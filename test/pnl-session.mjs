#!/usr/bin/env node
/**
 * 今日盈亏（同花顺投资账本）宿主侧纯函数回归测试 —— 零依赖，只用 Node 内建模块。
 *
 *   cd plugins/dsh-market-dock && node test/pnl-session.mjs
 *
 * 断言合并自旧插件 plugins/dsh-ths-pnl/tests/session.test.mjs + interval.test.mjs：
 *   · 时段划分（含 09:30 / 11:30 / 13:00 / 15:00 四个边界与周末）
 *   · 下一个边界（**13:00 必须在边界表里**，否则午休睡到 15:00）
 *   · 该不该拉上游（无快照必拉 / 盘中必拉 / 收盘补拉 / 周末不拉）
 *   · 客户端轮询间隔（盘中心跳、盘外睡到边界）
 *   · clampPollMs 的秒→毫秒换算与越界钳制
 *
 * 时刻一律用 beijingInstant 构造，所以结果与机器本地时区无关。
 * 用仓库统一的手写 check() 而不是 node:test：后者在 DSH Windows 文件沙箱下
 * 容易踩子进程/管道（EPERM），本文件直接 node 执行、进程内跑完。
 */

import {
  OPEN_MIN, CLOSE_MIN,
  beijingInstant, sessionInfo, nextBoundary, msUntilNextBoundary, shouldFetch, nextPollMs,
} from '../lib/pnl/session.js'
import { clampPollMs } from '../lib/pnl/index.js'
import { MIN_POLL_MS, MAX_POLL_MS } from '../lib/pnl/constants.js'

const failures = []
let total = 0

function check(name, cond, detail) {
  total++
  if (cond) console.log('  ✓ ' + name)
  else {
    failures.push(name)
    console.log('  ✗ ' + name + (detail === undefined || detail === '' ? '' : ' :: ' + detail))
  }
}
function section(title) {
  console.log('\n' + title)
}

/** 2026-09-23 星期三的北京时刻。 */
const WED = (h, m) => beijingInstant(2026, 9, 23, h, m)
/** 2026-09-25 星期五。 */
const FRI = (h, m) => beijingInstant(2026, 9, 25, h, m)
/** 2026-09-26 星期六。 */
const SAT = (h, m) => beijingInstant(2026, 9, 26, h, m)
/** 2026-09-28 星期一。 */
const MON = (h, m) => beijingInstant(2026, 9, 28, h, m)

console.log('今日盈亏：交易时段 + 刷新间隔（纯函数回归）')

/* ------------------------------------------------------------------ *
 * 1. 时段划分
 * ------------------------------------------------------------------ */
section('[1] 时段划分（北京时间，UTC+8 固定偏移）')

check('09:29 → pre / 不在盘中', sessionInfo(WED(9, 29)).state === 'pre' && sessionInfo(WED(9, 29)).inSession === false, sessionInfo(WED(9, 29)).state)
check('09:30 边界 → morning / 盘中', sessionInfo(WED(9, 30)).state === 'morning' && sessionInfo(WED(9, 30)).inSession === true, sessionInfo(WED(9, 30)).state)
check('11:30 边界 → morning / 仍盘中', sessionInfo(WED(11, 30)).state === 'morning' && sessionInfo(WED(11, 30)).inSession === true, sessionInfo(WED(11, 30)).state)
check('11:31 → lunch / 不在盘中', sessionInfo(WED(11, 31)).state === 'lunch' && sessionInfo(WED(11, 31)).inSession === false, sessionInfo(WED(11, 31)).state)
check('12:59 → lunch', sessionInfo(WED(12, 59)).state === 'lunch')
check('13:00 边界 → afternoon / 盘中', sessionInfo(WED(13, 0)).state === 'afternoon' && sessionInfo(WED(13, 0)).inSession === true, sessionInfo(WED(13, 0)).state)
check('15:00 边界 → afternoon / 仍盘中', sessionInfo(WED(15, 0)).state === 'afternoon' && sessionInfo(WED(15, 0)).inSession === true, sessionInfo(WED(15, 0)).state)
check('15:01 → after / 不在盘中', sessionInfo(WED(15, 1)).state === 'after' && sessionInfo(WED(15, 1)).inSession === false, sessionInfo(WED(15, 1)).state)
check('23:59 → after', sessionInfo(WED(23, 59)).state === 'after')

check('周六 → weekend / 非交易日 / 不在盘中', sessionInfo(SAT(10, 0)).state === 'weekend' && sessionInfo(SAT(10, 0)).isTradingDay === false && sessionInfo(SAT(10, 0)).inSession === false, sessionInfo(SAT(10, 0)).state)
check('周日 → weekend', sessionInfo(beijingInstant(2026, 9, 27, 10, 0)).state === 'weekend')

check('日期按北京时间取（周三 00:05 北京 = 周二 16:05 UTC）', sessionInfo(beijingInstant(2026, 9, 23, 0, 5)).date === '2026-09-23', sessionInfo(beijingInstant(2026, 9, 23, 0, 5)).date)
check('日期按北京时间取（周三 23:55 北京）', sessionInfo(beijingInstant(2026, 9, 23, 23, 55)).date === '2026-09-23', sessionInfo(beijingInstant(2026, 9, 23, 23, 55)).date)
check('常量：开盘 09:30 / 收盘 15:00', OPEN_MIN === 570 && CLOSE_MIN === 900, OPEN_MIN + '/' + CLOSE_MIN)

/* ------------------------------------------------------------------ *
 * 2. 下一个边界
 * ------------------------------------------------------------------ */
section('[2] 下一个边界（09:30 / 13:00 / 15:00，跳过周末）')

check('盘前 08:00 → 当天 09:30', nextBoundary(WED(8, 0)).getTime() === WED(9, 30).getTime(), String(nextBoundary(WED(8, 0))))
check('上午盘 10:00 → 当天 13:00（午休出口，不能直接睡到 15:00）', nextBoundary(WED(10, 0)).getTime() === WED(13, 0).getTime(), String(nextBoundary(WED(10, 0))))
check('上午盘 11:31 → 当天 13:00', nextBoundary(WED(11, 31)).getTime() === WED(13, 0).getTime(), String(nextBoundary(WED(11, 31))))
check('午间 12:00 → 当天 13:00', nextBoundary(WED(12, 0)).getTime() === WED(13, 0).getTime(), String(nextBoundary(WED(12, 0))))
check('午间 12:59 → 当天 13:00', nextBoundary(WED(12, 59)).getTime() === WED(13, 0).getTime(), String(nextBoundary(WED(12, 59))))
check('下午盘 13:01 → 当天 15:00', nextBoundary(WED(13, 1)).getTime() === WED(15, 0).getTime(), String(nextBoundary(WED(13, 1))))
check('下午盘 14:59 → 当天 15:00', nextBoundary(WED(14, 59)).getTime() === WED(15, 0).getTime(), String(nextBoundary(WED(14, 59))))
check('收盘后 16:00 → 次日 09:30', nextBoundary(WED(16, 0)).getTime() === beijingInstant(2026, 9, 24, 9, 30).getTime(), String(nextBoundary(WED(16, 0))))
check('周五收盘后 → 下周一 09:30（跨过周末）', nextBoundary(FRI(16, 0)).getTime() === MON(9, 30).getTime(), String(nextBoundary(FRI(16, 0))))
check('周末 → 周一 09:30', nextBoundary(SAT(10, 0)).getTime() === MON(9, 30).getTime(), String(nextBoundary(SAT(10, 0))))

// 容差窗口：定时器比边界早 1ms 触发时不能把这次边界整个跳过（否则 15:00 收盘拉取丢失）
const justBefore = new Date(WED(15, 0).getTime() - 1)
const justAfter = new Date(WED(15, 0).getTime() + 1000)
const wellAfter = new Date(WED(15, 0).getTime() + 5000)
check('15:00 前 1ms → 仍指向当天 15:00（收盘拉取不丢）', nextBoundary(justBefore).getTime() === WED(15, 0).getTime(), String(nextBoundary(justBefore)))
check('15:00 后 1s → 仍指向当天 15:00（容差窗口）', nextBoundary(justAfter).getTime() === WED(15, 0).getTime(), String(nextBoundary(justAfter)))
check('超过容差窗口（+5s）→ 真正翻页到次日 09:30', nextBoundary(wellAfter).getTime() === beijingInstant(2026, 9, 24, 9, 30).getTime(), String(nextBoundary(wellAfter)))

check('msUntilNextBoundary：10:00 → 13:00 共 3 小时', msUntilNextBoundary(WED(10, 0)) === 3 * 60 * 60 * 1000, String(msUntilNextBoundary(WED(10, 0))))
check('msUntilNextBoundary：收盘后至少睡十几小时', msUntilNextBoundary(WED(16, 0)) > 12 * 60 * 60 * 1000, String(msUntilNextBoundary(WED(16, 0))))

/* ------------------------------------------------------------------ *
 * 3. 该不该拉上游
 * ------------------------------------------------------------------ */
section('[3] shouldFetch：该不该去账本拉一次')

check('从未有快照 → 拉（周六也拉，否则首次安装一直空白）', shouldFetch(sessionInfo(SAT(10, 0)), null) === true)
check('快照为 undefined → 拉', shouldFetch(sessionInfo(WED(22, 0)), undefined) === true)

const wedSnap = { sessionDate: '2026-09-23', closeDate: '2026-09-23' }
check('盘中 09:30 → 拉', shouldFetch(sessionInfo(WED(9, 30)), wedSnap) === true)
check('盘中 15:00 → 拉', shouldFetch(sessionInfo(WED(15, 0)), wedSnap) === true)

check('午间休市 → 不拉（这就是"非开盘时间保持最后的值"）', shouldFetch(sessionInfo(WED(12, 0)), { sessionDate: '2026-09-23' }) === false)

check('收盘后今天还没拉过收盘值 → 拉', shouldFetch(sessionInfo(WED(15, 30)), { sessionDate: '2026-09-23' }) === true)
check('收盘后已拉过收盘值 → 不拉（冻结）', shouldFetch(sessionInfo(WED(15, 30)), { sessionDate: '2026-09-23', closeDate: '2026-09-23' }) === false)
check('深夜已拉过收盘值 → 不拉', shouldFetch(sessionInfo(WED(23, 0)), { sessionDate: '2026-09-23', closeDate: '2026-09-23' }) === false)

check('盘中（昨天的快照）→ 拉', shouldFetch(sessionInfo(WED(10, 0)), { sessionDate: '2026-09-22', closeDate: '2026-09-22' }) === true)
check('午间但今天还没拉过 → 补一次（别一直显示昨天的值）', shouldFetch(sessionInfo(WED(12, 0)), { sessionDate: '2026-09-22' }) === true)
check('盘前且今天没拉过 → 不拉（等 09:30 边界）', shouldFetch(sessionInfo(WED(9, 0)), { sessionDate: '2026-09-22' }) === false)
check('周末已有快照 → 不拉', shouldFetch(sessionInfo(SAT(10, 0)), { sessionDate: '2026-09-25', closeDate: '2026-09-25' }) === false)

/* ------------------------------------------------------------------ *
 * 4. 下次轮询间隔
 * ------------------------------------------------------------------ */
section('[4] nextPollMs：客户端/宿主下次该等多久')

check('盘中 10:00 → 心跳 60s', nextPollMs(sessionInfo(WED(10, 0)), WED(10, 0), 60_000) === 60_000, String(nextPollMs(sessionInfo(WED(10, 0)), WED(10, 0), 60_000)))
check('15:00 边界 → 心跳 60s', nextPollMs(sessionInfo(WED(15, 0)), WED(15, 0), 60_000) === 60_000, String(nextPollMs(sessionInfo(WED(15, 0)), WED(15, 0), 60_000)))
check('午间 12:00 → 睡到 13:00 边界 + 1.5s 容差', nextPollMs(sessionInfo(WED(12, 0)), WED(12, 0), 60_000) === 60 * 60 * 1000 + 1500, String(nextPollMs(sessionInfo(WED(12, 0)), WED(12, 0), 60_000)))
check('周末 → 睡过一天', nextPollMs(sessionInfo(SAT(10, 0)), SAT(10, 0), 60_000) > 24 * 60 * 60 * 1000, String(nextPollMs(sessionInfo(SAT(10, 0)), SAT(10, 0), 60_000)))

// 回归：11:31 进入午休后只睡到 13:00，下午盘必须能自己醒过来
const lunchInfo = sessionInfo(WED(11, 31))
const wakeAt = new Date(WED(11, 31).getTime() + nextPollMs(lunchInfo, WED(11, 31), 60_000))
check('回归：11:31 处于 lunch', lunchInfo.state === 'lunch', lunchInfo.state)
check('回归：醒来时刻 = 13:00 + 1.5s 容差', wakeAt.getTime() === WED(13, 0).getTime() + 1500, String(wakeAt))
check('回归：醒来时已是 afternoon 盘中（否则就是"13:16 还显示午间"那个 bug）', sessionInfo(wakeAt).state === 'afternoon' && sessionInfo(wakeAt).inSession === true, sessionInfo(wakeAt).state)
check('回归：醒来时 shouldFetch 为 true', shouldFetch(sessionInfo(wakeAt), { sessionDate: '2026-09-23' }) === true)

/* ------------------------------------------------------------------ *
 * 5. clampPollMs：秒 → 毫秒 + 越界钳制
 * ------------------------------------------------------------------ */
section('[5] clampPollMs：刷新间隔规整')

check('60 秒 → 60000ms', clampPollMs(60) === 60_000, String(clampPollMs(60)))
check('30 秒 → 30000ms', clampPollMs(30) === 30_000, String(clampPollMs(30)))
check('5 秒 → 5000ms', clampPollMs(5) === 5_000, String(clampPollMs(5)))
check('3600 秒 → 3600000ms', clampPollMs(3600) === 3_600_000, String(clampPollMs(3600)))

check('数字字符串 "60" → 60000ms（表单输入框给的就是字符串）', clampPollMs('60') === 60_000, String(clampPollMs('60')))
check('带空格 " 45 " → 45000ms', clampPollMs(' 45 ') === 45_000, String(clampPollMs(' 45 ')))
check('小数 "7.6" → 7600ms（四舍五入）', clampPollMs('7.6') === 7_600, String(clampPollMs('7.6')))

check('1 秒 → 夹到下限（保护账本接口，别把刷新调到 1 秒）', clampPollMs(1) === MIN_POLL_MS, String(clampPollMs(1)))
check('0.5 秒 → 夹到下限', clampPollMs(0.5) === MIN_POLL_MS, String(clampPollMs(0.5)))
check('"1" → 夹到下限', clampPollMs('1') === MIN_POLL_MS, String(clampPollMs('1')))
check('下限常量 = 5 秒', MIN_POLL_MS === 5_000, String(MIN_POLL_MS))

check('99999 秒 → 夹到上限', clampPollMs(99999) === MAX_POLL_MS, String(clampPollMs(99999)))
check('999999 秒 → 夹到上限', clampPollMs(999999) === MAX_POLL_MS, String(clampPollMs(999999)))
check('上限常量 = 1 小时', MAX_POLL_MS === 3_600_000, String(MAX_POLL_MS))

check('"abc" → null（调用方回退默认）', clampPollMs('abc') === null)
check('空串 → null', clampPollMs('') === null)
check('全空格 → null', clampPollMs('   ') === null)
check('undefined → null', clampPollMs(undefined) === null)
check('null → null', clampPollMs(null) === null)
check('NaN → null', clampPollMs(NaN) === null)
check('Infinity → null', clampPollMs(Infinity) === null)
check('0 → null', clampPollMs(0) === null)
check('-5 → null', clampPollMs(-5) === null)

/* ------------------------------------------------------------------ *
 * 汇总
 * ------------------------------------------------------------------ */
console.log('\n' + '-'.repeat(60))
if (failures.length === 0) {
  console.log('结果：全部通过（' + total + ' 项断言）')
} else {
  console.log('结果：' + failures.length + ' 项失败 / 共 ' + total + ' 项断言')
  for (const f of failures) console.log('  ✗ ' + f)
}
process.exit(failures.length === 0 ? 0 : 1)

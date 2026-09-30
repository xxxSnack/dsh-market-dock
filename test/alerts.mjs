#!/usr/bin/env node
/**
 * 持久化价格提醒（lib/alerts.js）聚焦回归测试 —— 零依赖，进程内跑完。
 *
 *   cd plugins/dsh-xueqiu-debug && node test/alerts.mjs
 *
 * 背景：提醒功能（方案3）此前零测试覆盖。这里锁四条最容易翻车的行为契约：
 *
 *   [1] remove 掉最后一规则 → watcher 停止（定时器被回收、停止后旧回调不再轮询）；
 *       负对照：还有剩余规则时 remove 不停 watcher；重新 alerts.set 会再武装。
 *   [2] 同阈值同价：触发后回到阈值另一侧会重新武装（rearm），再次越过同阈值、
 *       同一价格可再次触发 —— 不存在「触发过一次就永远沉默」。
 *   [3] 首次加载历史事件不通知：重启后磁盘上的规则/事件被规整加载，但首轮报价
 *       只建基线不产生新事件（价格已越过阈值也不补发）；已触发未确认（armed:false）
 *       的规则重启后不重发，回到另一侧才恢复武装。
 *   [4] ack 失败保留：未知 id / 空 ids / 非数组 ids / null 的 ack 一律保留事件、
 *       不崩不误删；有效 ack 只删命中的 id（幂等）。
 *
 * 测试边界（与 pnl-cookie.mjs 同风格：直测 lib 模块 + 假依赖）：
 *   - installAlerts(core) 直装，core.stateRead/stateWrite 用**真的 installState**
 *     （落点就是假 $DSH_HOME/<stateDir>/，持久化路径真实可信）；
 *   - core.loadWatchlist 用真的 installWatchlist（无自选文件时回退配置默认表）；
 *   - core.actQuote 是脚本化假行情：按顺序回放报价并记录入参，绝不触网；
 *   - ctx.timeout 只登记不调度（manualTimers，同 smoke-host）：watcher 轮询由测试
 *     显式调用定时器回调驱动，每轮之间用 setImmediate 冲刷异步链 → 完全确定、零真实定时器。
 *
 * 隔离：全程只写 tmp/refactor-xueqiu/alerts-test/ 下的假 $DSH_HOME 与假工作区；
 * 收尾断言仓库根/插件目录没有掉 .xueqiu-*.json、真实 ~/.dsh 未被触碰。
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { installAlerts } from '../lib/alerts.js'
import { installState } from '../lib/state.js'
import { installWatchlist } from '../lib/watchlist.js'
import { ALERT_POLL_MS } from '../lib/constants.js'

/* ------------------------------------------------------------------ *
 * 0. 路径与隔离基线
 * ------------------------------------------------------------------ */

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PLUGIN_DIR = path.resolve(HERE, '..')
const REPO_ROOT = path.resolve(PLUGIN_DIR, '..', '..')
const TMP_ROOT = path.join(REPO_ROOT, 'tmp', 'refactor-xueqiu', 'alerts-test')
const HOME = path.join(TMP_ROOT, 'home') // 假 $DSH_HOME
const WORK = path.join(TMP_ROOT, 'work') // 假 cwd / 假 sandboxPolicy.workspaceRoot
const JAIL = TMP_ROOT // 假 fs 的写白名单
const REAL_XQ_HOME = path.join(os.homedir(), '.dsh', 'dsh-xueqiu')
const STATE_FILE_RE = /^\.xueqiu-.*\.json$/

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
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function listStateFiles(dir) {
  if (!fs.existsSync(dir)) return []
  try {
    return fs.readdirSync(dir).filter((n) => STATE_FILE_RE.test(n)).sort()
  } catch (e) {
    return []
  }
}
function snapshotDir(dir) {
  if (!fs.existsSync(dir)) return null
  const out = {}
  try {
    for (const n of fs.readdirSync(dir).sort()) {
      try { out[n] = fs.statSync(path.join(dir, n)).size } catch (e) { out[n] = -1 }
    }
  } catch (e) { return null }
  return out
}

const baseline = {
  repo: listStateFiles(REPO_ROOT),
  plugin: listStateFiles(PLUGIN_DIR),
  realHome: snapshotDir(REAL_XQ_HOME),
}

fs.rmSync(TMP_ROOT, { recursive: true, force: true })
fs.mkdirSync(HOME, { recursive: true })
fs.mkdirSync(WORK, { recursive: true })
process.env.DSH_HOME = HOME
process.chdir(WORK)

console.log('价格提醒（lib/alerts.js）聚焦回归测试')
console.log('  假 DSH_HOME : ' + HOME)
console.log('  假工作目录  : ' + WORK)

/* ------------------------------------------------------------------ *
 * 1. 测试装置：监牢 fs / 登记式定时器 / 脚本化行情 / boot
 * ------------------------------------------------------------------ */

function inJail(p) {
  const abs = path.resolve(String(p))
  return abs === JAIL || abs.startsWith(JAIL + path.sep)
}

/** 真 fs 的监牢外壳（语义对齐 DSH fs 服务：resolve/readText/writeText），越界一律抛错。 */
function makeFsStub() {
  return {
    async resolve(p, opts) {
      const cwd = opts && opts.cwd ? String(opts.cwd) : WORK
      const abs = path.resolve(cwd, String(p))
      if (!inJail(abs)) throw new Error('[alerts-test] fs.resolve 越界被拒: ' + abs)
      return abs
    },
    async readText(p) {
      if (!inJail(p)) throw new Error('[alerts-test] fs.readText 越界被拒: ' + p)
      return fs.readFileSync(p, 'utf8') // 不存在 → ENOENT 抛错，由调用方兜底
    },
    async writeText(p, text) {
      const abs = path.resolve(String(p))
      if (!inJail(abs)) throw new Error('[alerts-test] fs.writeText 越界被拒: ' + abs)
      fs.mkdirSync(path.dirname(abs), { recursive: true })
      fs.writeFileSync(abs, String(text))
    },
  }
}

function makeCtx() {
  const rec = {
    timers: [],      // 登记的 watcher 定时器（{cb, ms, live}，永不自动触发）
    timerStops: [],  // 被停止函数清掉的定时器间隔（顺序记录）
    disposers: [],   // ctx.effect 返回的回收函数
    warns: [],       // logger.warn 收到的告警（watcher 内部异常应视为测试失败信号）
    getNames: [],
  }
  const provided = { fs: makeFsStub(), sandboxPolicy: { workspaceRoot: WORK } }
  const ctx = {
    timeout(cb, ms) {
      const entry = { cb, ms, live: true }
      rec.timers.push(entry)
      return () => {
        if (entry.live) {
          entry.live = false
          rec.timerStops.push(ms)
        }
      }
    },
    effect(fn) {
      const d = fn()
      if (typeof d === 'function') rec.disposers.push(d)
      return typeof d === 'function' ? d : () => {}
    },
    get(name) {
      rec.getNames.push(name)
      return provided[name]
    },
    logger: {
      info() {},
      warn(e) { rec.warns.push(String((e && e.message) || e)) },
      error() {},
      debug() {},
    },
  }
  return { ctx, rec }
}

/** setImmediate 冲刷：等异步链（纯微任务 + 同步 fs 替身）自然落定，无真实定时器参与。 */
async function flush(times) {
  for (let i = 0; i < (times || 20); i++) await new Promise((r) => setImmediate(r))
}

/** 有界等待谓词成真；超时返回 false（断言会带上下文失败，不悬挂）。 */
async function settle(pred) {
  for (let i = 0; i < 500; i++) {
    if (pred()) return true
    await new Promise((r) => setImmediate(r))
  }
  return false
}

const ALL_REC = [] // 所有场景的 rec（收尾统一核对 ctx.get 依赖面）

/** 报价脚本项：actQuote 单次回放的 list。 */
const Q = (current) => [{ symbol: 'SH600519', current: current, name: '贵州茅台' }]

/**
 * 装一个独立的提醒实例：真 state/watchlist 层 + 假行情 + manualTimers。
 * opts.seed 传 {stateDir, store} 时先落一份 .xueqiu-alerts.json 再启动。
 */
async function boot(opts) {
  const o = opts || {}
  const stateDir = o.stateDir || 'al-default'
  if (o.seed) {
    fs.mkdirSync(path.join(HOME, stateDir), { recursive: true })
    fs.writeFileSync(path.join(HOME, stateDir, '.xueqiu-alerts.json'), JSON.stringify(o.seed.store))
  }
  const { ctx, rec } = makeCtx()
  ALL_REC.push(rec)
  const core = {
    ctx: ctx,
    config: { stateDir: stateDir, watchlist: o.watchlist || ['SH600519'] },
    stateBasePromise: null,
  }
  installState(core)
  installWatchlist(core)
  const script = (o.quotes || []).slice()
  const quoteCalls = []
  core.actQuote = async function (args) {
    quoteCalls.push({ symbols: (args && args.symbols) || [], force: !!(args && args.force) })
    if (!script.length) throw new Error('[alerts-test] 行情脚本用尽：出现了预期外的轮询')
    return { list: script.shift(), status: null }
  }
  installAlerts(core)
  // 启动加载：有种子的（有规则）等到 watcher 真正武装；空的等到加载链落定后应无定时器。
  if (o.seed) {
    const ok = await settle(() => rec.timers.some((e) => e.live))
    if (!ok) throw new Error('[alerts-test] 启动后 watcher 未武装')
  } else {
    await flush(30)
  }
  const dispose = async function () {
    for (const d of rec.disposers) {
      try { d() } catch (e) { /* 回收失败要在断言里暴露，而不是吞掉 */ }
    }
    await flush(10)
  }
  return { core, rec, quoteCalls, stateDir: stateDir, dispose: dispose }
}

/** 读假 $DSH_HOME 下的持久化 store（磁盘真相）。 */
function readStore(stateDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(HOME, stateDir, '.xueqiu-alerts.json'), 'utf8'))
  } catch (e) {
    return null
  }
}

/** 显式驱动一轮 watcher 轮询：调当前活定时器回调，等本轮行情被消费且下一轮武装完成。 */
async function drivePoll(h, expectQuotes) {
  const entry = h.rec.timers.find((e) => e.live)
  if (!entry) throw new Error('[alerts-test] 没有活的 watcher 定时器可驱动')
  const lenBefore = h.rec.timers.length
  entry.cb()
  // 完成判据（硬信号）：wake 的 finally 在 pollOnce 完全落定后才经 arm() 登记新定时器条目，
  // 所以「条目总数增长」等价于本轮轮询（含 persist）已完成；单看 live 标记不行 ——
  // wake 入口会置空 timerStop，manualTimers 下旧条目会残留 live=true（幽灵条目）。
  const ok = await settle(() => h.quoteCalls.length >= expectQuotes && h.rec.timers.length > lenBefore)
  if (!ok) throw new Error('[alerts-test] 第 ' + expectQuotes + ' 轮轮询未在限定步数内完成（timers=' + h.rec.timers.length + ' qc=' + h.quoteCalls.length + '）')
  await flush(10) // 让观测断言（actAlertsGet / 磁盘读取）之前的尾巴全部落定
}

const store = async (h) => h.core.actAlertsGet()
const rulesOf = async (h) => (await store(h)).rules
const eventsOf = async (h) => (await store(h)).events

/* ------------------------------------------------------------------ *
 * [1] remove 最后一规则 → watcher 停止
 * ------------------------------------------------------------------ */

section('[1] remove 最后一规则停止 watcher（含负对照与恢复）')
{
  const h = await boot({ stateDir: 'al-sc1', quotes: [] })

  check('无规则启动：不空转（没有任何 watcher 定时器）', h.rec.timers.length === 0, 'timers=' + h.rec.timers.length)

  const set1 = await h.core.actAlertsSet({ symbol: 'SH600519', target: 10, direction: 'above' })
  check('alerts.set → 规则落库且 armed 初始为 true', set1.rules.length === 1 && set1.rules[0].armed === true, JSON.stringify(set1))
  check('alerts.set → watcher 立即武装（间隔 = ALERT_POLL_MS）',
    h.rec.timers.length === 1 && h.rec.timers[0].live && h.rec.timers[0].ms === ALERT_POLL_MS,
    'timers=' + JSON.stringify(h.rec.timers.map((t) => t.ms)))

  await h.core.actAlertsSet({ symbol: 'AAPL', target: 200, direction: 'below' })
  check('第二个规则 set 不重复武装（仍是同一条定时器）', h.rec.timers.length === 1 && h.rec.timers[0].live, 'timers=' + h.rec.timers.length)

  await h.core.actAlertsRemove({ symbol: 'AAPL' })
  check('负对照：remove 非最后规则 → watcher 不停（定时器仍活、无 stop 记录）',
    h.rec.timers[0].live && h.rec.timerStops.length === 0,
    'stops=' + JSON.stringify(h.rec.timerStops))

  const rm = await h.core.actAlertsRemove({ symbol: 'SH600519' })
  check('remove 最后一规则 → 返回空规则表', sameJson(rm.rules, []), JSON.stringify(rm))
  check('remove 最后一规则 → watcher 定时器被回收（stop 记录 ALERT_POLL_MS）',
    sameJson(h.rec.timerStops, [ALERT_POLL_MS]) && !h.rec.timers.some((e) => e.live),
    'stops=' + JSON.stringify(h.rec.timerStops))

  const onDisk = readStore(h.stateDir)
  check('remove 落盘：磁盘 store 的 rules 已清空', Boolean(onDisk) && sameJson(onDisk.rules, []), JSON.stringify(onDisk))

  const before = h.quoteCalls.length
  h.rec.timers[0].cb() // 手动触发已被停止的旧定时器回调
  await flush(30)
  check('停止后旧定时器回调不再轮询（零行情请求）', h.quoteCalls.length === before, 'delta=' + (h.quoteCalls.length - before))
  check('停止后旧定时器回调不会重新武装', !h.rec.timers.some((e) => e.live) && h.rec.timers.length === 1, 'timers=' + h.rec.timers.length)

  await h.core.actAlertsSet({ symbol: 'SH600519', target: 11, direction: 'above' })
  check('停止后重新 alerts.set → watcher 恢复武装（stop 不是永久性的）',
    h.rec.timers.length === 2 && h.rec.timers[1].live && h.rec.timers[1].ms === ALERT_POLL_MS,
    'timers=' + JSON.stringify(h.rec.timers.map((t) => [t.ms, t.live])))

  check('场景 [1] 全程零 watcher 告警', h.rec.warns.length === 0, JSON.stringify(h.rec.warns))
  await h.dispose()
  check('disposer 可回收（cleanup 不抛错）', h.rec.disposers.length === 1, 'disposers=' + h.rec.disposers.length)
}

/* ------------------------------------------------------------------ *
 * [2] 同阈值同价：rearm 后可再次触发
 * ------------------------------------------------------------------ */

section('[2] 同阈值同价在 rearm 后可再次触发')
{
  const h = await boot({ stateDir: 'al-sc2', quotes: [Q(9), Q(10.5), Q(10.6), Q(9.5), Q(10.5)] })
  await h.core.actAlertsSet({ symbol: 'SH600519', target: 10, direction: 'above' })

  // 第 1 轮：首次有效报价只建基线
  await drivePoll(h, 1)
  check('轮询入参：批量行情 force=true 且并入规则标的', sameJson(h.quoteCalls[0], { symbols: ['SH600519'], force: true }), JSON.stringify(h.quoteCalls[0]))
  check('第 1 轮（9）：只建基线，不产生事件', (await eventsOf(h)).length === 0, JSON.stringify(await eventsOf(h)))
  check('第 1 轮：报价名回写规则（name 同步）', (await rulesOf(h))[0].name === '贵州茅台', JSON.stringify(await rulesOf(h)))

  // 第 2 轮：越过阈值 → 触发
  await drivePoll(h, 2)
  const ev1 = await eventsOf(h)
  check('第 2 轮（10.5 越过 10）：触发 1 条事件', ev1.length === 1, JSON.stringify(ev1))
  check('事件字段齐全：current/target/direction/at 且 id 以标的开头',
    ev1[0] && ev1[0].current === 10.5 && ev1[0].target === 10 && ev1[0].direction === 'above' &&
    typeof ev1[0].id === 'string' && ev1[0].id.indexOf('SH600519-') === 0 && /^\d{4}-\d{2}-\d{2}T/.test(String(ev1[0].at)),
    JSON.stringify(ev1[0]))
  check('触发后规则去武装（armed=false）', (await rulesOf(h))[0].armed === false, JSON.stringify(await rulesOf(h)))

  // 第 3 轮：仍在阈值上方 → 已去武装，不重复触发
  await drivePoll(h, 3)
  check('第 3 轮（10.6 仍在上方）：去武装期间不重复触发', (await eventsOf(h)).length === 1, JSON.stringify(await eventsOf(h)))
  check('第 3 轮：规则仍未重新武装（同侧不 rearm）', (await rulesOf(h))[0].armed === false, JSON.stringify(await rulesOf(h)))

  // 第 4 轮：回到阈值另一侧 → 重新武装
  await drivePoll(h, 4)
  check('第 4 轮（9.5 回到下方）：重新武装且不补发事件', (await rulesOf(h))[0].armed === true && (await eventsOf(h)).length === 1, JSON.stringify(await rulesOf(h)))

  // 第 5 轮：同阈值、同价格 → 再次触发
  await drivePoll(h, 5)
  const ev2 = await eventsOf(h)
  check('第 5 轮（同阈值 10、同价 10.5）：再次触发（共 2 条）', ev2.length === 2, JSON.stringify(ev2))
  check('两次事件同阈值同价（id 不同）',
    ev2[1].current === ev2[0].current && ev2[1].target === ev2[0].target && ev2[1].id !== ev2[0].id,
    JSON.stringify(ev2.map((e) => [e.id, e.current, e.target])))
  check('第二次触发后规则再次去武装', (await rulesOf(h))[0].armed === false, JSON.stringify(await rulesOf(h)))

  const onDisk = readStore(h.stateDir)
  check('磁盘真相：2 条事件 + armed=false 都已持久化',
    Boolean(onDisk) && onDisk.events.length === 2 && onDisk.rules.length === 1 && onDisk.rules[0].armed === false,
    JSON.stringify(onDisk))

  check('场景 [2] 全程零 watcher 告警', h.rec.warns.length === 0, JSON.stringify(h.rec.warns))
  await h.dispose()
}

/* ------------------------------------------------------------------ *
 * [3] 首次加载历史事件不通知
 * ------------------------------------------------------------------ */

section('[3] 首次加载历史事件不通知（重启不补发 / 不重发）')
{
  // 3a：磁盘上有 armed:true 的规则 + 历史事件；重启后价格已越过阈值也只建基线，不补发。
  const h = await boot({
    stateDir: 'al-sc3a',
    quotes: [Q(12), Q(12.2)],
    seed: {
      store: {
        rules: [{ symbol: 'SH600519', name: '贵州茅台', target: 10, direction: 'above', enabled: true, armed: true }],
        events: [{ id: 'SH600519-1700000000000-1', symbol: 'SH600519', name: '贵州茅台', current: 10.5, target: 10, direction: 'above', at: '2025-01-01T09:30:00.000Z' }],
      },
    },
  })
  check('带持久化规则启动 → watcher 自动武装', h.rec.timers.length === 1 && h.rec.timers[0].live, 'timers=' + h.rec.timers.length)

  await drivePoll(h, 1)
  check('首轮（12 已越过阈值 10）：只建基线，不补发新事件', (await eventsOf(h)).length === 1, JSON.stringify(await eventsOf(h)))
  await drivePoll(h, 2)
  const evs = await eventsOf(h)
  check('次轮（12.2，prev 已在上方）：不产生穿越，历史事件仍是唯一一条',
    evs.length === 1 && evs[0].id === 'SH600519-1700000000000-1', JSON.stringify(evs))
  check('历史事件字段在加载往返后完整保留',
    evs[0].current === 10.5 && evs[0].target === 10 && evs[0].direction === 'above' && evs[0].at === '2025-01-01T09:30:00.000Z',
    JSON.stringify(evs[0]))
  check('重启后规则仍 armed（基线语义未被破坏）', (await rulesOf(h))[0].armed === true, JSON.stringify(await rulesOf(h)))
  check('场景 [3a] 全程零 watcher 告警', h.rec.warns.length === 0, JSON.stringify(h.rec.warns))
  await h.dispose()

  // 3b：已触发未确认（armed:false 持久化）→ 重启不重发，回到另一侧才恢复武装。
  const h2 = await boot({
    stateDir: 'al-sc3b',
    quotes: [Q(12), Q(9)],
    seed: {
      store: {
        rules: [{ symbol: 'SH600519', name: '贵州茅台', target: 10, direction: 'above', enabled: true, armed: false }],
        events: [{ id: 'SH600519-1700000000001-2', symbol: 'SH600519', name: '贵州茅台', current: 10.2, target: 10, direction: 'above', at: '2025-01-01T09:31:00.000Z' }],
      },
    },
  })
  await drivePoll(h2, 1)
  check('armed:false 重启 + 价格仍在上方：不重发未确认的触发', (await eventsOf(h2)).length === 1 && (await rulesOf(h2))[0].armed === false, JSON.stringify(await rulesOf(h2)))
  await drivePoll(h2, 2)
  check('价格回到另一侧（9 < 10）：恢复武装，仍不补发历史事件',
    (await rulesOf(h2))[0].armed === true && (await eventsOf(h2)).length === 1, JSON.stringify(await rulesOf(h2)))
  const onDisk = readStore(h2.stateDir)
  check('恢复武装已落盘（armed=true 持久化，重启循环可延续）',
    Boolean(onDisk) && onDisk.rules[0].armed === true && onDisk.events.length === 1, JSON.stringify(onDisk))
  check('场景 [3b] 全程零 watcher 告警', h2.rec.warns.length === 0, JSON.stringify(h2.rec.warns))
  await h2.dispose()
}

/* ------------------------------------------------------------------ *
 * [4] ack 失败/无效 → 事件保留
 * ------------------------------------------------------------------ */

section('[4] ack 失败/无效保留事件；有效 ack 只删命中')
{
  const h = await boot({ stateDir: 'al-sc4', quotes: [Q(9), Q(10.5)] })
  await h.core.actAlertsSet({ symbol: 'SH600519', target: 10, direction: 'above' })
  await drivePoll(h, 1) // 基线
  await drivePoll(h, 2) // 触发 → 1 条事件
  const evs = await eventsOf(h)
  const id = evs[0].id
  check('前置：轮询产生 1 条事件', evs.length === 1, JSON.stringify(evs))

  const afterGhost = await h.core.actAlertsAck({ ids: ['ghost-1', 'ghost-2'] })
  check('未知 id 的 ack → 事件保留（原样回传）', afterGhost.events.length === 1 && afterGhost.events[0].id === id, JSON.stringify(afterGhost))

  await h.core.actAlertsAck({})
  await h.core.actAlertsAck(null)
  await h.core.actAlertsAck({ ids: 'not-an-array' })
  await h.core.actAlertsAck({ ids: [null, '', '  '] })
  check('空 ids / null / 非数组 / 全空白 → 全部保留', (await eventsOf(h)).length === 1 && (await eventsOf(h))[0].id === id, JSON.stringify(await eventsOf(h)))

  const onDiskMid = readStore(h.stateDir)
  check('失败的 ack 未落盘抹数据（磁盘事件仍在）',
    Boolean(onDiskMid) && onDiskMid.events.length === 1 && onDiskMid.events[0].id === id, JSON.stringify(onDiskMid))

  const ackOk = await h.core.actAlertsAck({ ids: [id, 'ghost'] })
  check('有效 ack（混合未知 id）→ 只删命中的那条', ackOk.events.length === 0, JSON.stringify(ackOk))
  const onDisk = readStore(h.stateDir)
  check('有效 ack 落盘：磁盘 events 清空（rules 不受影响）',
    Boolean(onDisk) && onDisk.events.length === 0 && onDisk.rules.length === 1, JSON.stringify(onDisk))

  const ackAgain = await h.core.actAlertsAck({ ids: [id] })
  check('重复 ack 幂等：不崩、返回空表', sameJson(ackAgain.events, []), JSON.stringify(ackAgain))
  check('场景 [4] 全程零 watcher 告警', h.rec.warns.length === 0, JSON.stringify(h.rec.warns))
  await h.dispose()
}

/* ------------------------------------------------------------------ *
 * [5] 隔离与依赖面
 * ------------------------------------------------------------------ */

section('[5] 隔离与依赖面')
{
  const got = []
  for (const rec of ALL_REC) for (const n of rec.getNames) if (got.indexOf(n) < 0) got.push(n)
  check('ctx.get 依赖面 ⊆ {fs, sandboxPolicy}（提醒不碰 shell / 网络）',
    got.length > 0 && got.every((n) => ['fs', 'sandboxPolicy'].indexOf(n) >= 0), JSON.stringify(got))
  check('假工作区没有 .xueqiu-* 文件（稳定目录模式生效，未走工作区回退）', listStateFiles(WORK).length === 0, JSON.stringify(listStateFiles(WORK)))
  check('仓库根未新增 .xueqiu-*.json', sameJson(listStateFiles(REPO_ROOT), baseline.repo), JSON.stringify(listStateFiles(REPO_ROOT)))
  check('插件目录未新增 .xueqiu-*.json', sameJson(listStateFiles(PLUGIN_DIR), baseline.plugin), JSON.stringify(listStateFiles(PLUGIN_DIR)))
  check('真实 ~/.dsh/dsh-xueqiu 未被触碰', sameJson(snapshotDir(REAL_XQ_HOME), baseline.realHome), JSON.stringify(snapshotDir(REAL_XQ_HOME)))
}

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
console.log('临时产物：' + TMP_ROOT + '（可整目录删除）')
process.exit(failures.length === 0 ? 0 : 1)

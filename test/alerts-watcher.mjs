#!/usr/bin/env node
/**
 * 价格提醒宿主侧 watcher —— 回归测试（零依赖，只用 Node 内置模块）。
 *
 *   cd plugins/dsh-xueqiu-debug && node test/alerts-watcher.mjs
 *
 * 锁住两条曾经出错的行为（方案3 宿主侧持续轮询）：
 *
 *   1) `alerts.remove` 删掉最后一条规则后，递归的宿主 watcher 必须**立即停表**：
 *      · 常规路径：还有待触发的定时器 → 删除后不能再有存活的 30000ms 定时器；
 *      · 竞态路径：停表请求发生在一次**在途 poll** 期间（行情请求被挂起）→ 那一轮跑完
 *        也不能再续挂下一轮、不能再发行情请求（旧实现只在 wake 的三段 if/else 里兜底）。
 *
 *   2) 事件判重只能按**唯一 id**，绝不能按 (symbol, direction, target, current) 价格签名：
 *      rearm 之后价格再次穿越同一价位是合法事件，必须照常记录（含跨重启）；
 *      同时新 id 不与已有事件撞车，否则落盘/重启后 parseStore 的 id 去重会吃掉合法事件。
 *
 * 机制：manualTimers 假 ctx（定时器只登记，由测试手动触发 `entry.cb()`）+ 脚本化假 shell
 * （按命令内容回放行情 JSON，可按需挂起一次请求制造在途竞态）+ 动态路径的 RPC 入口
 * （`harness.handle('xq.call', fn)`，直接拿到 { ok, data } 包络）。
 * 全程零网络、零真实定时器，只写仓库 tmp/ 下的临时目录。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/* ------------------------------------------------------------------ *
 * 0. 隔离世界
 * ------------------------------------------------------------------ */

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PLUGIN_DIR = path.resolve(HERE, '..')
const REPO_ROOT = path.resolve(PLUGIN_DIR, '..', '..')
const TMP_ROOT = path.join(REPO_ROOT, 'tmp', 'refactor-xueqiu', 'alerts-watcher')
const HOME = path.join(TMP_ROOT, 'home')                 // 假 $DSH_HOME
const WORK = path.join(TMP_ROOT, 'work')                 // 假 sandboxPolicy.workspaceRoot
const STATE_DIR = path.join(HOME, 'dsh-xueqiu')          // 插件状态文件落点
const STATE_FILE = path.join(STATE_DIR, '.xueqiu-alerts.json')
const JAIL = TMP_ROOT
const POLL_MS = 30000                                    // ALERT_POLL_MS

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
function section(title) { console.log('\n' + title) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// 不用 Date.now 计时的等待：下面有冻结 Date.now 的用例，用它会让循环卡死
async function waitFor(fn, budgetMs = 1500) {
  const step = 5
  for (let waited = 0; waited < budgetMs; waited += step) {
    if (fn()) return true
    await sleep(step)
  }
  return Boolean(fn())
}

fs.rmSync(TMP_ROOT, { recursive: true, force: true })
fs.mkdirSync(STATE_DIR, { recursive: true })
fs.mkdirSync(WORK, { recursive: true })
process.env.DSH_HOME = HOME

/* ------------------------------------------------------------------ *
 * 1. 假 fs / 假 shell / 假 ctx / 假 harness
 * ------------------------------------------------------------------ */

const inJail = (p) => {
  const abs = path.resolve(String(p))
  return abs === JAIL || abs.startsWith(JAIL + path.sep)
}

function makeFs() {
  return {
    async resolve(p, opts) {
      const cwd = opts && opts.cwd ? String(opts.cwd) : WORK
      const abs = path.resolve(cwd, String(p))
      if (!inJail(abs)) throw new Error('[alerts] fs.resolve 越界被拒: ' + abs)
      return abs
    },
    async readText(p) {
      if (!inJail(p)) throw new Error('[alerts] fs.readText 越界被拒: ' + p)
      return fs.readFileSync(p, 'utf8')
    },
    async writeText(p, text) {
      const abs = path.resolve(String(p))
      if (!inJail(abs)) throw new Error('[alerts] fs.writeText 越界被拒: ' + abs)
      fs.mkdirSync(path.dirname(abs), { recursive: true })
      fs.writeFileSync(abs, String(text))
    },
  }
}

const stats = { seed: 0, quote: 0, unexpected: 0 }
let price = 99          // 脚本化行情价格（每次 poll 读一次）
let hold = null         // 非 null 时：下一次行情请求挂起，等 release()

function quoteBody(p) {
  return JSON.stringify({
    data: {
      items: [{ quote: { symbol: 'SH600519', name: '贵州茅台', current: p }, market: { status_id: '1' } }],
    },
  })
}

/** 让下一次行情请求挂起，返回 { consumed, release } —— 用来制造"poll 在途"的竞态窗口。 */
function blockNextQuote() {
  let release = null
  const promise = new Promise((r) => { release = r })
  const gate = { consumed: { value: false }, release: release, promise: promise }
  hold = gate
  return gate
}

const shell = {
  resolve(spec) { return { command: String((spec && spec.command) || ''), timeoutMs: spec && spec.timeoutMs } },
  run() {
    // DSH 0.2 起 shell 服务没有 run()（改名 execute）：插件若退回旧 API，这里要炸得很响。
    throw new Error('[alerts] shell.run 已不存在（DSH 0.2 起改名 execute）：插件仍在调用旧 API')
  },
  execute(spec) {
    const command = String((spec && spec.command) || '')
    let value
    if (command.indexOf('xueqiu.com/hq') >= 0) {
      stats.seed++
      // 一次性播种成功：ensureCookie 见到 xq_a_token 就 break（不再打第二个 URL）
      value = { exitCode: 0, stdout: { text: 'HTTP/2 200\nset-cookie: xq_a_token=SEED;\nset-cookie: u=42;\n' } }
    } else if (command.indexOf('/v5/stock/batch/quote.json') >= 0) {
      stats.quote++
      if (hold) {
        const gate = hold
        hold = null
        gate.consumed.value = true
        // 0.2：execute 返回句柄，前台执行 = await handle.result()；这里同样把「迟到」做在 result 上
        return { result: () => gate.promise.then(() => ({ exitCode: 0, stdout: { text: quoteBody(price) } })) }
      }
      value = { exitCode: 0, stdout: { text: quoteBody(price) } }
    } else {
      stats.unexpected++
      throw new Error('[alerts] 预期外的 shell 调用: ' + command)
    }
    return { result: async function () { return value } }
  },
}

function makeCtx() {
  const rec = { timers: [], timerStops: [], disposers: [], effects: 0, getNames: [] }
  const provided = { shell: shell, fs: makeFs(), sandboxPolicy: { workspaceRoot: WORK } }
  function effect(fn) {
    rec.effects++
    const dispose = fn()
    if (typeof dispose === 'function') { rec.disposers.push(dispose); return dispose }
    return () => {}
  }
  const ctx = {
    // manualTimers：只登记不触发；触发由测试调 entry.cb()，停止由插件调 stop 函数（entry.live=false）
    timeout(cb, ms) {
      const entry = { cb: cb, ms: ms, live: true }
      rec.timers.push(entry)
      return () => {
        if (!entry.live) return
        entry.live = false
        rec.timerStops.push(ms)
      }
    },
    effect: effect,
    get(name) { rec.getNames.push(name); return provided[name] },
    inject(names, cb) {
      const sub = Object.create(ctx)
      sub.effect = effect
      cb(sub)
    },
    logger: { info() {}, warn() {}, error() {}, debug() {} },
  }
  return { ctx: ctx, rec: rec }
}

const mod = await import(pathToFileURL(path.join(PLUGIN_DIR, 'src', 'index.js')).href)
const plugin = mod.default

async function boot(label) {
  const c = makeCtx()
  const hrec = { channel: null, fn: null }
  globalThis.harness = {
    handle(channel, fn) { hrec.channel = channel; hrec.fn = fn; return () => {} },
    defineTool(spec) { return spec },
    registerTool() { return () => {} },
  }
  try { plugin.apply(c.ctx) } finally { delete globalThis.harness }
  check('[' + label + '] 注册 xq.call 通道（可回收）', hrec.channel === 'xq.call' && typeof hrec.fn === 'function', String(hrec.channel))
  check('[' + label + '] 动态路径不残留 globalThis.harness', typeof globalThis.harness === 'undefined')
  return { ctx: c.ctx, rec: c.rec, call: (payload) => hrec.fn(payload) }
}

/* 定时器 / poll 操作 */

const liveTimers = (rec, ms) => rec.timers.filter((t) => t.live && t.ms === ms)
const livePoll = (rec) => liveTimers(rec, POLL_MS).slice(-1)[0] || null
function fire(entry) { entry.live = false; entry.cb() }
/** 手动跑一轮 watcher；settle 毫秒内 poll 会跑完并（若有规则）挂上下一轮定时器。 */
async function runPoll(rec, settleMs = 120) {
  const t = livePoll(rec)
  if (!t) return false
  fire(t)
  await sleep(settleMs)
  return true
}
const readStore = () => {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) } catch (e) { return null }
}
const writeStore = (store) => fs.writeFileSync(STATE_FILE, JSON.stringify(store))
const alertsGet = async (inst) => {
  const res = await inst.call({ action: 'alerts.get' })
  return res && res.ok === true ? res.data : null
}

const RULE = { symbol: 'SH600519', name: 'SH600519', target: 100, direction: 'above', enabled: true, armed: true }

try {
  /* ---------------------------------------------------------------- *
   * 2. 正常触发 / rearm / 同价再次触发（价格签名判重的回归点）
   * ---------------------------------------------------------------- */
  section('[1] 触发 → rearm → 同价再次触发（不得被价格签名吞掉）')
  writeStore({ rules: [Object.assign({}, RULE)], events: [] })

  const inst1 = await boot('实例1')
  const armed = await waitFor(() => livePoll(inst1.rec) !== null)
  check('持久化规则存在时，install 后自动挂上 30000ms 轮询定时器', armed, 'timers=' + JSON.stringify(inst1.rec.timers.map((t) => t.ms)))
  const got0 = await alertsGet(inst1)
  check('持久化规则被读出来（rules=1）', Boolean(got0) && got0.rules.length === 1 && got0.rules[0].target === 100 && got0.rules[0].direction === 'above', JSON.stringify(got0))

  price = 99
  check('第 1 轮 poll 已执行', await runPoll(inst1.rec))
  check('首报只建立基线：上方规则当前价 99 → 不误触发（events=0）', (await alertsGet(inst1)).events.length === 0)

  price = 101
  await runPoll(inst1.rec)
  const got1 = await alertsGet(inst1)
  check('价 99 → 101 穿越阈值：记录 1 条事件', got1.events.length === 1, JSON.stringify(got1.events))
  check('事件字段完整（symbol/current/target/direction/at）', got1.events.length === 1 && got1.events[0].symbol === 'SH600519' && got1.events[0].current === 101 && got1.events[0].target === 100 && got1.events[0].direction === 'above' && typeof got1.events[0].at === 'string' && got1.events[0].at.length > 0, JSON.stringify(got1.events))
  check('触发后规则落盘为未武装（armed=false）', readStore().rules[0].armed === false, JSON.stringify(readStore().rules))
  check('触发后仍有下一轮定时器（watcher 持续轮询）', livePoll(inst1.rec) !== null)

  price = 98
  await runPoll(inst1.rec)
  check('回到阈值另一侧 → 重新武装且不产生事件（events=1）', (await alertsGet(inst1)).events.length === 1)
  check('rearm 状态已落盘（armed=true）', readStore().rules[0].armed === true, JSON.stringify(readStore().rules))

  price = 101
  await runPoll(inst1.rec)
  const got2 = await alertsGet(inst1)
  const sameSignature = got2.events.length === 2
    && got2.events[0].symbol === got2.events[1].symbol && got2.events[1].current === got2.events[0].current
    && got2.events[1].target === got2.events[0].target && got2.events[1].direction === got2.events[0].direction
  check('rearm 后同价（101/100/above）再次穿越 → 记录第 2 条事件（价格签名判重的回归点）', sameSignature, JSON.stringify(got2.events))
  check('两条事件 current/target/direction 完全相同（正是旧判重键会吞掉的那条）', sameSignature && got2.events[0].current === 101 && got2.events[1].current === 101)
  check('两条事件 id 不同（唯一性由 id 表达，不靠价格签名）', got2.events.length === 2 && got2.events[0].id !== got2.events[1].id, JSON.stringify(got2.events.map((e) => e.id)))
  check('两条事件都已落盘（events=2）', readStore().events.length === 2, JSON.stringify(readStore().events))
  check('4 轮轮询只发了 4 次行情请求 + 1 次 cookie 播种（无多余外呼）', stats.quote === 4 && stats.seed === 1, JSON.stringify(stats))

  /* ---------------------------------------------------------------- *
   * 3. 跨重启：状态迁移 + 不误触发 + 同价再次触发仍成立
   * ---------------------------------------------------------------- */
  section('[2] 跨重启（新实例读同一状态文件）')
  for (const d of inst1.rec.disposers) { try { d() } catch (e) { /* 已回收 */ } }
  check('实例1 effect 回收后不再有存活的轮询定时器', liveTimers(inst1.rec, POLL_MS).length === 0, JSON.stringify(inst1.rec.timers.map((t) => [t.ms, t.live])))

  const before2 = { seed: stats.seed, quote: stats.quote }
  const inst2 = await boot('实例2')
  check('重启后自动重新挂表', await waitFor(() => livePoll(inst2.rec) !== null))
  const r2 = await alertsGet(inst2)
  check('跨重启：规则（armed=false）与 2 条事件都还在', Boolean(r2) && r2.rules.length === 1 && r2.rules[0].armed === false && r2.events.length === 2, JSON.stringify(r2))

  price = 101
  await runPoll(inst2.rec)
  check('重启后首报只建基线：价格仍在上方 → 不误触发、不错误 rearm（events=2）', (await alertsGet(inst2)).events.length === 2)

  price = 99
  await runPoll(inst2.rec)
  check('重启后回到阈值另一侧 → 重新武装（events 仍为 2）', (await alertsGet(inst2)).events.length === 2 && readStore().rules[0].armed === true, JSON.stringify(readStore().rules))

  price = 101
  await runPoll(inst2.rec)
  const r3 = await alertsGet(inst2)
  check('跨重启 rearm 后同价再次穿越 → 记录第 3 条事件', r3.events.length === 3 && r3.events[2].current === 101, JSON.stringify(r3.events))
  check('三条事件 id 互不相同且都已落盘', new Set(r3.events.map((e) => e.id)).size === 3 && readStore().events.length === 3, JSON.stringify(r3.events.map((e) => e.id)))
  check('重启后 3 轮 poll = 3 次行情请求 + 1 次播种（cookie 按实例隔离，各播一次）', stats.quote - before2.quote === 3 && stats.seed - before2.seed === 1, JSON.stringify(stats))

  /* ---------------------------------------------------------------- *
   * 4. 删除最后一条规则 → 立即停表（含在途 poll 竞态）
   * ---------------------------------------------------------------- */
  section('[3] alerts.remove 删空即停表（含在途 poll 竞态）')

  const rm = await inst2.call({ action: 'alerts.remove', args: { symbol: 'SH600519' } })
  check('alerts.remove → ok:true + rules:[]', Boolean(rm) && rm.ok === true && Array.isArray(rm.data.rules) && rm.data.rules.length === 0, JSON.stringify(rm))
  check('删空后没有任何存活的 30000ms 定时器（立即停表，不等落盘）', liveTimers(inst2.rec, POLL_MS).length === 0, JSON.stringify(inst2.rec.timers.map((t) => [t.ms, t.live])))
  check('删空后规则落盘为空（events 保留）', readStore().rules.length === 0 && readStore().events.length === 3, JSON.stringify(readStore()))
  const quoteAfterRemove = stats.quote
  await sleep(150)
  check('停表后递归不再续挂下一轮（静置 150ms 无新定时器）', liveTimers(inst2.rec, POLL_MS).length === 0 && stats.quote === quoteAfterRemove, 'quote=' + stats.quote)

  // 停表不是永久的：重新加规则要能重新起表
  const set = await inst2.call({ action: 'alerts.set', args: { symbol: 'SH600519', target: 100, direction: 'above' } })
  check('重新 alerts.set → ok:true', Boolean(set) && set.ok === true, JSON.stringify(set))
  check('加回规则后重新挂上 30000ms 定时器', liveTimers(inst2.rec, POLL_MS).length === 1, JSON.stringify(inst2.rec.timers.map((t) => [t.ms, t.live])))

  // 竞态：poll 在途（行情请求被挂起）时删空最后一条规则
  const gate = blockNextQuote()
  const raced = livePoll(inst2.rec)
  check('前置：存在可触发的轮询定时器', Boolean(raced))
  fire(raced)
  check('前置：本轮 poll 已进入被挂起的行情请求（确实"在途"）', await waitFor(() => gate.consumed.value), JSON.stringify(stats))
  const rmRace = await inst2.call({ action: 'alerts.remove', args: { symbol: 'SH600519' } })
  check('在途期间 alerts.remove → ok:true + rules:[]', Boolean(rmRace) && rmRace.ok === true && rmRace.data.rules.length === 0, JSON.stringify(rmRace))
  gate.release()
  const quoteAtRelease = stats.quote
  await sleep(200)
  check('在途一轮跑完后不再续挂下一轮（竞态下也停表）', liveTimers(inst2.rec, POLL_MS).length === 0, JSON.stringify(inst2.rec.timers.map((t) => [t.ms, t.live])))
  check('释放后的在途轮不再产生新行情请求，也没有误记事件', stats.quote === quoteAtRelease && readStore().events.length === 3, 'quote=' + stats.quote + ' events=' + readStore().events.length)
  check('删空后的空 store 不再让 watcher 空转（静置无新定时器）', liveTimers(inst2.rec, POLL_MS).length === 0)

  /* ---------------------------------------------------------------- *
   * 5. id 撞车不吃合法事件（跨重启判重只能按 id）
   * ---------------------------------------------------------------- */
  section('[4] 事件 id 与已有事件撞车时，合法事件仍要落盘')

  // eventSeq 重启后从 0 重新计数：新实例在同一毫秒里生成的 id 会与旧事件同形。
  // 把时钟**向前**冷冻（而不是往下调）：新实例只在这一轮 poll 期间看这个值，
  // 请求闸门算出的最小间隔差是负数 → 不会走 ctx.timeout 排队，poll 不会被挂住。
  const FROZEN_NOW = Date.now() + 60000
  const frozenId = 'SH600519-' + FROZEN_NOW + '-1'   // 重新计数会生成的第一个 id
  writeStore({
    rules: [Object.assign({}, RULE)],
    events: [{
      id: frozenId, symbol: 'SH600519', name: 'SH600519',
      current: 101, target: 100, direction: 'above', at: '2026-01-01T00:00:00.000Z',
    }],
  })

  const inst3 = await boot('实例3')
  check('前置：实例3 挂表并读到撞车事件', (await waitFor(() => livePoll(inst3.rec) !== null)) && (await alertsGet(inst3)).events.length === 1)

  price = 99
  await runPoll(inst3.rec)
  price = 101
  const realNow = Date.now
  Date.now = () => FROZEN_NOW
  try {
    await runPoll(inst3.rec)
  } finally {
    Date.now = realNow
  }
  const r4 = await alertsGet(inst3)
  check('时钟与已有事件同一毫秒时，合法事件仍被记录（events=2，不被 id 去重吃掉）', r4.events.length === 2, JSON.stringify(r4.events))
  check('新事件 id 让开撞车（seq 续取为 -2），与已有 id 不同', r4.events.length === 2
    && r4.events.some((e) => e.id === 'SH600519-' + FROZEN_NOW + '-2')
    && new Set(r4.events.map((e) => e.id)).size === 2, JSON.stringify(r4.events.map((e) => e.id)))
  check('两条事件都落盘（重启后 parseStore 按 id 去重不会吃掉合法事件）', readStore().events.length === 2, JSON.stringify(readStore().events))

  for (const d of inst3.rec.disposers) { try { d() } catch (e) { /* 已回收 */ } }

  /* ---------------------------------------------------------------- *
   * 6. 约束：只用 ctx.timeout / ctx.effect，无全局定时器；依赖面不变
   * ---------------------------------------------------------------- */
  section('[5] 约束面')
  const src = fs.readFileSync(path.join(PLUGIN_DIR, 'lib', 'alerts.js'), 'utf8')
  check('alerts.js 只用 ctx.timeout（无 setTimeout/setInterval 全局定时器）',
    src.indexOf('ctx.timeout(') >= 0 && !/(^|[^.\w])setTimeout\s*\(/.test(src) && !/(^|[^.\w])setInterval\s*\(/.test(src))
  check('alerts.js 的定时器挂在 ctx.effect 内（可回收）', src.indexOf('ctx.effect(') >= 0)
  const gotNames = []
  for (const n of inst2.rec.getNames) if (gotNames.indexOf(n) < 0) gotNames.push(n)
  check('ctx.get 依赖面 ⊆ {shell, fs, sandboxPolicy}（没有新增服务依赖）', gotNames.length > 0 && gotNames.every((n) => ['shell', 'fs', 'sandboxPolicy'].indexOf(n) >= 0), JSON.stringify(gotNames))
  check('全程没有预期外的外呼（只有 cookie 播种 + 行情）', stats.unexpected === 0, JSON.stringify(stats))
} catch (e) {
  failures.push('未捕获异常: ' + String((e && e.stack) || e))
  console.log('\n  ✗ 未捕获异常 :: ' + String((e && e.stack) || e))
}

console.log('\n' + '-'.repeat(60))
if (failures.length === 0) console.log('结果：全部通过（' + total + ' 项断言）')
else {
  console.log('结果：' + failures.length + ' 项失败 / 共 ' + total + ' 项断言')
  for (const f of failures) console.log('  ✗ ' + f)
}
console.log('临时产物：' + TMP_ROOT + '（可整目录删除）')
process.exit(failures.length === 0 ? 0 : 1)
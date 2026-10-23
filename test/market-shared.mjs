#!/usr/bin/env node
/**
 * 共享行情层（lib/quotes.js）· 请求闸门（lib/gate.js）· 持仓旧视图保护（client/store/positions.js）
 * 聚焦回归测试 —— 零依赖，虚拟时钟 + 可控 Promise，不依赖真实毫秒差。
 *
 * 运行：node test/market-shared.mjs      （退出码 0=通过）
 *
 * 覆盖（对应 docs/dsh-market-dock-shared-market-plan.md §5 的行为测试清单）：
 *   · [A,B] 与 [B,C] 同一合批窗口只出一次网，各调用方拿自己的顺序与首项 status；
 *   · 10s 缓存命中只补过期项；force 绕开已完成缓存，刷新后普通读复用；
 *   · 20 只分块；部分失败只让受影响调用失败；遗漏代码不伪造报价、调用必结束；
 *   · 登录 generation 切换后旧在途响应不回填；缓存条目有上限；
 *   · 闸门并发上限 2 / 相邻启动间隔 ≥ 100ms（原实现实测 [0,109,0]ms）；
 *   · 持仓「编辑前发出、编辑后才到」的旧刷新不得覆盖修改后的视图（宿主 revision + 客户端守卫）。
 */

import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PLUGIN_DIR = path.resolve(HERE, '..')
const LIB_DIR = path.join(PLUGIN_DIR, 'lib')

let total = 0
const failures = []
function check(name, cond, detail) {
  total++
  if (cond) console.log('  ✓ ' + name + (detail === undefined || detail === '' ? '' : '：' + detail))
  else {
    failures.push(name + (detail ? ' :: ' + detail : ''))
    console.log('  ✗ ' + name + (detail === undefined || detail === '' ? '' : ' :: ' + detail))
  }
}
function section(title) { console.log('\n' + title) }
const settle = (rounds = 4) => new Promise((resolve) => {
  let n = 0
  const step = () => (++n >= rounds ? resolve() : setImmediate(step))
  setImmediate(step)
})

/** 发起一次取行情并推进一个合批窗口（缓存全命中时会立即 resolve，多推进 25ms 无副作用）。 */
async function qcall(q, clock, symbols, opts) {
  const p = q.fetchQuotes(symbols, opts)
  await clock.advance(QUOTE_BATCH_WINDOW_MS)
  return p
}

/* ------------------------------------------------------------------ *
 * 虚拟时钟：Date.now 可推进，ctx.timeout 只登记，由测试显式触发
 * ------------------------------------------------------------------ */
const realNow = Date.now
let fakeNow = 1700000000000
Date.now = () => fakeNow

function makeClock() {
  const timers = []
  let seq = 0
  const ctx = {
    timeout(cb, ms) {
      const entry = { id: ++seq, at: fakeNow + ms, ms: ms, cb: cb, live: true }
      timers.push(entry)
      return function stop() { entry.live = false }
    }
  }
  function due() { return timers.filter((t) => t.live && t.at <= fakeNow) }
  async function runDue() {
    for (let guard = 0; guard < 100; guard++) {
      const list = due()
      if (!list.length) break
      for (const t of list) { t.live = false; t.cb() }
      await settle()
    }
  }
  async function advance(ms) { fakeNow += ms; await runDue() }
  async function drain(stepMs = 10, rounds = 200) {
    for (let i = 0; i < rounds; i++) {
      await runDue()
      const live = timers.filter((t) => t.live)
      if (!live.length) return true
      fakeNow = Math.max(fakeNow, Math.min.apply(null, live.map((t) => t.at)))
    }
    return false
  }
  return { ctx, timers, advance, runDue, drain }
}

const { installQuotes } = await import(pathToFileURL(path.join(LIB_DIR, 'quotes.js')).href)
const { installGate } = await import(pathToFileURL(path.join(LIB_DIR, 'gate.js')).href)
const { QUOTE_BATCH_WINDOW_MS, QUOTE_BATCH_MAX, QUOTE_CACHE_MAX, MIN_GAP_MS, MAX_CONCURRENCY, QUOTE_TTL_MS } =
  await import(pathToFileURL(path.join(LIB_DIR, 'constants.js')).href)

/* ------------------------------------------------------------------ *
 * 假上游：按请求的代码回行情（可脚本化价格 / 遗漏 / 失败 / 挂起）
 * ------------------------------------------------------------------ */
function makeUpstream() {
  const calls = []
  const state = {
    priceOf: function (sym) { return 100 + sym.length },
    statusOf: function (sym) { return sym.charCodeAt(0) % 2 === 0 ? 5 : 6 },
    omit: Object.create(null),           // sym -> true：上游不返回该代码（无效/退市）
    failChunks: Object.create(null),     // 触发失败：包含这些代码的批次 reject
    hold: null,                          // { promise, release }：挂起下一次请求
    delayMs: 0
  }
  function respond(symbols) {
    const items = []
    for (const sym of symbols) {
      if (state.omit[sym]) continue
      items.push({
        quote: { symbol: sym, name: 'N-' + sym, current: state.priceOf(sym), percent: 1.5, last_close: 99 },
        market: { status_id: state.statusOf(sym) }
      })
    }
    return { data: { items: items } }
  }
  const core = {
    ctx: null,
    getJSON(pathname, params, opts) {
      const symbols = String(params.symbol).split(',').filter(Boolean)
      calls.push({ pathname: pathname, symbols: symbols, opts: opts })
      const shouldFail = symbols.some((s) => state.failChunks[s])
      const produce = function () {
        if (shouldFail) return Promise.reject(new Error('upstream failed: ' + symbols.join(',')))
        return Promise.resolve(respond(symbols))
      }
      if (state.hold && !state.hold.used) {
        const hold = state.hold
        hold.used = true
        return hold.promise.then(produce)
      }
      if (state.delayMs > 0) {
        return new Promise((resolve) => { state.holdTimer = setTimeout(resolve, state.delayMs) }).then(produce)
      }
      return produce()
    }
  }
  return { core, calls, state }
}

/* ================================================================== *
 * 1. 合批与在途共享
 * ================================================================== */
section('[1] 同一窗口合批：并集出网，各调用方拿自己的顺序与首项 status')
{
  const clock = makeClock()
  const up = makeUpstream()
  up.core.ctx = clock.ctx
  installQuotes(up.core)
  const q = up.core.quotes

  const p1 = q.fetchQuotes(['A', 'B'])
  const p2 = q.fetchQuotes(['B', 'C'])
  await settle()
  check('窗口未到期时不出网', up.calls.length === 0, 'calls=' + up.calls.length)

  await clock.advance(QUOTE_BATCH_WINDOW_MS)
  const r1 = await p1
  const r2 = await p2
  check('同一窗口内 [A,B] 与 [B,C] 只出一次网', up.calls.length === 1, JSON.stringify(up.calls.map((c) => c.symbols)))
  check('出网并集 = A,B,C（保持首次出现顺序）', up.calls[0].symbols.join(',') === 'A,B,C', up.calls[0].symbols.join(','))
  check('调用方 1 只拿到自己的 A,B 且顺序不变', r1.list.map((x) => x.symbol).join(',') === 'A,B', r1.list.map((x) => x.symbol).join(','))
  check('调用方 2 只拿到自己的 B,C 且顺序不变', r2.list.map((x) => x.symbol).join(',') === 'B,C', r2.list.map((x) => x.symbol).join(','))
  check('status 按调用方自己的首个有效标的取（不被合批/排序改变）',
    r1.status === up.state.statusOf('A') && r2.status === up.state.statusOf('B'),
    'r1=' + r1.status + ' r2=' + r2.status)
  check('在途共享计数：至少一个调用复用了同窗口的请求', q.stats().calls === 2, 'calls=' + q.stats().calls)
}

/* ================================================================== *
 * 2. 缓存命中 / 只补过期项 / force
 * ================================================================== */
section('[2] 10s 缓存：命中不出网、只补过期项、force 绕开已完成缓存')
{
  const clock = makeClock()
  const up = makeUpstream()
  up.core.ctx = clock.ctx
  installQuotes(up.core)
  const q = up.core.quotes

  const a = await qcall(q, clock, ['A', 'B'])
  check('首次读取出网一次', up.calls.length === 1, JSON.stringify(up.calls[0].symbols))
  up.calls.length = 0
  const hit = await qcall(q, clock, ['A', 'B'])
  check('10s 内重复读取完全命中缓存（0 新请求，且不排合批窗口）', up.calls.length === 0, 'calls=' + up.calls.length)
  check('缓存命中返回同样的行情', hit.list[0].current === a.list[0].current, String(hit.list[0].current))

  // 只补过期项：让 A/B 过期（> QUOTE_TTL_MS），C 刚刚取到（仍新鲜）
  await clock.advance(QUOTE_TTL_MS + 1000)
  const pc = q.fetchQuotes(['C'])
  await clock.advance(QUOTE_BATCH_WINDOW_MS)
  await pc
  up.calls.length = 0
  const partial = q.fetchQuotes(['A', 'B', 'C'])
  await clock.advance(QUOTE_BATCH_WINDOW_MS)
  const pr = await partial
  check('只补过期项：C 仍新鲜 → 只对 A,B 出网', up.calls.length === 1 && up.calls[0].symbols.join(',') === 'A,B', JSON.stringify(up.calls.map((c) => c.symbols)))
  check('返回值仍包含全部三个标的（新鲜的 C 来自缓存）', pr.list.map((x) => x.symbol).join(',') === 'A,B,C', pr.list.map((x) => x.symbol).join(','))

  // force：绕开已完成的缓存（即使 1 秒前刚取过）
  up.calls.length = 0
  up.state.priceOf = (sym) => 200 + sym.length
  await clock.advance(1000)
  const forced = q.fetchQuotes(['A'], { force: true })
  await clock.advance(QUOTE_BATCH_WINDOW_MS)
  const fr = await forced
  check('force 绕过已完成的缓存（仍然出网）', up.calls.length === 1, 'calls=' + up.calls.length)
  check('force 拿到的是新价格', fr.list[0].current === 200 + 'A'.length, String(fr.list[0].current))
  up.calls.length = 0
  const afterForce = await qcall(q, clock, ['A'])
  check('force 完成后普通读复用它的结果（0 新请求）', up.calls.length === 0 && afterForce.list[0].current === 200 + 'A'.length, 'current=' + afterForce.list[0].current + ' calls=' + up.calls.length)
}

/* ================================================================== *
 * 3. 分块 / 部分失败 / 遗漏
 * ================================================================== */
section('[3] 20 只分块、部分失败隔离、遗漏代码不伪造报价且调用必结束')
{
  const clock = makeClock()
  const up = makeUpstream()
  up.core.ctx = clock.ctx
  installQuotes(up.core)
  const q = up.core.quotes

  const many = []
  for (let i = 0; i < 25; i++) many.push('S' + (i < 10 ? '0' + i : String(i)))
  const pm = q.fetchQuotes(many)
  await clock.advance(QUOTE_BATCH_WINDOW_MS)
  await pm
  check('25 只拆成 2 批（20 + 5）', up.calls.length === 2 && up.calls[0].symbols.length === QUOTE_BATCH_MAX && up.calls[1].symbols.length === 5,
    JSON.stringify(up.calls.map((c) => c.symbols.length)))
  check('单个批次不超过 20 只', up.calls.every((c) => c.symbols.length <= 20), JSON.stringify(up.calls.map((c) => c.symbols.length)))

  // 部分失败：25 只拆两批，第 2 批（第 21 只起）失败 → 该调用失败，但第 1 批已入缓存
  up.calls.length = 0
  const fresh = []
  for (let i = 0; i < 20; i++) fresh.push('T' + (i < 10 ? '0' + i : String(i)))
  const fresh2 = []
  for (let i = 20; i < 25; i++) fresh2.push('T' + i)
  const all = fresh.concat(fresh2)
  up.state.failChunks.T20 = true
  let rejected = null
  const pf = q.fetchQuotes(all).catch((e) => { rejected = e; return null })
  await clock.advance(QUOTE_BATCH_WINDOW_MS)
  await pf
  check('一批失败 → 受影响的调用 reject（不是静默成功）', rejected instanceof Error, rejected ? rejected.message : 'no error')
  up.state.failChunks.T20 = false
  up.calls.length = 0
  const reuse = await qcall(q, clock, fresh)
  check('失败不影响另一批：已成功的 20 只直接命中缓存（0 新请求）', up.calls.length === 0 && reuse.list.length === 20, 'calls=' + up.calls.length + ' list=' + reuse.list.length)

  // 遗漏：上游不返回该代码
  up.calls.length = 0
  up.state.omit.BAD = true
  const pmiss = q.fetchQuotes(['GOOD', 'BAD'])
  await clock.advance(QUOTE_BATCH_WINDOW_MS)
  const miss = await pmiss
  check('遗漏代码不进 list（不伪造成功报价）', miss.list.map((x) => x.symbol).join(',') === 'GOOD', miss.list.map((x) => x.symbol).join(','))
  check('遗漏代码进入 missing 列表', miss.missing.join(',') === 'BAD', miss.missing.join(','))
  up.calls.length = 0
  const again = await qcall(q, clock, ['BAD'])
  check('遗漏记录有效期内不再为坏代码出网（调用照样结束）', up.calls.length === 0 && again.list.length === 0, 'calls=' + up.calls.length)
  const pforce = q.fetchQuotes(['BAD'], { force: true })
  await clock.advance(QUOTE_BATCH_WINDOW_MS)
  await pforce
  check('force 不受遗漏记录限制（仍会真的问一次上游）', up.calls.length === 1, 'calls=' + up.calls.length)
}

/* ================================================================== *
 * 4. 身份 generation / 缓存上限
 * ================================================================== */
section('[4] 登录 generation 切换：旧在途响应不回填；缓存条目有上限')
{
  const clock = makeClock()
  const up = makeUpstream()
  up.core.ctx = clock.ctx
  installQuotes(up.core)
  const q = up.core.quotes

  await qcall(q, clock, ['A'])
  let release = null
  up.state.hold = { promise: new Promise((resolve) => { release = resolve }), used: false }
  up.state.priceOf = () => 888
  const pending = q.fetchQuotes(['A'], { force: true })
  await clock.advance(QUOTE_BATCH_WINDOW_MS)
  await settle()
  check('前置：旧身份下的请求已在途', up.calls.length === 2, 'calls=' + up.calls.length)
  q.invalidate()
  up.state.hold = null
  up.state.priceOf = () => 111
  release()
  await pending
  up.calls.length = 0
  const after = await qcall(q, clock, ['A'])
  check('切换 generation 后缓存已清空 → 重新出网（旧响应没被当成新鲜数据）', up.calls.length === 1, 'calls=' + up.calls.length)
  check('重新取到的是新身份下的价格', after.list[0].current === 111, String(after.list[0].current))

  // 缓存上限：塞满超过上限的代码，缓存条目数不超过 QUOTE_CACHE_MAX
  const clock2 = makeClock()
  const up2 = makeUpstream()
  up2.core.ctx = clock2.ctx
  installQuotes(up2.core)
  const big = []
  for (let i = 0; i < 1005; i++) big.push('L' + i)
  for (let i = 0; i < big.length; i += 40) {
    const p = up2.core.quotes.fetchQuotes(big.slice(i, i + 40))
    await clock2.advance(QUOTE_BATCH_WINDOW_MS)
    await p
  }
  check('缓存条目有上限（不随 AI 任意查询无界增长）', up2.core.quotes.stats().cacheSize <= QUOTE_CACHE_MAX, 'cacheSize=' + up2.core.quotes.stats().cacheSize)
}

/* ================================================================== *
 * 5. 请求闸门：并发 2 / 启动间隔 ≥ 100ms
 * ================================================================== */
section('[5] 闸门：并发上限与相邻启动间隔（原实现实测 [0,109,0]ms）')
{
  const clock = makeClock()
  const core = { ctx: clock.ctx }
  installGate(core)

  const starts = []
  let running = 0
  let maxRunning = 0
  // 任务体也在虚拟时钟上完成：这样「启动间隔」由调度器决定，不掺真实毫秒
  function task() {
    return core.gate(async function () {
      starts.push(fakeNow)
      running++
      if (running > maxRunning) maxRunning = running
      await new Promise((resolve) => { clock.ctx.timeout(resolve, 50) })
      running--
      return true
    })
  }
  let finished = false
  Promise.all([task(), task(), task(), task()]).then(() => { finished = true }, () => { finished = true })
  for (let i = 0; i < 400 && !finished; i++) { await clock.advance(MIN_GAP_MS); await settle(2) }
  check('4 个任务全部完成（没有死锁）', finished && starts.length === 4, 'starts=' + starts.length)
  const gaps = []
  for (let i = 1; i < starts.length; i++) gaps.push(starts[i] - starts[i - 1])
  check('相邻启动间隔全部 ≥ MIN_GAP_MS（' + MIN_GAP_MS + 'ms）', gaps.every((g) => g >= MIN_GAP_MS), JSON.stringify(gaps))
  check('并发不超过 MAX_CONCURRENCY（' + MAX_CONCURRENCY + '）', maxRunning <= MAX_CONCURRENCY, 'max=' + maxRunning)
  check('调度槽全部释放（running 归零）', core.running === 0, 'running=' + core.running)
}

/* ================================================================== *
 * 6. 持仓旧视图保护：编辑前发出、编辑后才到的刷新不得覆盖修改结果
 * ================================================================== */
section('[6] 持仓：编辑前的旧刷新不得覆盖修改后的视图（宿主 revision + 客户端守卫）')
{
  Date.now = realNow   // 这一节用真实时钟（只比较 revision，不比较时间）

  let getCalls = 0
  let releaseOld = null
  const mkView = (revision, qty) => ({
    configured: true,
    rows: [{ code: '600519', name: '贵州茅台', qty: qty, cost: 1201.3, xq_symbol: 'SH600519', price: 1304.66, prev_close: 1250, day_pct: 4.37, day_profit: 5466, day_rate: 4.3728, value: 1304.66 * qty, cost_value: 1201.3 * qty, hold_profit: 103.36 * qty, hold_rate: 8.6 }],
    totals: { held: 1, missing: 0, value: 1304.66 * qty, cost_value: 1201.3 * qty, day_profit: 5466, day_base: 1250 * qty, day_rate: 4.37, hold_profit: 103.36 * qty, hold_rate: 8.6 },
    updated_at: '2026-10-20T02:00:00.000Z', as_of: '2026-10-20T02:30:00.000Z',
    session: 'after', in_session: false, poll_ms: 30000, next_poll_ms: 60000,
    cloud: null, migrated_from: null, revision: revision
  })

  globalThis.host = {
    call: async function (channel, payload) {
      const action = payload && payload.action
      if (action === 'positions.get') {
        getCalls++
        // 第一次 get 就是「编辑前发出的自动刷新」：挂起，等编辑完成后再返回旧视图
        if (getCalls === 1) {
          const rev = 0
          return new Promise((resolve) => {
            releaseOld = () => resolve({ ok: true, data: mkView(rev, 100) })
          })
        }
        return { ok: true, data: mkView(2, 200) }
      }
      if (action === 'positions.save') return { ok: true, data: mkView(2, 200) }
      return { ok: false, error: 'unexpected action: ' + action }
    }
  }

  const store = await import(pathToFileURL(path.join(PLUGIN_DIR, 'client', 'store', 'positions.js')).href)
  const ctx = { timeout() { return function () {} }, interval() { return function () {} } }
  const rt = store.createPositionsRuntime(ctx)

  const oldRefresh = rt.refresh()          // 编辑前发出的刷新（挂起）
  await settle()
  check('前置：旧刷新已在途', getCalls === 1, 'getCalls=' + getCalls)

  const saved = await rt.save({ code: '600519', qty: 200 })   // 用户改股数
  check('保存返回修改后的股数', saved.rows[0].qty === 200 && saved.revision === 2, 'qty=' + saved.rows[0].qty + ' rev=' + saved.revision)

  releaseOld()                              // 旧刷新这时才返回（rev=0 / qty=100）
  await oldRefresh
  const state = rt.getState()
  check('旧刷新晚到后被丢弃：客户端视图仍是修改后的 200 股', state.data && state.data.rows[0].qty === 200, 'qty=' + (state.data && state.data.rows[0].qty))
  check('视图 revision 没有被旧响应回退', state.data && state.data.revision === 2, 'rev=' + (state.data && state.data.revision))
}

/* ================================================================== *
 * 7. 客户端共享运行时：逐 symbol 迟到保护 / 首屏自选立即取价 / 在途不空转
 * ================================================================== */
section('[7] 客户端共享运行时：逐 symbol 迟到判定、首屏自选立即取价、在途期间不排 0ms 定时器')
{
  // 本节用虚拟时钟（只比较调度，不比较真实毫秒）
  Date.now = () => fakeNow
  const { WATCHLIST_POLL_MS } = await import(pathToFileURL(path.join(PLUGIN_DIR, 'client', 'constants.js')).href)

  /** 假宿主：watchlist.get / quote 可控挂起、可控失败；价格按代码固定。 */
  function makeMarketHost() {
    const calls = []
    const state = { symbols: ['SH600519', 'SZ300750'], gate: null, failWatchlist: false, holdQuote: null, status: 5 }
    globalThis.host = {
      call: async function (channel, payload) {
        const action = payload && payload.action
        const args = (payload && payload.args) || {}
        if (action === 'watchlist.get') {
          calls.push({ action: action, symbols: [] })
          if (state.failWatchlist) throw new Error('watchlist failed')
          if (state.gate) {
            const gate = state.gate
            state.gate = null
            return gate.then(function () { return { ok: true, data: { symbols: state.symbols.slice() } } })
          }
          return { ok: true, data: { symbols: state.symbols.slice() } }
        }
        if (action === 'quote') {
          const asked = String(args.symbols || '').split(',').filter(Boolean)
          calls.push({ action: action, symbols: asked })
          const build = function () {
            return {
              ok: true,
              data: {
                status: state.status,
                list: asked.map(function (sym) { return { symbol: sym, name: 'N-' + sym, current: 100 + sym.length, percent: 1 } })
              }
            }
          }
          if (state.holdQuote) {
            const hold = state.holdQuote
            state.holdQuote = null
            return hold.then(build)
          }
          return build()
        }
        return { ok: false, error: 'unexpected action: ' + action }
      }
    }
    return { calls, state }
  }

  const store = await import(pathToFileURL(path.join(PLUGIN_DIR, 'client', 'store', 'market.js')).href)
  const INDICES = ['SH000001', 'SZ399001']

  // ---- 7a. 互不相交的请求：先发的指数批晚到，不得被后发的自选批丢掉 ----
  {
    const clock = makeClock()
    const host = makeMarketHost()
    const rt = store.createMarketRuntime(clock.ctx)

    let release = null
    host.state.holdQuote = new Promise(function (resolve) { release = resolve })
    const pIndices = rt.refresh(INDICES, { force: true })   // 先发：挂起
    await settle()
    const pWatch = rt.refresh(['SH600519'], { force: true })  // 后发：先回
    await pWatch
    release()                                                 // 指数批这时才回
    await pIndices

    const snap = rt.getSnapshot(INDICES.concat(['SH600519']))
    check('先发后到的指数批仍然生效（全局序号会把它整批丢掉）',
      snap.list.map(function (q) { return q.symbol }).join(',') === 'SH000001,SZ399001,SH600519',
      snap.list.map(function (q) { return q.symbol }).join(','))
    check('逐 symbol 判定不影响「同一代码以新请求为准」：自选那笔的价格仍在',
      snap.list.length === 3 && snap.list[2].current === 100 + 'SH600519'.length,
      String(snap.list[2] && snap.list[2].current))
    rt.destroy()
  }

  // ---- 7b. 同一 symbol 的旧响应仍然要让位给更新的请求 ----
  {
    const clock = makeClock()
    const host = makeMarketHost()
    const rt = store.createMarketRuntime(clock.ctx)

    let release = null
    host.state.holdQuote = new Promise(function (resolve) { release = resolve })
    const pOld = rt.refresh(['SH600519'], { force: true })   // 旧请求：挂起
    await settle()
    await rt.refresh(['SH600519'], { force: true })          // 新请求：立即回（price 立即入缓存）
    const before = rt.getSnapshot(['SH600519']).list[0]
    release()
    await pOld
    const after = rt.getSnapshot(['SH600519']).list[0]
    check('同一代码的过期响应不覆盖新结果', before && after && after.current === before.current,
      'before=' + (before && before.current) + ' after=' + (after && after.current))
    rt.destroy()
  }

  // ---- 7c. 首屏自选：列表还在途 → 不空转；列表一到就立即补取行情 ----
  {
    const clock = makeClock()
    const host = makeMarketHost()
    const rt = store.createMarketRuntime(clock.ctx)

    let release = null
    host.state.gate = new Promise(function (resolve) { release = resolve })
    const callsBefore = host.calls.length
    let notified = 0
    rt.subscribe({ watchlistLimit: 12, needsWatchlist: true, intervalMs: 20000 }, function () { notified++ })
    await settle()

    const liveDuringRead = clock.timers.filter(function (t) { return t.live })
    check('自选列表在途期间不排任何定时器（不会连续排 0ms 空转）', liveDuringRead.length === 0,
      'live=' + liveDuringRead.length + ' at=' + JSON.stringify(liveDuringRead.map(function (t) { return t.at - fakeNow })))

    release()                       // 列表返回
    await settle(8)
    const quoteCalls = host.calls.slice(callsBefore).filter(function (c) { return c.action === 'quote' })
    check('列表返回后立即为自选补取行情（不等下一个 20s/30s 周期）',
      quoteCalls.length === 1 && quoteCalls[0].symbols.join(',') === 'SH600519,SZ300750',
      JSON.stringify(quoteCalls.map(function (c) { return c.symbols.join(','); })))
    check('补取完成后订阅者能拿到行情快照', rt.getSnapshot(host.state.symbols).list.length === 2,
      'list=' + rt.getSnapshot(host.state.symbols).list.length + ' notify=' + notified)

    const liveAfter = clock.timers.filter(function (t) { return t.live })
    check('补取完成后只留一个「按周期」的定时器（20s 后）',
      liveAfter.length === 1 && liveAfter[0].at - fakeNow === 20000,
      JSON.stringify(liveAfter.map(function (t) { return t.at - fakeNow })))
    check('自选列表按 30s 节奏单独排期（不被行情周期覆盖）',
      rt.stats().watchlist === 2, 'watchlist=' + rt.stats().watchlist)
    rt.destroy()
  }

  // ---- 7d. 自选增删后立即按新列表补取（不等 20s） ----
  {
    const clock = makeClock()
    const host = makeMarketHost()
    const rt = store.createMarketRuntime(clock.ctx)
    rt.subscribe({ watchlistLimit: 12, needsWatchlist: true, intervalMs: 20000 }, function () { })
    await settle(8)
    const before = host.calls.length
    rt.applyWatchlist(['SH601318', 'SZ399006'])
    await settle(8)
    const quoteCalls = host.calls.slice(before).filter(function (c) { return c.action === 'quote' })
    check('自选变更后立即为新列表补取行情',
      quoteCalls.length === 1 && quoteCalls[0].symbols.join(',') === 'SH601318,SZ399006',
      JSON.stringify(quoteCalls.map(function (c) { return c.symbols.join(','); })))
    rt.destroy()
  }

  // ---- 7e. 自选读取失败：按 30s 退避，不空转 ----
  {
    const clock = makeClock()
    const host = makeMarketHost()
    host.state.failWatchlist = true
    const rt = store.createMarketRuntime(clock.ctx)
    rt.subscribe({ watchlistLimit: 12, needsWatchlist: true, intervalMs: 20000 }, function () { })
    await settle(8)
    const live = clock.timers.filter(function (t) { return t.live })
    const nextAt = live.length === 1 ? live[0].at - fakeNow : -1
    check('自选读取失败后按周期重排（行情 20s / 列表退避 30s，都不是 0ms 空转）',
      live.length === 1 && nextAt >= 20000 && nextAt <= WATCHLIST_POLL_MS,
      'live=' + live.length + ' next=' + nextAt)
    check('读取失败不把 loading 卡住（在途计数归零）', rt.stats().pending === 0, 'pending=' + rt.stats().pending)
    rt.destroy()
  }

  // ---- 7f. 菜单落点：最后一行下方没空间时向上展开（避免被表格 overflow 裁掉） ----
  {
    const { menuUpward } = await import(pathToFileURL(path.join(PLUGIN_DIR, 'client', 'menu.js')).href)
    const at = function (top, bottom) { return { getBoundingClientRect: function () { return { top: top, bottom: bottom, left: 0, right: 30 } } } }
    check('最后一行（离视口底只剩 10px）→ 菜单向上展开', menuUpward(at(750, 790), 0) === true)
    check('首行（下方还有 660px）→ 菜单保持向下', menuUpward(at(100, 140), 0) === false)
    check('取不到按钮（无 DOM / 空 ref）→ 退回向下，不抛错', menuUpward(null, 0) === false)
  }

  Date.now = realNow
}

/* ------------------------------------------------------------------ */
console.log('\n' + '-'.repeat(60))
if (failures.length) {
  console.log('结果：' + failures.length + ' 项失败 / 共 ' + total + ' 项断言')
  for (const f of failures) console.log('  ✗ ' + f)
  process.exit(1)
}
console.log('全部通过（' + total + ' 项断言）')

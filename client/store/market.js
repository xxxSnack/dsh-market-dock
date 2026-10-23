// 行情取数 + 页面内共享订阅运行时（client 侧）。
//
// 分两层职责（与宿主 lib/quotes.js 对齐）：
//   · 宿主 负责**跨组件/跨页面**的 symbol 级缓存、合批与在途共享（同样的代码只出一次网）；
//   · 这里负责**同一页面内**的调度与广播：面板/徽章/指数条各自订阅自己的代码集合与刷新周期，
//     同一 symbol 按所有活跃订阅里最快的需求取价，一份结果广播给所有订阅者。
//
// 为什么要有客户端这一层：改造前面板、徽章、指数条分别 interval + 各自 fetch，同一只股票在
// 同一时刻会被三个组件各下一次单；走完宿主共享服务后请求虽然能合并，但客户端仍在重复调度与
// 重复渲染。运行时把调度收敛成「一个最近到期的定时器 + 一次并集请求」。
//
// 生命周期：由 client/index.js 的 apply 创建（每次 apply 一份），随 ui/positions 运行时一起重建。
import { call, A_QUOTE, A_WATCHLIST_GET } from '../platform.js'
import { XQ_INDEX_SYMBOLS, WATCHLIST_POLL_MS, MARKET_SOFT_TTL_MS } from '../constants.js'

// ---- 取数封装（对外契约，与改造前同名同参）----
// 批量行情（面板：指数一组、自选一组；徽标：自选前 12 只一组）
export function fetchQuote(symbols, force) { return call(A_QUOTE, { symbols: symbols, force: force === true }) }

// 四大指数（面板指数卡 / 徽标指数区 / 底部指数条共用同一组代码）
export function fetchIndices(force) { return call(A_QUOTE, { symbols: XQ_INDEX_SYMBOLS, force: force === true }) }

// 自选列表（面板 refreshMarket、徽标主体）
export function fetchWatchlist() { return call(A_WATCHLIST_GET, {}) }

// ---- 运行时持有者：每次 apply 一份 ----
let marketRuntime = null

export function getMarketRuntime() { return marketRuntime }

function symbolKey(value) { return String(value == null ? '' : value).trim().toUpperCase() }

function disposer(handle) {
  if (!handle) return null
  if (typeof handle === 'function') return handle
  if (typeof handle.dispose === 'function') return function () { handle.dispose() }
  return null
}

export function createMarketRuntime(ctx) {
  // 重新 apply 时清掉上一份实例：定时器与 visibilitychange 监听都必须跟着走，
  // 否则旧实例会在插件重载后继续用旧 ctx 发请求（与「每次 apply 一份」的生命周期约定冲突）。
  if (marketRuntime && typeof marketRuntime.destroy === 'function') {
    try { marketRuntime.destroy() } catch (e) { /* ignore */ }
  }
  const quotes = new Map()       // SYMBOL -> { quote, at, seq }（seq = 写入它的请求序号）
  const touched = new Map()      // SYMBOL -> 最近一次真实取数时刻（含「上游没返回」的代码）
  const subs = []                // { id, symbols, watchlistLimit, needsWatchlist, intervalMs, dueAt, listener }
  let seed = 0
  let timer = null
  let destroyed = false
  let ticking = false            // 一轮调度（可能含自选列表读取 + 行情请求）是否在途
  let tickSubs = []              // 本轮正在服务的订阅（收尾时给它们推进到期时间）

  let status = null
  let statusSeq = 0              // 写入 status 的请求序号（整批共有的市场状态按「最新请求」为准）
  let error = ''
  let errorSeq = 0
  let receivedAt = 0
  let pending = 0                // 在途取数笔数（loading 由它派生，慢请求不会互相把状态改回「不忙」）

  let reqSeq = 0                 // 请求序号：只用来做**逐 symbol**的迟到判定（见 fetchSymbols）

  let watchlist = null           // string[]（null = 尚未读到）
  let watchlistReadSeq = 0       // 读取序号
  let watchlistAppliedSeq = 0    // 已应用到内存的序号（add/remove/pull 会推进它，让迟到读取作废）
  let watchlistInflight = null
  let watchlistDueAt = 0         // 0 = 有自选消费者时立刻读一次（首次订阅立即读取）
  let watchlistAt = 0

  function hasWatchlistConsumer() {
    for (let i = 0; i < subs.length; i++) if (subs[i].needsWatchlist) return true
    return false
  }

  function symbolsOf(sub) {
    if (Array.isArray(sub.symbols)) return sub.symbols
    if (sub.watchlistLimit > 0) return (watchlist || []).slice(0, sub.watchlistLimit)
    return []
  }

  function notify() {
    const list = subs.slice()
    for (let i = 0; i < list.length; i++) {
      try { list[i].listener() } catch (e) { /* 单个订阅者抛错不影响其他订阅者 */ }
    }
  }

  function snapshotOf(symbols) {
    const out = []
    const list = Array.isArray(symbols) ? symbols : []
    for (let i = 0; i < list.length; i++) {
      const entry = quotes.get(symbolKey(list[i]))
      if (entry) out.push(entry.quote)
    }
    return { list: out, status: status, loading: pending > 0, error: error, receivedAt: receivedAt }
  }

  // 一次真实取数（force=true 时绕开宿主缓存的已完成部分）
  function fetchSymbols(symbols, force) {
    const list = []
    const seen = Object.create(null)
    for (let i = 0; i < symbols.length; i++) {
      const sym = symbolKey(symbols[i])
      if (!sym || seen[sym]) continue
      seen[sym] = true
      list.push(sym)
    }
    if (!list.length) return Promise.resolve(null)
    const my = ++reqSeq
    pending++
    if (!receivedAt) notify()
    let settled = false
    // 每笔请求只结算一次：同一批的 then/catch 都要把 pending 减回去，否则 loading 会永久卡住
    function settle() {
      if (settled) return
      settled = true
      if (pending > 0) pending--
      notify()
    }
    return fetchQuote(list, force === true).then(function (data) {
      if (destroyed) { settle(); return null }
      const at = Date.now()
      const rows = (data && data.list) || []
      for (let i = 0; i < rows.length; i++) {
        const q = rows[i]
        const sym = symbolKey(q && q.symbol)
        if (!sym) continue
        const prev = quotes.get(sym)
        // **逐 symbol** 判定迟到：只有比「写入这只代码的那次请求」更新的请求才能覆盖它。
        // 用全局序号会误伤互不相交的请求 —— 先发的指数批晚到，会被后发的自选批整个丢掉，
        // 表现为「指数卡一直空着，自选却正常」。
        if (prev && prev.seq > my) continue
        quotes.set(sym, { quote: q, at: at, seq: my })
      }
      // 上游没返回的代码也记下取数时刻：无效代码不因此被每一轮反复请求
      for (let i = 0; i < list.length; i++) touched.set(list[i], at)
      // status 是整批共有的市场状态，没有「按 symbol」的概念：取最新那次请求的结果
      if (my >= statusSeq) {
        statusSeq = my
        if (data && data.status !== undefined) status = data.status
      }
      receivedAt = at
      if (my >= errorSeq) { errorSeq = my; error = '' }   // 更早的失败晚到，不覆盖这次成功
      settle()
      return data
    }, function (e) {
      if (destroyed) { settle(); return null }
      // 失败保留旧值（不能把失败伪装成新数据），只把错误交给界面显示
      if (my >= errorSeq) { errorSeq = my; error = String((e && e.message) || e) }
      settle()
      return null
    })
  }

  // ---- 自选列表 ----
  function readWatchlist() {
    if (watchlistInflight) return watchlistInflight
    const my = ++watchlistReadSeq
    const task = fetchWatchlist().then(function (data) {
      if (destroyed) return null
      if (watchlistInflight === task) watchlistInflight = null
      // 更早的读取晚到：不能覆盖已经应用的（add/remove/pull 之后的）列表
      if (my < watchlistAppliedSeq) return null
      watchlistAppliedSeq = my
      watchlist = ((data && data.symbols) || []).slice()
      watchlistAt = Date.now()
      watchlistDueAt = watchlistAt + WATCHLIST_POLL_MS
      notify()
      return watchlist
    }, function () {
      if (destroyed) return null
      if (watchlistInflight === task) watchlistInflight = null
      // 读取失败也按同一节奏退避，避免空转打穿宿主
      watchlistDueAt = Date.now() + WATCHLIST_POLL_MS
      return null
    })
    watchlistInflight = task
    return task
  }

  function applyWatchlist(symbols) {
    watchlist = Array.isArray(symbols) ? symbols.slice() : []
    watchlistAppliedSeq = ++watchlistReadSeq   // 让更早的读取作废
    watchlistAt = Date.now()
    watchlistDueAt = watchlistAt + WATCHLIST_POLL_MS
    notify()
    // 列表刚变（增/删/登录同步）：立刻按新列表补取一遍，不等下一个 20s/30s 周期
    kickDue()
    return watchlist
  }

  // 把「按列表订阅」的订阅者立即置为到期，然后跑一轮调度（只补过期/新增的代码）
  function kickDue() {
    const at = Date.now()
    for (let i = 0; i < subs.length; i++) {
      if (subs[i].watchlistLimit > 0 && subs[i].dueAt > at) subs[i].dueAt = at
    }
    tick()
  }

  // ---- 调度：一个最近到期的定时器 ----
  function clearTimer() {
    if (timer) { try { timer() } catch (e) { /* ignore */ } timer = null }
  }

  function nextDue() {
    let due = Infinity
    for (let i = 0; i < subs.length; i++) if (subs[i].dueAt < due) due = subs[i].dueAt
    if (hasWatchlistConsumer() && watchlistDueAt < due) due = watchlistDueAt
    return due
  }

  function arm() {
    clearTimer()
    // 一轮调度在途时不排新定时器：它的收尾会重排。
    // 否则「自选列表还没返回」时到期时间不前进，会连续排出 0ms 定时器空转。
    if (destroyed || ticking) return
    const due = nextDue()
    if (!isFinite(due)) return
    timer = disposer(ctx.timeout(tick, Math.max(0, due - Date.now())))
  }

  // 每个 symbol 的「最快需求周期」：只由需要它的订阅决定，20s 订阅不会把别人的 30s 股票提到 20s
  function paceOf(symbol) {
    let pace = Infinity
    for (let i = 0; i < subs.length; i++) {
      const sub = subs[i]
      if (sub.intervalMs < pace && symbolsOf(sub).indexOf(symbol) !== -1) pace = sub.intervalMs
    }
    return pace
  }

  // 本轮要真取的代码：并集 + 去掉「刚取过」的
  function collectNeed(dueSubs, at) {
    const need = []
    const seen = Object.create(null)
    for (let i = 0; i < dueSubs.length; i++) {
      const list = symbolsOf(dueSubs[i])
      for (let j = 0; j < list.length; j++) {
        const sym = symbolKey(list[j])
        if (!sym || seen[sym]) continue
        const at2 = touched.get(sym)
        const age = at2 === undefined ? Infinity : at - at2
        // 已有别的组件刚刚取过：不因为新挂载一个组件就重复刷新
        if (age < Math.min(MARKET_SOFT_TTL_MS, paceOf(sym))) continue
        seen[sym] = true
        need.push(sym)
      }
    }
    return need
  }

  function tick() {
    clearTimer()
    if (destroyed || ticking) return
    const at = Date.now()
    const dueSubs = []
    for (let i = 0; i < subs.length; i++) if (subs[i].dueAt <= at) dueSubs.push(subs[i])
    const needList = hasWatchlistConsumer() && watchlistDueAt <= at
    if (!dueSubs.length && !needList) { arm(); return }

    ticking = true
    tickSubs = dueSubs
    // 自选列表还没读到时，先把它读回来再算本轮要取哪些代码：
    // 「列表返回后只通知组件、不补取报价」会让首屏行情白等一个完整周期（20–30s）。
    const prep = (needList && watchlist === null) ? readWatchlist() : Promise.resolve(null)
    prep.then(runTick, runTick).then(finishTick, finishTick)
  }

  function runTick() {
    if (destroyed) return null
    const need = collectNeed(tickSubs, Date.now())
    if (!need.length) return null
    // 请求完成后才排下一次：慢请求不堆积周期任务
    return fetchSymbols(need, false)
  }

  function finishTick() {
    ticking = false
    const serviced = tickSubs
    tickSubs = []
    if (destroyed) return
    const at = Date.now()
    for (let i = 0; i < serviced.length; i++) {
      const sub = serviced[i]
      if (subs.indexOf(sub) === -1) continue   // 期间被注销：不再为它排期
      sub.dueAt = at + sub.intervalMs
    }
    arm()
  }

  // 页面恢复可见：合并成本轮一次补刷（监听器全局只挂一个）
  function onVisibility() {
    if (destroyed) return
    try { if (typeof document !== 'undefined' && document.hidden) return } catch (e) { /* ignore */ }
    const at = Date.now()
    for (let i = 0; i < subs.length; i++) subs[i].dueAt = at
    watchlistDueAt = at
    tick()
  }
  let visibilityBound = false
  function bindVisibility() {
    if (visibilityBound) return
    try {
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('visibilitychange', onVisibility)
        visibilityBound = true
      }
    } catch (e) { /* ignore */ }
  }
  function unbindVisibility() {
    if (!visibilityBound) return
    try { document.removeEventListener('visibilitychange', onVisibility) } catch (e) { /* ignore */ }
    visibilityBound = false
  }

  const rt = {
    ctx: ctx,

    /**
     * 订阅一组行情。
     * @param {{symbols?:string[], watchlistLimit?:number, needsWatchlist?:boolean, intervalMs:number}} opts
     *        symbols：固定代码集合；watchlistLimit>0 时改为「自选前 N 只」（随自选变化）；
     *        needsWatchlist：需要自选列表本身（会按 WATCHLIST_POLL_MS 统一读取）。
     * @param {function} listener 数据变化时回调（读取请用 getSnapshot）
     * @returns {function} unsubscribe
     */
    subscribe: function (opts, listener) {
      const o = opts || {}
      const sub = {
        id: ++seed,
        symbols: Array.isArray(o.symbols) ? o.symbols.slice() : null,
        watchlistLimit: o.watchlistLimit > 0 ? o.watchlistLimit : 0,
        needsWatchlist: o.needsWatchlist === true,
        intervalMs: o.intervalMs > 0 ? o.intervalMs : 30000,
        dueAt: Date.now(),
        listener: listener || function () {}
      }
      subs.push(sub)
      bindVisibility()
      // 已有可用快照时先广播一次快照（不等定时器）
      if (receivedAt || watchlist) sub.listener()
      tick()
      return function () {
        const i = subs.indexOf(sub)
        if (i !== -1) subs.splice(i, 1)
        if (!subs.length) { clearTimer(); unbindVisibility() }
        else arm()
      }
    },

    getSnapshot: snapshotOf,

    // 手动刷新：等待真实完成的 Promise（用户点「刷新」时就该看到新价）
    refresh: function (symbols, opts) {
      return fetchSymbols(Array.isArray(symbols) ? symbols : [], !!(opts && opts.force))
    },

    getWatchlist: function () { return watchlist === null ? null : watchlist.slice() },
    refreshWatchlist: function () { return readWatchlist() },
    applyWatchlist: applyWatchlist,

    // 测试/诊断用：活跃订阅数、当前定时器是否在跑、列表读取是否在途
    stats: function () {
      return {
        subs: subs.map(function (s) { return { id: s.id, symbols: s.symbols ? s.symbols.length : 0, watchlistLimit: s.watchlistLimit, intervalMs: s.intervalMs } }),
        watchlist: watchlist ? watchlist.length : null,
        symbols: quotes.size,
        loading: pending > 0,
        pending: pending,
        ticking: ticking,
        watchlistInflight: watchlistInflight !== null
      }
    },

    destroy: function () {
      destroyed = true
      clearTimer()
      unbindVisibility()
      subs.length = 0
      quotes.clear()
      touched.clear()
    }
  }

  marketRuntime = rt
  return rt
}

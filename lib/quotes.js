// 宿主共享行情服务：按 symbol 缓存 + 短窗口合批 + per-symbol 在途共享。
//
// 为什么要有这一层（而不是继续靠 lib/http.js 的 URL 缓存）：http 的 TTL/在途去重是按**完整 URL**
// 做的，`[A,B]` 与 `[B,C]` 这种「重叠但不是同一个集合」的请求完全无法复用 —— 面板、徽章、指数条、
// 持仓、提醒各刷各的，同一只股票每分钟被取很多次。这里以 symbol 为单位记账：
//
//   · 普通读取命中 symbol 缓存（10s 新鲜度）→ 不出网；
//   · 同窗口（QUOTE_BATCH_WINDOW_MS）内的多个调用求并集，按 20 只一批出网；
//   · 每个 symbol 有自己在途 Promise，多组重叠请求复用同一份工作；
//   · 各调用方只拿到自己请求的标的，并按自己的顺序组装（status 也按自己的原始顺序取首项）。
//
// force 语义（提醒 / 用户点刷新）：跳过调用**开始前**已完成的缓存，但允许共享同窗口或已经启动的
// 真实上游请求（与改造前「在途可复用」一致）；出网时绕开 http 的 URL 缓存，去重由本服务管理。
// force 完成后同一批结果会写回 symbol 缓存，普通读者随后也能拿到它。
//
// 失败语义：一批失败只让**受影响调用**失败；已有成功缓存不清空、也不刷新时间。
// 上游遗漏（无效/退市代码）不能伪造成成功报价，但调用必须结束 —— 记一条 ≤行情 TTL 的遗漏记录，
// 非 force 读取在有效期内直接当「无行情」，force 不受它限制。

import { pickQuote, nz } from './normalize.js'
import { QUOTE_TTL_MS, QUOTE_BATCH_WINDOW_MS, QUOTE_BATCH_MAX, QUOTE_CACHE_MAX, QUOTE_MISS_TTL_MS } from './constants.js'

const QUOTE_SYMBOL_RE = /^[A-Za-z0-9_.]+$/

/** 单个代码的规整：trim + 大写 + 白名单校验。不认的返回空串。 */
export function quoteSymbol(value) {
  const raw = String(value == null ? '' : value).trim().toUpperCase()
  return raw && QUOTE_SYMBOL_RE.test(raw) ? raw : ''
}

/** 调用方代码表 → 去重保序的合法代码；max>0 时截断。 */
export function uniqueQuoteSymbols(list, max) {
  const out = []
  const seen = Object.create(null)
  const arr = Array.isArray(list) ? list : []
  const cap = max > 0 ? max : 0
  for (let i = 0; i < arr.length; i++) {
    const sym = quoteSymbol(arr[i])
    if (!sym || seen[sym]) continue
    seen[sym] = true
    out.push(sym)
    if (cap && out.length >= cap) break
  }
  return out
}

export function installQuotes(core) {
  const ctx = core.ctx

  // symbol -> { quote, marketStatus, fetchedAt, generation }
  const cache = new Map()
  // symbol -> { promise, generation, symbols }
  const inflight = new Map()
  // symbol -> { at, generation }（上游没返回的代码；短期记录，避免每轮都为一个坏代码出网）
  const missed = new Map()

  let generation = 1
  let queue = []            // 等待本轮合批的调用
  let windowScheduled = false
  let windowStop = null

  // 内存计数器：不落盘、不含 Cookie/token，只通过 debug action 提供聚合值。
  const stats = {
    calls: 0,              // fetchQuotes 调用次数（客户端 RPC 侧口径）
    symbolRequests: 0,     // 调用方请求的标的总数（去重后）
    cacheHits: 0,          // 命中已完成缓存
    missedHits: 0,         // 命中遗漏记录
    inflightShared: 0,     // 复用了别人的在途请求
    upstreamBatches: 0,    // 真正发出的上游行情批次数
    upstreamSymbols: 0,    // 真正发给上游的标的数
    failures: 0,           // 失败的批次数
    forceCalls: 0,         // 其中 force 调用次数
    generations: 0         // 内部 generation 切换次数（登录/退出）
  }

  function nowMs() { return Date.now() }
  function freshOf(entry, at) {
    return !!entry && entry.generation === generation && (at - entry.fetchedAt) < QUOTE_TTL_MS
  }

  function clearWindow() {
    if (windowStop) {
      try { windowStop() } catch (e) { /* 已停止 */ }
      windowStop = null
    }
    windowScheduled = false
  }

  function trimCache() {
    if (cache.size <= QUOTE_CACHE_MAX) return
    const at = nowMs()
    // 先清长期不活跃的条目（24h），再按 fetchedAt 最旧逐个淘汰
    for (const pair of Array.from(cache.entries())) {
      if (at - pair[1].fetchedAt > 86400000) cache.delete(pair[0])
    }
    while (cache.size > QUOTE_CACHE_MAX) {
      let oldestKey = null
      let oldestAt = Infinity
      for (const pair of cache) {
        if (pair[1].fetchedAt < oldestAt) { oldestAt = pair[1].fetchedAt; oldestKey = pair[0] }
      }
      if (oldestKey == null) break
      cache.delete(oldestKey)
    }
  }

  function releaseInflight(symbols, holder) {
    for (let i = 0; i < symbols.length; i++) {
      if (inflight.get(symbols[i]) === holder) inflight.delete(symbols[i])
    }
  }

  // 发出一批（≤QUOTE_BATCH_MAX）真实上游请求，并把结果按 symbol 落到缓存 / 遗漏记录。
  // 返回 Map<symbol, {quote, marketStatus}>，只含本批真实拿到的标的。
  function startFetch(symbols) {
    const gen = generation
    stats.upstreamBatches++
    stats.upstreamSymbols += symbols.length
    const promise = core.getJSON('/v5/stock/batch/quote.json', { symbol: symbols.join(',') }, { ttl: 0, bypass: true })
      .then(function (data) {
        const items = (data && data.data && data.data.items) || []
        const got = new Map()
        for (let i = 0; i < items.length; i++) {
          const it = items[i] || {}
          const q = pickQuote(it.quote)
          const sym = q ? quoteSymbol(q.symbol) : ''
          if (!sym) continue
          got.set(sym, { quote: q, marketStatus: nz(it.market ? it.market.status_id : null) })
        }
        // 旧 generation（期间登录/退出过）的响应一律不回填当前缓存
        if (gen === generation) {
          const at = nowMs()
          for (let i = 0; i < symbols.length; i++) {
            const sym = symbols[i]
            const hit = got.get(sym)
            if (hit) {
              cache.set(sym, { quote: hit.quote, marketStatus: hit.marketStatus, fetchedAt: at, generation: gen })
              missed.delete(sym)
            } else {
              missed.set(sym, { at: at, generation: gen })
            }
          }
          trimCache()
        }
        return got
      }, function (error) {
        stats.failures++
        throw error
      })
    const holder = { promise: promise, generation: gen, symbols: symbols }
    for (let i = 0; i < symbols.length; i++) inflight.set(symbols[i], holder)
    promise.then(function () { releaseInflight(symbols, holder) }, function () { releaseInflight(symbols, holder) })
    return holder
  }

  // 把一个调用者依赖的在途工作收齐，再按它自己的代码顺序组装 { status, list }。
  function settleWaiter(waiter) {
    const waits = []
    const seen = Object.create(null)
    for (let i = 0; i < waiter.slots.length; i++) {
      const slot = waiter.slots[i]
      const holder = slot.kind === 'fetch' ? inflight.get(slot.symbol)
        : slot.kind === 'promise' ? slot.holder : null
      if (!holder || seen[slot.symbol]) continue
      seen[slot.symbol] = true
      waits.push(holder.promise)
    }
    Promise.all(waits).then(function (groups) {
      const bySymbol = Object.create(null)
      for (let i = 0; i < groups.length; i++) {
        const got = groups[i]
        if (!got || typeof got.forEach !== 'function') continue
        got.forEach(function (value, key) { bySymbol[key] = value })
      }
      const at = nowMs()
      const list = []
      const missing = []
      let status = null
      let statusTaken = false
      for (let i = 0; i < waiter.symbols.length; i++) {
        const sym = waiter.symbols[i]
        let hit = bySymbol[sym]
        if (!hit) {
          // 只认「刚刚写进来的新鲜缓存」：遗漏记录与过期值都不冒充成功报价
          const entry = cache.get(sym)
          if (freshOf(entry, at)) hit = { quote: entry.quote, marketStatus: entry.marketStatus }
        }
        if (hit && hit.quote) {
          list.push(hit.quote)
          // status 只由「调用方原始有效顺序里的首个有报价标的」决定，不因合批/排序改变
          if (!statusTaken) { statusTaken = true; status = nz(hit.marketStatus) }
        } else {
          missing.push(sym)
        }
      }
      waiter.resolve({ status: status, list: list, symbols: waiter.symbols, missing: missing, force: waiter.force, receivedAt: at })
    }, function (error) {
      waiter.reject(error)
    })
  }

  // 本轮合批：把队列里所有调用者的需求求并集，只为「缺失/过期」的代码出网。
  function flush() {
    clearWindow()
    if (!queue.length) return
    const waiters = queue
    queue = []
    const need = []
    const needSeen = Object.create(null)
    const at = nowMs()

    for (let i = 0; i < waiters.length; i++) {
      const w = waiters[i]
      w.slots = []
      for (let j = 0; j < w.symbols.length; j++) {
        const sym = w.symbols[j]
        const entry = cache.get(sym)
        if (!w.force && freshOf(entry, at)) { stats.cacheHits++; w.slots.push({ symbol: sym, kind: 'cache' }); continue }
        const holder = inflight.get(sym)
        if (holder && holder.generation === generation) {
          stats.inflightShared++
          w.slots.push({ symbol: sym, kind: 'promise', holder: holder })
          continue
        }
        if (!w.force) {
          const miss = missed.get(sym)
          if (miss && miss.generation === generation && (at - miss.at) < QUOTE_MISS_TTL_MS) {
            stats.missedHits++
            w.slots.push({ symbol: sym, kind: 'miss' })
            continue
          }
        }
        if (!needSeen[sym]) { needSeen[sym] = true; need.push(sym) }
        w.slots.push({ symbol: sym, kind: 'fetch' })
      }
    }

    // 单批上限沿用持仓路径已验证的 20 只，不向上游发未经验证的大批量请求
    for (let i = 0; i < need.length; i += QUOTE_BATCH_MAX) {
      startFetch(need.slice(i, i + QUOTE_BATCH_MAX))
    }
    for (let i = 0; i < waiters.length; i++) settleWaiter(waiters[i])
  }

  function enqueue(waiter) {
    queue.push(waiter)
    if (windowScheduled) return
    windowScheduled = true
    let stop = null
    try {
      stop = ctx.timeout(function () { windowStop = null; flush() }, QUOTE_BATCH_WINDOW_MS)
    } catch (e) { stop = null }
    windowStop = typeof stop === 'function' ? stop : null
    if (!windowStop) {
      // 宿主 timeout 不可用（返回空/抛错）时不能把调用挂死：退化为微任务合批，同一 tick 仍会合并。
      windowScheduled = true
      Promise.resolve().then(function () { if (queue.length) flush() })
    }
  }

  /**
   * 取行情。返回 { status, list, symbols, missing, force, receivedAt }。
   * @param {string[]} symbols 调用方代码表（原样，可含重复/非法项）
   * @param {{force?:boolean}} [opts]
   */
  function fetchQuotes(symbols, opts) {
    const list = uniqueQuoteSymbols(symbols, 0)
    const force = !!(opts && opts.force)
    stats.calls++
    stats.symbolRequests += list.length
    if (force) stats.forceCalls++
    if (!list.length) return Promise.resolve({ status: null, list: [], symbols: [], missing: [], force: force, receivedAt: nowMs() })
    // 快路径：全部命中已完成的缓存时不排合批窗口（常规读取不该多等一个窗口）
    if (!force) {
      const at = nowMs()
      const hitList = []
      let status = null
      let statusTaken = false
      let allFresh = true
      for (let i = 0; i < list.length; i++) {
        const entry = cache.get(list[i])
        if (!freshOf(entry, at)) { allFresh = false; break }
        hitList.push(entry.quote)
        if (!statusTaken) { statusTaken = true; status = nz(entry.marketStatus) }
      }
      if (allFresh) {
        stats.cacheHits++
        return Promise.resolve({ status: status, list: hitList, symbols: list, missing: [], force: false, receivedAt: at })
      }
    }
    return new Promise(function (resolve, reject) {
      enqueue({ symbols: list, force: force, resolve: resolve, reject: reject, slots: null })
    })
  }

  // 登录/退出/换 Cookie：换 generation。旧 generation 的在途响应不会回填当前缓存。
  function invalidate() {
    generation++
    stats.generations++
    cache.clear()
    missed.clear()
    for (const pair of Array.from(inflight.entries())) {
      if (pair[1].generation !== generation) inflight.delete(pair[0])
    }
  }

  function snapshot() {
    return {
      calls: stats.calls, symbolRequests: stats.symbolRequests, cacheHits: stats.cacheHits,
      missedHits: stats.missedHits, inflightShared: stats.inflightShared,
      upstreamBatches: stats.upstreamBatches, upstreamSymbols: stats.upstreamSymbols,
      failures: stats.failures, forceCalls: stats.forceCalls, generations: stats.generations,
      cacheSize: cache.size, inflightSize: inflight.size, missedSize: missed.size
    }
  }

  core.quotes = { fetchQuotes: fetchQuotes, invalidate: invalidate, stats: snapshot, generation: function () { return generation } }
}

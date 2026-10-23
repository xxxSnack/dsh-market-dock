// 持久化价格提醒：规则/事件状态、RPC 动作与宿主轮询 watcher。
// 只依赖 core 的状态文件与行情接口；不使用浏览器可见性、全局定时器或 fetch。

import { ALERT_POLL_MS, ALERT_MAX_POLL_MS, ALERT_MAX_RULES, ALERT_MAX_EVENTS, ALERT_MAX_SYMBOL_LEN, ALERT_MAX_NAME_LEN } from './constants.js'

export function installAlerts(core) {
  const ctx = core.ctx
  const ALERT_FILE = '.xueqiu-alerts.json'
  const symbolRe = /^[A-Za-z0-9_.]+$/
  let writeTail = Promise.resolve()
  let previous = Object.create(null)
  let eventSeq = 0
  let timerStop = null
  let schedulerAlive = true
  let watcherArmed = false
  let pollInflight = null
  let pollDelay = ALERT_POLL_MS

  function emptyStore() { return { rules: [], events: [] } }

  function validSymbol(value) {
    const symbol = String(value == null ? '' : value).trim()
    return symbol && symbol.length <= ALERT_MAX_SYMBOL_LEN && symbolRe.test(symbol) ? symbol : ''
  }

  function finitePositive(value) {
    const n = typeof value === 'number' && Number.isFinite(value) ? value : Number(value)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  function safeName(value, fallback) {
    const name = String(value == null ? '' : value).trim()
    return (name || fallback).slice(0, ALERT_MAX_NAME_LEN)
  }

  function copyRule(rule) {
    return {
      symbol: rule.symbol, name: rule.name, target: rule.target,
      direction: rule.direction, enabled: rule.enabled, armed: rule.armed
    }
  }

  function copyEvent(event) {
    return {
      id: event.id, symbol: event.symbol, name: event.name,
      current: event.current, target: event.target,
      direction: event.direction, at: event.at
    }
  }

  // 事件身份只由唯一 id 表达：**禁止**按 (symbol, direction, target, current) 判重 ——
  // 触发后 rearm、价格再次穿越同一价位是合法事件，按价格签名抑制会把它吞掉。
  // 这里只保证新 id 不与 store 里已有事件冲突：eventSeq 重启后从 0 重新计数，
  // 理论上可能与旧 id 撞车，而 parseStore 的 id 去重会把撞车的那条当成重复事件丢弃。
  function nextEventId(store, symbol) {
    const stamp = Date.now()
    let id = ''
    do {
      eventSeq = (eventSeq + 1) % 1000000
      id = symbol + '-' + stamp + '-' + eventSeq
    } while (store.events.some(function (event) { return event.id === id }))
    return id
  }

  // 读取时严格规整，损坏、超量或字段异常只会退回安全子集。
  function parseStore(text) {
    const out = emptyStore()
    if (typeof text !== 'string' || !text) return out
    let parsed
    try { parsed = JSON.parse(text) } catch (e) { return out }
    if (!parsed || typeof parsed !== 'object') return out

    const seen = Object.create(null)
    if (Array.isArray(parsed.rules)) {
      for (let i = 0; i < parsed.rules.length && out.rules.length < ALERT_MAX_RULES; i++) {
        const raw = parsed.rules[i]
        if (!raw || typeof raw !== 'object') continue
        const symbol = validSymbol(raw.symbol)
        const target = finitePositive(raw.target)
        const direction = raw.direction === 'above' || raw.direction === 'below' ? raw.direction : ''
        if (!symbol || target === null || !direction || seen[symbol]) continue
        seen[symbol] = true
        out.rules.push({
          symbol: symbol,
          name: safeName(raw.name, symbol),
          target: target,
          direction: direction,
          enabled: raw.enabled !== false,
          armed: raw.armed !== false
        })
      }
    }

    const eventIds = Object.create(null)
    if (Array.isArray(parsed.events)) {
      for (let i = 0; i < parsed.events.length && out.events.length < ALERT_MAX_EVENTS; i++) {
        const raw = parsed.events[i]
        if (!raw || typeof raw !== 'object') continue
        const id = String(raw.id == null ? '' : raw.id).slice(0, 200)
        const symbol = validSymbol(raw.symbol)
        const current = finitePositive(raw.current)
        const target = finitePositive(raw.target)
        const direction = raw.direction === 'above' || raw.direction === 'below' ? raw.direction : ''
        const at = typeof raw.at === 'string' && raw.at.length <= 80 ? raw.at : ''
        if (!id || !symbol || current === null || target === null || !direction || !at || eventIds[id]) continue
        eventIds[id] = true
        out.events.push({
          id: id, symbol: symbol, name: safeName(raw.name, symbol),
          current: current, target: target, direction: direction, at: at
        })
      }
    }
    return out
  }

  async function loadStore() {
    if (core.alertStore) return core.alertStore
    if (core.alertStoreLoad) return core.alertStoreLoad
    core.alertStoreLoad = (async function () {
      const fs = ctx.get('fs')
      const sp = ctx.get('sandboxPolicy')
      const root = sp && sp.workspaceRoot ? sp.workspaceRoot : null
      let text = null
      if (fs) {
        try { text = await core.stateRead(ALERT_FILE, fs, root) } catch (e) { text = null }
      }
      core.alertStore = parseStore(text)
      return core.alertStore
    })()
    try { return await core.alertStoreLoad } finally { core.alertStoreLoad = null }
  }

  // 写入串行化；每次排队时捕获快照，避免并发 action/watcher 交叉覆盖。
  function persist() {
    const snapshot = JSON.stringify(core.alertStore || emptyStore())
    const task = writeTail.catch(function () {}).then(async function () {
      const fs = ctx.get('fs')
      if (!fs) return
      const sp = ctx.get('sandboxPolicy')
      const root = sp && sp.workspaceRoot ? sp.workspaceRoot : null
      try { await core.stateWrite(ALERT_FILE, snapshot, fs, root) } catch (e) { /* 沙箱不可写时保持内存态 */ }
    })
    writeTail = task
    return task
  }

  async function actAlertsGet() {
    const store = await loadStore()
    return { rules: store.rules.map(copyRule), events: store.events.map(copyEvent) }
  }

  async function actAlertsSet(args) {
    const a = args && typeof args === 'object' ? args : {}
    const symbol = validSymbol(a.symbol)
    if (!symbol) throw new Error('无效代码: ' + String(a.symbol == null ? '' : a.symbol))
    const target = finitePositive(a.target)
    if (target === null) throw new Error('target 必须是有限正数')
    if (a.direction !== 'above' && a.direction !== 'below') throw new Error('direction 只能是 above 或 below')
    if (a.enabled !== undefined && typeof a.enabled !== 'boolean') throw new Error('enabled 必须是布尔值')
    const store = await loadStore()
    let rule = store.rules.find(function (item) { return item.symbol === symbol })
    if (!rule) {
      if (store.rules.length >= ALERT_MAX_RULES) throw new Error('提醒规则数量已达上限')
      rule = { symbol: symbol, name: symbol, target: target, direction: a.direction, enabled: a.enabled !== false, armed: true }
      store.rules.push(rule)
    } else {
      rule.target = target
      rule.direction = a.direction
      rule.enabled = a.enabled !== false
      rule.armed = true
    }
    // 规则更新后重新建立该标的基线，避免新阈值被旧价格误判。
    delete previous[symbol]
    await persist()
    if (schedulerAlive && !watcherArmed) arm(ALERT_POLL_MS)
    return { rules: store.rules.map(copyRule) }
  }

  async function actAlertsRemove(args) {
    const a = args && typeof args === 'object' ? args : {}
    const symbol = validSymbol(a.symbol)
    if (!symbol) throw new Error('无效代码: ' + String(a.symbol == null ? '' : a.symbol))
    const store = await loadStore()
    store.rules = store.rules.filter(function (rule) { return rule.symbol !== symbol })
    delete previous[symbol]
    // 删空即停表，不等 persist 落盘：否则 IO 窗口里 watcher 还会多跑一轮空轮询，
    // 停表也得靠 wake 的兜底才生效。规则还在时保持原有节奏不变。
    if (!store.rules.length) stopTimer()
    await persist()
    return { rules: store.rules.map(copyRule) }
  }

  async function actAlertsAck(args) {
    const a = args && typeof args === 'object' ? args : {}
    const ids = Array.isArray(a.ids) ? a.ids.map(function (id) { return String(id == null ? '' : id) }).filter(Boolean).slice(0, ALERT_MAX_EVENTS) : []
    const store = await loadStore()
    if (ids.length) {
      store.events = store.events.filter(function (event) { return ids.indexOf(event.id) === -1 })
      await persist()
    }
    return { events: store.events.map(copyEvent) }
  }

  function warn(error) {
    try {
      if (ctx.logger && typeof ctx.logger.warn === 'function') ctx.logger.warn(error instanceof Error ? error : new Error(String(error)))
    } catch (e) { /* 日志失败不影响 watcher */ }
  }

  function stopOf(disposable) {
    if (typeof disposable === 'function') return disposable
    if (disposable && typeof disposable.dispose === 'function') return function () { disposable.dispose() }
    return function () {}
  }

  function stopTimer() {
    if (timerStop) {
      try { timerStop() } catch (e) { /* 已停止 */ }
      timerStop = null
    }
    watcherArmed = false
  }

  function arm(ms) {
    if (!schedulerAlive) return
    stopTimer()
    watcherArmed = true
    timerStop = stopOf(ctx.timeout(function () { wake().catch(warn) }, ms))
  }

  // 是否还需要继续轮询：store 已加载且规则为空 → 停表；store 尚未加载出来 → 继续（等规则被读出来）。
  function shouldKeepPolling() {
    if (!schedulerAlive) return false
    if (!core.alertStore) return true
    return core.alertStore.rules.length > 0
  }

  // watcher 唯一的重挂点：所有分支都经由这里，所以「最后一条规则被删掉」之后
  // 不会再被任何在途 poll 续命（旧实现的三段 if/else 链在 pollInflight 分支上会漏掉这条判断）。
  function scheduleNext() {
    if (shouldKeepPolling()) arm(pollDelay)
    else stopTimer()
  }

  async function pollOnce() {
    const store = await loadStore()
    if (!store.rules.length) return
    // 只请求规则标的：不再夹带整份自选（改造前为了「顺手刷新」把自选并进来，实际只是白白放大外呼）。
    // force 保持既有语义：不读陈旧价格，合批窗口带来的额外等待只有约一个窗口。
    const symbols = []
    for (let i = 0; i < store.rules.length; i++) {
      const sym = validSymbol(store.rules[i].symbol)
      if (sym && symbols.indexOf(sym) === -1) symbols.push(sym)
    }
    if (!symbols.length) return
    const quoted = await core.actQuote({ symbols: symbols, force: true })
    const items = quoted && Array.isArray(quoted.list) ? quoted.list : []
    const bySymbol = Object.create(null)
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const symbol = validSymbol(item && item.symbol)
      const current = finitePositive(item && item.current)
      if (symbol && current !== null) bySymbol[symbol] = { current: current, name: safeName(item.name, symbol) }
    }

    let dirty = false
    const now = new Date().toISOString()
    for (let i = 0; i < store.rules.length; i++) {
      const rule = store.rules[i]
      const quote = bySymbol[rule.symbol]
      if (!quote) continue
      if (quote.name !== rule.name) { rule.name = quote.name; dirty = true }
      const prev = previous[rule.symbol]
      previous[rule.symbol] = quote.current
      if (!rule.enabled) continue
      if (!rule.armed) {
        // 触发后，回到阈值另一侧才重新武装。
        if ((rule.direction === 'above' && quote.current < rule.target) || (rule.direction === 'below' && quote.current > rule.target)) {
          rule.armed = true
          dirty = true
        }
        continue
      }
      // 首次有效报价只建立基线，禁止启动时误触发。
      if (!Number.isFinite(prev)) continue
      const crossed = rule.direction === 'above'
        ? prev < rule.target && quote.current >= rule.target
        : prev > rule.target && quote.current <= rule.target
      if (!crossed) continue
      // 每次穿越都记录一条事件（同价再次穿越也算）—— 唯一性由 nextEventId 保证，不按价格签名抑制。
      store.events.push({
        id: nextEventId(store, rule.symbol),
        symbol: rule.symbol, name: rule.name, current: quote.current,
        target: rule.target, direction: rule.direction, at: now
      })
      if (store.events.length > ALERT_MAX_EVENTS) store.events = store.events.slice(-ALERT_MAX_EVENTS)
      rule.armed = false
      dirty = true
    }
    if (dirty) await persist()
  }

  async function wake() {
    timerStop = null
    if (!schedulerAlive) return
    if (pollInflight) { scheduleNext(); return }
    const task = pollOnce()
    pollInflight = task
    try {
      await task
      pollDelay = ALERT_POLL_MS
    } catch (e) {
      warn(e)
      pollDelay = Math.min(ALERT_MAX_POLL_MS, Math.max(ALERT_POLL_MS, pollDelay * 2))
    } finally {
      if (pollInflight === task) pollInflight = null
      // 以 store 现状决定是否续挂下一轮：删空规则后在途的这一轮跑完就停表，不会自我续命。
      scheduleNext()
    }
  }

  core.alertStore = null
  core.alertStoreLoad = null
  core.actAlertsGet = actAlertsGet
  core.actAlertsSet = actAlertsSet
  core.actAlertsRemove = actAlertsRemove
  core.actAlertsAck = actAlertsAck

  ctx.effect(function () {
    schedulerAlive = true
    // 无规则时不做空轮询；已有持久化规则则在异步加载完成后启动。
    loadStore().then(function (store) {
      if (schedulerAlive && store.rules.length && !watcherArmed) arm(ALERT_POLL_MS)
    }, function (error) {
      warn(error)
      // 初始读失败也要继续尝试，不能让 watcher 因一次沙箱/IO 抖动永久停止。
      if (schedulerAlive) arm(ALERT_POLL_MS)
    })
    return function () {
      schedulerAlive = false
      stopTimer()
      // cleanup 只停止当前 timer；wake 的 finally 看到 schedulerAlive=false 后不会重新挂起。
    }
  }, 'market-dock: 价格提醒 watcher')
}

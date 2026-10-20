// 本地持仓 + 当日盈亏：**唯一数据源**（运行时持有者 + 单一轮询器）。
//
// 数据流：宿主持有 positions.json（主数据）并负责「持仓 × 雪球行情」的现算，
// 客户端只做三件事：按节奏取视图、把编辑动作发下去、把结果广播给订阅者。
//
// 与改造前 store/pnl.js 的差别（这次重构的核心）：
//   · 打的是宿主**本地**持仓 + 行情，不碰账本 —— 账本 Cookie 废了也不影响实时数字；
//   · 账本只在用户点「从账本同步」时被调用一次（sync()，不参与轮询）；
//   · 仍然只有一个轮询器：头部 chip、底部指数条、两个 tab 同时挂着也只有一份数据、一份请求。
//
// 为什么是「运行时持有者」而不是模块级单例：状态必须每次 apply 一份，模块级单例会在重新 apply
// 时残留旧状态、多实例互相串数据。createPositionsRuntime(ctx) 由 client/index.js 的 apply 重建。
import { call, A_POSITIONS_GET, A_POSITIONS_SAVE, A_POSITIONS_REMOVE, A_POSITIONS_SYNC } from '../platform.js'
import { pageHidden } from '../dom.js'
import { POSITIONS_POLL_FALLBACK_MS } from '../constants.js'

let positionsRuntime = null

export function getPositionsRuntime() { return positionsRuntime }

export function createPositionsRuntime(ctx) {
  const listeners = []

  // 定时器句柄归一化：ctx.timeout 可能返回 stop 函数，也可能返回带 dispose() 的对象。
  function disposer(handle) {
    if (!handle) return null
    if (typeof handle === 'function') return handle
    if (typeof handle.dispose === 'function') return function () { handle.dispose() }
    return null
  }

  // 宿主给的节奏不可信时（缺字段 / 过密）一律回退 30 秒：宁可慢，也不能把行情打穿。
  function hostDelay(data) {
    const ms = Number(data && data.next_poll_ms)
    if (!isFinite(ms) || ms < 5000) return POSITIONS_POLL_FALLBACK_MS
    return ms
  }

  const rt = {
    ctx: ctx,
    data: null,                    // 最近一次 positions.get 的返回对象（宿主现算的视图）
    status: 'idle',                // 'idle' | 'loading' | 'ready' | 'error'
    error: '',
    listeners: listeners,
    timer: null,                   // 当前排定的下一次刷新（归一化后的 stop 函数）
    inflight: null,                // 并发去重：多处同时触发时复用同一个 promise
    refs: 0,
    active: false,
    delay: POSITIONS_POLL_FALLBACK_MS,
    visibilityBound: false,

    subscribe: function (fn) {
      listeners.push(fn)
      rt.start()
      return function () {
        const i = listeners.indexOf(fn)
        if (i !== -1) listeners.splice(i, 1)
        rt.stop()
      }
    },

    // 每次返回**新对象**：组件用 useState 存它时靠引用比较判断是否变化。
    getState: function () {
      return { data: rt.data, status: rt.status, error: rt.error }
    },

    notify: function () {
      const fns = listeners.slice()
      for (let i = 0; i < fns.length; i++) {
        try { fns[i]() } catch (e) { /* 单个订阅者抛错不影响其他订阅者 */ }
      }
    },

    // force=true 绕过行情 10 秒缓存（用户点「刷新」/「立即同步」时用）。
    refresh: function (force) {
      if (rt.inflight) return rt.inflight
      if (rt.data === null) { rt.status = 'loading'; rt.notify() }
      const p = call(A_POSITIONS_GET, force ? { force: true } : {}).then(function (data) {
        rt.data = data || null
        rt.status = 'ready'
        rt.error = ''
        rt.inflight = null
        rt.notify()
        return rt.data
      }).catch(function (e) {
        rt.status = 'error'
        rt.error = String((e && e.message) || e)
        rt.inflight = null
        rt.notify()
        return null   // 吞掉拒绝：轮询链不能产生未处理的 Promise 拒绝
      })
      rt.inflight = p
      return p
    },

    // ---- 编辑动作（宿主落盘后会回传新视图，直接替换本地数据，省掉一次往返）----
    save: function (row, originalCode) {
      const args = { row: row }
      if (originalCode) args.originalCode = originalCode
      return call(A_POSITIONS_SAVE, args).then(function (data) {
        rt.data = data
        rt.status = 'ready'
        rt.error = ''
        rt.notify()
        return data
      })
    },
    remove: function (code) {
      return call(A_POSITIONS_REMOVE, { code: code }).then(function (data) {
        rt.data = data
        rt.status = 'ready'
        rt.error = ''
        rt.notify()
        return data
      })
    },

    // 从账本同步（**唯一**会请求账本的入口，只在用户点击时调用）。
    // 返回 { ok, report, error, view }；失败时 view 仍是最新本地视图（持仓不受影响）。
    sync: function (mode) {
      return call(A_POSITIONS_SYNC, mode ? { mode: mode } : {}).then(function (res) {
        if (res && res.view) {
          rt.data = res.view
          rt.status = 'ready'
          rt.notify()
        }
        return res
      })
    },

    start: function () {
      rt.refs++
      if (rt.refs !== 1) return   // 已有轮询器在跑，chip 与各 tab 共享它
      rt.active = true
      bindVisibility()
      cycle()
    },

    stop: function () {
      rt.refs--
      if (rt.refs > 0) return
      rt.refs = 0
      rt.active = false
      unbindVisibility()
      if (rt.timer) { try { rt.timer() } catch (e) { /* ignore */ } rt.timer = null }
    }
  }

  function arm(ms) {
    if (rt.timer) { try { rt.timer() } catch (e) { /* ignore */ } rt.timer = null }
    rt.delay = ms
    rt.timer = disposer(ctx.timeout(cycle, ms))
  }

  // 页面从后台恢复时不要等完上一次「盘外长睡」：浏览器可能暂停/钳制定时器，
  // 正好会错过 09:30 开盘或把收盘状态留在屏幕上。可见性恢复立即走一次宿主判定，
  // 宿主会按北京时间决定是否真的去取行情。
  function onVisibility() {
    if (!rt.active || pageHidden()) return
    if (rt.timer) { try { rt.timer() } catch (e) { /* ignore */ } rt.timer = null }
    cycle()
  }
  function bindVisibility() {
    if (rt.visibilityBound) return
    try {
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('visibilitychange', onVisibility)
        rt.visibilityBound = true
      }
    } catch (e) { /* ignore */ }
  }
  function unbindVisibility() {
    if (!rt.visibilityBound) return
    try { document.removeEventListener('visibilitychange', onVisibility) } catch (e) { /* ignore */ }
    rt.visibilityBound = false
  }

  // 一次「取数 → 按宿主给的节奏重排」。
  // 页面隐藏时跳过请求但**照旧等这么久**：重排更密没有意义（页面不可见），
  // 重排更疏又会让回到前台的第一屏变旧。
  function cycle() {
    if (!rt.active) return
    if (pageHidden()) { arm(Math.max(rt.delay, POSITIONS_POLL_FALLBACK_MS)); return }
    rt.refresh().then(function () {
      if (!rt.active) return
      arm(rt.status === 'error' ? POSITIONS_POLL_FALLBACK_MS : hostDelay(rt.data))
    })
  }

  positionsRuntime = rt
  return rt
}

/**
 * 订阅持仓视图（chip / 两个 tab / 底部指数条共用）。
 *
 * 放在 store 里而不是某个面板文件里：它现在是「全局唯一数据源」的读入口，
 * 任何组件都不该自己再造一个轮询器（改造前 chip 与 tab 各轮一次就打两遍上游）。
 */
export function usePositionsState() {
  const [state, setState] = React.useState(function () {
    const rt = getPositionsRuntime()
    return rt ? rt.getState() : { data: null, status: 'idle', error: '' }
  })
  React.useEffect(function () {
    const rt = getPositionsRuntime()
    if (!rt) return function () { }
    setState(rt.getState())   // 订阅前可能已经有数据（另一个订阅者先拉到了）
    return rt.subscribe(function () { setState(rt.getState()) })
  }, [])
  return state
}

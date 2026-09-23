// 今日盈亏共享状态：运行时持有者（与 store/ui.js 同构）+ **单一轮询器**。
//
// 为什么是「运行时持有者」而不是模块级单例：状态必须每次 apply 一份，模块级单例会在重新 apply
// 时残留旧状态、多实例互相串数据。createPnlRuntime(ctx) 由 client/index.js 的 apply 重建。
//
// 为什么只有一个轮询器：头部 chip 与「盈亏」tab 展示的是**同一份**今日盈亏快照。若两边各轮一次，
// 同一时刻会打两次同花顺上游（有风控，且两边数值可能不一致）。所以取数只发生在这里：
// 订阅者只读 getState()，轮询由引用计数驱动 —— 第一个订阅者启动、最后一个退订停止。
//
// 轮询节奏**由宿主决定**（pnl.get 回传 next_poll_ms）：盘中是心跳，盘外是「睡到下一个 09:30/15:00」。
// 因此非交易时段界面自然冻结在最后一次的值，客户端不需要自己判断交易时段。
import { call, A_PNL_GET } from '../platform.js'
import { pageHidden } from '../dom.js'
import { PNL_POLL_FALLBACK_MS } from '../constants.js'

// 当前 apply 的运行时（每次 apply 一份）；组件渲染时经 getPnlRuntime() 取。
let pnlRuntime = null

export function getPnlRuntime() { return pnlRuntime }

export function createPnlRuntime(ctx) {
  const listeners = []

  // 定时器句柄归一化：ctx.timeout 可能返回 stop 函数，也可能返回带 dispose() 的对象。
  function disposer(handle) {
    if (!handle) return null
    if (typeof handle === 'function') return handle
    if (typeof handle.dispose === 'function') return function () { handle.dispose() }
    return null
  }

  // 宿主给的节奏不可信时（缺字段 / 过密）一律回退 60s：宁可慢，也不能把上游打穿。
  function hostDelay(data) {
    const ms = Number(data && data.next_poll_ms)
    if (!isFinite(ms) || ms < 5000) return PNL_POLL_FALLBACK_MS
    return ms
  }

  const rt = {
    ctx: ctx,
    data: null,                    // 最近一次 pnl.get 的返回对象
    status: 'idle',                // 'idle' | 'loading' | 'ready' | 'error'
    error: '',
    listeners: listeners,
    timer: null,                   // 当前排定的下一次轮询（归一化后的 stop 函数）
    inflight: null,                // 并发去重：多处同时触发时复用同一个 promise
    refs: 0,                       // 订阅者引用计数
    active: false,
    delay: PNL_POLL_FALLBACK_MS,   // 上次排定的间隔（页面隐藏时按它重排，不会排出更密的节奏）

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

    // force=true 透传给宿主：跳过它的时段缓存判定、立刻打一次上游（「立即刷新」按钮用）。
    refresh: function (force) {
      if (rt.inflight) return rt.inflight
      // 已有数据时不回退到 loading：后台轮询不该把界面上的数字变成省略号。
      if (rt.data === null) { rt.status = 'loading'; rt.notify() }
      const p = call(A_PNL_GET, force ? { force: true } : {}).then(function (data) {
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

    start: function () {
      rt.refs++
      if (rt.refs !== 1) return   // 已有轮询器在跑，chip 与 tab 共享它
      rt.active = true
      cycle()
    },

    stop: function () {
      rt.refs--
      if (rt.refs > 0) return
      rt.refs = 0
      rt.active = false
      if (rt.timer) { try { rt.timer() } catch (e) { /* ignore */ } rt.timer = null }
    }
  }

  function arm(ms) {
    if (rt.timer) { try { rt.timer() } catch (e) { /* ignore */ } rt.timer = null }
    rt.delay = ms
    rt.timer = disposer(ctx.timeout(cycle, ms))
  }

  // 一次「取数 → 按宿主给的节奏重排」。
  // 页面隐藏时跳过请求但**照旧等这么久**：重排更密没有意义（页面不可见），
  // 重排更疏又会让回到前台的第一屏变旧。
  function cycle() {
    if (!rt.active) return
    if (pageHidden()) { arm(Math.max(rt.delay, PNL_POLL_FALLBACK_MS)); return }
    rt.refresh().then(function () {
      if (!rt.active) return
      arm(rt.status === 'error' ? PNL_POLL_FALLBACK_MS : hostDelay(rt.data))
    })
  }

  pnlRuntime = rt
  return rt
}

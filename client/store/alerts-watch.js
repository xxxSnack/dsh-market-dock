// 价格提醒的浏览器侧通知器（**应用级**运行时）：把宿主新产生的提醒事件弹成系统通知。
//
// ── 为什么必须提到应用级（FORK-NOTES §11）────────────────────────────────────
// 宿主的 lib/alerts.js watcher 负责「是否穿越阈值 + 事件持久化」，它跟页面显示完全无关，一直在跑；
// 浏览器这一侧原来只做两件事：读事件、弹 Notification —— 而这两件事写死在 XueqiuPanel 的
// refreshAlerts 里。于是「面板收起」= 通知静默。行情隐身功能要求「不显示行情，但到价还要提醒我」，
// 这条老耦合必须拆掉：通知器跟 ui.hidden / 面板挂载都无关，只跟页面在不在有关。
//
// ── 语义 ───────────────────────────────────────────────────────────────────
//   · 首轮静默：宿主 events 是持久化历史，页面加载时不能为旧事件刷屏（第一轮只建立基线）。
//   · 之后每出现一个新事件 id 就弹一次；面板的「页面内通知区」由 panel/index.js 订阅同一份快照渲染。
//   · 空转退避：没有规则时按 ALERT_IDLE_POLL_MS（5 分钟）读一次本地文件，既不空转也不错过
//     「在别处新增了规则」；有规则时回到 ALERT_POLL_MS（30 秒，与改造前一致）。
import { fetchAlerts } from './alerts.js'
import { ALERT_POLL_MS, ALERT_IDLE_POLL_MS } from '../constants.js'

let alertsWatchRuntime = null

export function getAlertsWatchRuntime() { return alertsWatchRuntime }

// 事件身份：宿主 id 优先，缺失时退化到内容签名（与改造前 panel 内实现逐字一致）。
export function alertEventId(e) {
  if (!e) return ''
  return String(e.id != null ? e.id : (e.event_id != null ? e.event_id : [e.symbol, e.target, e.direction, e.triggered_at || e.created_at || e.time].join('|')))
}

// 在用户手势里请求一次通知权限（隐身按钮点击时调用）：权限弹窗挂在定时器里常被浏览器直接拒绝。
export function ensureAlertPermission() {
  const rt = alertsWatchRuntime
  if (rt) rt.ensurePermission()
}

export function createAlertsWatchRuntime(ctx) {
  const listeners = []
  // event id → true：既当「首轮基线」也当「已弹过通知」的账本（同一集合，语义天然一致）
  const known = Object.create(null)
  let baselined = false
  let timer = null
  let inflight = null

  // 定时器句柄归一化：ctx.timeout 可能返回 stop 函数，也可能返回带 dispose() 的对象。
  function disposer(handle) {
    if (!handle) return null
    if (typeof handle === 'function') return handle
    if (typeof handle.dispose === 'function') return function () { handle.dispose() }
    return null
  }

  const rt = {
    ctx: ctx,
    state: { rules: [], events: [], loaded: false },
    active: false,

    getState: function () { return rt.state },

    // 订阅即补发：订阅者（面板）晚于首次取数挂载时要能立刻拿到当前快照，否则那一段会空着。
    subscribe: function (fn) {
      listeners.push(fn)
      if (rt.state.loaded) { try { fn(rt.state, []) } catch (e) { /* 单个订阅者抛错不影响其他 */ } }
      return function () {
        const i = listeners.indexOf(fn)
        if (i !== -1) listeners.splice(i, 1)
      }
    },

    refresh: function () {
      if (inflight) return inflight
      const p = fetchAlerts().then(function (data) {
        const rules = (data && Array.isArray(data.rules)) ? data.rules : []
        const events = (data && Array.isArray(data.events)) ? data.events : []
        const fresh = []
        if (!baselined) {
          // 首轮（含页面刷新后的首次）：只建立基线，不为历史事件弹通知。
          baselined = true
          for (let i = 0; i < events.length; i++) known[alertEventId(events[i])] = true
        } else {
          for (let i = 0; i < events.length; i++) {
            const id = alertEventId(events[i])
            if (known[id]) continue
            known[id] = true
            fresh.push(events[i])
          }
        }
        rt.state = { rules: rules, events: events, loaded: true }
        inflight = null
        const fns = listeners.slice()
        for (let i = 0; i < fns.length; i++) {
          try { fns[i](rt.state, fresh) } catch (e) { /* 单个订阅者抛错不影响其他 */ }
        }
        if (fresh.length) fire(fresh)
        return rt.state
      }).catch(function () {
        // 读失败不是致命错误：保留上一份快照，节奏由 cycle 决定下一步（不阻断后续轮询）。
        inflight = null
        return rt.state
      })
      inflight = p
      return p
    },

    // 规则被增删改之后立刻核对一次（不用等下一个 tick，也不必自己维护一份基线）。
    kick: function () {
      if (!rt.active) return Promise.resolve(rt.state)
      if (timer) { try { timer() } catch (e) { /* ignore */ } timer = null }
      return rt.refresh()
    },

    ensurePermission: function () {
      try {
        if (typeof window === 'undefined' || !window.Notification) return
        if (window.Notification.permission !== 'default') return
        if (typeof window.Notification.requestPermission !== 'function') return
        window.Notification.requestPermission().catch(function () { /* 用户拒绝/浏览器不支持：静默 */ })
      } catch (e) { /* ignore */ }
    },

    start: function () {
      if (rt.active) return
      rt.active = true
      bindVisibility()
      cycle()
    },

    stop: function () {
      rt.active = false
      unbindVisibility()
      if (timer) { try { timer() } catch (e) { /* ignore */ } timer = null }
    }
  }

  function fire(events) {
    try {
      if (typeof window === 'undefined' || !window.Notification) return
      const title = '雪球价格提醒'
      const show = function (e) {
        const text = (e.name || e.symbol || '标的') + ' ' + (e.direction === 'below' ? '≤' : '≥') + ' ' + (e.target == null ? '' : e.target) + (e.current == null ? '' : '，现价 ' + e.current)
        return new window.Notification(title, { body: text, tag: 'xq-alert-' + alertEventId(e) })
      }
      if (window.Notification.permission === 'granted') {
        for (let i = 0; i < events.length; i++) { try { show(events[i]) } catch (e) { /* ignore */ } }
      } else if (window.Notification.permission === 'default' && typeof window.Notification.requestPermission === 'function') {
        window.Notification.requestPermission().then(function (permission) {
          if (permission !== 'granted') return
          for (let i = 0; i < events.length; i++) { try { show(events[i]) } catch (e) { /* ignore */ } }
        }).catch(function () { /* ignore */ })
      }
    } catch (e) { /* 浏览器权限/实现异常静默：页面内通知区仍然会列出事件 */ }
  }

  function arm(ms) {
    if (timer) { try { timer() } catch (e) { /* ignore */ } timer = null }
    timer = disposer(ctx.timeout(cycle, ms))
  }

  // 一次「取数 → 按规则数量重排」。取数失败时 state.loaded 仍是上次的值：
  // 从没读成功过就按 30 秒快速重试，读成功过就照规则数量决定节奏。
  function cycle() {
    if (!rt.active) return
    rt.refresh().then(function (state) {
      if (!rt.active) return
      if (!state.loaded) { arm(ALERT_POLL_MS); return }
      arm(state.rules.length ? ALERT_POLL_MS : ALERT_IDLE_POLL_MS)
    })
  }

  // 页面从后台回来时立刻补一次：后台标签页的定时器会被钳制，错过的那段时间要在这里追上。
  function onVisibility() {
    if (!rt.active) return
    if (timer) { try { timer() } catch (e) { /* ignore */ } timer = null }
    cycle()
  }
  function bindVisibility() {
    try { if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', onVisibility) } catch (e) { /* ignore */ }
  }
  function unbindVisibility() {
    try { if (typeof document !== 'undefined' && document.removeEventListener) document.removeEventListener('visibilitychange', onVisibility) } catch (e) { /* ignore */ }
  }

  alertsWatchRuntime = rt
  return rt
}

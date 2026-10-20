// 嵌入式主面板（conversation.input.dock）：输入框上方一整行。
// ---------- 嵌入式主面板（conversation.input.dock）：输入框上方一整行 ----------
// DockGate 常驻挂载：负责 hydrate + 订阅 ui，open=false 或 hidden=true 时渲染 null。
// 不能把开关写在槽位 render 闭包里——槽位函数不会因 ui 变化而重新执行。
import { el, viewport, sessionsText } from './dom.js'
import { getUiRuntime, hydrateUi } from './store/ui.js'
import { ensureAlertPermission } from './store/alerts-watch.js'
import { XueqiuPanel } from './panel/index.js'
import { PnlChip } from './panel/pnl.js'
import { DOCK_H_MIN, DOCK_H_MAX, DOCK_H_VP_RATIO, DOCK_H_DEFAULT_RATIO, DOCK_H_FALLBACK, VIEWPORT_FALLBACK_H, POLL_DOCK_SESSION_MS } from './constants.js'

export function DockGate() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const [, force] = React.useState(0)
  React.useEffect(function () {
    hydrateUi()   // 幂等：MiniBadge 已经触发过就是空操作
    const off = ui.subscribe(function () { force(function (x) { return x + 1 }) })
    return off
  }, [])
  // hidden = 行情隐身：面板/徽章/指数条三个入口一起卸载，行情轮询随之全停（FORK-NOTES §11）。
  if (!ui.hydrated || !ui.open || ui.hidden) return null
  return el(DockPanel, null)
}

export function DockPanel() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const dockResize = rt.dockResize
  const [, force] = React.useState(0)
  const [tick, setTick] = React.useState(0)
  React.useEffect(function () {
    const off = ui.subscribe(function () { if (ui.hydrated) rt.saveUi(); force(function (x) { return x + 1 }) })
    return off
  }, [])
  // 每分钟重算一次交易时段提示
  React.useEffect(function () {
    const stop = rt.ctx.interval(function () { setTick(function (x) { return x + 1 }) }, POLL_DOCK_SESSION_MS)
    return function () { if (stop) stop() }
  }, [])
  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    dockResize.active = true
    dockResize.startY = e.clientY
    dockResize.startH = ui.dockH || defaultDockH()
    // 拖动期间直改 DOM（不触发 React 重渲染），松手才提交一次状态
    try {
      const dock = e.currentTarget.closest('.xq-dock')
      dockResize.body = dock ? dock.querySelector('.xq-dock-body') : null
      if (dockResize.body) dockResize.body.style.transition = 'none'
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
    } catch (err) { /* ignore */ }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (err) { /* ignore */ }
  }
  function onMove(e) {
    if (!dockResize.active || !dockResize.body) return
    const vp = viewport()
    const maxH = Math.round((vp ? vp.h : VIEWPORT_FALLBACK_H) * DOCK_H_VP_RATIO)
    let h = dockResize.startH + (e.clientY - dockResize.startY)
    h = Math.min(Math.max(DOCK_H_MIN, h), Math.min(maxH, DOCK_H_MAX))
    dockResize.h = h
    dockResize.body.style.height = h + 'px'   // 直接写样式，逐帧零渲染
  }
  function onUp(e) {
    if (dockResize.active && dockResize.body) {
      dockResize.body.style.transition = ''
      dockResize.body.style.height = ''
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      if (dockResize.h) ui.set({ dockH: dockResize.h })   // 松手一次性提交
    }
    dockResize.active = false
    dockResize.h = 0
    try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) } catch (err) { /* ignore */ }
  }
  function defaultDockH() {
    try { if (typeof window !== 'undefined' && window.innerHeight) return Math.round(window.innerHeight * DOCK_H_DEFAULT_RATIO) } catch (e) { /* ignore */ }
    return DOCK_H_FALLBACK
  }
  const bodyStyle = ui.dockH ? { height: ui.dockH + 'px' } : null
  return el('div', { className: 'xq-dock' }, [
    el('div', { key: 'head', className: 'xq-dock-head' }, [
      el('span', { key: 'logo', className: 'xq-logo' }, [el('b', { key: 'b' }, '雪球'), ' mini']),
      el('span', { key: 'st', className: 'xq-status', title: 'A股/港股/美股交易时段（本地时区推算，不含节假日）' }, sessionsText() || '行情面板'),
      el(PnlChip, { key: 'pnl' }),
      el('span', { key: 'hint', className: 'xq-update' }, '已嵌入输入框上方 · Esc 收起'),
      el('span', { key: 'sp', className: 'xq-spacer' }),
      // 隐身：一个按钮把三个常驻入口一起关掉（不是收起 —— 收起只关面板，徽章和指数条还在）。
      // 顺带在用户手势里请求一次通知权限（定时器里请求常被浏览器直接拒绝），保证隐身期间到价还能提醒。
      el('button', {
        key: 'hide', className: 'xq-btn-mini', title: '完全隐藏行情：面板、徽章、指数条一起消失，行情请求随之停止（价格提醒仍然生效）。恢复：Ctrl/⌘+Alt+Shift+X（可在 设置→通用→快捷键 改键），或对 AI 说「把行情打开」',
        onClick: function () { ensureAlertPermission(); ui.set({ hidden: true }) }
      }, '隐身'),
      el('button', { key: 'min', className: 'xq-btn-mini', title: '收起（点右下角徽章重新打开）', onClick: function () { ui.set({ open: false }) } }, '收起 —')
    ]),
    el('div', { key: 'body', className: 'xq-dock-body', style: bodyStyle }, [
      el(XueqiuPanel, { key: 'panel' })
    ]),
    el('div', {
      key: 'rs', className: 'xq-dock-resize', title: '拖动调整面板高度（双击复位）',
      onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp,
      onDoubleClick: function () { ui.set({ dockH: null }) }
    }, [el('span', { key: 'g' }, null)])
  ])
}

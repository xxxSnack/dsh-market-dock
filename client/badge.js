// 迷你悬浮徽章（shell.overlay）：可拖动、右下角手柄调宽度。
// 形态 C：默认区域模式（320px 宽，前 12 只自选静态平铺换行）；⤡ 手柄可调宽 120–480px，双击复位 320。
// 悬停弹层已砍掉：速览靠拉宽徽章，完整功能点徽章开面板。
import { el, viewport, pageHidden, aSession, sessionsText } from './dom.js'
import { fmt, fmtPct, colorOf } from './format.js'
import { getUiRuntime, hydrateUi } from './store/ui.js'
import { fetchIndices, fetchQuote, fetchWatchlist } from './store/market.js'
import { BADGE_WATCH_LIMIT, BADGE_W_MIN, BADGE_W_MAX, BADGE_W_DEFAULT, BADGE_DRAG_THRESHOLD, EDGE_GAP, VIEWPORT_FALLBACK_W, VIEWPORT_FALLBACK_H, POLL_BADGE_MS } from './constants.js'

// ---------- 迷你悬浮徽章（shell.overlay）：可拖动、右下角手柄调宽度 ----------
export function MiniBadge() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const [idx, setIdx] = React.useState([])
  const [top, setTop] = React.useState([])
  const [mOpen, setMOpen] = React.useState(true)
  const [, force] = React.useState(0)
  const refreshSeq = React.useRef(0)

  React.useEffect(function () {
    let alive = true
    function refresh() {
      if (pageHidden()) return   // 页面隐藏时暂停徽章轮询
      const my = ++refreshSeq.current
      fetchIndices().then(function (data) {
        if (!alive || refreshSeq.current !== my) return
        setIdx((data && data.list) || [])
        const st = data ? data.status : null
        if (st === 5 || st === 6) setMOpen(true)
        else if (st !== null && st !== undefined) setMOpen(false)
      }).catch(function () { /* 静默失败 */ })
      // 徽章主体：自选前 12 只（轮动素材 / 平铺内容）；自选为空回退指数
      fetchWatchlist().then(function (wl) {
        if (!alive || refreshSeq.current !== my) return
        const symbols = ((wl && wl.symbols) || []).slice(0, BADGE_WATCH_LIMIT)
        if (!symbols.length) { setTop([]); return }
        return fetchQuote(symbols).then(function (data) {
          if (alive && refreshSeq.current === my) setTop((data && data.list) || [])
        })
      }).catch(function () { /* 静默失败：保留指数 */ })
    }
    function onVis() { if (!pageHidden()) refresh() }
    refresh()
    // [fork-fix] 应用级水合入口：shell.overlay 全局只挂一次，不随会话切换重放旧持久化值
    hydrateUi()
    const stop = rt.ctx.interval(refresh, POLL_BADGE_MS)
    const off = ui.subscribe(function () { force(function (x) { return x + 1 }) })
    try { document.addEventListener('visibilitychange', onVis) } catch (e) { /* ignore */ }
    return function () {
      alive = false; if (stop) stop(); off()
      try { document.removeEventListener('visibilitychange', onVis) } catch (e) { /* ignore */ }
    }
  }, [])

  // 挂载后与视口变化时按真实渲染尺寸钳制徽标位置：
  // DockGate 恢复时只能按 badgeW 估算宽度（不含边框/极限情况），且窗口缩小后
  // 旧坐标可能落到屏幕外——这里用 offsetWidth 实测值兜底，保证徽标永远可见
  const badgeRef = React.useRef(null)
  function clampBadge() {
    const node = badgeRef.current
    if (!node || !ui.badgePos) return
    const w = node.offsetWidth || 0
    const h = node.offsetHeight || 0
    if (!w) return
    const vp = viewport()
    if (!vp) return
    const x = Math.min(Math.max(EDGE_GAP, Number(ui.badgePos.x)), Math.max(EDGE_GAP, vp.w - w - EDGE_GAP))
    const y = Math.min(Math.max(EDGE_GAP, Number(ui.badgePos.y)), Math.max(EDGE_GAP, vp.h - h - EDGE_GAP))
    if (x !== ui.badgePos.x || y !== ui.badgePos.y) ui.set({ badgePos: { x: x, y: y } })
  }
  // 每次渲染后钳制：数据异步到达→徽章长高→重渲染，逐渲染钳制无时序死角
  // （仅依赖挂载一次/ResizeObserver 的方案在慢环境漏过"渲染后才长高"的场景，CI 实测踩坑）。
  // ui.set 仅在有变更时触发下一次渲染，收敛后不再循环。
  React.useLayoutEffect(clampBadge)
  React.useEffect(function () {
    window.addEventListener('resize', clampBadge)
    let ro = null
    try {
      const node = badgeRef.current
      ro = new ResizeObserver(function () { clampBadge() })
      if (node) ro.observe(node)
    } catch (e) { /* 无 ResizeObserver 时退化为 resize 事件 + 每渲染钳制 */ }
    return function () {
      try { window.removeEventListener('resize', clampBadge) } catch (e) { /* ignore */ }
      try { if (ro) ro.disconnect() } catch (e) { /* ignore */ }
    }
  }, [])

  function isBadgeControl(e) {
    const target = e && e.target
    return !!(target && typeof target.closest === 'function' && target.closest('.xq-badge-control'))
  }
  function stopBadgeControl(e) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation()
  }
  function onDown(e) {
    // 按钮等子控件不启动徽章拖拽，也不取得 pointer capture。
    if (isBadgeControl(e)) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    rt.badgeDrag = { x: e.clientX, y: e.clientY }
    rt.badgeMoved = false
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (err) { /* ignore */ }
  }
  function onMove(e) {
    if (!rt.badgeDrag) return
    const dx = e.clientX - rt.badgeDrag.x, dy = e.clientY - rt.badgeDrag.y
    if (Math.abs(dx) + Math.abs(dy) > BADGE_DRAG_THRESHOLD) rt.badgeMoved = true
    if (!rt.badgeMoved) return
    const vp = viewport()
    const w = e.currentTarget.offsetWidth || 160
    const h = e.currentTarget.offsetHeight || 30
    let x = e.clientX - w / 2
    let y = e.clientY - h / 2
    x = Math.min(Math.max(EDGE_GAP, x), (vp ? vp.w : VIEWPORT_FALLBACK_W) - w - EDGE_GAP)
    y = Math.min(Math.max(EDGE_GAP, y), (vp ? vp.h : VIEWPORT_FALLBACK_H) - h - EDGE_GAP)
    rt.badgeDrag.x = x + w / 2
    rt.badgeDrag.y = y + h / 2
    rt.badgeDrag.pos = { x: x, y: y }
    e.currentTarget.style.left = x + 'px'
    e.currentTarget.style.top = y + 'px'
    e.currentTarget.style.right = 'auto'
    e.currentTarget.style.bottom = 'auto'
  }
  function finishDrag(e, activate) {
    // 未由徽章背景启动的 pointerup（例如工具按钮）不能误触发开合。
    if (!rt.badgeDrag) return
    const moved = rt.badgeMoved
    const pos = rt.badgeDrag.pos
    rt.badgeDrag = null
    rt.badgeMoved = false
    try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) } catch (err) { /* ignore */ }
    if (!moved) {
      if (!activate) return
      // 胶囊点击只恢复徽章；完整徽章背景点击才开合大面板。
      if (ui.badgeCompact) ui.set({ badgeCompact: false })
      else ui.set({ open: !ui.open })
      return
    }
    if (pos) ui.set({ badgePos: pos })   // 松手一次性提交
  }
  function onUp(e) { finishDrag(e, true) }
  function onCancel(e) { finishDrag(e, false) }

  // ---- 宽度调节手柄：横向拖动改变徽章宽度（120–480px），松手持久化；双击复位为单行条 ----
  const gripDrag = React.useRef(null)
  function onGripDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.stopPropagation()   // 不触发徽章移动
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (err) { /* ignore */ }
    const base = ui.badgeW || (e.currentTarget.parentElement ? e.currentTarget.parentElement.offsetWidth : 200)
    gripDrag.current = { startX: e.clientX, baseW: base }
  }
  function onGripMove(e) {
    if (!gripDrag.current) return
    e.stopPropagation()
    const vp = viewport()
    const maxW = Math.min(BADGE_W_MAX, (vp ? vp.w : VIEWPORT_FALLBACK_W) - 24)
    const w = Math.min(Math.max(BADGE_W_MIN, gripDrag.current.baseW + (e.clientX - gripDrag.current.startX)), maxW)
    ui.set({ badgeW: w })   // 拖动过程实时反馈（内存态，松手才落盘）
  }
  function onGripUp(e) {
    if (!gripDrag.current) return
    e.stopPropagation()
    gripDrag.current = null
    try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) } catch (err) { /* ignore */ }
    rt.saveUi()   // 落盘（debounce）
  }
  function onGripDblClick(e) {
    e.stopPropagation()
    ui.set({ badgeW: null })   // 复位为默认区域宽度（320px）
    rt.saveUi()
  }


  // 默认区域模式：自选静态平铺（badgeW 未设置时用默认宽 320px；双击手柄回到 320 而非单行）
  const wide = true
  const compact = ui.badgeCompact === true
  const effW = (ui.badgeW !== null && ui.badgeW !== undefined) ? ui.badgeW : BADGE_W_DEFAULT
  // 区域模式：前 12 只全部平铺（换行）；单行模式：轮动页（页码指示）
  function wItem(q) {
    return el('span', { key: 'w-' + q.symbol, className: 'xq-witem', title: (q.name || q.symbol) + ' ' + fmt(q.current) + (q.percent !== undefined ? '  ' + fmtPct(q.percent) : '') }, [
      el('span', { key: 'n', className: 'xq-badge-hint' }, (q.name || q.symbol) + ' '),
      el('span', { key: 'p', className: 'xq-badge-val ' + colorOf(q.percent) }, fmtPct(q.percent))
    ])
  }
  // 指数区：4 指数两列（上证 深证 创业 科创50），有自选时作为区域头部，无自选时即主体
  function idxRow(q) {
    return el('span', { key: 'ix-' + q.symbol, className: 'xq-idxrow', title: (q.name || q.symbol) + ' ' + fmt(q.current) }, [
      el('span', { key: 'n', className: 'xq-badge-hint' }, (q.name || q.symbol)),
      el('span', { key: 'p', className: 'xq-badge-val ' + colorOf(q.percent) }, fmtPct(q.percent))
    ])
  }
  const idxEls = el('div', { key: 'idx', className: 'xq-idxgrid' }, idx.map(idxRow))
  const bodyEls = top.length
    ? el('div', { key: 'wg', className: 'xq-wgrid' }, top.map(wItem))
    : null
  let style = ui.badgePos
    ? { left: ui.badgePos.x, top: ui.badgePos.y, right: 'auto', bottom: 'auto' }
    : null
  if (wide && !compact) {
    if (!style) { style = {} }
    style.maxWidth = effW + 'px'
    style.width = effW + 'px'
  }
  const compactButton = el('button', {
    key: 'compact', type: 'button', className: 'xq-badge-control',
    title: compact ? '展开行情徽章' : '收起为小胶囊',
    'aria-label': compact ? '展开行情徽章' : '收起为小胶囊',
    'aria-expanded': !compact,
    onPointerDown: stopBadgeControl, onPointerMove: stopBadgeControl,
    onPointerUp: stopBadgeControl, onPointerCancel: stopBadgeControl,
    onClick: function (e) { stopBadgeControl(e); ui.set({ badgeCompact: !ui.badgeCompact }) }
  }, compact ? '+' : '−')
  const badgeKids = [
    el('div', { key: 'hd', className: 'xq-badge-hd' }, [
      el('span', { key: 'logo' }, [el('b', { key: 'b' }, '雪球'), 'mini']),
      el('span', { key: 'st', className: 'xq-status' + (aSession() === '盘中' ? ' xq-live' : ''), title: sessionsText() }, (function () { var s = aSession(); return s === '盘中' ? '● 盘中' : (s || (mOpen ? '● 盘中' : '休市')) })()),
      el('span', { key: 'sp', className: 'xq-spacer' }),
      compactButton,
      el('span', { key: 'ct', className: 'xq-caret' }, ui.open ? '▾' : '▴')
    ])
  ]
  if (!compact) {
    badgeKids.push(idxEls, bodyEls, el('span', {
      key: 'grip', className: 'xq-badge-grip', title: '拖动调宽度 · 双击复位',
      onPointerDown: onGripDown, onPointerMove: onGripMove, onPointerUp: onGripUp, onPointerCancel: onGripUp,
      onDoubleClick: onGripDblClick
    }, '⤡'))
  }
  const badgeEl = el('div', {
    ref: badgeRef,
    className: 'xq-badge' + (compact ? ' xq-badge-compact' : ''),
    style: style,
    title: compact ? '点击胶囊恢复行情列表 · 拖动调整位置' : '点击开合行情面板 · 拖动调整位置 · 右下角 ⤡ 调宽度（双击复位）',
    onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onCancel
  }, badgeKids)
  return el('div', { style: { display: 'contents' } }, [badgeEl])
}

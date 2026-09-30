// 底部指数条（会话页，输入框下方氛围行）。
// 除指数外还常驻一条「今日盈亏」：面板收起时（DockGate 直接返回 null）头部 chip 是看不到的，
// 而这条氛围行始终在，所以它是「收起面板也能看到盈亏」的唯一落点。
// 与头部 chip 共用同一个 PnlChip（也就共用同一个轮询器，见 store/pnl.js 的引用计数）。
import { el } from './dom.js'
import { fmt, fmtPct, colorOf } from './format.js'
import { getUiRuntime } from './store/ui.js'
import { fetchIndices } from './store/market.js'
import { PnlChip, usePnlState } from './panel/pnl.js'
import { POLL_TICKER_MS } from './constants.js'

// ---------- 独占一行：宿主那条 .dock 是「不换行的 flex 行」 ----------
// 指数条注册在 conversation.composer.dock，宿主把它铺在输入框下方那条 .dock 行里
// （display:flex / 不换行 / justify-content:center），于是指数条和宿主自己的统计文字
// （"N 轮 M 步 · tok/s"、"… 缓存命中 96%"、成本插件的"本会话 ¥0…"）挤在同一行。
//
// 两个实测坑（都踩过，别再犯）：
//   1. 宿主给槽位条目外面套了一层**无 class、display:contents** 的 div。这一层自己不生成盒子
//      （getBoundingClientRect 全 0、给它设 flex-wrap 完全无效），真正的 flex 容器还要再往上一层。
//      所以不能拿 node.parentElement 当行容器，要沿父链跳过 display:contents 的透明层。
//   2. 只写「自己占满 100% 宽」而不让那一行换行，会把宿主那些可收缩的统计文字挤成 0 宽（比不改更糟）。
//      所以这里改完**当场自检**：自己必须真的落到另一行、且没有任何兄弟被挤成 0 宽，否则原样撤回。
//      撤回与改动在同一个 effect 内完成（中间强制读一次布局），浏览器不会画出中间态。
function flexRowOf(node) {
  let p = node.parentElement
  for (let i = 0; p && i < 8; i++) {
    let d = ''
    try { d = getComputedStyle(p).display || '' } catch (e) { return null }
    if (d.indexOf('flex') >= 0) return p
    if (d !== 'contents') return null   // 只跳过 display:contents 的透明层，别的祖先一律不碰
    p = p.parentElement
  }
  return null
}

// 真正的 flex 条目：行容器的子元素，遇到 display:contents 的透明层就展开它的子元素。
function flexItemsOf(row, depth) {
  const out = []
  const kids = row.children
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i]
    let d = ''
    try { d = getComputedStyle(c).display || '' } catch (e) { d = '' }
    if (d === 'contents' && depth < 3) {
      const inner = flexItemsOf(c, depth + 1)
      for (let j = 0; j < inner.length; j++) out.push(inner[j])
    } else {
      out.push(c)
    }
  }
  return out
}

function ownLine(node) {
  if (typeof getComputedStyle !== 'function' || typeof node.getBoundingClientRect !== 'function') return
  const row = flexRowOf(node)
  if (!row) return
  const prev = {
    wrap: row.style.flexWrap, align: row.style.alignSelf,
    flex: node.style.flex, order: node.style.order
  }
  function restore() {
    row.style.flexWrap = prev.wrap
    row.style.alignSelf = prev.align
    node.style.flex = prev.flex
    node.style.order = prev.order
  }
  // 自己是否已经在另一行、且没把兄弟挤没
  function settled() {
    const a = node.getBoundingClientRect()
    const items = flexItemsOf(row, 0)
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it === node) continue
      const r = it.getBoundingClientRect()
      if (r.width < 1) return false                                        // 兄弟被挤成 0 宽
      if (!(a.bottom <= r.top || r.bottom <= a.top)) return false          // 垂直有重叠 = 还在同一行
    }
    return true
  }
  function attempt(stretch) {
    row.style.flexWrap = 'wrap'          // 让这一行可以换行（宿主自己没设过 flex-wrap）
    if (stretch) {
      // 行容器是「居中收缩」的（父级是 align-items:center 的 column flex）时，宽度由内容决定，
      // 百分比 flex-basis 可能解析不出确定值而换不了行；stretch 让这一行拿到确定宽度（视觉不变，
      // 因为它的 justify-content 本来就是 center）。
      let dir = ''
      try { dir = getComputedStyle(row.parentElement).flexDirection || '' } catch (e) { dir = '' }
      if (dir.indexOf('column') === 0) row.style.alignSelf = 'stretch'
    }
    node.style.flex = '1 0 100%'         // 自己占满一整行
    node.style.order = '9'               // 排到最后：宿主原有统计行不动，指数条落到下面一行
    return settled()
  }
  if (!attempt(false) && !attempt(true)) { restore(); return }
  return restore
}

// ---------- 底部指数条（会话页，输入框下方氛围行） ----------
export function Ticker() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const [indices, setIndices] = React.useState([])
  const pnl = usePnlState()
  const requestSeq = React.useRef(0)
  const rootRef = React.useRef(null)
  React.useEffect(function () {
    let alive = true
    function refresh() {
      // 底部行情条持续读取，隐藏页的浏览器 timer 可能仍被节流。
      const my = ++requestSeq.current
      fetchIndices().then(function (data) {
        if (alive && requestSeq.current === my) setIndices((data && data.list) || [])
      }).catch(function () { /* 静默失败 */ })
    }
    function onVis() { refresh() }
    refresh()
    const stop = rt.ctx.interval(refresh, POLL_TICKER_MS)
    try { document.addEventListener('visibilitychange', onVis) } catch (e) { /* ignore */ }
    return function () {
      alive = false; if (stop) stop()
      try { document.removeEventListener('visibilitychange', onVis) } catch (e) { /* ignore */ }
    }
  }, [])
  // 指数拉不到时不再整条消失：只要盈亏还有东西可说，这一行就有意义。
  const showPnl = pnl.data !== null || pnl.status === 'loading' || pnl.status === 'error'
  const hasRow = indices.length > 0 || showPnl
  // 这一行真的挂上 DOM 之后（hasRow 由 false 变 true）才做独占一行处理；
  // 依赖 hasRow 而不是 []：首次渲染没数据时返回 null、根本没有节点可处理。
  React.useEffect(function () {
    const node = rootRef.current
    if (!node) return
    return ownLine(node)
  }, [hasRow])
  if (!hasRow) return null
  const kids = indices.map(function (q) {
    return el('span', { key: q.symbol, className: 'xq-tick' }, [
      el('span', { key: 'n', className: 'xq-tick-name' }, q.name),
      el('span', { key: 'c', className: 'xq-tick-cur ' + colorOf(q.percent) }, fmt(q.current)),
      el('span', { key: 'p', className: colorOf(q.percent) }, fmtPct(q.percent))
    ])
  })
  if (showPnl) kids.push(el(PnlChip, { key: 'pnl' }))
  return el('div', { className: 'xq-ticker', ref: rootRef, onClick: function () { ui.set({ open: true }) } }, kids)
}

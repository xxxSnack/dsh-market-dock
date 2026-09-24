// 底部指数条（会话页，输入框下方氛围行）。
// 除指数外还常驻一条「今日盈亏」：面板收起时（DockGate 直接返回 null）头部 chip 是看不到的，
// 而这条氛围行始终在，所以它是「收起面板也能看到盈亏」的唯一落点。
// 与头部 chip 共用同一个 PnlChip（也就共用同一个轮询器，见 store/pnl.js 的引用计数）。
import { el, pageHidden } from './dom.js'
import { fmt, fmtPct, colorOf } from './format.js'
import { getUiRuntime } from './store/ui.js'
import { fetchIndices } from './store/market.js'
import { PnlChip, usePnlState } from './panel/pnl.js'
import { POLL_TICKER_MS } from './constants.js'

// ---------- 底部指数条（会话页，输入框下方氛围行） ----------
export function Ticker() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const [indices, setIndices] = React.useState([])
  const pnl = usePnlState()
  const requestSeq = React.useRef(0)
  React.useEffect(function () {
    let alive = true
    function refresh() {
      if (pageHidden()) return   // 页面隐藏时暂停指数条轮询
      const my = ++requestSeq.current
      fetchIndices().then(function (data) {
        if (alive && requestSeq.current === my) setIndices((data && data.list) || [])
      }).catch(function () { /* 静默失败 */ })
    }
    function onVis() { if (!pageHidden()) refresh() }
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
  if (!indices.length && !showPnl) return null
  const kids = indices.map(function (q) {
    return el('span', { key: q.symbol, className: 'xq-tick' }, [
      el('span', { key: 'n', className: 'xq-tick-name' }, q.name),
      el('span', { key: 'c', className: 'xq-tick-cur ' + colorOf(q.percent) }, fmt(q.current)),
      el('span', { key: 'p', className: colorOf(q.percent) }, fmtPct(q.percent))
    ])
  })
  if (showPnl) kids.push(el(PnlChip, { key: 'pnl' }))
  return el('div', { className: 'xq-ticker', onClick: function () { ui.set({ open: true }) } }, kids)
}

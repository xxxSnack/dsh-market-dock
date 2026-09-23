// 底部指数条（会话页，输入框下方氛围行）。
import { el, pageHidden } from './dom.js'
import { fmt, fmtPct, colorOf } from './format.js'
import { getUiRuntime } from './store/ui.js'
import { fetchIndices } from './store/market.js'
import { POLL_TICKER_MS } from './constants.js'

export function Ticker() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const [indices, setIndices] = React.useState([])
  React.useEffect(function () {
    let alive = true
    function refresh() {
      if (pageHidden()) return   // 页面隐藏时暂停指数条轮询
      fetchIndices().then(function (data) {
        if (alive) setIndices((data && data.list) || [])
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
  if (!indices.length) return null
  const kids = indices.map(function (q) {
    return el('span', { key: q.symbol, className: 'xq-tick' }, [
      el('span', { key: 'n', className: 'xq-tick-name' }, q.name),
      el('span', { key: 'c', className: 'xq-tick-cur ' + colorOf(q.percent) }, fmt(q.current)),
      el('span', { key: 'p', className: colorOf(q.percent) }, fmtPct(q.percent))
    ])
  })
  return el('div', { className: 'xq-ticker', onClick: function () { ui.set({ open: true }) } }, kids)
}

// 热榜 tab：市场切换 + 热度榜行。
// 显式上下文 p：
//   p.hot / p.hotMarket / p.setHotMarket / p.hotSeq / p.setHot / p.setErr / p.openDetail
import { el } from '../dom.js'
import { fmt, fmtPct, colorOf } from '../format.js'
import { call, A_HOT } from '../platform.js'
import { HOT_MARKETS, HOT_LIST_SIZE } from '../constants.js'

export function HotTab(p) {
  const markets = HOT_MARKETS
  return el('div', null, [
    el('div', { key: 'seg', className: 'xq-seg', style: { marginBottom: 8 } }, markets.map(function (m) {
      return el('button', {
        key: m[0], className: p.hotMarket === m[0] ? 'xq-seg-on' : '',
        onClick: function () {
          p.setHotMarket(m[0])
          const my = ++p.hotSeq.current
          call(A_HOT, { market: m[0], size: HOT_LIST_SIZE }).then(function (data) {
            if (p.hotSeq.current !== my) return   // 快速连点：只认最后一次
            p.setHot((data && data.list) || [])
          }).catch(function (e) {
            if (p.hotSeq.current !== my) return
            p.setErr(String((e && e.message) || e))
          })
        }
      }, m[1])
    })),
    el('div', { key: 'list', className: 'xq-grid' }, p.hot.map(function (it, i) {
      return el('div', { key: it.symbol, className: 'xq-hot-row', onClick: function () { p.openDetail(it.symbol) } }, [
        el('span', { key: 'r', className: 'xq-rank' }, String(i + 1)),
        el('div', { key: 'n' }, [
          el('div', { key: 'a', className: 'xq-name' }, it.name),
          el('div', { key: 'b', className: 'xq-sub' }, it.symbol)
        ]),
        el('span', { key: 'sp', className: 'xq-spacer' }),
        el('span', { key: 'c', className: colorOf(it.percent) }, fmt(it.current)),
        el('span', { key: 'p', className: colorOf(it.percent) }, fmtPct(it.percent)),
        el('button', { key: 'd', className: 'xq-btn-mini', onClick: function (e) { e.stopPropagation(); p.openDetail(it.symbol) } }, '详情')
      ])
    }))
  ])
}

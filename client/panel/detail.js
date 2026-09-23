// 详情 tab（个股）：报价头 + 统计卡 + 走势（K线/分时）+ 财务 + 热议用户。
// 显式上下文 p：
//   p.detail / p.view / p.setView / p.chartMode / p.setChartMode
//   p.klinePeriod / p.setKlinePeriod / p.fetchEarlierKline
import { el } from '../dom.js'
import { fmt, fmtBig, fmtPct, fmtVol, colorOf } from '../format.js'
import { KlineChart } from '../charts/kline.js'
import { MinuteChart } from '../charts/minute.js'
import { KLINE_PERIODS, PERIOD_LABELS } from '../constants.js'

export function DetailView(p) {
  if (!p.detail) return el('div', { className: 'xq-loading' }, '加载中…')
  const q = p.detail.quote || {}
  const kl = p.detail.kline || { rows: [] }
  const mn = p.detail.minute || { items: [], last_close: null }
  const fin = p.detail.finance || { list: [] }
  const kol = p.detail.kol || []
  const firstFin = fin.list && fin.list.length ? fin.list[0] : null
  const stats = [
    ['今开', fmt(q.open)], ['昨收', fmt(q.last_close)], ['最高', fmt(q.high)], ['最低', fmt(q.low)],
    ['成交量', fmtVol(q.volume, q.symbol)], ['成交额', fmtBig(q.amount)], ['换手率', fmt(q.turnover_rate) + '%'], ['振幅', fmt(q.amplitude) + '%'],
    ['总市值', fmtBig(q.market_capital)], ['流通市值', fmtBig(q.float_market_capital)], ['量比', fmt(q.volume_ratio)], ['PE(TTM)', fmt(q.pe_ttm)],
    ['PB', fmt(q.pb)], ['股息率', fmt(q.dividend_yield) + '%'], ['52周高', fmt(q.high52w)], ['52周低', fmt(q.low52w)]
  ]
  const finStats = firstFin ? [
    ['ROE', fmt(firstFin.avg_roe) + '%'], ['EPS', fmt(firstFin.basic_eps)],
    ['毛利率', fmt(firstFin.gross_selling_rate) + '%'], ['净利率', fmt(firstFin.net_selling_rate) + '%'],
    ['营收同比', fmt(firstFin.operating_income_yoy) + '%'], ['净利同比', fmt(firstFin.net_profit_atsopc_yoy) + '%'],
    ['资产负债率', fmt(firstFin.asset_liab_ratio) + '%'], ['每股现金流', fmt(firstFin.operate_cash_flow_ps)]
  ] : []
  const kolKids = kol.map(function (u) {
    return el('span', { key: u.id, className: 'xq-kol-chip' }, [
      u.screen_name || ('用户' + u.id),
      u.verified ? el('span', { key: 'v', className: 'xq-verif' }, '✓') : null,
      ' · ' + fmtBig(u.followers_count) + '粉'
    ])
  })
  // 行情主标题：现价 + 涨跌额 + 涨跌幅（参考雪球 ¥18.23 +0.14 +0.77% 层级）
  // 精度取现价自身小数位（港交所 1 位等），涨跌额同精度
  const qDigits = (function () {
    const m = String(q.current == null ? '' : q.current).split('.')
    const d = m[1] ? m[1].length : 0
    return Math.max(2, Math.min(4, d))
  })()
  const chgRaw = (q.current != null && q.last_close != null) ? (Number(q.current) - Number(q.last_close)) : null
  const chgStr = (chgRaw != null && isFinite(chgRaw)) ? (chgRaw > 0 ? '+' + fmt(chgRaw, qDigits) : (chgRaw < 0 ? '-' + fmt(Math.abs(chgRaw), qDigits) : fmt(0, qDigits))) : ''
  const priceCls = colorOf(q.percent)
  return el('div', null, [
    el('div', { key: 'h', className: 'xq-detail-head' }, [
      el('button', { key: 'b', className: 'xq-btn-mini', onClick: function () { p.setView(null) } }, '← 返回'),
      el('span', { key: 'n', className: 'xq-detail-name' }, q.name || p.view),
      el('span', { key: 'c', className: 'xq-detail-code' }, p.view),
      el('span', { key: 'sp', className: 'xq-spacer' }),
      el('div', { key: 'px', className: 'xq-detail-price' }, [
        el('span', { key: 'cur', className: 'xq-detail-cur ' + priceCls }, fmt(q.current, qDigits)),
        el('span', { key: 'dl', className: 'xq-detail-delta' }, [
          chgStr ? el('span', { key: 'chg', className: 'xq-detail-chg ' + priceCls }, chgStr) : null,
          el('span', { key: 'pct', className: 'xq-detail-pct ' + priceCls }, fmtPct(q.percent))
        ])
      ])
    ]),
    el('div', { key: 'st', className: 'xq-stats' }, stats.map(function (s, i) {
      return el('div', { key: i, className: 'xq-stat' }, [
        el('div', { key: 'k', className: 'xq-stat-k' }, s[0]),
        el('div', { key: 'v', className: 'xq-stat-v' }, s[1])
      ])
    })),
    el('div', { key: 'kl', className: 'xq-card' }, [
      el('div', { key: 't', className: 'xq-card-t' }, [
        el('span', { key: 't' }, '走势'),
        el('span', { key: 'modes', className: 'xq-modes' }, [
          el('button', { key: 'k', className: p.chartMode === 'kline' ? 'xq-on' : '', onClick: function () { p.setChartMode('kline') } }, 'K线'),
          el('button', { key: 'm', className: p.chartMode === 'minute' ? 'xq-on' : '', onClick: function () { p.setChartMode('minute') } }, '分时')
        ]),
        el('span', { key: 'sp', className: 'xq-spacer' }),
        p.chartMode === 'kline' ? el('span', { key: 'pd', className: 'xq-periods' }, (function () {
          // 注：内层 map 参数原为 p（与显式上下文参数 p 撞名），改名 k —— 纯改名，行为不变
          const ps = KLINE_PERIODS
          const lb = PERIOD_LABELS
          return ps.map(function (k) {
            return el('button', {
              key: k, className: p.klinePeriod === k ? 'xq-on' : '',
              onClick: function () { p.setKlinePeriod(k) }
            }, lb[k] || k)
          })
        })()) : null
      ]),
      p.chartMode === 'kline'
        ? el(KlineChart, { key: 'k' + p.view + p.klinePeriod, symbol: p.view, period: p.klinePeriod, rows: kl.rows, onNeedEarlier: p.fetchEarlierKline })
        : el(MinuteChart, { key: 'm' + p.view, symbol: p.view, items: mn.items, lastClose: mn.last_close })
    ]),
    firstFin ? el('div', { key: 'fin', className: 'xq-card' }, [
      el('div', { key: 't', className: 'xq-card-t' }, '财务指标 · ' + (firstFin.report_name || '')),
      el('div', { key: 'g', className: 'xq-stats' }, finStats.map(function (s, i) {
        return el('div', { key: i, className: 'xq-stat' }, [
          el('div', { key: 'k', className: 'xq-stat-k' }, s[0]),
          el('div', { key: 'v', className: 'xq-stat-v' }, s[1])
        ])
      }))
    ]) : null,
    kolKids.length ? el('div', { key: 'kol', className: 'xq-card' }, [
      el('div', { key: 't', className: 'xq-card-t' }, '热议用户'),
      el('div', { key: 'l', className: 'xq-kol' }, kolKids)
    ]) : null
  ])
}

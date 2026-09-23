// 分时图（面积价线 + 昨收虚线 + 均价线 + 十字光标 tooltip）。
import { el } from '../dom.js'
import { fmt, fmtPct, fmtTime, fmtDay, colorOf } from '../format.js'
import { klcLib, klcSetup, klcNoLib, klcPrecision, cssVarColor, klcPalette } from './setup.js'
import { MINUTE_TIP_WRAP_FALLBACK } from '../constants.js'

// ---------- 分时图（面积价线 + 昨收虚线 + 均价线 + 十字光标 tooltip） ----------
export function MinuteChart(props) {
  const items = props.items || []
  const lastClose = Number(props.lastClose) || 0
  const boxRef = React.useRef(null)
  const wrapRef = React.useRef(null)
  const [noLib, setNoLib] = React.useState(false)
  const [hi, setHi] = React.useState(null)
  const baseRef = React.useRef({ lastClose: lastClose })
  baseRef.current = { lastClose: lastClose }
  // 分时数据是详情页渐进渲染晚到的一块（quote+kline 先上屏、minute 随后 merge）：
  // effect 依赖 [] 曾导致空 items 挂载后数据到达永不刷新（空白图）。改为「空数据不挂图表，
  // 数据到达（hasData 变 true）时重建」，彻底消除竞态窗口。
  const hasData = items.length > 0

  React.useEffect(function () {
    const K = klcLib()
    if (!K || !boxRef.current) { setNoLib(true); return undefined }
    if (!hasData) return undefined   // 数据未到：不建图表（等 hasData 变 true 重建）
    // 自定义指标：昨收虚线 + 均价线（series normal → 单独附图，避免干扰价格轴刻度）
    // 注意：registerIndicator 全局只注册一次，calc 闭包捕获的是首次挂载实例的 baseRef——
    // 切换股票后旧 calc 仍读旧实例的昨收（宁德分时曾因此挂上茅台昨收 1304，y 轴被撑爆成直线）。
    // 因此每次挂载都 overrideIndicator 换成绑定当前 baseRef 的新 calc。
    if (K.getSupportedIndicators().indexOf('xq-minute') < 0) {
      K.registerIndicator({
        name: 'xq-minute', shortName: '分时', series: 'normal',
        calc: function (dataList) {
          const base = baseRef.current.lastClose
          return dataList.map(function (d) {
            return { avg: Number(d.avg_price != null ? d.avg_price : d.close), base: base }
          })
        },
        figures: [
          { key: 'base', title: '昨收: ', type: 'line', styles: function () { return { style: 'dashed', size: 1, color: cssVarColor('--dsw-alias-label-secondary', '#8a8f98') } } },
          { key: 'avg', title: '均价: ', type: 'line', styles: function () { return { style: 'solid', size: 1, color: cssVarColor('--dsw-alias-state-warn-primary', '#f59e0b') } } }
        ]
      })
    }
    const h = klcSetup(K, boxRef, 'minute')
    if (!h) { setNoLib(true); return undefined }
    const chart = h.chart
    // 数据映射：分时 items → KLineData（current 充当 o/h/l/c；avg_price/pct 挂扩展字段供指标与 tooltip 用）
    const toBars = function (list, lclose) {
      return (list || []).map(function (it) {
        const c = Number(it.current)
        const pct = lclose ? (c - lclose) / lclose * 100 : (it.percent != null ? Number(it.percent) : null)
        return {
          timestamp: Number(it.timestamp), open: c, high: Number(it.high) || c, low: Number(it.low) || c, close: c,
          volume: Number(it.volume) || 0, avg_price: it.avg_price, pct: pct
        }
      }).filter(function (d) { return d.timestamp > 0 })
    }
    const barsRef = { v: toBars(items, lastClose) }
    // 顺序要求（实测 v10）：setPeriod → setSymbol → setDataLoader（挂载 loader 触发唯一一次 init；
    // 不 setPeriod 则 crosshair 不触发，setSymbol 先于 setPeriod 会双 init 重复叠加数据）
    chart.setPeriod({ type: 'minute', span: 1 })
    chart.setSymbol({ ticker: props.symbol || 'xq', pricePrecision: klcPrecision(barsRef.v, props.precision), volumePrecision: 2 })
    chart.setDataLoader({
      getBars: function (params) {
        if (params.type === 'init') params.callback(barsRef.v, { backward: false, forward: false })
        else params.callback([], { backward: false, forward: false })
      }
    })
    const last = items.length ? Number(items[items.length - 1].current) : 0
    const up = lastClose ? last >= lastClose : true
    // 涨跌色改面积线色（palette up 色对A股即"涨"）
    chart.setStyles({ candle: { type: 'area', area: { lineColor: up ? klcPalette().up : klcPalette().down, backgroundColor: up ? 'rgba(239,68,68,0.10)' : 'rgba(34,197,94,0.10)' } } })
    chart.createIndicator({ name: 'xq-minute', paneId: 'candle_pane' })   // 均价/昨收叠加到主图分时曲线（与雪球一致）
    // 绑定当前实例 baseRef 的 calc（防跨股票串昨收，见上方注释）
    chart.overrideIndicator({ name: 'xq-minute', calc: function (dataList) {
      const base = baseRef.current.lastClose
      return dataList.map(function (d) {
        return { avg: Number(d.avg_price != null ? d.avg_price : d.close), base: base }
      })
    } })
    // 分时固定视角：禁缩放拖拽，全部笔数铺满宽度
    chart.setZoomEnabled(false)
    chart.setScrollEnabled(false)
    chart.setOffsetRightDistance(4)
    if (items.length > 1 && boxRef.current.clientWidth) {
      chart.setBarSpace(Math.max(boxRef.current.clientWidth / (items.length + 6), 0.1))
    }
    // v10.0.2 的 onCrosshairChange 事件只带 {x,y,paneId}（文档声称的 kLineData 字段实际未填），
    // 用 convertFromPixel 反查 dataIndex，再从自有 bars 取明细
    chart.subscribeAction('onCrosshairChange', function (d) {
      if (!d || typeof d.x !== 'number') { setHi(null); return }
      let p = null
      try { const r = chart.convertFromPixel([{ x: d.x, y: d.y }]); p = r && r[0] } catch (e) { /* 忽略 */ }
      const di = p && typeof p.dataIndex === 'number' ? p.dataIndex : -1
      if (di >= 0 && di < barsRef.v.length) setHi({ r: barsRef.v[di], x: d.x })
      else setHi(null)
    })
    return function () {
      try { chart.unsubscribeAction('onCrosshairChange') } catch (e) { /* 忽略 */ }
      h.dispose()
    }
  }, [hasData, props.symbol])

  if (noLib) return klcNoLib()
  if (!hasData) return el('div', { className: 'xq-chart-wrap', style: { display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dsw-alias-label-secondary)', fontSize: 12 } }, '分时数据加载中…')
  // 十字光标 tooltip（沿用 .xq-tip 卡片）
  let tip = null
  if (hi && hi.r) {
    const r = hi.r
    const pct = r.pct != null ? Number(r.pct) : null
    const wrapW = (wrapRef.current && wrapRef.current.offsetWidth) || MINUTE_TIP_WRAP_FALLBACK
    const x = typeof hi.x === 'number' ? hi.x : 0
    tip = el('div', {
      key: 'tip', className: 'xq-tip',
      style: { left: x + 'px', transform: x > wrapW * 0.55 ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)' }
    }, [
      el('div', { key: 'd', className: 'xq-tip-d' }, fmtTime(r.timestamp)),
      el('div', { key: 'r1', className: 'xq-tip-r' }, [
        el('span', { key: 'p', className: colorOf(pct) }, [el('span', { key: 'k', className: 'xq-tip-k' }, '价 '), fmt(r.close)]),
        el('span', { key: 'a' }, [el('span', { key: 'k', className: 'xq-tip-k' }, '均价 '), fmt(r.avg_price)]),
        el('span', { key: 'g', className: colorOf(pct) }, [el('span', { key: 'k', className: 'xq-tip-k' }, '涨跌 '), fmtPct(pct)])
      ])
    ])
  }
  return el('div', { className: 'xq-chart-wrap', ref: wrapRef }, [
    tip,
    el('div', { key: 'c', ref: boxRef, className: 'xq-klc xq-klc-min' }),
    el('div', { key: 'lb', className: 'xq-chart-labels' }, [
      el('span', { key: 'd' }, items.length ? fmtDay(items[0].timestamp) + ' 分时' : ''),
      el('span', { key: 'n' }, items.length + ' 笔')
    ])
  ])
}

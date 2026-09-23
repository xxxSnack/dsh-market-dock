// K线蜡烛图（KLineChart：内置 MA/VOL、滚轮缩放、拖拽平移、右拖自动加载更早历史）。
import { el } from '../dom.js'
import { fmtDay } from '../format.js'
import { klcLib, klcSetup, klcNoLib, klcNormRows, klcPrecision } from './setup.js'
import { KLC_PERIOD_MAP } from '../constants.js'

export function KlineChart(props) {
  const rows = props.rows || []
  const onNeedEarlier = props.onNeedEarlier || null
  const boxRef = React.useRef(null)
  const [noLib, setNoLib] = React.useState(false)
  const propsRef = React.useRef(null)
  propsRef.current = { rows: rows, onNeedEarlier: onNeedEarlier }

  // v1.22.10 起周期切换只清 kline 数据不重建详情骨架，图表可能先以空 rows 挂载、
  // 数据后到——与 MinuteChart 的 hasData 同款门控：空数据不建图，rows 到达时重建
  const hasRows = rows.length > 0
  React.useEffect(function () {
    const K = klcLib()
    if (!K || !boxRef.current) { setNoLib(true); return undefined }
    if (!hasRows) return undefined
    const h = klcSetup(K, boxRef, 'kline')
    if (!h) { setNoLib(true); return undefined }
    const chart = h.chart
    let busy = false
    // 顺序要求（实测 v10）：setPeriod → setSymbol → setDataLoader。若 setSymbol 在 setPeriod 之前，
    // 两者各触发一次 init 导致数据重复叠加；setPeriod 必须设置，否则 crosshair 不触发。
    const pm = KLC_PERIOD_MAP
    chart.setPeriod(pm[props.period] || { type: 'day', span: 1 })
    chart.setSymbol({ ticker: props.symbol || 'xq', pricePrecision: klcPrecision(rows, props.precision), volumePrecision: 2 })
    chart.setDataLoader({
      getBars: function (params) {
        const done = params.callback
        if (params.type === 'init') {
          done(klcNormRows(propsRef.current.rows), { forward: true, backward: false })
          return
        }
        // v10 语义（源码 _processDataLoad/_addData）：'backward'=锚定最后一根、concat 到尾部，即拉"更新"数据
        // （盘中右缘新K线）；'forward'=锚定第一根、前插，即拉"更早"历史（右拖触底）。A股场景无实时增量，backward 恒空。
        if (params.type !== 'forward' || busy) { done([], { forward: false, backward: false }); return }
        const fetch = propsRef.current.onNeedEarlier
        if (!fetch) { done([], { forward: false, backward: false }); return }
        busy = true
        Promise.resolve(fetch(params.timestamp)).then(function (fresh) {
          busy = false
          const add = (fresh || []).filter(function (r) { return r.timestamp < params.timestamp })
          done(add, { forward: add.length > 0, backward: false })
        }, function () { busy = false; done([], { forward: false, backward: false }) })
      }
    })
    // 均线叠加到主图蜡烛 pane（paneId 指定已有主图，不传则默认新开附图 pane）——与雪球一致
    chart.createIndicator({ name: 'MA', paneId: 'candle_pane' })
    chart.createIndicator('VOL')
    chart.setOffsetRightDistance(16)
    // 双击回最新（标签文案承诺过；kline v10 自带 dblclick 仅做空十字，需手动 scrollToRealTime）
    // 拖拽光标反馈已统一在 klcSetup（K线/分时共用）
    const box = boxRef.current
    const onDbl = function () { try { chart.scrollToRealTime() } catch (e) { /* 忽略 */ } }
    box.addEventListener('dblclick', onDbl)
    return function () {
      // 卸载清理时 boxRef.current 已被 React 置 null（切 tab 触发，曾致槽位整体崩溃），须闭包捕获节点
      try { box.removeEventListener('dblclick', onDbl) } catch (e) { /* 忽略 */ }
      h.dispose()
    }
  }, [hasRows])

  if (noLib) return klcNoLib()
  const norm = rows.length && !rows[0].timestamp ? klcNormRows(rows) : rows
  return el('div', { className: 'xq-chart-wrap' }, [
    el('div', { key: 'c', ref: boxRef, className: 'xq-klc' }),
    el('div', { key: 'lb', className: 'xq-chart-labels' }, [
      el('span', { key: 'd' }, norm.length ? fmtDay(norm[0].timestamp) + ' ~ ' + fmtDay(norm[norm.length - 1].timestamp) : ''),
      el('span', { key: 'n' }, norm.length + ' 根 · 滚轮缩放 · 右拖加载更早 · 双击回最新')
    ])
  ])
}

// 图表引擎：KLineChart v10（canvas）。初始化 / 主题同步 / 尺寸自适应 / 销毁 与具体图表无关的部分都在这里。
import { el } from '../dom.js'

// ---------- 图表引擎：KLineChart v10（canvas；UMD 由 tools/build.mjs 内联进静态形态，动态调试会话无库时降级提示） ----------
// 选型对比（2026-08，实测 gzip 体积）：KLineChart 10.0.2 59.8KB vs lightweight-charts 5.2.1 62.3KB vs ECharts ~330KB。
// 胜出理由：零依赖、A股原生观感（红涨绿跌）、内置 MA/VOL 指标与十字光标 legend、dataLoader 反向加载直接对接右拖拉历史。
export function klcLib() {
  try { return (typeof window !== 'undefined' && window.klinecharts) || null } catch (e) { return null }
}

export function cssVarColor(name, fallback) {
  try {
    // 主题令牌定义在 <body>（GUI 主题层），<html> 上读不到——曾因此永远拿不到令牌、
    // 双主题都渲染硬编码回退色（浅色下图例 #8a8f98 对白底对比度仅 ~1.8:1）
    let v = getComputedStyle(document.body).getPropertyValue(name).trim()
    if (!v) v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return v || fallback
  } catch (e) { return fallback }
}

// canvas 不能用 CSS 变量，主题色在 init/主题变化时解析为具体色值
export function klcPalette() {
  return {
    up: cssVarColor('--dsw-alias-state-error-primary', '#ef4444'),
    down: cssVarColor('--dsw-alias-state-success-primary', '#22c55e'),
    grid: cssVarColor('--dsw-alias-border-l2', 'rgba(128,128,128,0.25)'),
    text: cssVarColor('--dsw-alias-label-secondary', '#8a8f98'),
    warn: cssVarColor('--dsw-alias-state-warn-primary', '#f59e0b')
  }
}

export function klcStyles(kind, pal) {
  const s = {
    grid: { horizontal: { color: pal.grid }, vertical: { show: false } },
    candle: {
      bar: {
        upColor: pal.up, downColor: pal.down, noChangeColor: pal.text,
        upBorderColor: pal.up, downBorderColor: pal.down, noChangeBorderColor: pal.text,
        upWickColor: pal.up, downWickColor: pal.down, noChangeWickColor: pal.text
      },
      // OHLC 图例：K线常显最新一根（v1.22.5 起紧凑中文单行、字号 10，不再压蜡烛）；
      // 悬停十字光标时跟随显示对应根；分时在下方 minute 分支整体关闭。
      // 默认英文 time/open/... 标题太长会折成两行——已换中文单行
      tooltip: {
        showRule: 'always',
        title: { show: false },
        legend: {
          size: 10, color: pal.text,
          template: [
            { title: '开', value: '{open}' }, { title: '高', value: '{high}' },
            { title: '低', value: '{low}' }, { title: '收', value: '{close}' },
            { title: '量', value: '{volume}' }
          ]
        }
      },
      priceMark: {
        // 关闭最高/最低点重复标注（窄图时易与坐标轴重叠成杂乱数字），保留最新价标
        high: { show: false }, low: { show: false },
        last: { upColor: pal.up, downColor: pal.down, noChangeColor: pal.text, text: { color: pal.text } }
      }
    },
    indicator: {
      bars: [{ upColor: pal.up, downColor: pal.down, noChangeColor: pal.text }],
      // 和谐 MA 配色：蓝/橙/紫/青，多均线更易区分（对齐雪球观感）
      lines: [{ color: '#3b82f6' }, { color: '#f59e0b' }, { color: '#8b5cf6' }, { color: '#06b6d4' }],
      // MA 数值悬停显示（蜡烛图例一行 + MA 图例一行，同雪球）；常驻关闭避免压图
      tooltip: { showRule: 'follow_cross' }
    },
    xAxis: { axisLine: { color: pal.grid }, tickLine: { color: pal.grid }, tickText: { color: pal.text } },
    yAxis: { axisLine: { color: pal.grid }, tickLine: { color: pal.grid }, tickText: { color: pal.text } },
    separator: { color: pal.grid },
    crosshair: {
      horizontal: { line: { color: pal.text }, text: { backgroundColor: pal.text } },
      vertical: { line: { color: pal.text }, text: { backgroundColor: pal.text } }
    }
  }
  if (kind === 'minute') {
    // 分时：面积图 + 昨收虚线 + 均价线（xq-minute 指标），涨跌色由调用方按收盘定
    s.candle.type = 'area'
    s.candle.area = { lineSize: 1.4, lineColor: pal.up, backgroundColor: 'rgba(239,68,68,0.10)', value: 'close', smooth: false }
    s.candle.priceMark = { high: { color: pal.text }, low: { color: pal.text }, last: { upColor: pal.up, downColor: pal.down, noChangeColor: pal.text, text: { color: pal.text } } }
    // 分时悬停信息已由自定义 .xq-tip（价/均价/涨跌）承担；面积图开=高=低=收同值，
    // canvas OHLC 图例纯冗余且与 .xq-tip 双份叠加 → 蜡烛与指标图例整体关闭
    s.candle.tooltip = { showRule: 'none' }
    s.indicator = { tooltip: { showRule: 'none' } }
  }
  return s
}

// 通用图表生命周期：init + 主题监听 + 尺寸自适应，返回清理函数
export function klcSetup(K, boxRef, kind) {
  const chart = K.init(boxRef.current, { styles: klcStyles(kind, klcPalette()) })
  if (!chart) return null
  // 卸载清理时 boxRef.current 已被 React 置 null，dispose 须用闭包捕获的节点
  const box = boxRef.current
  let ro = null
  try {
    ro = new ResizeObserver(function () { chart.resize() })
    ro.observe(boxRef.current)
  } catch (e) { /* 旧环境无 RO */ }
  let mo = null
  try {
    mo = new MutationObserver(function () { chart.setStyles(klcStyles(kind, klcPalette())) })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })
  } catch (e) { /* 忽略 */ }
  // GUI 跟随系统配色时 DOM 属性不变（上面的 MutationObserver 永不触发），
  // 主题翻转唯一可靠信号是 matchMedia change
  let mqOff = null
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onScheme = function () { try { chart.setStyles(klcStyles(kind, klcPalette())) } catch (e) { /* ignore */ } }
    if (mq.addEventListener) { mq.addEventListener('change', onScheme); mqOff = function () { mq.removeEventListener('change', onScheme) } }
    else if (mq.addListener) { mq.addListener(onScheme); mqOff = function () { mq.removeListener(onScheme) } }
  } catch (e) { /* ignore */ }
  // 拖拽光标反馈（K线/分时共用）：悬停小手、按住抓手（松手点可能在图外，需 window 级兜底复位）
  const onCurDown = function () { try { box.classList.add('xq-dragging') } catch (e) { /* 忽略 */ } }
  const onCurUp = function () { try { box.classList.remove('xq-dragging') } catch (e) { /* 忽略 */ } }
  try {
    box.addEventListener('mousedown', onCurDown)
    box.addEventListener('mouseup', onCurUp)
    box.addEventListener('mouseleave', onCurUp)
    window.addEventListener('mouseup', onCurUp)
  } catch (e) { /* 忽略 */ }
  return {
    chart: chart,
    dispose: function () {
      if (ro) ro.disconnect()
      if (mo) mo.disconnect()
      if (mqOff) mqOff()
      try {
        box.removeEventListener('mousedown', onCurDown)
        box.removeEventListener('mouseup', onCurUp)
        box.removeEventListener('mouseleave', onCurUp)
        window.removeEventListener('mouseup', onCurUp)
      } catch (e) { /* 忽略 */ }
      // 卸载清理时 boxRef.current 已被 React 置 null（与 dblclick 监听同类坑），须闭包捕获节点
      try { K.dispose(box) } catch (e) { /* 忽略 */ }
    }
  }
}

export function klcNoLib() {
  return el('div', { className: 'xq-muted', style: { padding: '24px 0', textAlign: 'center' } },
    '图表引擎（KLineChart）未加载：静态安装形态自带，动态调试会话不含 vendored 库')
}

// rows 归一化：面板行为 {timestamp(ms),open,high,low,close,volume}；卡片行为 {time(ISO),...} → 补 timestamp
export function klcNormRows(rows) {
  return (rows || []).map(function (r) {
    if (r.timestamp) return r
    const t = r.time ? Date.parse(r.time) : NaN
    return Object.assign({}, r, { timestamp: isNaN(t) ? 0 : t })
  }).filter(function (r) { return r.timestamp > 0 })
}

export function klcPrecision(rows, hint) {
  if (hint != null) return hint
  try {
    const s = String(rows.length ? rows[rows.length - 1].close : '')
    const d = (s.split('.')[1] || '').length
    return Math.max(0, Math.min(4, d || 2))
  } catch (e) { return 2 }
}

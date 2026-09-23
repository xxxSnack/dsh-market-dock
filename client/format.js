// 纯格式化：数字 / 百分比 / 大数 / 成交量 / 时间 / 涨跌配色。全部无副作用、无外部依赖。

export function fmt(v, d) {
  if (v === null || v === undefined || v === '') return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  const digits = (d === undefined) ? 2 : d
  return n.toFixed(digits)
}
export function fmtPct(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}
export function fmtBig(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + '亿'
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(2) + '万'
  return String(n)
}
// 雪球 volume 字段全市场均为「股」（实证：amount/volume ≈ price，含A股/港/美/ETF/指数，
// quote/kline/minute 三接口一致）。A股口径按 1手=100股 换算显示；港/美直接以股计。
export function fmtVol(v, symbol) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  const cn = /^(SH|SZ|BJ)/i.test(String(symbol || ''))
  const lots = cn ? n / 100 : n
  const unit = cn ? '手' : '股'
  if (lots >= 1e8) return (lots / 1e8).toFixed(2) + '亿' + unit
  if (lots >= 1e4) return (lots / 1e4).toFixed(2) + '万' + unit
  return (cn ? String(Math.round(lots)) : String(lots)) + unit
}
export function fmtTime(ts) {
  if (!ts) return ''
  const d = new Date(Number(ts))
  function p(n) { return n < 10 ? '0' + n : String(n) }
  return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
}
export function fmtDay(ts) {
  if (!ts) return ''
  const d = new Date(Number(ts))
  function p(n) { return n < 10 ? '0' + n : String(n) }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
export function fmtFullDay(ts) {
  if (!ts) return ''
  const d = new Date(Number(ts))
  function p(n) { return n < 10 ? '0' + n : String(n) }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
export function colorOf(pct) {
  if (pct === null || pct === undefined) return 'xq-flat'
  const n = Number(pct)
  if (n > 0) return 'xq-up'
  if (n < 0) return 'xq-down'
  return 'xq-flat'
}
export function upColor(up) { return up ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-state-success-primary)' }

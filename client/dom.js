// 渲染与 DOM 小工具：createElement 简写、视口、页面可见性、交易时段判定。
// 注：React 不 import —— 静态形态由 wrapper 以 react seed 门面提供，动态形态由运行时注入全局。

export function el(type, props, children) { return React.createElement(type, props, children) }

export function viewport() {
  try { if (typeof window !== 'undefined' && window.innerWidth) return { w: window.innerWidth, h: window.innerHeight } } catch (e) { /* ignore */ }
  try { if (typeof document !== 'undefined' && document.documentElement && document.documentElement.clientWidth) return { w: document.documentElement.clientWidth, h: document.documentElement.clientHeight } } catch (e) { /* ignore */ }
  return null
}

export function pageHidden() {
  try { return typeof document !== 'undefined' && document.hidden } catch (e) { return false }
}

// 交易时段：本地 Intl 时区判定（不含节假日，仅供参考）
// segs: [[开盘分,收盘分],...]；lunch: [午休起,午休止]（可选）
export function sessionState(tz, segs, lunch) {
  try {
    var now = new Date()
    var f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit' })
    var p = {}
    f.formatToParts(now).forEach(function (x) { p[x.type] = x.value })
    if (p.weekday === 'Sat' || p.weekday === 'Sun') return '休市'
    var h = parseInt(p.hour, 10) % 24
    var cur = h * 60 + parseInt(p.minute, 10)
    var inSess = segs.some(function (s) { return cur >= s[0] && cur < s[1] })
    if (inSess) return '盘中'
    if (lunch && cur >= lunch[0] && cur < lunch[1]) return '午休'
    return cur < segs[0][0] ? '盘前' : '休市'
  } catch (e) { return '' }
}
export function aSession() { return sessionState('Asia/Shanghai', [[570, 690], [780, 900]], [690, 780]) }
export function hkSession() { return sessionState('Asia/Hong_Kong', [[570, 720], [780, 960]], [720, 780]) }
export function usSession() { return sessionState('America/New_York', [[570, 960]], null) }
export function sessionsText() {
  var a = aSession(), hk = hkSession(), us = usSession()
  if (!a && !hk && !us) return ''
  return [a && 'A股' + a, hk && '港股' + hk, us && '美股' + us].filter(Boolean).join(' · ')
}

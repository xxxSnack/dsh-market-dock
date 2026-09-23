// 由 tools/build.mjs 从 client/ 生成 —— 勿手改；改源后运行 node tools/build.mjs（cordis 动态模块：函数体形式，末尾 return 交出插件对象）
// 常量表：指数代码 / 周期 / 钳制常量 / 轮询间隔 / 请求规模 / 槽位 id 与 order。
// 说明：客户端没有自己的持久化文件键名 —— 界面状态的键由宿主侧 ui.get/ui.set 决定（见 store/ui.js）。
// 这里所有的值都来自重构前的字面量，一一对应，使用点见各常量后的注释。

// ---- 指数代码表：面板指数卡 / 徽标指数区 / 底部指数条三处共用同一组 ----
const XQ_INDEX_SYMBOLS = ['SH000001', 'SZ399001', 'SZ399006', 'SH000688']

// ---- 周期表 ----
// 面板周期丸顺序（不含 1m：面板只给这 7 档）
const KLINE_PERIODS = ['5m', '15m', '30m', '60m', 'day', 'week', 'month']
// 周期显示名：面板周期丸与 KlineCard 共用（KlineCard 会用到 '1m'）
const PERIOD_LABELS = { '1m': '1分', '5m': '5分', '15m': '15分', '30m': '30分', '60m': '60分', day: '日K', week: '周K', month: '月K' }
// KLineChart setPeriod 的周期映射（挂载顺序要求见 charts/kline.js 里的注释）
const KLC_PERIOD_MAP = {
  '5m': { type: 'minute', span: 5 }, '15m': { type: 'minute', span: 15 }, '30m': { type: 'minute', span: 30 },
  '60m': { type: 'hour', span: 1 }, day: { type: 'day', span: 1 }, week: { type: 'week', span: 1 }, month: { type: 'month', span: 1 }
}

// ---- 热榜市场表（数组顺序=按钮顺序）/ 市场显示名（KlineCard/HotCard 用）----
const HOT_MARKETS = [['cn', 'A股'], ['us', '美股'], ['hk', '港股'], ['global', '全球']]
const HOT_MARKET_LABELS = { cn: 'A股', hk: '港股', us: '美股', global: '全球' }

// ---- 面板 tab 条（key + 文案）----
// 顺序：原有 4 项位置不动，盈亏（pnl）为**追加**的第 5 项（宿主 ui.get 的 tab 白名单同步放行）。
const PANEL_TABS = [['market', '行情'], ['hot', '热榜'], ['search', '搜索'], ['news', '快讯'], ['pnl', '盈亏']]

// ---- 请求规模参数（属于 call() 参数形状的一部分，与原字面量一致）----
const NEWS_PAGE_SIZE = 20          // news count
const HOT_LIST_SIZE = 10           // hot size
const KLINE_PAGE_SIZE = 500        // kline count（也用于右拖加载更早历史）
const KOL_SIZE = 6                 // kol count
const SEARCH_STOCK_SIZE = 8        // search count
const SEARCH_POST_SIZE = 10        // searchPosts count
const BADGE_WATCH_LIMIT = 12       // 徽标主体最多展示的自选只数

// ---- 钳制常量 ----
const BADGE_W_MIN = 120            // 徽章宽下限（grip 拖动 / 水合宽度有效性判定）
const BADGE_W_MAX = 480            // 徽章宽上限
const BADGE_W_DEFAULT = 320        // 未设置时的默认区域宽度
const BADGE_CLAMP_MIN_H = 60       // 水合时按「徽章至少 60px 高」估 y 上限
const BADGE_DRAG_THRESHOLD = 4     // 拖拽判定阈值（位移绝对值之和 > 4px 才算拖动）
const EDGE_GAP = 4                 // 距视口边缘的最小留白
const VIEWPORT_FALLBACK_W = 1200   // 取不到视口时的兜底宽
const VIEWPORT_FALLBACK_H = 800    // 取不到视口时的兜底高
const DOCK_H_MIN = 160             // 面板高度下限
const DOCK_H_MAX = 1200            // 面板高度上限
const DOCK_H_VP_RATIO = 0.85       // 面板高度不超过视口高的 85%
const DOCK_H_DEFAULT_RATIO = 0.52  // 未设置时默认视口高的 52%
const DOCK_H_FALLBACK = 420        // 取不到视口时的默认高度
const MINUTE_TIP_WRAP_FALLBACK = 640 // 分时 tooltip 左右翻转用的兜底宽度
const SAVE_UI_DEBOUNCE_MS = 800    // ui.set 落盘 debounce

// ---- 轮询间隔（毫秒）----
const POLL_MARKET_OPEN_MS = 20000     // 面板：盘中行情
const POLL_MARKET_CLOSED_MS = 60000   // 面板：休市行情
const POLL_CONTENT_OPEN_MS = 60000    // 面板：盘中热榜/快讯
const POLL_CONTENT_CLOSED_MS = 180000 // 面板：休市热榜/快讯
const POLL_BADGE_MS = 30000           // 徽标
const POLL_TICKER_MS = 30000          // 底部指数条
const POLL_DOCK_SESSION_MS = 60000    // 面板头部交易时段文案重算
// 今日盈亏：宿主回传的 next_poll_ms 缺失或过密时的兜底间隔（出错退避也用这个值）
const PNL_POLL_FALLBACK_MS = 60000

// ---- 槽位 id 与 order（7 个注册逐一对应，注册顺序见 slots.js）----
const SLOT_TOOLVIEW = 'tool.call.toolview'
const SLOT_INPUT_DOCK = 'conversation.input.dock'
const SLOT_OVERLAY = 'shell.overlay'
const SLOT_COMPOSER_DOCK = 'conversation.composer.dock'
const TOOLVIEW_KEYS = { quote: 'xueqiu_quote', kline: 'xueqiu_kline', hot: 'xueqiu_hot', news: 'xueqiu_news' }
const PANEL_ID = 'xueqiu-debug-panel'
const PANEL_ORDER = 30
const BADGE_ID = 'xueqiu-debug-badge'
const TICKER_ID = 'xueqiu-debug-ticker'
const TICKER_ORDER = 1

// 纯格式化：数字 / 百分比 / 大数 / 成交量 / 时间 / 涨跌配色。全部无副作用、无外部依赖。

function fmt(v, d) {
  if (v === null || v === undefined || v === '') return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  const digits = (d === undefined) ? 2 : d
  return n.toFixed(digits)
}
function fmtPct(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}
function fmtBig(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + '亿'
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(2) + '万'
  return String(n)
}
// 雪球 volume 字段全市场均为「股」（实证：amount/volume ≈ price，含A股/港/美/ETF/指数，
// quote/kline/minute 三接口一致）。A股口径按 1手=100股 换算显示；港/美直接以股计。
function fmtVol(v, symbol) {
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
function fmtTime(ts) {
  if (!ts) return ''
  const d = new Date(Number(ts))
  function p(n) { return n < 10 ? '0' + n : String(n) }
  return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
}
function fmtDay(ts) {
  if (!ts) return ''
  const d = new Date(Number(ts))
  function p(n) { return n < 10 ? '0' + n : String(n) }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
function fmtFullDay(ts) {
  if (!ts) return ''
  const d = new Date(Number(ts))
  function p(n) { return n < 10 ? '0' + n : String(n) }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
function colorOf(pct) {
  if (pct === null || pct === undefined) return 'xq-flat'
  const n = Number(pct)
  if (n > 0) return 'xq-up'
  if (n < 0) return 'xq-down'
  return 'xq-flat'
}
function upColor(up) { return up ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-state-success-primary)' }

// 渲染与 DOM 小工具：createElement 简写、视口、页面可见性、交易时段判定。
// 注：React 不 import —— 静态形态由 wrapper 以 react seed 门面提供，动态形态由运行时注入全局。

function el(type, props, children) { return React.createElement(type, props, children) }

function viewport() {
  try { if (typeof window !== 'undefined' && window.innerWidth) return { w: window.innerWidth, h: window.innerHeight } } catch (e) { /* ignore */ }
  try { if (typeof document !== 'undefined' && document.documentElement && document.documentElement.clientWidth) return { w: document.documentElement.clientWidth, h: document.documentElement.clientHeight } } catch (e) { /* ignore */ }
  return null
}

function pageHidden() {
  try { return typeof document !== 'undefined' && document.hidden } catch (e) { return false }
}

// 交易时段：本地 Intl 时区判定（不含节假日，仅供参考）
// segs: [[开盘分,收盘分],...]；lunch: [午休起,午休止]（可选）
function sessionState(tz, segs, lunch) {
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
function aSession() { return sessionState('Asia/Shanghai', [[570, 690], [780, 900]], [690, 780]) }
function hkSession() { return sessionState('Asia/Hong_Kong', [[570, 720], [780, 960]], [720, 780]) }
function usSession() { return sessionState('America/New_York', [[570, 960]], null) }
function sessionsText() {
  var a = aSession(), hk = hkSession(), us = usSession()
  if (!a && !hk && !us) return ''
  return [a && 'A股' + a, hk && '港股' + hk, us && '美股' + us].filter(Boolean).join(' · ')
}

// 宿主调用层：call() 是对 host.call('xq.call', {action,args}) 的唯一封装，外加全部 action 名常量。
// 两种形态共用同一份源码：静态 bundle 由 wrapper 提供 `const host = { call: …fetch('/xq-rpc') }`，
// 动态形态由运行时注入 host 全局。
//
// action 常量集中在这里，方便一眼核对「客户端↔宿主」的 RPC 契约（宿主 dispatch 表见宿主侧）。

const A_UI_GET = 'ui.get'
const A_UI_SET = 'ui.set'
const A_WATCHLIST_GET = 'watchlist.get'
const A_WATCHLIST_ADD = 'watchlist.add'
const A_WATCHLIST_REMOVE = 'watchlist.remove'
const A_WATCHLIST_PULL = 'watchlist.pull'
const A_QUOTE = 'quote'
const A_QUOTE_DETAIL = 'quoteDetail'
const A_KLINE = 'kline'
const A_MINUTE = 'minute'
const A_HOT = 'hot'
const A_NEWS = 'news'
const A_SEARCH = 'search'
const A_SEARCH_POSTS = 'searchPosts'
const A_LOGIN_STATUS = 'login.status'
const A_LOGIN_SAVE = 'login.save'
const A_LOGIN_LOGOUT = 'login.logout'
const A_FINANCE = 'finance'
const A_KOL = 'kol'
// 今日盈亏（同花顺投资账本）：读快照 / 校验 Cookie / 写配置。宿主实现见 lib/pnl/。
const A_PNL_GET = 'pnl.get'
const A_PNL_VERIFY = 'pnl.verify'
const A_PNL_CONFIG = 'pnl.config'

// 注：用具名 async 函数表达式（构建器只认 `export function|const|let|var|class` 开头的导出行）。
const call = async function (action, args) {
  const r = await host.call('xq.call', { action: action, args: args || {} })
  if (!r || !r.ok) throw new Error((r && r.error) || '调用失败')
  return r.data
}

// UI 共享状态：面板开合 / 当前标签 / 徽章位置尺寸。同时是**运行时持有者（runtime holder）**。
//
// ── 为什么需要持有者 ─────────────────────────────────────────────────────────
// 重构前所有东西都在 apply(ctx) 的闭包里，因此 ui store、saveUi（debounce 包装）、hydratePromise、
// 徽章拖拽引用、面板高度拖拽引用都是「每次 apply 一份」。拆到模块作用域后如果直接写成模块级
// 单例（例如 `const ui = {...}`），就会变成「整个模块生命周期一份」：重新 apply 时旧状态不会
// 重置，多个实例还会互相串状态——这是行为变化。
// 因此这里保留一个模块级变量 `uiRuntime`，由 apply 开头调用 createUiRuntime(ctx) 重建；
// 组件在渲染时通过 getUiRuntime() 取，语义与旧闭包一致：同一 apply 内共享、跨 apply 隔离。
//
// ── fork-fix 集中地（对照 FORK-NOTES.md，四处理由详见行内注释）────────────────
//   1. touched 守卫新增 badgePos/badgeW/dockH（原来是 open/tab 独有）
//   2. ui.set 的落盘条件从 'open' in patch 扩展为位置/尺寸任一
//   3. hydrateUi() 改为应用级、幂等、只跑一次（原来挂在 DockGate 里，切会话会重放）

// 当前 apply 的运行时（每次 apply 一份；组件渲染时经 getUiRuntime() 取）
let uiRuntime = null

function getUiRuntime() { return uiRuntime }

function createUiRuntime(ctx) {
  // ---------- 共享 UI 状态：面板开合 / 当前标签 / 徽章位置 ----------
  const ui = {
    open: false, tab: 'market', badgePos: null, badgeW: null, dockH: null, hydrated: false,
    // [fork-fix] 已交互过的字段不被迟到的水合回滚。open/tab 原本就有这两个标志，位置/尺寸缺失。
    openTouched: false, tabTouched: false, badgePosTouched: false, badgeWTouched: false, dockHTouched: false,
    _fns: [],
    subscribe: function (fn) {
      this._fns.push(fn)
      const self = this
      return function () {
        const i = self._fns.indexOf(fn)
        if (i !== -1) self._fns.splice(i, 1)
      }
    },
    notify: function () {
      const fns = this._fns.slice()
      for (let i = 0; i < fns.length; i++) { try { fns[i]() } catch (e) { /* ignore */ } }
    },
    set: function (patch) {
      let ch = false
      for (const k in patch) {
        if (this[k] !== patch[k]) { this[k] = patch[k]; ch = true }
        // 水合前用户已交互过的字段不做回滚（页面刚加载就点开面板/切标签，不被迟到的旧持久化打回）
        if (k === 'open') this.openTouched = true
        if (k === 'tab') this.tabTouched = true
        // [fork-fix] 位置/尺寸同样要守卫：原来只有 open/tab 有，导致切会话时重放的水合
        // 把刚拖到的徽章位置打回旧持久化值（表现为"切会话后弹回右下角"）。
        if (k === 'badgePos') this.badgePosTouched = true
        if (k === 'badgeW') this.badgeWTouched = true
        if (k === 'dockH') this.dockHTouched = true
      }
      if (ch) {
        this.notify()
        // 打开面板的 set 发生在面板组件订阅建立之前（订阅在挂载后才生效）——
        // 若无人续触发 ui.set，open=true 永远不落盘，刷新后面板关着。open 翻转直接触发落盘。
        // [fork-fix] 原来只有 open 直接落盘：位置/尺寸靠 DockPanel 的订阅间接落盘，
        // 而面板收起时 DockPanel 根本不挂载（DockGate 返回 null）→ 拖徽章永不写入。
        // 改为所有被持久化的键都直接排一次落盘，不再依赖某个组件恰好挂着。
        if ('open' in patch || 'badgePos' in patch || 'badgeW' in patch || 'dockH' in patch) {
          try { saveUi() } catch (e) { /* 初始化前忽略 */ }
        }
      }
    }
  }

  const saveUi = ctx.debounce(function () {
    call(A_UI_SET, { tab: ui.tab, open: ui.open, badgePos: ui.badgePos, badgeW: ui.badgeW, dockH: ui.dockH }).catch(function () { /* 忽略 */ })
  }, SAVE_UI_DEBOUNCE_MS)

  uiRuntime = {
    ctx: ctx,
    ui: ui,
    saveUi: saveUi,
    // 应用级水合 promise（幂等：已发起过就直接复用）
    hydratePromise: null,
    // 徽章拖拽引用（实例唯一）
    badgeDrag: null,
    badgeMoved: false,
    // 面板高度拖拽引用（实例唯一，避免组件重渲染丢失状态）
    dockResize: { active: false, startY: 0, startH: 0, h: 0, body: null }
  }
  return uiRuntime
}

// [fork-fix] 水合改为应用级、幂等、只跑一次。
// 下面四行是重构前的原文（"本组件"= 当时承载这段代码的 DockGate；本函数现已随代码搬到 store/ui.js）：
// ui 是全局状态（不属于任何会话），但原来 ui.get 挂在本组件里，而
// conversation.input.dock 的 scope 是 "session" → 每次切会话重挂都会重放一次水合，
// 把内存里刚拖到的新位置覆盖成旧持久化值。移到 shell.overlay 的 MiniBadge（全局只挂一次）触发。
function hydrateUi() {
  const rt = getUiRuntime()
  const ui = rt.ui
  if (rt.hydratePromise) return rt.hydratePromise
  rt.hydratePromise = call(A_UI_GET, {}).then(function (d) {
    if (d && d.tab && !ui.tabTouched) ui.set({ tab: d.tab })
    if (d && typeof d.open === 'boolean' && !ui.openTouched) ui.set({ open: d.open })
    if (d && d.badgePos && isFinite(Number(d.badgePos.x)) && isFinite(Number(d.badgePos.y)) && !ui.badgePosTouched) {
      // 恢复位置时钳制到当前视口内（视口缩小/分辨率变化后防止徽章落到屏幕外）
      // maxX 必须按徽章实际宽度算：区域模式宽达 480px，固定 -140 会让宽徽章右缘出屏
      const vp = viewport()
      const effW = (typeof d.badgeW === 'number' && isFinite(d.badgeW) && d.badgeW >= BADGE_W_MIN)
        ? Math.min(d.badgeW, BADGE_W_MAX) : BADGE_W_DEFAULT
      const maxX = (vp ? vp.w : VIEWPORT_FALLBACK_W) - effW - EDGE_GAP
      const maxY = (vp ? vp.h : VIEWPORT_FALLBACK_H) - BADGE_CLAMP_MIN_H
      ui.set({ badgePos: {
        x: Math.min(Math.max(EDGE_GAP, Number(d.badgePos.x)), Math.max(EDGE_GAP, maxX)),
        y: Math.min(Math.max(EDGE_GAP, Number(d.badgePos.y)), Math.max(EDGE_GAP, maxY))
      } })
    }
    if (d && typeof d.dockH === 'number' && isFinite(d.dockH) && !ui.dockHTouched) {
      ui.set({ dockH: d.dockH })
    }
    if (d && typeof d.badgeW === 'number' && isFinite(d.badgeW) && !ui.badgeWTouched) {
      ui.set({ badgeW: d.badgeW })
    }
    ui.set({ hydrated: true })
  }).catch(function () { ui.set({ hydrated: true }) })
  return rt.hydratePromise
}

// 行情取数函数：本期只放各组件共用的**纯取数**封装（不引入共享 store、不做缓存/合并请求）。
// 每个函数严格等于重构前散落在各组件里的那一次 call(...) 调用（action 与参数形状不变）。

// 批量行情（面板：指数一组、自选一组；徽标：指数一组、自选前 12 只一组）
function fetchQuote(symbols) { return call(A_QUOTE, { symbols: symbols }) }

// 四大指数（面板指数卡 / 徽标指数区 / 底部指数条共用同一组代码）
function fetchIndices() { return call(A_QUOTE, { symbols: XQ_INDEX_SYMBOLS }) }

// 自选列表（面板 refreshMarket、徽标主体）
function fetchWatchlist() { return call(A_WATCHLIST_GET, {}) }

// 今日盈亏共享状态：运行时持有者（与 store/ui.js 同构）+ **单一轮询器**。
//
// 为什么是「运行时持有者」而不是模块级单例：状态必须每次 apply 一份，模块级单例会在重新 apply
// 时残留旧状态、多实例互相串数据。createPnlRuntime(ctx) 由 client/index.js 的 apply 重建。
//
// 为什么只有一个轮询器：头部 chip 与「盈亏」tab 展示的是**同一份**今日盈亏快照。若两边各轮一次，
// 同一时刻会打两次同花顺上游（有风控，且两边数值可能不一致）。所以取数只发生在这里：
// 订阅者只读 getState()，轮询由引用计数驱动 —— 第一个订阅者启动、最后一个退订停止。
//
// 轮询节奏**由宿主决定**（pnl.get 回传 next_poll_ms）：盘中是心跳，盘外是「睡到下一个 09:30/15:00」。
// 因此非交易时段界面自然冻结在最后一次的值，客户端不需要自己判断交易时段。

// 当前 apply 的运行时（每次 apply 一份）；组件渲染时经 getPnlRuntime() 取。
let pnlRuntime = null

function getPnlRuntime() { return pnlRuntime }

function createPnlRuntime(ctx) {
  const listeners = []

  // 定时器句柄归一化：ctx.timeout 可能返回 stop 函数，也可能返回带 dispose() 的对象。
  function disposer(handle) {
    if (!handle) return null
    if (typeof handle === 'function') return handle
    if (typeof handle.dispose === 'function') return function () { handle.dispose() }
    return null
  }

  // 宿主给的节奏不可信时（缺字段 / 过密）一律回退 60s：宁可慢，也不能把上游打穿。
  function hostDelay(data) {
    const ms = Number(data && data.next_poll_ms)
    if (!isFinite(ms) || ms < 5000) return PNL_POLL_FALLBACK_MS
    return ms
  }

  const rt = {
    ctx: ctx,
    data: null,                    // 最近一次 pnl.get 的返回对象
    status: 'idle',                // 'idle' | 'loading' | 'ready' | 'error'
    error: '',
    listeners: listeners,
    timer: null,                   // 当前排定的下一次轮询（归一化后的 stop 函数）
    inflight: null,                // 并发去重：多处同时触发时复用同一个 promise
    refs: 0,                       // 订阅者引用计数
    active: false,
    delay: PNL_POLL_FALLBACK_MS,   // 上次排定的间隔（页面隐藏时按它重排，不会排出更密的节奏）

    subscribe: function (fn) {
      listeners.push(fn)
      rt.start()
      return function () {
        const i = listeners.indexOf(fn)
        if (i !== -1) listeners.splice(i, 1)
        rt.stop()
      }
    },

    // 每次返回**新对象**：组件用 useState 存它时靠引用比较判断是否变化。
    getState: function () {
      return { data: rt.data, status: rt.status, error: rt.error }
    },

    notify: function () {
      const fns = listeners.slice()
      for (let i = 0; i < fns.length; i++) {
        try { fns[i]() } catch (e) { /* 单个订阅者抛错不影响其他订阅者 */ }
      }
    },

    // force=true 透传给宿主：跳过它的时段缓存判定、立刻打一次上游（「立即刷新」按钮用）。
    refresh: function (force) {
      if (rt.inflight) return rt.inflight
      // 已有数据时不回退到 loading：后台轮询不该把界面上的数字变成省略号。
      if (rt.data === null) { rt.status = 'loading'; rt.notify() }
      const p = call(A_PNL_GET, force ? { force: true } : {}).then(function (data) {
        rt.data = data || null
        rt.status = 'ready'
        rt.error = ''
        rt.inflight = null
        rt.notify()
        return rt.data
      }).catch(function (e) {
        rt.status = 'error'
        rt.error = String((e && e.message) || e)
        rt.inflight = null
        rt.notify()
        return null   // 吞掉拒绝：轮询链不能产生未处理的 Promise 拒绝
      })
      rt.inflight = p
      return p
    },

    start: function () {
      rt.refs++
      if (rt.refs !== 1) return   // 已有轮询器在跑，chip 与 tab 共享它
      rt.active = true
      cycle()
    },

    stop: function () {
      rt.refs--
      if (rt.refs > 0) return
      rt.refs = 0
      rt.active = false
      if (rt.timer) { try { rt.timer() } catch (e) { /* ignore */ } rt.timer = null }
    }
  }

  function arm(ms) {
    if (rt.timer) { try { rt.timer() } catch (e) { /* ignore */ } rt.timer = null }
    rt.delay = ms
    rt.timer = disposer(ctx.timeout(cycle, ms))
  }

  // 一次「取数 → 按宿主给的节奏重排」。
  // 页面隐藏时跳过请求但**照旧等这么久**：重排更密没有意义（页面不可见），
  // 重排更疏又会让回到前台的第一屏变旧。
  function cycle() {
    if (!rt.active) return
    if (pageHidden()) { arm(Math.max(rt.delay, PNL_POLL_FALLBACK_MS)); return }
    rt.refresh().then(function () {
      if (!rt.active) return
      arm(rt.status === 'error' ? PNL_POLL_FALLBACK_MS : hostDelay(rt.data))
    })
  }

  pnlRuntime = rt
  return rt
}

// 图表引擎：KLineChart v10（canvas）。初始化 / 主题同步 / 尺寸自适应 / 销毁 与具体图表无关的部分都在这里。

// ---------- 图表引擎：KLineChart v10（canvas；UMD 由 tools/build.mjs 内联进静态形态，动态调试会话无库时降级提示） ----------
// 选型对比（2026-08，实测 gzip 体积）：KLineChart 10.0.2 59.8KB vs lightweight-charts 5.2.1 62.3KB vs ECharts ~330KB。
// 胜出理由：零依赖、A股原生观感（红涨绿跌）、内置 MA/VOL 指标与十字光标 legend、dataLoader 反向加载直接对接右拖拉历史。
function klcLib() {
  try { return (typeof window !== 'undefined' && window.klinecharts) || null } catch (e) { return null }
}

function cssVarColor(name, fallback) {
  try {
    // 主题令牌定义在 <body>（GUI 主题层），<html> 上读不到——曾因此永远拿不到令牌、
    // 双主题都渲染硬编码回退色（浅色下图例 #8a8f98 对白底对比度仅 ~1.8:1）
    let v = getComputedStyle(document.body).getPropertyValue(name).trim()
    if (!v) v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return v || fallback
  } catch (e) { return fallback }
}

// canvas 不能用 CSS 变量，主题色在 init/主题变化时解析为具体色值
function klcPalette() {
  return {
    up: cssVarColor('--dsw-alias-state-error-primary', '#ef4444'),
    down: cssVarColor('--dsw-alias-state-success-primary', '#22c55e'),
    grid: cssVarColor('--dsw-alias-border-l2', 'rgba(128,128,128,0.25)'),
    text: cssVarColor('--dsw-alias-label-secondary', '#8a8f98'),
    warn: cssVarColor('--dsw-alias-state-warn-primary', '#f59e0b')
  }
}

function klcStyles(kind, pal) {
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
function klcSetup(K, boxRef, kind) {
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

function klcNoLib() {
  return el('div', { className: 'xq-muted', style: { padding: '24px 0', textAlign: 'center' } },
    '图表引擎（KLineChart）未加载：静态安装形态自带，动态调试会话不含 vendored 库')
}

// rows 归一化：面板行为 {timestamp(ms),open,high,low,close,volume}；卡片行为 {time(ISO),...} → 补 timestamp
function klcNormRows(rows) {
  return (rows || []).map(function (r) {
    if (r.timestamp) return r
    const t = r.time ? Date.parse(r.time) : NaN
    return Object.assign({}, r, { timestamp: isNaN(t) ? 0 : t })
  }).filter(function (r) { return r.timestamp > 0 })
}

function klcPrecision(rows, hint) {
  if (hint != null) return hint
  try {
    const s = String(rows.length ? rows[rows.length - 1].close : '')
    const d = (s.split('.')[1] || '').length
    return Math.max(0, Math.min(4, d || 2))
  } catch (e) { return 2 }
}

// K线蜡烛图（KLineChart：内置 MA/VOL、滚轮缩放、拖拽平移、右拖自动加载更早历史）。

// ---------- K线蜡烛图（KLineChart：内置 MA/VOL、滚轮缩放、拖拽平移、右拖自动加载更早历史） ----------
function KlineChart(props) {
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

// 分时图（面积价线 + 昨收虚线 + 均价线 + 十字光标 tooltip）。

// ---------- 分时图（面积价线 + 昨收虚线 + 均价线 + 十字光标 tooltip） ----------
function MinuteChart(props) {
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

// Agent 工具调用卡片的取数：tool-result block → JSON。

// execute 返回 JSON 字符串；从 tool-result block 的 content 里递归找 text 再 parse（us-stocks 同款防御）。
function xqToolText(content, depth) {
  depth = depth || 0
  if (depth > 3 || !Array.isArray(content)) return undefined
  for (let i = 0; i < content.length; i++) {
    const b = content[i]
    if (!b || typeof b !== 'object') continue
    if (b.type === 'text' && typeof b.text === 'string') return b.text
    const nested = xqToolText(b.content, depth + 1)
    if (nested !== undefined) return nested
  }
  return undefined
}
function xqParseResult(block) {
  // block 可能是运行中（无 kind）或已完成（kind=tool-result）
  if (!block || typeof block !== 'object') return null
  const text = xqToolText(block.content)
  if (text === undefined) return null
  try {
    const v = JSON.parse(text)
    return (v && typeof v === 'object') ? v : null
  } catch (e) { return null }
}

// Agent 工具调用卡片（tool.call.toolview）：xueqiu_quote / xueqiu_kline / xueqiu_hot / xueqiu_news。

// ---------- Agent 工具调用卡片（tool.call.toolview）：xueqiu_quote / xueqiu_kline ----------
function QuoteCard(props) {
  const block = props.block
  const r = xqParseResult(block)
  if (!r) return el('div', { className: 'xq-tv-shell' }, block && block.kind ? '结果不可读' : '查询中…')
  const list = Array.isArray(r.list) ? r.list : []
  if (!list.length) return el('div', { className: 'xq-tv-shell' }, '无行情数据（检查代码，或先用 xueqiu_search 查代码）')
  return el('div', { className: 'xq-tv-shell' }, [
    el('div', { key: 'h', className: 'xq-tv-head' }, [
      el('span', { key: 't', className: 'xq-tv-title' }, '雪球行情'),
      el('span', { key: 'n', className: 'xq-tv-pill' }, list.length + ' 只'),
      r.status ? el('span', { key: 's', className: 'xq-tv-pill' }, r.status) : null
    ]),
    el('div', { key: 'b', className: 'xq-tv-table' }, list.map(function (q) {
      const up = Number(q.percent) > 0, dn = Number(q.percent) < 0
      return el('div', { key: q.symbol, className: 'xq-tv-row' }, [
        el('span', { key: 'n', className: 'xq-tv-name' }, [
          String(q.name || ''),
          el('span', { key: 'c', className: 'xq-tv-code' }, ' ' + String(q.symbol || ''))
        ]),
        el('span', { key: 'p', className: 'xq-tv-price ' + (up ? 'xq-up' : dn ? 'xq-down' : '') }, fmt(q.current)),
        el('span', { key: 'g', className: 'xq-tv-pct ' + (up ? 'xq-up' : dn ? 'xq-down' : '') },
          fmtPct(q.percent))
      ])
    }))
  ])
}

function KlineCard(props) {
  const block = props.block
  const r = xqParseResult(block)
  if (!r) return el('div', { className: 'xq-tv-shell' }, block && block.kind ? '结果不可读' : '查询中…')
  if (r.error) return el('div', { className: 'xq-tv-shell' }, String(r.error))
  const rows = Array.isArray(r.rows) ? r.rows : []
  if (!rows.length) return el('div', { className: 'xq-tv-shell' }, '无K线数据')
  const first = rows[0], last = rows[rows.length - 1]
  const chgPct = Number(first.close) ? (Number(last.close) - Number(first.close)) / Number(first.close) * 100 : 0
  const lb = PERIOD_LABELS
  // 复用面板蜡烛图（rows 字段兼容：卡片 rows 已含 open/high/low/close/volume）
  return el('div', { className: 'xq-tv-shell' }, [
    el('div', { key: 'h', className: 'xq-tv-head' }, [
      el('span', { key: 't', className: 'xq-tv-title' }, String(r.symbol || '')),
      el('span', { key: 'p', className: 'xq-tv-pill' }, lb[r.period] || r.period || '日K'),
      el('span', { key: 'n', className: 'xq-tv-pill' }, rows.length + ' 根'),
      rows.length > 1 ? el('span', { key: 'd', className: 'xq-tv-pill' },
        String(first.time || '').slice(0, 10) + ' → ' + String(last.time || '').slice(0, 10)) : null,
      el('span', { key: 'g', className: 'xq-tv-pct ' + (chgPct > 0 ? 'xq-up' : chgPct < 0 ? 'xq-down' : ''), style: { marginLeft: 'auto' } },
        fmt(last.close) + '  ' + (chgPct >= 0 ? '+' : '') + chgPct.toFixed(2) + '%')
    ]),
    el(KlineChart, { key: 'c' + rows.length, symbol: String(r.symbol || ''), rows: rows })
  ])
}

function HotCard(props) {
  const block = props.block
  const r = xqParseResult(block)
  if (!r) return el('div', { className: 'xq-tv-shell' }, block && block.kind ? '结果不可读' : '查询中…')
  const list = Array.isArray(r.list) ? r.list : []
  if (!list.length) return el('div', { className: 'xq-tv-shell' }, '无热榜数据')
  const mk = HOT_MARKET_LABELS
  return el('div', { className: 'xq-tv-shell' }, [
    el('div', { key: 'h', className: 'xq-tv-head' }, [
      el('span', { key: 't', className: 'xq-tv-title' }, '雪球热榜'),
      el('span', { key: 'm', className: 'xq-tv-pill' }, mk[r.market] || r.market || 'A股'),
      el('span', { key: 'n', className: 'xq-tv-pill' }, list.length + ' 只')
    ]),
    el('div', { key: 'b', className: 'xq-tv-table' }, list.map(function (h, i) {
      const up = Number(h.percent) > 0, dn = Number(h.percent) < 0
      const rc = Number(h.rank_change)
      return el('div', { key: h.symbol || i, className: 'xq-tv-row' }, [
        el('span', { key: 'r', className: 'xq-tv-rank' }, String(i + 1)),
        el('span', { key: 'n', className: 'xq-tv-name' }, [
          String(h.name || ''),
          el('span', { key: 'c', className: 'xq-tv-code' }, ' ' + String(h.symbol || ''))
        ]),
        rc > 0 ? el('span', { key: 'rc', className: 'xq-tv-rankup', title: '热度排名上升' }, '↑' + rc) :
          rc < 0 ? el('span', { key: 'rc', className: 'xq-tv-rankdn', title: '热度排名下降' }, '↓' + (-rc)) : null,
        el('span', { key: 'p', className: 'xq-tv-price ' + (up ? 'xq-up' : dn ? 'xq-down' : '') }, fmt(h.current)),
        el('span', { key: 'g', className: 'xq-tv-pct ' + (up ? 'xq-up' : dn ? 'xq-down' : '') },
          fmtPct(h.percent))
      ])
    }))
  ])
}

function NewsCard(props) {
  const block = props.block
  const r = xqParseResult(block)
  if (!r) return el('div', { className: 'xq-tv-shell' }, block && block.kind ? '结果不可读' : '查询中…')
  const items = Array.isArray(r.items) ? r.items : []
  if (!items.length) return el('div', { className: 'xq-tv-shell' }, '无快讯')
  return el('div', { className: 'xq-tv-shell' }, [
    el('div', { key: 'h', className: 'xq-tv-head' }, [
      el('span', { key: 't', className: 'xq-tv-title' }, '雪球快讯'),
      el('span', { key: 'n', className: 'xq-tv-pill' }, items.length + ' 条')
    ]),
    el('div', { key: 'b', className: 'xq-tv-news' }, items.map(function (n, i) {
      const t = String(n.time || '')
      return el('div', { key: n.id || i, className: 'xq-tv-item' + (n.mark === 1 ? ' xq-tv-mark' : '') }, [
        el('span', { key: 'tm', className: 'xq-tv-time' }, t.slice(11, 16) || t.slice(5, 16)),
        el('span', { key: 'tx', className: 'xq-tv-text' }, [
          n.mark === 1 ? el('b', { key: 'm', className: 'xq-tv-flag' }, '重要 ') : null,
          String(n.text || '')
        ])
      ])
    }))
  ])
}

// 登录框（可选：粘贴浏览器 Cookie 启用云端自选股）。
// 提到模块作用域后不再靠闭包读父级 state —— 全部经显式上下文 p 传入：
//   p.login / p.cookieInput / p.setCookieInput / p.loginMsg / p.loginBusy
//   p.doLogin / p.doLogout / p.doPull / p.setLoginOpen / p.setLoginMsg

function LoginBox(p) {
  const loggedIn = !!(p.login && p.login.loggedIn)
  return el('div', { className: 'xq-login' }, [
    el('div', { key: 'hd', className: 'xq-login-hd' }, loggedIn ? '雪球账号 · 已登录' : '登录雪球（可选）'),
    loggedIn
      ? el('div', { key: 'u', className: 'xq-login-user' }, [
          '当前账号：', el('b', { key: 'b' }, p.login.screenName || ('uid ' + (p.login.uid || '?'))),
          el('span', { key: 'c', className: 'xq-acc-mark' }, ' · 云端自选股已启用，加/删自选双端同步（云端为准）')
        ])
      : el('div', { key: 'tip', className: 'xq-login-tip' }, [
          '不登录也能用（匿名模式，自选股存本地）。登录后可直接使用', el('b', { key: 'b' }, '你在雪球的云端自选股'),
          el('ol', { key: 'ol' }, [
            el('li', { key: '1' }, ['浏览器打开 ', el('a', { key: 'a', href: 'https://xueqiu.com', target: '_blank', rel: 'noreferrer' }, 'xueqiu.com'), ' 并登录']),
            el('li', { key: '2' }, 'F12 开发者工具 → Network → 刷新页面，任选一个 xueqiu.com 请求'),
            el('li', { key: '3' }, 'Request Headers 里找到 Cookie: 一行，整行复制粘贴到下面'),
            el('li', { key: '4' }, 'Cookie 仅保存在本机插件目录，不上传任何第三方')
          ])
        ]),
    p.login && p.login.expired
      ? el('div', { key: 'ex', className: 'xq-login-msg xq-login-bad' }, 'Cookie 已过期，请按上面步骤重新获取')
      : null,
    loggedIn ? null : el('textarea', {
      key: 'ta',
      placeholder: '粘贴 Cookie 整行，例如 xq_a_token=...; xq_id_token=...; u=...; device_id=...',
      value: p.cookieInput,
      onChange: function (e) { p.setCookieInput(e.target.value) }
    }),
    p.loginMsg ? el('div', { key: 'msg', className: 'xq-login-msg ' + (p.loginMsg.ok ? 'xq-login-ok' : 'xq-login-bad') }, p.loginMsg.text) : null,
    el('div', { key: 'row', className: 'xq-login-row' }, [
      loggedIn
        ? el('button', { key: 'pull', className: 'xq-btn', disabled: p.loginBusy, onClick: p.doPull }, '同步云端自选')
        : el('button', { key: 'ok', className: 'xq-btn xq-acc-on', disabled: p.loginBusy, onClick: p.doLogin }, p.loginBusy ? '校验中…' : '登录'),
      loggedIn
        ? el('button', { key: 'out', className: 'xq-btn', disabled: p.loginBusy, onClick: p.doLogout }, '退出登录')
        : null,
      el('button', { key: 'close', className: 'xq-btn-mini', disabled: p.loginBusy, onClick: function () { p.setLoginOpen(false); p.setLoginMsg(null) } }, '关闭')
    ])
  ])
}

// 行情 tab：指数卡 + 自选表格（排序 / 闪烁 / 加删自选）。
// 显式上下文 p：
//   p.quotes / p.indices / p.flashDir / p.sortK / p.sortAsc / p.setSortK / p.setSortAsc
//   p.openDetail / p.removeWatch / p.manualCode / p.setManualCode / p.addManual

function MarketTab(p) {
  const sorted = p.quotes.slice()
  if (p.sortK !== 'default') {
    sorted.sort(function (a, b) {
      const av = Number(a[p.sortK]), bv = Number(b[p.sortK])
      const an = isFinite(av) ? av : -Infinity
      const bn = isFinite(bv) ? bv : -Infinity
      return p.sortAsc ? an - bn : bn - an
    })
  }
  function sortBy(k) {
    if (p.sortK === k) p.setSortAsc(!p.sortAsc)
    else { p.setSortK(k); p.setSortAsc(false) }
  }
  function arrow(k) { return p.sortK === k ? (p.sortAsc ? ' ▲' : ' ▼') : '' }
  const idxKids = p.indices.map(function (q) {
    return el('div', {
      key: q.symbol, className: 'xq-idx-card', title: '查看 ' + (q.name || q.symbol) + ' 详情',
      onClick: function () { p.openDetail(q.symbol) }
    }, [
      el('div', { key: 'n', className: 'xq-idx-name' }, q.name),
      el('div', { key: 'r', className: 'xq-idx-row' }, [
        el('span', { key: 'c', className: 'xq-idx-cur ' + colorOf(q.percent) }, fmt(q.current)),
        el('span', { key: 'p', className: 'xq-idx-pct xq-pct-chip ' + colorOf(q.percent) }, fmtPct(q.percent))
      ])
    ])
  })
  const rows = sorted.map(function (q) {
    return el('div', { key: q.symbol, className: 'xq-grid-row', onClick: function () { p.openDetail(q.symbol) } }, [
      el('div', { key: 'n' }, [
        el('div', { key: 'a', className: 'xq-name' }, q.name || q.symbol),
        el('div', { key: 'b', className: 'xq-sub' }, q.symbol)
      ]),
      el('div', { key: 'c', className: colorOf(q.percent) + (p.flashDir[q.symbol] === 1 ? ' xq-flash-up' : p.flashDir[q.symbol] === -1 ? ' xq-flash-down' : '') }, fmt(q.current)),
      el('div', { key: 'p' }, el('span', { key: 'pp', className: 'xq-pct-chip ' + colorOf(q.percent) }, fmtPct(q.percent))),
      el('div', { key: 'v', className: 'xq-sub' }, fmtVol(q.volume, q.symbol)),
      el('div', { key: 'a2', className: 'xq-actions' }, [
        el('button', { key: 'd', className: 'xq-btn-mini', onClick: function (e) { e.stopPropagation(); p.openDetail(q.symbol) } }, '详情'),
        el('button', { key: 'r', className: 'xq-btn-mini', title: '移除自选', onClick: function (e) { e.stopPropagation(); p.removeWatch(q.symbol) } }, '×')
      ])
    ])
  })
  return el('div', null, [
    el('div', { key: 'idx', className: 'xq-idx' }, idxKids),
    el('div', { key: 'wl', className: 'xq-grid' }, [
      el('div', { key: 'h', className: 'xq-grid-hd' }, [
        el('span', { key: 'c0' }, '名称'),
        el('span', { key: 'c1', className: 'xq-sort-h' + (p.sortK === 'current' ? ' xq-sort-on' : ''), onClick: function () { sortBy('current') } }, '现价' + arrow('current')),
        el('span', { key: 'c2', className: 'xq-sort-h' + (p.sortK === 'percent' ? ' xq-sort-on' : ''), onClick: function () { sortBy('percent') } }, '涨跌幅' + arrow('percent')),
        el('span', { key: 'c3' }, '成交量'),
        el('span', { key: 'c4' }, '操作')
      ]),
      rows.length ? rows : el('div', { key: 'empty', className: 'xq-grid-row' }, el('span', { key: 'e', className: 'xq-muted' }, '自选股为空，去「搜索」或下方添加'))
    ]),
    el('div', { key: 'add', className: 'xq-search-row' }, [
      el('input', {
        key: 'i', className: 'xq-input', placeholder: '添加代码，如 SH600519 / 00700 / AAPL',
        value: p.manualCode,
        onChange: function (e) { p.setManualCode(e.target.value) },
        onKeyDown: function (e) { if (e.key === 'Enter') p.addManual() }
      }),
      el('button', { key: 'b', className: 'xq-btn', onClick: p.addManual }, '添加')
    ])
  ])
}

// 详情 tab（个股）：报价头 + 统计卡 + 走势（K线/分时）+ 财务 + 热议用户。
// 显式上下文 p：
//   p.detail / p.view / p.setView / p.chartMode / p.setChartMode
//   p.klinePeriod / p.setKlinePeriod / p.fetchEarlierKline

function DetailView(p) {
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

// 热榜 tab：市场切换 + 热度榜行。
// 显式上下文 p：
//   p.hot / p.hotMarket / p.setHotMarket / p.hotSeq / p.setHot / p.setErr / p.openDetail

function HotTab(p) {
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

// 搜索 tab：股票 / 帖子两种模式（doSearch 的数据逻辑仍在父组件，经 p 传入）。
// 显式上下文 p：
//   p.searchQ / p.setSearchQ / p.searchMode / p.setSearchMode / p.searchRes / p.setSearchRes
//   p.searching / p.doSearch / p.openDetail / p.addWatch

function SearchTab(p) {
  const isPost = p.searchMode === 'post'
  const resKids = p.searchRes.map(function (r) {
    const title = isPost ? (r.title || '') : r.name
    const sub = isPost ? ((r.user ? r.user.screen_name + ' · ' : '') + fmtBig(r.view_count) + '阅读') : (r.code || '')
    const desc = isPost ? String(r.text || '').slice(0, 60) : sub
    return el('div', { key: String(r.id || r.code), className: 'xq-grid-row' }, [
      el('div', { key: 'n' }, [
        el('div', { key: 'a', className: 'xq-name' }, title || '（无标题）'),
        el('div', { key: 'b', className: 'xq-sub' }, desc)
      ]),
      el('div', { key: 'c', className: 'xq-sub' }, sub),
      el('div', { key: 'p', className: 'xq-sub' }, isPost ? fmtDay(r.created_at) : ''),
      el('div', { key: 'a2', className: 'xq-actions' }, isPost
        ? null
        : [
          el('button', { key: 'd', className: 'xq-btn-mini', onClick: function () { p.openDetail(r.code) } }, '详情'),
          el('button', { key: 'w', className: 'xq-btn-mini', onClick: function () { p.addWatch(r.code) } }, '加自选')
        ])
    ])
  })
  return el('div', null, [
    el('div', { key: 'row', className: 'xq-search-row' }, [
      el('input', {
        key: 'i', className: 'xq-input', placeholder: p.searchMode === 'stock' ? '搜索股票，如「茅台」' : '搜索帖子，如「段永平」',
        value: p.searchQ,
        onChange: function (e) { p.setSearchQ(e.target.value) },
        onKeyDown: function (e) { if (e.key === 'Enter') p.doSearch() }
      }),
      el('button', { key: 'b', className: 'xq-btn', disabled: p.searching, onClick: p.doSearch }, p.searching ? '搜索中…' : '搜索')
    ]),
    el('div', { key: 'seg', className: 'xq-seg', style: { marginBottom: 8 } }, [
      el('button', { key: 's', className: p.searchMode === 'stock' ? 'xq-seg-on' : '', onClick: function () { p.setSearchMode('stock'); p.setSearchRes([]) } }, '股票'),
      el('button', { key: 'p', className: p.searchMode === 'post' ? 'xq-seg-on' : '', onClick: function () { p.setSearchMode('post'); p.setSearchRes([]) } }, '帖子')
    ]),
    p.searchRes.length ? el('div', { key: 'res', className: 'xq-grid' }, [
      el('div', { key: 'h', className: 'xq-grid-hd' }, ['结果', '', '', ''].map(function (t, i) { return el('span', { key: i }, t) })),
      resKids
    ]) : el('div', { key: 'tip', className: 'xq-muted' }, '输入关键词搜索，回车或点搜索')
  ])
}

// 快讯 tab：时间轴分组（今天/昨天/M月D日）+ 滚动到底加载更早。
// 显式上下文 p：
//   p.news / p.newsMore / p.newsNoMore / p.loadMoreNews

function NewsTab(p) {
  // 时间轴：按「今天/昨天/M月D日」分组，每组一个锚点头
  const kids = []
  let lastDay = null
  p.news.forEach(function (it) {
    const d = new Date(it.created_at)
    const now = new Date()
    if (isNaN(d.getTime())) {   // 脏/缺失时间：跳过分组头（否则渲染 "NaN月NaN日"）
      kids.push(el('div', { key: String(it.id), className: 'xq-news-item' + (it.mark === 1 ? ' xq-important' : '') }, [
        el('div', { key: 't' }, it.text),
        el('div', { key: 'm', className: 'xq-news-time' }, fmtTime(it.created_at) + (it.mark === 1 ? ' · 重要' : ''))
      ]))
      return
    }
    const sameDay = function (a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate() }
    const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    let label = null
    const dayKey = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate()
    if (dayKey !== lastDay) {
      lastDay = dayKey
      label = sameDay(d, now) ? '今天' : (sameDay(d, yest) ? '昨天' : (d.getMonth() + 1) + '月' + d.getDate() + '日')
    }
    if (label) kids.push(el('div', { key: 'g' + dayKey, className: 'xq-news-group' }, label))
    kids.push(el('div', { key: String(it.id), className: 'xq-news-item' + (it.mark === 1 ? ' xq-important' : '') }, [
      el('div', { key: 't' }, it.text),
      el('div', { key: 'm', className: 'xq-news-time' }, fmtTime(it.created_at) + (it.mark === 1 ? ' · 重要' : ''))
    ]))
  })
  // 滚动到底自动加载；手动入口兜底（滚轮惯性/触控板场景）
  kids.push(el('div', {
    key: 'more',
    className: 'xq-news-more',
    onClick: function () { p.loadMoreNews() }
  }, p.newsMore ? '加载中…' : (p.newsNoMore ? '没有更早的快讯了' : '加载更早 ↑')))
  return p.news.length
    ? el('div', {
        className: 'xq-news xq-news-tl',
        onScroll: function (e) {
          const n = e.target
          if (n.scrollTop + n.clientHeight >= n.scrollHeight - 40) p.loadMoreNews()
        }
      }, kids)
    : el('div', { className: 'xq-muted' }, '暂无快讯')
}

// 今日盈亏（同花顺投资账本）：面板头部常驻 chip + 「盈亏」tab。
//
// 两个组件都**自取运行时**（getPnlRuntime / getUiRuntime），不读父级上下文的任何字段，
// 因此 panel/index.js 里 TAB_CTX 的 pnl 工厂返回空对象即可（本文件不使用任何父级上下文字段）。
//
// 展示口径沿用 dsh-ths-pnl 的客户端实现：金额带符号 + 千分位 + 两位小数，百分比两位小数；
// 涨跌按 **A 股习惯（涨=红、跌=绿）** —— 与雪球页面一致，但与欧美习惯相反。

// 带符号千分位两位小数（金额）。不用 toFixed 是为了千分位分组。
function fmtYk(value) {
  const n = Number(value) || 0
  const sign = n > 0 ? '+' : (n < 0 ? '-' : '')
  return sign + Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 涨跌配色类（A 股：涨红跌绿）。
function trendClass(value) {
  const n = Number(value) || 0
  if (n > 0) return 'xq-pnl-up'
  if (n < 0) return 'xq-pnl-down'
  return ''
}

// 时段文案。盘外时段（盘前/午间/收盘/休市）要显式标出来，否则用户会以为数字停住是坏了。
const SESSION_TEXT = { pre: '盘前', morning: '盘中', lunch: '午间', afternoon: '盘中', after: '收盘', weekend: '休市' }
const OFF_HOURS = { pre: 1, lunch: 1, after: 1, weekend: 1 }

// 订阅盈亏运行时。返回 state 快照；订阅/退订由 store 的引用计数管轮询器的启停，
// 所以 chip 与 tab 同时挂着也只有一个轮询器、一份数据。
function usePnlState() {
  const [state, setState] = React.useState(function () {
    const rt = getPnlRuntime()
    return rt ? rt.getState() : { data: null, status: 'idle', error: '' }
  })
  React.useEffect(function () {
    const rt = getPnlRuntime()
    if (!rt) return function () { }
    setState(rt.getState())   // 订阅前可能已经有数据（另一个订阅者先拉到了）
    return rt.subscribe(function () { setState(rt.getState()) })
  }, [])
  return state
}

// 头部常驻 chip：一行小字展示今日盈亏，点击切到「盈亏」tab。
function PnlChip() {
  const state = usePnlState()
  const data = state.data

  let label
  let cls = 'xq-pnl-dim'
  let tag = ''
  if (state.status === 'error') {
    label = '今日盈亏 数据异常'
  } else if (!data) {
    label = '今日盈亏 …'
  } else if (data.configured === false) {
    label = '今日盈亏 未配置'
  } else if (data.token_expired) {
    label = '今日盈亏 已过期'
    cls = 'xq-pnl-bad'
  } else if (data.error) {
    label = '今日盈亏 数据异常'
  } else {
    label = '今日 ' + fmtYk(data.pnl_yk) + ' (' + fmtPct(data.pnl_pct) + ')'
    cls = trendClass(data.pnl_yk) || 'xq-pnl-dim'
    tag = OFF_HOURS[data.session] ? (SESSION_TEXT[data.session] || '') : ''
  }

  let title = '同花顺投资账本 · 今日总盈亏（点击查看盈亏页）'
  if (data && data.updated_at) title += '\n数据时间：' + new Date(data.updated_at).toLocaleString('zh-CN')
  if (data && data.frozen) title += '\n非交易时段 · 显示最后一次获取的值'
  if (state.status === 'error' && state.error) title += '\n' + state.error

  const kids = [el('span', { key: 'v' }, label)]
  if (tag) kids.push(el('span', { key: 'tag', className: 'xq-pnl-tag' }, tag))

  return el('span', {
    className: 'xq-pnl-chip ' + cls,
    title: title,
    onClick: function () {
      const ui = getUiRuntime()
      if (ui) ui.ui.set({ tab: 'pnl', open: true })
    }
  }, kids)
}

// 完整「盈亏」tab：大字盈亏 + 数据时间 + 时段；组合选择、Cookie、刷新间隔三块配置。
// 形参 p 是 tab 上下文（由 panel/index.js 的 TAB_CTX 提供），本组件不读它的任何字段。
function PnlTab(p) {
  const state = usePnlState()
  const data = state.data
  const [draft, setDraft] = React.useState('')          // Cookie 草稿
  const [status, setStatus] = React.useState(null)      // pnl.verify / pnl.config 的结果
  const [busy, setBusy] = React.useState(false)
  const [intervalDraft, setIntervalDraft] = React.useState('')

  // 打开本 tab 时校验一次：拿到组合列表、当前生效间隔、宿主给的可调范围。
  React.useEffect(function () {
    let alive = true
    // 先用快照里的生效值即时预填，避免输入框空一瞬
    const rt = getPnlRuntime()
    const snap = rt ? rt.data : null
    if (snap && isFinite(Number(snap.poll_ms)) && Number(snap.poll_ms) > 0) setIntervalDraft(String(Number(snap.poll_ms) / 1000))
    call(A_PNL_VERIFY, {}).then(function (d) {
      if (!alive) return
      setStatus(d || null)
      if (d && isFinite(Number(d.poll_ms)) && Number(d.poll_ms) > 0) setIntervalDraft(String(Number(d.poll_ms) / 1000))
    }).catch(function (e) {
      if (alive) setStatus({ configured: true, valid: false, error: String((e && e.message) || e) })
    })
    return function () { alive = false }
  }, [])

  // 合并而不是整体替换：只改间隔时宿主不回组合列表，整体替换会让「组合」下拉框凭空消失。
  // checked=true 表示本次真的提交了 Cookie（或清了 Cookie），此时宿主的 valid 才算数；
  // 只改间隔 / 换组合时宿主不校验、会把 valid 回传成 false，界面不该因此从「有效」退回「待校验」。
  function applyResult(json, checked) {
    setStatus(function (prev) {
      const old = prev || {}
      const configured = json.configured !== undefined ? json.configured : (old.configured !== undefined ? old.configured : true)
      return {
        configured: configured,
        valid: checked ? (json.valid !== undefined ? json.valid : old.valid) : (old.valid !== undefined ? old.valid : json.valid),
        // 已清除时不再保留上一轮报错，否则「已清除」旁边还挂着「Cookie 已过期」
        error: configured === false ? '' : (json.error !== undefined ? json.error : old.error),
        // 非空数组才覆盖：只改间隔时宿主可能回空列表，直接替换会让下拉框消失
        portfolios: (json.portfolios && json.portfolios.length) ? json.portfolios : (configured === false ? [] : (old.portfolios || [])),
        fundKey: json.fundKey !== undefined ? json.fundKey : old.fundKey,
        poll_ms: json.poll_ms !== undefined ? json.poll_ms : old.poll_ms,
        min_sec: json.min_sec !== undefined ? json.min_sec : old.min_sec,
        max_sec: json.max_sec !== undefined ? json.max_sec : old.max_sec,
        savedSec: json.poll_sec
      }
    })
  }

  // 所有配置写操作走同一条路：提交 → 合并结果 → 让 store 立刻重取一次快照（chip 同步更新）
  function post(args, checked) {
    if (busy) return
    setBusy(true)
    call(A_PNL_CONFIG, args).then(function (json) {
      applyResult(json, checked === true)
      if (json && isFinite(Number(json.poll_sec))) setIntervalDraft(String(json.poll_sec))
      if (json && json.valid) setDraft('')
      const rt = getPnlRuntime()
      if (rt) rt.refresh()
    }).catch(function (e) {
      setStatus(function (prev) {
        return Object.assign({}, prev || {}, { valid: false, error: String((e && e.message) || e) })
      })
    }).then(function () { setBusy(false) })
  }

  function save() {
    const cookie = draft.trim()
    const args = { pollSec: intervalDraft }
    if (cookie) args.cookie = cookie
    post(args, args.cookie !== undefined)
  }
  function clearCookie() { setDraft(''); post({ clear: true }, true) }
  function chooseFund(key) { post({ fundKey: key }, false) }
  function forceRefresh() {
    const rt = getPnlRuntime()
    if (rt) rt.refresh(true)   // force：跳过宿主时段缓存，立刻打一次上游
  }

  const cfg = status || {}
  const portfolios = cfg.portfolios || []
  const fundKey = cfg.fundKey || ''
  const minSec = Number(cfg.min_sec) > 0 ? Number(cfg.min_sec) : 5
  const maxSec = Number(cfg.max_sec) > 0 ? Number(cfg.max_sec) : 3600
  const currentSec = Number(cfg.poll_ms || (data && data.poll_ms) || 0) / 1000
  const intervalDirty = intervalDraft !== '' && Number(intervalDraft) !== currentSec
  const canSave = !busy && (draft.trim().length > 0 || intervalDirty)

  // ---- 大字区：金额 + 百分比 + 时段 ----
  let amountText
  let amountCls
  let subText = ''
  let subBad = false       // 副标题是「真问题」（红/黄）还是「中性提示」（灰）
  let hasValue = false
  if (state.status === 'error') {
    amountText = '--'
    amountCls = 'xq-pnl-dim'
    subText = '数据异常：' + state.error
    subBad = true
  } else if (!data) {
    amountText = '…'
    amountCls = 'xq-pnl-dim'
    subText = '加载中…'
  } else if (data.configured === false) {
    amountText = '未配置'
    amountCls = 'xq-pnl-dim'
    subText = '粘贴同花顺投资账本 Cookie 后即可显示今日盈亏'
  } else if (data.token_expired) {
    amountText = '已过期'
    amountCls = 'xq-pnl-bad'
    subText = data.error || 'Cookie 已过期，请重新粘贴'
    subBad = true
  } else if (data.error) {
    amountText = '--'
    amountCls = 'xq-pnl-dim'
    subText = data.error
    subBad = true
  } else {
    amountText = fmtYk(data.pnl_yk)
    amountCls = trendClass(data.pnl_yk) || 'xq-pnl-dim'
    hasValue = true
  }
  const sessionText = data && SESSION_TEXT[data.session] ? SESSION_TEXT[data.session] : ''
  const hero = el('div', { className: 'xq-pnl-hero' }, [
    el('span', { key: 'a', className: 'xq-pnl-amt ' + amountCls }, amountText),
    hasValue ? el('span', { key: 'p', className: 'xq-pnl-pct ' + amountCls }, fmtPct(data.pnl_pct)) : null,
    sessionText ? el('span', { key: 's', className: 'xq-pnl-tag' }, sessionText) : null
  ])

  const metaParts = []
  if (data && data.updated_at) metaParts.push('数据时间 ' + new Date(data.updated_at).toLocaleString('zh-CN'))
  if (data && data.frozen) metaParts.push('非交易时段 · 已冻结在收盘值')
  if (data && isFinite(Number(data.poll_ms))) metaParts.push('刷新间隔 ' + Math.round(Number(data.poll_ms) / 1000) + ' 秒')
  const meta = metaParts.length ? el('div', { className: 'xq-pnl-meta' }, metaParts.join(' · ')) : null
  const sub = subText ? el('div', { className: subBad ? 'xq-pnl-sub xq-pnl-bad' : 'xq-pnl-sub' }, subText) : null

  // ---- 组合账户 ----
  const fundRow = el('div', { className: 'xq-pnl-field' }, [
    el('label', { key: 'l' }, '组合账户'),
    portfolios.length
      ? el('select', {
        key: 's', className: 'xq-pnl-sel', value: fundKey, disabled: busy || portfolios.length < 2,
        onChange: function (e) { chooseFund(e.target.value) }
      }, portfolios.map(function (it, i) {
        return el('option', { key: String(i), value: it.fund_key }, it.name || it.manualname || it.brokername || it.fund_key)
      }))
      : el('span', { key: 's', className: 'xq-pnl-note' }, '未读到组合（Cookie 有效后自动列出）')
  ])

  // ---- Cookie ----
  const cookieBlock = el('div', { className: 'xq-pnl-block' }, [
    el('div', { key: 't', className: 'xq-pnl-sec' }, 'Cookie（同花顺投资账本）'),
    el('div', { key: 'tip', className: 'xq-pnl-note' }, '登录 tzzb.10jqka.com.cn 后按 F12 → 控制台执行 copy(document.cookie)，把结果粘贴到这里。与 dsh-ths-pnl 插件共用同一份凭据与快照，粘一次两边都生效。'),
    el('textarea', {
      key: 'ta', className: 'xq-pnl-ta',
      placeholder: '直接粘贴整段 Cookie（形如 v=...; userid=...; pex_userid=...）',
      value: draft,
      onChange: function (e) { setDraft(e.target.value) }
    })
  ])

  // ---- 刷新间隔 ----
  const intervalRow = el('div', { className: 'xq-pnl-field' }, [
    el('label', { key: 'l' }, '刷新间隔'),
    el('input', {
      key: 'i', className: 'xq-pnl-num', type: 'number', min: String(minSec), max: String(maxSec), step: '1',
      value: intervalDraft,
      onChange: function (e) { setIntervalDraft(e.target.value) },
      onKeyDown: function (e) { if (e.key === 'Enter') save() }
    }),
    el('span', { key: 'u', className: 'xq-pnl-note' }, '秒（' + minSec + '–' + maxSec + '，超出会被夹到边界）')
  ])

  const btnRow = el('div', { className: 'xq-pnl-row' }, [
    el('button', { key: 'save', className: 'xq-btn', disabled: !canSave, onClick: save },
      busy ? '处理中…' : (draft.trim().length > 0 ? '保存并校验' : '保存间隔')),
    el('button', { key: 'clr', className: 'xq-btn', disabled: busy, title: '只清 Cookie，保留最后一次快照', onClick: clearCookie }, '清除 Cookie'),
    el('button', { key: 'now', className: 'xq-btn', disabled: busy, title: '跳过宿主时段缓存，立刻打一次上游', onClick: forceRefresh }, '立即刷新')
  ])

  // ---- 校验结果 ----
  const msgParts = []
  if (status) {
    if (cfg.valid) msgParts.push(el('span', { key: 'v', className: 'xq-pnl-ok' }, '✓ Cookie 有效，' + portfolios.length + ' 个组合'))
    else if (cfg.configured === false) msgParts.push(el('span', { key: 'v', className: 'xq-pnl-note' }, '未配置 Cookie'))
    else if (cfg.error) msgParts.push(el('span', { key: 'v', className: 'xq-pnl-bad' }, '✗ ' + cfg.error))
    else msgParts.push(el('span', { key: 'v', className: 'xq-pnl-note' }, '待校验'))
    if (cfg.savedSec !== undefined && cfg.savedSec !== null && isFinite(Number(cfg.savedSec))) {
      msgParts.push(el('span', { key: 's', className: 'xq-pnl-note' }, '刷新间隔已设为 ' + cfg.savedSec + ' 秒'))
    }
  }
  const msg = msgParts.length ? el('div', { className: 'xq-pnl-msg' }, msgParts) : null

  return el('div', { className: 'xq-pnl' }, [hero, meta, sub, fundRow, cookieBlock, intervalRow, btnRow, msg])
}

// XueqiuPanel：面板内容容器（数据 + tab 条 + 查表分发）。
//
// 内层视图（LoginBox / MarketTab / DetailView / HotTab / SearchTab / NewsTab / PnlTab）已提到模块作用域，
// 原来靠父级闭包读的 state/句柄改为「调用点组装显式上下文 p」传入；本文件只保留数据逻辑。
//
// tab 分发表：ui.tab → 组件。注意 DetailView 不在此表 —— 详情由 view 真值门控（旧 if/else 链
// 也是先判 view），且宿主 ui.get 会把 tab 白名单化成 market/hot/search/news/pnl。把 detail 塞进
// 查表会让理论上不可达的 tab='detail' 渲染详情骨架（旧行为是落到快讯页），属于行为变化。

const XQ_TABS = { market: MarketTab, hot: HotTab, search: SearchTab, news: NewsTab, pnl: PnlTab }

// ---------- 面板内容（数据 + tabs + 详情） ----------
function XueqiuPanel() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const [watchlist, setWatchlist] = React.useState([])
  const [quotes, setQuotes] = React.useState([])
  // 价格闪烁：记录上一价与变化方向（symbol -> 1|-1），行渲染时挂一次性动画类
  const prevPrices = React.useRef({})
  const [flashDir, setFlashDir] = React.useState({})
  const [indices, setIndices] = React.useState([])
  const [hot, setHot] = React.useState([])
  const [hotMarket, setHotMarket] = React.useState('cn')
  // 竞态防护：热榜/搜索的响应序号（旧响应到达时序号已过期则丢弃，防慢请求覆盖新结果）
  const hotSeq = React.useRef(0)
  const searchSeq = React.useRef(0)
  // 轮询闭包读当前市场（interval 闭包不随状态更新，直接捕获 state 会拿到 stale 值）
  const hotMarketRef = React.useRef(hotMarket)
  hotMarketRef.current = hotMarket
  const [news, setNews] = React.useState([])
  const [newsMore, setNewsMore] = React.useState(false)   // 翻页加载中
  const [newsNoMore, setNewsNoMore] = React.useState(false) // 已到最旧
  const [searchQ, setSearchQ] = React.useState('')
  const [searchMode, setSearchMode] = React.useState('stock')
  const [searchRes, setSearchRes] = React.useState([])
  const [searching, setSearching] = React.useState(false)
  const [manualCode, setManualCode] = React.useState('')
  const [view, setView] = React.useState(null)
  const [detail, setDetail] = React.useState(null)
  // K线到达早于详情骨架时的暂存（view 与 period 两个 effect 并行取数，避免丢数据）
  const klineStash = React.useRef(null)
  const [klinePeriod, setKlinePeriod] = React.useState('day')
  const [chartMode, setChartMode] = React.useState('kline')
  const [marketOpen, setMarketOpen] = React.useState(true)
  const [err, setErr] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [sortK, setSortK] = React.useState('default')
  const [sortAsc, setSortAsc] = React.useState(false)
  // 可选登录态（粘贴浏览器 Cookie）：null=未知，{loggedIn}=状态
  const [login, setLoginSt] = React.useState(null)
  const [loginOpen, setLoginOpen] = React.useState(false)
  const [cookieInput, setCookieInput] = React.useState('')
  const [loginBusy, setLoginBusy] = React.useState(false)
  const [loginMsg, setLoginMsg] = React.useState(null)   // {ok, text}
  const tab = ui.tab
  function setTab(t) { ui.set({ tab: t }) }

  function refreshMarket() {
    return Promise.all([
      fetchWatchlist(),
      fetchIndices()
    ]).then(function (res) {
      const wl = (res[0] && res[0].symbols) || []
      const status = res[1] ? res[1].status : null
      setMarketOpen(status === 5 || status === 6)
      setWatchlist(wl)
      setIndices((res[1] && res[1].list) || [])
      setErr('')
      if (!wl.length) return
      return fetchQuote(wl).then(function (data) {
        const list = (data && data.list) || []
        // 批量行情会整只丢弃无效/退市代码：补占位行（现价/涨跌全 '--'，仍可删除/查详情），
        // 否则"加进自选却凭空消失"没有任何反馈
        const seen = {}
        list.forEach(function (q) { seen[q.symbol] = 1 })
        const missing = wl.filter(function (s) { return !seen[s] }).map(function (s) { return { symbol: s } })
        const dirs = {}
        list.forEach(function (q) {
          if (q.current === null || q.current === undefined) return
          const prev = prevPrices.current[q.symbol]
          if (prev !== undefined && q.current !== prev) dirs[q.symbol] = q.current > prev ? 1 : -1
          prevPrices.current[q.symbol] = q.current
        })
        if (Object.keys(dirs).length) setFlashDir(dirs)
        setQuotes(list.concat(missing))
      })
    }).catch(function (e) {
      setErr(String((e && e.message) || e))
    })
  }

  function refreshContent() {
    const my = ++hotSeq.current
    const market = hotMarketRef.current   // 读当前市场（轮询闭包防 stale）
    Promise.all([
      call(A_HOT, { market: market, size: HOT_LIST_SIZE }),
      call(A_NEWS, { count: NEWS_PAGE_SIZE })
    ]).then(function (res) {
      if (hotSeq.current !== my) return   // 期间用户切了市场/触发过手动刷新：丢弃旧响应
      setHot((res[0] && res[0].list) || [])
      setNews((res[1] && res[1].items) || [])
      setNewsMore(false)
      setNewsNoMore(false)
      setErr('')
    }).catch(function (e) {
      setErr(String((e && e.message) || e))
    })
  }

  // 快讯翻页：max_id = 当前最旧一条 id，返回严格更早的记录
  function loadMoreNews() {
    if (newsMore || newsNoMore || !news.length) return
    const maxId = news[news.length - 1].id
    setNewsMore(true)
    call(A_NEWS, { count: NEWS_PAGE_SIZE, max_id: maxId }).then(function (res) {
      const items = (res && res.items) || []
      const seen = {}
      news.forEach(function (it) { seen[it.id] = true })
      const fresh = items.filter(function (it) { return !seen[it.id] })
      if (!fresh.length) setNewsNoMore(true)
      else setNews(news.concat(fresh))
      setNewsMore(false)
    }).catch(function () {
      setNewsMore(false)
    })
  }

  React.useEffect(function () {
    setLoading(true)
    call(A_LOGIN_STATUS, {}).then(function (d) { setLoginSt(d || { loggedIn: false }) }).catch(function () { setLoginSt({ loggedIn: false }) })
    refreshMarket().then(function () { return refreshContent() })
      .then(function () { setLoading(false) })
      .catch(function () { setLoading(false) })
    return function () { /* 一次性 */ }
  }, [])

  React.useEffect(function () {
    const marketMs = marketOpen ? POLL_MARKET_OPEN_MS : POLL_MARKET_CLOSED_MS
    const contentMs = marketOpen ? POLL_CONTENT_OPEN_MS : POLL_CONTENT_CLOSED_MS
    // 页面隐藏时暂停轮询（省请求、降低风控概率），回到前台立即刷新一次
    const stopA = rt.ctx.interval(function () { if (!pageHidden()) refreshMarket() }, marketMs)
    const stopB = rt.ctx.interval(function () { if (!pageHidden()) refreshContent() }, contentMs)
    function onVis() {
      if (!pageHidden()) { refreshMarket(); refreshContent() }
    }
    try { document.addEventListener('visibilitychange', onVis) } catch (e) { /* ignore */ }
    return function () {
      if (stopA) stopA(); if (stopB) stopB()
      try { document.removeEventListener('visibilitychange', onVis) } catch (e) { /* ignore */ }
    }
  }, [marketOpen])

  // K线历史获取（纯函数，不碰 React 状态）：图表右拖触底时拉更早的 500 根，返回原始行；
  // 图表内部自行前插持有全部历史，React 缓冲始终只是初始窗口（避免双数据源互相反馈）。
  function fetchEarlierKline(earliestTs) {
    if (!view || !detail || !detail.kline) return []
    const cur = detail.kline.rows || []
    const begin = earliestTs || (cur.length ? cur[0].timestamp : 0)
    if (!begin) return []
    // 以当前最早一根为 begin 的近似：多拉 500 根（count 负值=含 begin 往前），host 侧 type:'before' 返回区间
    return call(A_KLINE, { symbol: view, period: klinePeriod, count: KLINE_PAGE_SIZE, begin: begin }).then(function (res) {
      return (res && res.rows) || []
    }).catch(function () { return [] /* 追加失败静默：图表仍可看已有缓冲 */ })
  }

  // 详情骨架（报价/分时/财务/KOL）：只在换标的时整体重建；
  // v1.22.10 前 klinePeriod 也在依赖里，切周期会把整个详情清空重拉 5 个接口——
  // 表现为切周期时报价/图例/周期丸闪灭 100-300ms，快速连点会丢按钮
  React.useEffect(function () {
    if (!view) { setDetail(null); return }
    let alive = true
    klineStash.current = null
    setDetail(null)
    function fb(p) { return p.catch(function () { return null }) }
    // 渐进渲染：报价先上屏（K线由下方周期 effect 并行供给，到达早于骨架时走 stash），分时/财务/KOL 到达后补充
    const pQuote = fb(call(A_QUOTE_DETAIL, { symbol: view }))
    const pMinute = fb(call(A_MINUTE, { symbol: view }))
    const pFinance = fb(call(A_FINANCE, { symbol: view }))
    const pKol = fb(call(A_KOL, { symbol: view, count: KOL_SIZE }))
    pQuote.then(function (res) {
      if (!alive) return
      setDetail({
        quote: (res && res.quote) || {},
        kline: klineStash.current || { rows: [] },
        minute: { items: [], last_close: null },
        finance: { list: [] },
        kol: []
      })
      if (!res) setErr('详情加载失败，数据可能不完整')
      // 其余部分到达后增量合并
      pMinute.then(function (m) { if (alive && m) setDetail(function (d) { return d ? Object.assign({}, d, { minute: m }) : d }) })
      pFinance.then(function (f) { if (alive && f) setDetail(function (d) { return d ? Object.assign({}, d, { finance: f }) : d }) })
      pKol.then(function (k) { if (alive && k) setDetail(function (d) { return d ? Object.assign({}, d, { kol: k.list || [] }) : d }) })
    }).catch(function (e) {
      if (alive) setErr(String((e && e.message) || e))
    })
    return function () { alive = false }
  }, [view])

  // K线按周期独立拉取：切周期只清图表数据、只发 1 个请求，报价与周期丸全程保持可点
  React.useEffect(function () {
    if (!view) return
    let alive = true
    setDetail(function (d) { return d ? Object.assign({}, d, { kline: { rows: [] } }) : d })
    call(A_KLINE, { symbol: view, period: klinePeriod, count: KLINE_PAGE_SIZE }).then(function (res) {
      if (!alive || !res) return
      klineStash.current = res
      setDetail(function (d) { return d ? Object.assign({}, d, { kline: res }) : d })
    }).catch(function () { /* 周期拉取失败：保持空图，不推翻已有详情 */ })
    return function () { alive = false }
  }, [view, klinePeriod])

  // Esc：先关详情，再收起面板（输入框内不触发）
  React.useEffect(function () {
    if (typeof window === 'undefined' || !window.addEventListener) return function () {}
    function onKey(e) {
      if (e.key !== 'Escape') return
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (loginOpen) setLoginOpen(false)
      else if (view) setView(null)
      else ui.set({ open: false })
    }
    window.addEventListener('keydown', onKey)
    return function () { window.removeEventListener('keydown', onKey) }
  }, [view, loginOpen])

  function openDetail(symbol) {
    setChartMode('kline')
    setKlinePeriod('day')
    setView(symbol)
  }

  function addWatch(symbol) {
    call(A_WATCHLIST_ADD, { symbol: symbol }).then(function (data) {
      setWatchlist((data && data.symbols) || [])
      refreshMarket()
    }).catch(function (e) { setErr(String((e && e.message) || e)) })
  }

  function removeWatch(symbol) {
    call(A_WATCHLIST_REMOVE, { symbol: symbol }).then(function (data) {
      setWatchlist((data && data.symbols) || [])
      setQuotes(quotes.filter(function (q) { return q.symbol !== symbol }))
    }).catch(function (e) { setErr(String((e && e.message) || e)) })
  }

  function doSearch() {
    const q = searchQ.trim()
    if (!q) return
    setSearching(true)
    const my = ++searchSeq.current
    const p = searchMode === 'stock'
      ? call(A_SEARCH, { q: q, count: SEARCH_STOCK_SIZE })
      : call(A_SEARCH_POSTS, { q: q, count: SEARCH_POST_SIZE })
    p.then(function (data) {
      if (searchSeq.current !== my) return   // 快速连搜：只认最后一次
      setSearchRes((data && data.list) || [])
    }).catch(function (e) {
      if (searchSeq.current !== my) return
      setErr(String((e && e.message) || e))
      setSearchRes([])
    }).then(function () { if (searchSeq.current === my) setSearching(false) })
  }

  function addManual() {
    const code = manualCode.trim().toUpperCase()
    if (!code) return
    addWatch(code)
    setManualCode('')
  }

  // ---- 可选登录 ----
  function doLogin() {
    const c = cookieInput.trim()
    if (!c) { setLoginMsg({ ok: false, text: '请先粘贴 Cookie' }); return }
    setLoginBusy(true)
    setLoginMsg(null)
    call(A_LOGIN_SAVE, { cookie: c }).then(function (d) {
      setLoginSt({ loggedIn: true, screenName: (d && d.screenName) || '', uid: d ? d.uid : null })
      setLoginMsg({ ok: true, text: '登录成功' + ((d && d.screenName) ? '：' + d.screenName : '') + (d && d.symbols ? '，已同步云端自选 ' + d.symbols.length + ' 只' : '') })
      setCookieInput('')
      setLoginOpen(false)
      refreshMarket()
    }).catch(function (e) {
      setLoginMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setLoginBusy(false) })
  }

  function doLogout() {
    setLoginBusy(true)
    call(A_LOGIN_LOGOUT, {}).then(function () {
      setLoginSt({ loggedIn: false })
      setLoginMsg({ ok: true, text: '已退出登录（本地自选股保留）' })
    }).catch(function (e) {
      setLoginMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setLoginBusy(false) })
  }

  function doPull() {
    setLoginBusy(true)
    setLoginMsg(null)
    call(A_WATCHLIST_PULL, {}).then(function (d) {
      setLoginMsg({ ok: true, text: '已同步云端自选 ' + (((d && d.symbols) || []).length) + ' 只' })
      refreshMarket()
    }).catch(function (e) {
      setLoginMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setLoginBusy(false) })
  }

  const tabs = el('div', { className: 'xq-tabs' }, PANEL_TABS.map(function (t) {
    return el('button', {
      key: t[0], className: 'xq-tab' + (tab === t[0] ? ' xq-tab-active' : ''),
      onClick: function () { setTab(t[0]); if (view) setView(null) }
    }, t[1])
  }).concat([
    el('span', { key: 'sp', className: 'xq-spacer' }),
    el('button', {
      key: 'acc', className: 'xq-btn xq-acc-btn' + (login && login.loggedIn ? ' xq-acc-on' : ''),
      title: login && login.loggedIn ? '已登录：' + (login.screenName || login.uid || '') + '（点击管理）' : '可选：登录雪球后使用云端自选股',
      onClick: function () { setLoginMsg(null); setLoginOpen(true) }
    }, login && login.loggedIn ? '👤 ' + (login.screenName || '已登录') : '👤 登录'),
    el('button', {
      key: 'btn', className: 'xq-btn', disabled: loading, title: '刷新全部数据',
      onClick: function () {
        setLoading(true)
        // 盈亏一并刷新：refresh() 内部已做并发去重，与后台轮询不会重复请求；
        // 它自己吞掉失败（返回 null 而非拒绝），所以这里的 loading 语义与原来完全一致。
        const pnlRt = getPnlRuntime()
        Promise.all([refreshMarket(), refreshContent(), pnlRt ? pnlRt.refresh() : Promise.resolve()]).then(function () { setLoading(false) }).catch(function () { setLoading(false) })
      }
    }, loading ? [el('span', { key: 's', className: 'xq-refresh-spin' }, '⟳'), ' 刷新中'] : '刷新')
  ]))

  const errBox = err ? el('div', { className: 'xq-err' }, err) : null

  // 每个 tab 的显式上下文工厂：字段 = 该 tab 函数体里用到的父级 state/句柄
  // （MarketTab/HotTab/SearchTab/NewsTab 的字段清单见各自文件头部注释；PnlTab 自取运行时，故返回空对象）
  const TAB_CTX = {
    market: function () {
      return {
        quotes: quotes, indices: indices, flashDir: flashDir,
        sortK: sortK, sortAsc: sortAsc, setSortK: setSortK, setSortAsc: setSortAsc,
        openDetail: openDetail, removeWatch: removeWatch,
        manualCode: manualCode, setManualCode: setManualCode, addManual: addManual
      }
    },
    hot: function () {
      return {
        hot: hot, hotMarket: hotMarket, setHotMarket: setHotMarket,
        hotSeq: hotSeq, setHot: setHot, setErr: setErr, openDetail: openDetail
      }
    },
    search: function () {
      return {
        searchQ: searchQ, setSearchQ: setSearchQ, searchMode: searchMode, setSearchMode: setSearchMode,
        searchRes: searchRes, setSearchRes: setSearchRes, searching: searching,
        doSearch: doSearch, openDetail: openDetail, addWatch: addWatch
      }
    },
    news: function () {
      return {
        news: news, newsMore: newsMore, newsNoMore: newsNoMore, loadMoreNews: loadMoreNews
      }
    },
    pnl: function () {
      return {}   // PnlTab 自身订阅盈亏运行时，不需要父级任何字段
    }
  }

  // tab 分发：旧 if/else 链里 market/hot/search 之外的任何 tab 都落到 NewsTab；
  // 这里用 hasOwnProperty 判定，未知 tab（含 undefined/'toString' 这类原型键）统一走 news。
  const tabKey = Object.prototype.hasOwnProperty.call(XQ_TABS, ui.tab) ? ui.tab : 'news'
  const renderTab = XQ_TABS[tabKey]

  let content
  if (loginOpen) {
    content = LoginBox({
      login: login, cookieInput: cookieInput, setCookieInput: setCookieInput,
      loginMsg: loginMsg, loginBusy: loginBusy,
      doLogin: doLogin, doLogout: doLogout, doPull: doPull,
      setLoginOpen: setLoginOpen, setLoginMsg: setLoginMsg
    })
  } else if (view) {
    content = DetailView({
      detail: detail, view: view, setView: setView,
      chartMode: chartMode, setChartMode: setChartMode,
      klinePeriod: klinePeriod, setKlinePeriod: setKlinePeriod,
      fetchEarlierKline: fetchEarlierKline
    })
  } else {
    content = renderTab(TAB_CTX[tabKey]())
  }

  // key 变化触发 xq-fade-in 重放：tab/详情切换有轻微淡入
  return el('div', null, [tabs, errBox, el('div', { key: 'v-' + (loginOpen ? 'login' : (view ? 'd' : tab)), className: 'xq-view' }, content)])
}

// 迷你悬浮徽章（shell.overlay）：可拖动、右下角手柄调宽度。
// 形态 C：默认区域模式（320px 宽，前 12 只自选静态平铺换行）；⤡ 手柄可调宽 120–480px，双击复位 320。
// 悬停弹层已砍掉：速览靠拉宽徽章，完整功能点徽章开面板。

// ---------- 迷你悬浮徽章（shell.overlay）：可拖动、右下角手柄调宽度 ----------
function MiniBadge() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const [idx, setIdx] = React.useState([])
  const [top, setTop] = React.useState([])
  const [mOpen, setMOpen] = React.useState(true)
  const [, force] = React.useState(0)

  React.useEffect(function () {
    let alive = true
    function refresh() {
      if (pageHidden()) return   // 页面隐藏时暂停徽章轮询
      fetchIndices().then(function (data) {
        if (!alive) return
        setIdx((data && data.list) || [])
        const st = data ? data.status : null
        setMOpen(st === 5 || st === 6)
      }).catch(function () { /* 静默失败 */ })
      // 徽章主体：自选前 12 只（轮动素材 / 平铺内容）；自选为空回退指数
      fetchWatchlist().then(function (wl) {
        if (!alive) return
        const symbols = ((wl && wl.symbols) || []).slice(0, BADGE_WATCH_LIMIT)
        if (!symbols.length) { setTop([]); return }
        return fetchQuote(symbols).then(function (data) {
          if (alive) setTop((data && data.list) || [])
        })
      }).catch(function () { /* 静默失败：保留指数 */ })
    }
    function onVis() { if (!pageHidden()) refresh() }
    refresh()
    // [fork-fix] 应用级水合入口：shell.overlay 全局只挂一次，不随会话切换重放旧持久化值
    hydrateUi()
    const stop = rt.ctx.interval(refresh, POLL_BADGE_MS)
    const off = ui.subscribe(function () { force(function (x) { return x + 1 }) })
    try { document.addEventListener('visibilitychange', onVis) } catch (e) { /* ignore */ }
    return function () {
      alive = false; if (stop) stop(); off()
      try { document.removeEventListener('visibilitychange', onVis) } catch (e) { /* ignore */ }
    }
  }, [])

  // 挂载后与视口变化时按真实渲染尺寸钳制徽标位置：
  // DockGate 恢复时只能按 badgeW 估算宽度（不含边框/极限情况），且窗口缩小后
  // 旧坐标可能落到屏幕外——这里用 offsetWidth 实测值兜底，保证徽标永远可见
  const badgeRef = React.useRef(null)
  function clampBadge() {
    const node = badgeRef.current
    if (!node || !ui.badgePos) return
    const w = node.offsetWidth || 0
    const h = node.offsetHeight || 0
    if (!w) return
    const vp = viewport()
    if (!vp) return
    const x = Math.min(Math.max(EDGE_GAP, Number(ui.badgePos.x)), Math.max(EDGE_GAP, vp.w - w - EDGE_GAP))
    const y = Math.min(Math.max(EDGE_GAP, Number(ui.badgePos.y)), Math.max(EDGE_GAP, vp.h - h - EDGE_GAP))
    if (x !== ui.badgePos.x || y !== ui.badgePos.y) ui.set({ badgePos: { x: x, y: y } })
  }
  // 每次渲染后钳制：数据异步到达→徽章长高→重渲染，逐渲染钳制无时序死角
  // （仅依赖挂载一次/ResizeObserver 的方案在慢环境漏过"渲染后才长高"的场景，CI 实测踩坑）。
  // ui.set 仅在有变更时触发下一次渲染，收敛后不再循环。
  React.useLayoutEffect(clampBadge)
  React.useEffect(function () {
    window.addEventListener('resize', clampBadge)
    let ro = null
    try {
      const node = badgeRef.current
      ro = new ResizeObserver(function () { clampBadge() })
      if (node) ro.observe(node)
    } catch (e) { /* 无 ResizeObserver 时退化为 resize 事件 + 每渲染钳制 */ }
    return function () {
      try { window.removeEventListener('resize', clampBadge) } catch (e) { /* ignore */ }
      try { if (ro) ro.disconnect() } catch (e) { /* ignore */ }
    }
  }, [])

  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    rt.badgeDrag = { x: e.clientX, y: e.clientY }
    rt.badgeMoved = false
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (err) { /* ignore */ }
  }
  function onMove(e) {
    if (!rt.badgeDrag) return
    const dx = e.clientX - rt.badgeDrag.x, dy = e.clientY - rt.badgeDrag.y
    if (Math.abs(dx) + Math.abs(dy) > BADGE_DRAG_THRESHOLD) rt.badgeMoved = true
    if (!rt.badgeMoved) return
    const vp = viewport()
    const w = e.currentTarget.offsetWidth || 160
    const h = e.currentTarget.offsetHeight || 30
    let x = e.clientX - w / 2
    let y = e.clientY - h / 2
    x = Math.min(Math.max(EDGE_GAP, x), (vp ? vp.w : VIEWPORT_FALLBACK_W) - w - EDGE_GAP)
    y = Math.min(Math.max(EDGE_GAP, y), (vp ? vp.h : VIEWPORT_FALLBACK_H) - h - EDGE_GAP)
    rt.badgeDrag.x = x + w / 2
    rt.badgeDrag.y = y + h / 2
    rt.badgeDrag.pos = { x: x, y: y }
    e.currentTarget.style.left = x + 'px'
    e.currentTarget.style.top = y + 'px'
    e.currentTarget.style.right = 'auto'
    e.currentTarget.style.bottom = 'auto'
  }
  function onUp(e) {
    const moved = rt.badgeMoved
    const pos = rt.badgeDrag ? rt.badgeDrag.pos : null
    rt.badgeDrag = null
    rt.badgeMoved = false
    try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) } catch (err) { /* ignore */ }
    if (!moved) { ui.set({ open: !ui.open }); return }
    if (pos) ui.set({ badgePos: pos })   // 松手一次性提交
  }

  // ---- 宽度调节手柄：横向拖动改变徽章宽度（120–480px），松手持久化；双击复位为单行条 ----
  const gripDrag = React.useRef(null)
  function onGripDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.stopPropagation()   // 不触发徽章移动
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (err) { /* ignore */ }
    const base = ui.badgeW || (e.currentTarget.parentElement ? e.currentTarget.parentElement.offsetWidth : 200)
    gripDrag.current = { startX: e.clientX, baseW: base }
  }
  function onGripMove(e) {
    if (!gripDrag.current) return
    e.stopPropagation()
    const vp = viewport()
    const maxW = Math.min(BADGE_W_MAX, (vp ? vp.w : VIEWPORT_FALLBACK_W) - 24)
    const w = Math.min(Math.max(BADGE_W_MIN, gripDrag.current.baseW + (e.clientX - gripDrag.current.startX)), maxW)
    ui.set({ badgeW: w })   // 拖动过程实时反馈（内存态，松手才落盘）
  }
  function onGripUp(e) {
    if (!gripDrag.current) return
    e.stopPropagation()
    gripDrag.current = null
    try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) } catch (err) { /* ignore */ }
    rt.saveUi()   // 落盘（debounce）
  }
  function onGripDblClick(e) {
    e.stopPropagation()
    ui.set({ badgeW: null })   // 复位为默认区域宽度（320px）
    rt.saveUi()
  }


  // 默认区域模式：自选静态平铺（badgeW 未设置时用默认宽 320px；双击手柄回到 320 而非单行）
  const wide = true
  const effW = (ui.badgeW !== null && ui.badgeW !== undefined) ? ui.badgeW : BADGE_W_DEFAULT
  // 区域模式：前 12 只全部平铺（换行）；单行模式：轮动页（页码指示）
  function wItem(q) {
    return el('span', { key: 'w-' + q.symbol, className: 'xq-witem', title: (q.name || q.symbol) + ' ' + fmt(q.current) + (q.percent !== undefined ? '  ' + fmtPct(q.percent) : '') }, [
      el('span', { key: 'n', className: 'xq-badge-hint' }, (q.name || q.symbol) + ' '),
      el('span', { key: 'p', className: 'xq-badge-val ' + colorOf(q.percent) }, fmtPct(q.percent))
    ])
  }
  // 指数区：4 指数两列（上证 深证 创业 科创50），有自选时作为区域头部，无自选时即主体
  function idxRow(q) {
    return el('span', { key: 'ix-' + q.symbol, className: 'xq-idxrow', title: (q.name || q.symbol) + ' ' + fmt(q.current) }, [
      el('span', { key: 'n', className: 'xq-badge-hint' }, (q.name || q.symbol)),
      el('span', { key: 'p', className: 'xq-badge-val ' + colorOf(q.percent) }, fmtPct(q.percent))
    ])
  }
  const idxEls = el('div', { key: 'idx', className: 'xq-idxgrid' }, idx.map(idxRow))
  const bodyEls = top.length
    ? el('div', { key: 'wg', className: 'xq-wgrid' }, top.map(wItem))
    : null
  let style = ui.badgePos
    ? { left: ui.badgePos.x, top: ui.badgePos.y, right: 'auto', bottom: 'auto' }
    : null
  if (wide) {
    if (!style) { style = {} }
    style.maxWidth = effW + 'px'
    style.width = effW + 'px'
  }

  const badgeEl = el('div', {
    ref: badgeRef,
    className: 'xq-badge',
    style: style,
    title: '点击开合行情面板 · 拖动调整位置 · 右下角 ⤡ 调宽度（双击复位）',
    onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp
  }, [
    el('div', { key: 'hd', className: 'xq-badge-hd' }, [
      el('span', { key: 'logo' }, [el('b', { key: 'b' }, '雪球'), 'mini']),
      el('span', { key: 'st', className: 'xq-status' + (aSession() === '盘中' ? ' xq-live' : ''), title: sessionsText() }, (function () { var s = aSession(); return s === '盘中' ? '● 盘中' : (s || (mOpen ? '● 盘中' : '休市')) })()),
      el('span', { key: 'sp', className: 'xq-spacer' }),
      el('span', { key: 'ct', className: 'xq-caret' }, ui.open ? '▾' : '▴')
    ]),
    idxEls,
    bodyEls,
    el('span', {
      key: 'grip', className: 'xq-badge-grip', title: '拖动调宽度 · 双击复位',
      onPointerDown: onGripDown, onPointerMove: onGripMove, onPointerUp: onGripUp, onPointerCancel: onGripUp,
      onDoubleClick: onGripDblClick
    }, '⤡')
  ])
  return el('div', { style: { display: 'contents' } }, [badgeEl])
}

// 嵌入式主面板（conversation.input.dock）：输入框上方一整行。
// ---------- 嵌入式主面板（conversation.input.dock）：输入框上方一整行 ----------
// DockGate 常驻挂载：负责 hydrate + 订阅 ui，open=false 时渲染 null。
// 不能把开关写在槽位 render 闭包里——槽位函数不会因 ui 变化而重新执行。

function DockGate() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const [, force] = React.useState(0)
  React.useEffect(function () {
    hydrateUi()   // 幂等：MiniBadge 已经触发过就是空操作
    const off = ui.subscribe(function () { force(function (x) { return x + 1 }) })
    return off
  }, [])
  if (!ui.hydrated || !ui.open) return null
  return el(DockPanel, null)
}

function DockPanel() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const dockResize = rt.dockResize
  const [, force] = React.useState(0)
  const [tick, setTick] = React.useState(0)
  React.useEffect(function () {
    const off = ui.subscribe(function () { if (ui.hydrated) rt.saveUi(); force(function (x) { return x + 1 }) })
    return off
  }, [])
  // 每分钟重算一次交易时段提示
  React.useEffect(function () {
    const stop = rt.ctx.interval(function () { setTick(function (x) { return x + 1 }) }, POLL_DOCK_SESSION_MS)
    return function () { if (stop) stop() }
  }, [])
  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    dockResize.active = true
    dockResize.startY = e.clientY
    dockResize.startH = ui.dockH || defaultDockH()
    // 拖动期间直改 DOM（不触发 React 重渲染），松手才提交一次状态
    try {
      const dock = e.currentTarget.closest('.xq-dock')
      dockResize.body = dock ? dock.querySelector('.xq-dock-body') : null
      if (dockResize.body) dockResize.body.style.transition = 'none'
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
    } catch (err) { /* ignore */ }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (err) { /* ignore */ }
  }
  function onMove(e) {
    if (!dockResize.active || !dockResize.body) return
    const vp = viewport()
    const maxH = Math.round((vp ? vp.h : VIEWPORT_FALLBACK_H) * DOCK_H_VP_RATIO)
    let h = dockResize.startH + (e.clientY - dockResize.startY)
    h = Math.min(Math.max(DOCK_H_MIN, h), Math.min(maxH, DOCK_H_MAX))
    dockResize.h = h
    dockResize.body.style.height = h + 'px'   // 直接写样式，逐帧零渲染
  }
  function onUp(e) {
    if (dockResize.active && dockResize.body) {
      dockResize.body.style.transition = ''
      dockResize.body.style.height = ''
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      if (dockResize.h) ui.set({ dockH: dockResize.h })   // 松手一次性提交
    }
    dockResize.active = false
    dockResize.h = 0
    try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) } catch (err) { /* ignore */ }
  }
  function defaultDockH() {
    try { if (typeof window !== 'undefined' && window.innerHeight) return Math.round(window.innerHeight * DOCK_H_DEFAULT_RATIO) } catch (e) { /* ignore */ }
    return DOCK_H_FALLBACK
  }
  const bodyStyle = ui.dockH ? { height: ui.dockH + 'px' } : null
  return el('div', { className: 'xq-dock' }, [
    el('div', { key: 'head', className: 'xq-dock-head' }, [
      el('span', { key: 'logo', className: 'xq-logo' }, [el('b', { key: 'b' }, '雪球'), ' mini']),
      el('span', { key: 'st', className: 'xq-status', title: 'A股/港股/美股交易时段（本地时区推算，不含节假日）' }, sessionsText() || '行情面板'),
      el(PnlChip, { key: 'pnl' }),
      el('span', { key: 'hint', className: 'xq-update' }, '已嵌入输入框上方 · Esc 收起'),
      el('span', { key: 'sp', className: 'xq-spacer' }),
      el('button', { key: 'min', className: 'xq-btn-mini', title: '收起（点右下角徽章重新打开）', onClick: function () { ui.set({ open: false }) } }, '收起 —')
    ]),
    el('div', { key: 'body', className: 'xq-dock-body', style: bodyStyle }, [
      el(XueqiuPanel, { key: 'panel' })
    ]),
    el('div', {
      key: 'rs', className: 'xq-dock-resize', title: '拖动调整面板高度（双击复位）',
      onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp,
      onDoubleClick: function () { ui.set({ dockH: null }) }
    }, [el('span', { key: 'g' }, null)])
  ])
}

// 底部指数条（会话页，输入框下方氛围行）。

// ---------- 底部指数条（会话页，输入框下方氛围行） ----------
function Ticker() {
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

// 槽位注册：7 次 slots.inject/register 集中成一张表（顺序即契约，与重构前一一对应）。

// ---------- 注册 ----------
const XQ_SLOT_REGISTRATIONS = [
  { slot: SLOT_TOOLVIEW, options: { name: SLOT_TOOLVIEW, key: TOOLVIEW_KEYS.quote }, render: function (props) { return el(QuoteCard, props) } },
  { slot: SLOT_TOOLVIEW, options: { name: SLOT_TOOLVIEW, key: TOOLVIEW_KEYS.kline }, render: function (props) { return el(KlineCard, props) } },
  { slot: SLOT_TOOLVIEW, options: { name: SLOT_TOOLVIEW, key: TOOLVIEW_KEYS.hot }, render: function (props) { return el(HotCard, props) } },
  { slot: SLOT_TOOLVIEW, options: { name: SLOT_TOOLVIEW, key: TOOLVIEW_KEYS.news }, render: function (props) { return el(NewsCard, props) } },
  { slot: SLOT_INPUT_DOCK, options: { name: SLOT_INPUT_DOCK, id: PANEL_ID, order: PANEL_ORDER }, render: function () { return el(DockGate, null) } },
  { slot: SLOT_OVERLAY, options: { name: SLOT_OVERLAY, id: BADGE_ID }, render: function () { return el(MiniBadge, null) } },
  { slot: SLOT_COMPOSER_DOCK, options: { name: SLOT_COMPOSER_DOCK, id: TICKER_ID, order: TICKER_ORDER }, render: function () { return el(Ticker, null) } }
]

function installSlots(ctx) {
  const slots = ctx.get('slots')
  if (slots === undefined) return
  for (let i = 0; i < XQ_SLOT_REGISTRATIONS.length; i++) {
    const reg = XQ_SLOT_REGISTRATIONS[i]
    slots.inject(reg.slot, function () {
      return slots.register(reg.options, reg.render)
    })
  }
}

// 入口：apply 薄壳（插样式 → 建运行时 → 装槽位）+ 默认导出。
// 样式在 apply 开头只插一次；ui store / saveUi / hydratePromise / 拖拽引用等「每次 apply 一份」
// 的状态由 createUiRuntime 重建（见 store/ui.js 的运行时持有者说明）。

const xqClientPlugin = {
  inject: ['timer'],
  apply(ctx) {
    styles.insert(`
.xq-tv-shell{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:8px 10px;margin:4px 0;font-size:13px;line-height:1.5;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);min-width:0;}
.xq-tv-head{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px;}
.xq-tv-title{font-weight:700;}
.xq-tv-pill{font-size:11px;padding:1px 7px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);white-space:nowrap;}
.xq-tv-table{display:flex;flex-direction:column;gap:2px;}
.xq-tv-row{display:flex;align-items:baseline;gap:10px;padding:2px 4px;border-radius:6px;}
.xq-tv-row:hover{background:var(--dsw-alias-bg-layer-2);}
.xq-tv-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.xq-tv-code{color:var(--dsw-alias-label-tertiary);font-size:11px;}
.xq-tv-price{font-weight:700;font-variant-numeric:tabular-nums;}
.xq-tv-pct{font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap;}
.xq-tv-shell svg{max-width:100%;height:auto;display:block;}
.xq-tv-rank{width:22px;flex:none;text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);font-size:12px;}
.xq-tv-rankup{color:var(--dsw-alias-state-error-primary);font-size:11px;flex:none;font-variant-numeric:tabular-nums;}
.xq-tv-rankdn{color:var(--dsw-alias-state-success-primary);font-size:11px;flex:none;font-variant-numeric:tabular-nums;}
.xq-tv-news{display:flex;flex-direction:column;gap:1px;max-height:300px;overflow-y:auto;}
.xq-tv-item{display:flex;gap:8px;align-items:baseline;padding:2px 4px;border-radius:6px;}
.xq-tv-item:hover{background:var(--dsw-alias-bg-layer-2);}
.xq-tv-mark{background:var(--dsw-alias-bg-layer-2);}
.xq-tv-time{flex:none;font-size:11px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;}
.xq-tv-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.xq-tv-flag{color:var(--dsw-alias-state-error-primary);font-weight:700;}
.xq-up{color:var(--dsw-alias-state-error-primary);}
.xq-down{color:var(--dsw-alias-state-success-primary);}
.xq-dock{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;overflow:hidden;font-size:13px;line-height:1.45;color:var(--dsw-alias-label-primary);margin-bottom:6px;}
.xq-dock *{box-sizing:border-box;}
.xq-dock-head{display:flex;align-items:center;gap:8px;padding:7px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);}
.xq-dock-body{height:52vh;max-height:80vh;overflow-y:auto;padding:8px 12px 10px;}
.xq-dock-resize{display:flex;align-items:center;justify-content:center;height:12px;cursor:ns-resize;user-select:none;border-top:1px solid var(--dsw-alias-border-l1);}
.xq-dock-resize span{display:block;width:36px;height:3px;border-radius:2px;background:var(--dsw-alias-border-l2);}
.xq-badge{position:fixed;right:16px;bottom:64px;display:flex;flex-direction:column;align-items:stretch;gap:6px;padding:8px 12px;border-radius:14px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);box-shadow:0 6px 24px rgba(0,0,0,.25);font-size:11.5px;line-height:1.4;color:var(--dsw-alias-label-primary);cursor:grab;user-select:none;pointer-events:auto;z-index:1200;}
.xq-badge:active{cursor:grabbing;}
.xq-badge b{color:var(--dsw-alias-brand-primary);}
.xq-badge-val{font-weight:700;}
.xq-badge-hint{color:var(--dsw-alias-label-secondary);}
.xq-logo{font-weight:700;font-size:14px;letter-spacing:.5px;white-space:nowrap;}
.xq-logo b{color:var(--dsw-alias-brand-primary);}
.xq-update{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;}
.xq-status{font-size:10px;padding:1px 6px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);white-space:nowrap;}
.xq-status.xq-live{color:var(--dsw-alias-state-error-primary);}
.xq-spacer{flex:1;}
.xq-btn{font-size:12px;padding:2px 10px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);cursor:pointer;}
.xq-btn:hover{border-color:var(--dsw-alias-brand-primary);}
.xq-btn:disabled{opacity:.5;cursor:default;}
.xq-btn-mini{font-size:11px;padding:1px 8px;border-radius:5px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;line-height:1.4;}
.xq-btn-mini:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-secondary);}
.xq-tabs{display:flex;gap:4px;align-items:center;border-bottom:1px solid var(--dsw-alias-border-l1);margin-bottom:8px;}
.xq-tab{font-size:13px;padding:5px 12px;border:none;background:none;color:var(--dsw-alias-label-secondary);cursor:pointer;border-bottom:2px solid transparent;}
.xq-tab:hover{color:var(--dsw-alias-label-primary);}
.xq-tab-active{color:var(--dsw-alias-brand-primary);border-bottom-color:var(--dsw-alias-brand-primary);font-weight:600;}
.xq-idx{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;}
.xq-idx-card{flex:1;min-width:120px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:6px 8px;cursor:pointer;}
.xq-idx-card:hover{border-color:var(--dsw-alias-brand-primary);}
.xq-sort-h{cursor:pointer;user-select:none;}
.xq-sort-h:hover{color:var(--dsw-alias-label-primary);}
.xq-sort-on{color:var(--dsw-alias-label-primary);font-weight:600;}
.xq-idx-name{font-size:11px;color:var(--dsw-alias-label-secondary);}
.xq-idx-row{display:flex;align-items:baseline;gap:6px;}
.xq-idx-cur{font-size:14px;font-weight:700;}
.xq-idx-pct{font-size:11px;}
.xq-up{color:var(--dsw-alias-state-error-primary);}
.xq-down{color:var(--dsw-alias-state-success-primary);}
.xq-flat{color:var(--dsw-alias-label-secondary);}
/* 专业感三件套：①等宽数字 ②涨跌幅色块 ③价格闪烁 */
.xq-dock,.xq-badge,.xq-ticker{font-variant-numeric:tabular-nums;}
.xq-pct-chip{display:inline-block;min-width:52px;text-align:center;padding:1px 6px;border-radius:5px;font-size:11.5px;font-weight:600;}
.xq-pct-chip.xq-up{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);}
.xq-pct-chip.xq-down{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);}
.xq-pct-chip.xq-flat{background:var(--dsw-alias-bg-layer-2);}
.xq-idx-pct.xq-pct-chip{min-width:46px;padding:0 5px;font-size:10.5px;}
@keyframes xq-flash-up{0%{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 18%, transparent);}100%{background:transparent;}}
@keyframes xq-flash-down{0%{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 18%, transparent);}100%{background:transparent;}}
.xq-flash-up{animation:xq-flash-up .8s ease-out;}
.xq-flash-down{animation:xq-flash-down .8s ease-out;}
/* 微交互：内容切换淡入 + 刷新按钮旋转 */
@keyframes xq-fade-in{from{opacity:0;transform:translateY(3px);}to{opacity:1;transform:none;}}
.xq-view{animation:xq-fade-in .18s ease-out;}
@keyframes xq-spin{to{transform:rotate(360deg);}}
.xq-refresh-spin{display:inline-block;animation:xq-spin .8s linear infinite;}
.xq-tab{transition:color .15s,border-color .15s;}
/* 快讯时间轴：左侧竖线 + 时间锚点分组 */
.xq-news-tl{position:relative;padding-left:14px;}
.xq-news-tl::before{content:"";position:absolute;left:4px;top:6px;bottom:6px;width:1px;background:var(--dsw-alias-border-l2);}
.xq-news-group{font-size:10.5px;color:var(--dsw-alias-label-secondary);margin:8px 0 5px;display:flex;align-items:center;gap:6px;}
.xq-news-group::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-border-l2);margin-left:-13px;flex:none;}
.xq-news-item{position:relative;}
/* 徽章 hover 预览弹层 */
/* 徽章区域模式：右下角宽度调节手柄（⤡），拖动横向改变宽度 */
.xq-badge-grip{position:absolute;right:2px;bottom:2px;width:16px;height:16px;cursor:ew-resize;display:flex;align-items:flex-end;justify-content:flex-end;color:var(--dsw-alias-label-secondary);font-size:9px;line-height:1;opacity:0;transition:opacity .15s;}
.xq-badge:hover .xq-badge-grip{opacity:.85;}
.xq-badge-hd{display:flex;align-items:center;gap:8px;}
.xq-wgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px 12px;padding:1px 8px 1px 0;}
.xq-witem{white-space:nowrap;display:flex;justify-content:space-between;gap:6px;}
.xq-witem .xq-badge-hint{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:0 1 auto;}
.xq-idxgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px 12px;padding-bottom:5px;border-bottom:1px solid var(--dsw-alias-border-l2);}
.xq-idxrow{display:flex;justify-content:space-between;gap:6px;white-space:nowrap;}
.xq-grid{display:grid;gap:0;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;overflow:hidden;margin-bottom:8px;}
.xq-grid-hd,.xq-grid-row{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr 84px;align-items:center;}
.xq-grid-hd{font-size:11px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);padding:5px 8px;}
.xq-grid-row{padding:6px 8px;border-top:1px solid var(--dsw-alias-border-l1);cursor:pointer;font-size:12.5px;}
.xq-grid-row:hover{background:var(--dsw-alias-bg-layer-2);}
.xq-name{font-weight:600;}
.xq-sub{font-size:10.5px;color:var(--dsw-alias-label-secondary);}
.xq-muted{font-size:12px;color:var(--dsw-alias-label-secondary);}
.xq-err{font-size:12px;color:var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:6px;padding:5px 8px;margin-bottom:6px;}
.xq-actions{display:flex;gap:4px;justify-content:flex-end;}
.xq-input{font-size:12.5px;padding:4px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
.xq-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary);}
.xq-search-row{display:flex;gap:6px;margin-bottom:8px;}
.xq-search-row .xq-input{flex:1;}
.xq-seg{display:inline-flex;gap:2px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:1px;}
.xq-seg button{font-size:11.5px;border:none;background:none;color:var(--dsw-alias-label-secondary);padding:2px 8px;border-radius:5px;cursor:pointer;}
.xq-seg button.xq-seg-on{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600;}
.xq-news{display:flex;flex-direction:column;gap:7px;max-height:380px;overflow-y:auto;}
.xq-news-item{font-size:12.5px;padding:6px 8px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:7px;}
.xq-news-item.xq-important{border-left:3px solid var(--dsw-alias-state-warn-primary);}
.xq-news-time{font-size:10.5px;color:var(--dsw-alias-label-secondary);margin-top:3px;}
.xq-news-more{font-size:11.5px;color:var(--dsw-alias-label-secondary);text-align:center;padding:6px 0 2px;cursor:pointer;user-select:none;}
.xq-news-more:hover{color:var(--dsw-alias-label-primary);}
.xq-detail-head{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;}
.xq-detail-name{font-size:16px;font-weight:700;letter-spacing:.2px;}
.xq-detail-code{font-size:11px;color:var(--dsw-alias-label-tertiary);letter-spacing:.3px;}
.xq-detail-price{display:flex;align-items:baseline;gap:10px;}
.xq-detail-delta{display:flex;align-items:baseline;gap:6px;}
.xq-detail-cur{font-size:27px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;}
.xq-detail-chg{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;}
.xq-detail-pct{font-size:14px;font-weight:700;font-variant-numeric:tabular-nums;}
.xq-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px;}
.xq-stat{background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 55%, transparent);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:6px 8px;min-width:0;}
.xq-stat-k{font-size:10px;color:var(--dsw-alias-label-tertiary);margin-bottom:3px;letter-spacing:.2px;}
.xq-stat-v{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.xq-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:10px 12px;margin-bottom:12px;}
.xq-card-t{font-size:12.5px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.xq-card-t::before{content:"";width:3px;height:12px;border-radius:2px;background:var(--dsw-alias-brand-primary);flex:none;}
.xq-periods{display:inline-flex;flex-wrap:wrap;gap:2px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;padding:2px;background:var(--dsw-alias-bg-layer-2);}
.xq-periods button,.xq-modes button{font-size:11.5px;border:none;background:none;color:var(--dsw-alias-label-secondary);padding:3px 9px;border-radius:6px;cursor:pointer;transition:color .12s,background .12s;}
.xq-periods button:hover,.xq-modes button:hover{color:var(--dsw-alias-label-primary);}
.xq-periods button.xq-on,.xq-modes button.xq-on{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent);color:var(--dsw-alias-brand-primary);font-weight:700;}
.xq-chart{width:100%;height:auto;display:block;}
.xq-chart-pan{cursor:crosshair;touch-action:none;}
.xq-chart-pan:active{cursor:grabbing;}
.xq-chart-wrap{position:relative;}
.xq-tip{position:absolute;top:4px;z-index:5;pointer-events:none;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:4px 8px;font-size:10.5px;line-height:1.6;color:var(--dsw-alias-label-primary);box-shadow:0 4px 14px rgba(0,0,0,.28);white-space:nowrap;}
.xq-tip-d{font-weight:700;}
.xq-tip-r{display:flex;gap:8px;}
.xq-tip-k{color:var(--dsw-alias-label-secondary);}
.xq-chart-labels{display:flex;justify-content:space-between;font-size:10.5px;color:var(--dsw-alias-label-tertiary);margin-top:3px;}
.xq-ma-legend{display:flex;gap:10px;font-size:10.5px;color:var(--dsw-alias-label-secondary);}
.xq-klc{height:300px;width:100%;min-width:0;cursor:grab;}
.xq-klc.xq-dragging{cursor:grabbing;}
.xq-klc-min{height:230px;}
.xq-kol{display:flex;flex-wrap:wrap;gap:6px;}
.xq-kol-chip{font-size:12px;padding:4px 10px;border-radius:14px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);cursor:pointer;}
.xq-kol-chip:hover{border-color:var(--dsw-alias-brand-primary);}
.xq-verif{font-size:9.5px;color:var(--dsw-alias-brand-primary);margin-left:4px;}
.xq-hot-row{display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);cursor:pointer;}
.xq-hot-row:last-child{border-bottom:none;}
.xq-hot-row:hover{background:var(--dsw-alias-bg-layer-2);}
.xq-rank{font-size:12px;font-weight:700;width:20px;text-align:center;color:var(--dsw-alias-label-secondary);}
.xq-ticker{display:flex;gap:14px;font-size:11px;color:var(--dsw-alias-label-secondary);padding:2px 2px;flex-wrap:wrap;cursor:pointer;}
.xq-ticker:hover{color:var(--dsw-alias-label-primary);}
.xq-tick{display:inline-flex;gap:5px;align-items:baseline;}
.xq-tick-name{color:var(--dsw-alias-label-secondary);}
.xq-tick-cur{font-weight:600;}
.xq-caret{font-size:11px;color:var(--dsw-alias-label-secondary);flex-shrink:0;}
.xq-loading{font-size:12px;color:var(--dsw-alias-label-secondary);padding:12px 0;text-align:center;}
/* 账号登录（可选）：粘贴浏览器 Cookie 启用云端自选股 */
.xq-acc-btn.xq-acc-on{border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, transparent);color:var(--dsw-alias-brand-primary);}
.xq-login{display:flex;flex-direction:column;gap:9px;max-width:560px;}
.xq-login-hd{font-size:13.5px;font-weight:700;}
.xq-login-tip{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.7;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:7px;padding:7px 10px;}
.xq-login-tip b{color:var(--dsw-alias-label-primary);}
.xq-login-tip ol{margin:4px 0 0;padding-left:18px;}
.xq-login-tip a{color:var(--dsw-alias-brand-primary);}
.xq-login textarea{font-size:11.5px;font-family:ui-monospace,Menlo,monospace;width:100%;min-height:64px;resize:vertical;padding:6px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
.xq-login textarea:focus{outline:none;border-color:var(--dsw-alias-brand-primary);}
.xq-login-msg{font-size:12px;}
.xq-login-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
.xq-login-user{font-size:12.5px;color:var(--dsw-alias-label-primary);}
.xq-login-ok{color:var(--dsw-alias-state-success-primary);}
.xq-login-bad{color:var(--dsw-alias-state-warn-primary);}
.xq-acc-mark{font-size:10px;color:var(--dsw-alias-label-secondary);}
/* 今日盈亏（同花顺投资账本）：头部常驻 chip + 「盈亏」tab。
   配色沿用既有变量，A 股习惯「涨红跌绿」：up 用 state-error-primary、down 用 state-success-primary。 */
.xq-pnl-chip{display:inline-flex;align-items:baseline;gap:4px;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);white-space:nowrap;cursor:pointer;font-variant-numeric:tabular-nums;transition:color .15s;max-width:300px;overflow:hidden;text-overflow:ellipsis;}
.xq-pnl-chip:hover{color:var(--dsw-alias-label-primary);}
.xq-pnl-chip.xq-pnl-up{color:var(--dsw-alias-state-error-primary);font-weight:600;}
.xq-pnl-chip.xq-pnl-down{color:var(--dsw-alias-state-success-primary);font-weight:600;}
.xq-pnl-chip.xq-pnl-bad{color:var(--dsw-alias-state-warn-primary);}
.xq-pnl-tag{font-size:10px;color:var(--dsw-alias-label-tertiary);font-weight:400;}
.xq-pnl{display:flex;flex-direction:column;gap:9px;max-width:560px;}
.xq-pnl-hero{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}
.xq-pnl-amt{font-size:26px;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums;}
.xq-pnl-pct{font-size:14px;font-weight:700;font-variant-numeric:tabular-nums;}
.xq-pnl-up{color:var(--dsw-alias-state-error-primary);}
.xq-pnl-down{color:var(--dsw-alias-state-success-primary);}
.xq-pnl-dim{color:var(--dsw-alias-label-secondary);}
.xq-pnl-ok{color:var(--dsw-alias-state-success-primary);}
.xq-pnl-bad{color:var(--dsw-alias-state-warn-primary);}
.xq-pnl-meta{font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;}
.xq-pnl-block{display:flex;flex-direction:column;gap:6px;}
.xq-pnl-sec{font-size:12.5px;font-weight:700;display:flex;align-items:center;gap:8px;}
.xq-pnl-sec::before{content:"";width:3px;height:12px;border-radius:2px;background:var(--dsw-alias-brand-primary);flex:none;}
.xq-pnl-field{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.xq-pnl-field label{font-size:12px;color:var(--dsw-alias-label-secondary);flex:none;}
.xq-pnl-sel{font-size:12.5px;padding:3px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);max-width:100%;}
.xq-pnl-num{font-size:12.5px;width:88px;padding:3px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;}
.xq-pnl-num:focus,.xq-pnl-sel:focus{outline:none;border-color:var(--dsw-alias-brand-primary);}
.xq-pnl-ta{font-size:11.5px;font-family:ui-monospace,Menlo,monospace;width:100%;min-height:64px;resize:vertical;padding:6px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
.xq-pnl-ta:focus{outline:none;border-color:var(--dsw-alias-brand-primary);}
.xq-pnl-note{font-size:11px;color:var(--dsw-alias-label-tertiary);line-height:1.6;}
.xq-pnl-sub{font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary);}
.xq-pnl-sub.xq-pnl-bad{color:var(--dsw-alias-state-warn-primary);}
.xq-pnl-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
.xq-pnl-msg{font-size:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
`)
    createUiRuntime(ctx)
    createPnlRuntime(ctx)   // 只建运行时、不取数：首个订阅者（chip）挂载时才启动轮询
    installSlots(ctx)
  }
}



return xqClientPlugin

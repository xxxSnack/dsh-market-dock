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
// 顺序：原有 4 项位置不动，盈亏（pnl）为第 5 项、持仓（positions）为**追加**的第 6 项
// （宿主 ui.get 的 tab 白名单同步放行）。
const PANEL_TABS = [['market', '行情'], ['hot', '热榜'], ['search', '搜索'], ['news', '快讯'], ['pnl', '盈亏'], ['positions', '持仓']]

// ---- 请求规模参数（属于 call() 参数形状的一部分，与原字面量一致）----
const NEWS_PAGE_SIZE = 20          // news count
const HOT_LIST_SIZE = 10           // hot size
const KLINE_PAGE_SIZE = 500        // kline count（也用于右拖加载更早历史）
const KOL_SIZE = 6                 // kol count
const SEARCH_STOCK_SIZE = 8        // search count
const SEARCH_POST_SIZE = 10        // searchPosts count
const BADGE_WATCH_LIMIT = 12       // 徽标主体最多展示的自选只数
const WATCHLIST_MAX = 200          // 面板订阅的自选上限（与宿主 watchlist 的 200 上限一致）

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
// 自选列表读取节奏（客户端行情运行时）：宿主 watchlist.get 会触发 10 分钟节流的云端镜像同步，
// 所以**必须**保留定期读取 —— 否则网页端增删自选后本页永远跟不上。这里统一 30 秒一次，
// 且只在有自选消费者（面板/徽章）时读；无消费者时停表。
const WATCHLIST_POLL_MS = 30000
// 软 TTL：同一 symbol 在这么短时间内已经取过就不再为「新挂载的组件」重复刷新。
// 必须小于最快的行情周期（20s），否则会把用户的刷新节奏拖慢。
const MARKET_SOFT_TTL_MS = 5000
// 今日盈亏（本地持仓 × 行情）：宿主回传的 next_poll_ms 缺失或过密时的兜底间隔（出错退避也用这个值）
const POSITIONS_POLL_FALLBACK_MS = 30000
const ALERT_POLL_MS = 30000
// 没有提醒规则时的空转节奏：行情隐身/面板收起后提醒轮询依然常驻，不能按 30 秒空转。
// 5 分钟一次本地文件读（宿主的 alerts.get 只读 .xueqiu-alerts.json，不出网），
// 同时保留「在别处新增了规则，这个页面也能自己发现」的能力。
const ALERT_IDLE_POLL_MS = 300000
const ALERT_NOTICE_LIMIT = 20       // 首次加载仅展示有限待确认事件，避免旧事件撑爆面板

// ---- 行情隐身（FORK-NOTES §11）----
// 快捷键命令 id：注册到宿主快捷键服务，出现在 设置 → 通用 → 快捷键 里（可看键帽、可改键）。
const XQ_SHORTCUT_TOGGLE_HIDDEN = 'xq.toggleHidden'

// ---- 槽位 id 与 order（7 个注册逐一对应，注册顺序见 slots.js）----
const SLOT_TOOLVIEW = 'tool.call.toolview'
const SLOT_INPUT_DOCK = 'conversation.input.dock'
const SLOT_OVERLAY = 'shell.overlay'
const SLOT_COMPOSER_DOCK = 'conversation.composer.dock'
const TOOLVIEW_KEYS = { quote: 'xueqiu_quote', kline: 'xueqiu_kline', hot: 'xueqiu_hot', news: 'xueqiu_news' }
const PANEL_ID = 'market-dock-panel'
const PANEL_ORDER = 30
const BADGE_ID = 'market-dock-badge'
const TICKER_ID = 'market-dock-ticker'
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
    // 与宿主 P&L 时段口径一致：收盘分钟仍属于盘中（A 股 11:30 / 15:00），
    // 午休从下一分钟开始，避免界面在边界瞬间先显示“休市/午休”。
    var inSess = segs.some(function (s) { return cur >= s[0] && cur <= s[1] })
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

// 行内「更多」菜单的落点计算（面板/持仓两处共用）。
//
// 为什么需要它：菜单是相对按钮绝对定位的，而它一定会被某个祖先裁剪 ——
//   · 行情表 .xq-grid 有 overflow: hidden（圆角）；
//   · 持仓表 .xq-pos-table 在窄容器里是 overflow-x: auto（会把另一个轴也算成 auto）；
//   · 面板内容 .xq-dock-body 是滚动容器。
// 最后一行的菜单向下展开就会掉进裁剪区外面（看不见、点不到）。这里先量出按钮在
// **最近的裁剪祖先**可视区里上下各剩多少空间，下方不够就翻到上方展开。

/** 菜单自身高度估计（一项 = 28px + 上下 padding 8 + 边框 2；多一项按 28 递增）。 */
function estimateMenuHeight(items) {
  const n = items > 0 ? items : 1
  return 28 * n + 10
}

/**
 * 判断菜单是否应该向上展开。
 * @param {Element} trigger 触发按钮
 * @param {number} menuHeight 菜单高度估计
 * @returns {boolean} true = 向上展开
 */
function menuUpward(trigger, menuHeight) {
  if (!trigger || typeof trigger.getBoundingClientRect !== 'function') return false
  let rect
  try { rect = trigger.getBoundingClientRect() } catch (e) { return false }
  if (!rect) return false
  const need = (menuHeight > 0 ? menuHeight : estimateMenuHeight(1)) + 6

  let box = null
  try {
    let node = trigger.parentElement
    while (node && node !== document.body && node !== document.documentElement) {
      const cs = window.getComputedStyle(node)
      const clipY = cs.overflowY && cs.overflowY !== 'visible'
      const clipX = cs.overflowX && cs.overflowX !== 'visible'
      if (clipY || clipX) { box = node.getBoundingClientRect(); break }
      node = node.parentElement
    }
  } catch (e) { box = null }

  const top = box ? box.top : 0
  const bottom = box ? box.bottom : (typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : 800)
  const below = bottom - rect.bottom
  const above = rect.top - top
  if (below >= need) return false     // 下方放得下：保持默认向下
  return above > below                // 下方放不下：上方更宽裕就翻上去
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
// 持仓 + 今日盈亏：本地持仓 × 雪球行情（宿主现算），不需要账本凭据。宿主实现见 lib/pnl/。
const A_POSITIONS_GET = 'positions.get'
const A_POSITIONS_SAVE = 'positions.save'
const A_POSITIONS_REMOVE = 'positions.remove'
// 从账本同步（**唯一**会请求账本的入口，只在用户刻意点击时调用）
const A_POSITIONS_SYNC = 'positions.sync'
// 账本凭据（Cookie / 组合 / 行情刷新间隔）：只服务 positions.sync
const A_PNL_VERIFY = 'pnl.verify'
const A_PNL_CONFIG = 'pnl.config'
// 价格提醒：规则与事件由宿主持久化，客户端只负责展示与调用。
const A_ALERTS_GET = 'alerts.get'
const A_ALERTS_SET = 'alerts.set'
const A_ALERTS_REMOVE = 'alerts.remove'
const A_ALERTS_ACK = 'alerts.ack'

// 注：用具名 async 函数表达式（构建器只认 `export function|const|let|var|class` 开头的导出行）。
const call = async function (action, args) {
  const r = await host.call('xq.call', { action: action, args: args || {} })
  if (!r || !r.ok) throw new Error((r && r.error) || '调用失败')
  return r.data
}

// UI 共享状态：面板开合 / 当前标签 / 徽章位置、尺寸与折叠形态。同时是**运行时持有者（runtime holder）**。
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
    open: false, tab: 'market', badgePos: null, badgeW: null, badgeCompact: false, dockH: null, hydrated: false,
    // [fork.7] 行情隐身：true = 三个常驻入口（面板/徽章/指数条）全部不挂载，行情轮询随之停止。
    // 放在 ui 里而不是另起一套持久化：水合、touched 守卫、落盘 debounce 全部复用现成通道。
    hidden: false,
    // [fork-fix] 已交互过的字段不被迟到的水合回滚。open/tab 原本就有这些标志，位置/尺寸/折叠状态补齐。
    openTouched: false, tabTouched: false, badgePosTouched: false, badgeWTouched: false, badgeCompactTouched: false, dockHTouched: false,
    hiddenTouched: false,
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
        if (k === 'badgeCompact') this.badgeCompactTouched = true
        if (k === 'dockH') this.dockHTouched = true
        if (k === 'hidden') this.hiddenTouched = true
      }
      if (ch) {
        this.notify()
        // 打开面板的 set 发生在面板组件订阅建立之前（订阅在挂载后才生效）——
        // 若无人续触发 ui.set，open=true 永远不落盘，刷新后面板关着。open 翻转直接触发落盘。
        // [fork-fix] 原来只有 open 直接落盘：位置/尺寸靠 DockPanel 的订阅间接落盘，
        // 而面板收起时 DockPanel 根本不挂载（DockGate 返回 null）→ 拖徽章永不写入。
        // 改为所有被持久化的键都直接排一次落盘，不再依赖某个组件恰好挂着。
        if ('open' in patch || 'badgePos' in patch || 'badgeW' in patch || 'badgeCompact' in patch || 'dockH' in patch || 'hidden' in patch) {
          try { saveUi() } catch (e) { /* 初始化前忽略 */ }
        }
      }
    }
  }

  const saveUi = ctx.debounce(function () {
    call(A_UI_SET, { tab: ui.tab, open: ui.open, badgePos: ui.badgePos, badgeW: ui.badgeW, badgeCompact: ui.badgeCompact, dockH: ui.dockH, hidden: ui.hidden }).catch(function () { /* 忽略 */ })
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
    if (d && typeof d.badgeCompact === 'boolean' && !ui.badgeCompactTouched) {
      ui.set({ badgeCompact: d.badgeCompact })
    }
    // 隐身开关：必须在 hydrated 之前落定 —— 三个入口组件都等 hydrated 才渲染，
    // 否则刷新瞬间会先画出行情再消失（徽章一挂载就 fetchWatchlist、指数条一挂载就 fetchIndices）。
    if (d && typeof d.hidden === 'boolean' && !ui.hiddenTouched) {
      ui.set({ hidden: d.hidden })
    }
    ui.set({ hydrated: true })
  }).catch(function () { ui.set({ hydrated: true }) })
  return rt.hydratePromise
}

// ---------- 行情隐身（三个入口的唯一开关通道）----------
// 只改 ui.hidden：不动 open（恢复时保持用户原来的面板开合状态），不动 tab。
// ui.set 里 'hidden' 已在落盘条件内，所以这里不需要额外 saveUi。
function setUiHidden(hidden) {
  const rt = getUiRuntime()
  if (!rt) return false
  rt.ui.set({ hidden: !!hidden })
  return !!hidden
}

// 快捷键与徽章按钮共用：语义是「拨一下」而不是「设成某个值」。
function toggleUiHidden() {
  const rt = getUiRuntime()
  if (!rt) return false
  return setUiHidden(!rt.ui.hidden)
}

// 行情取数 + 页面内共享订阅运行时（client 侧）。
//
// 分两层职责（与宿主 lib/quotes.js 对齐）：
//   · 宿主 负责**跨组件/跨页面**的 symbol 级缓存、合批与在途共享（同样的代码只出一次网）；
//   · 这里负责**同一页面内**的调度与广播：面板/徽章/指数条各自订阅自己的代码集合与刷新周期，
//     同一 symbol 按所有活跃订阅里最快的需求取价，一份结果广播给所有订阅者。
//
// 为什么要有客户端这一层：改造前面板、徽章、指数条分别 interval + 各自 fetch，同一只股票在
// 同一时刻会被三个组件各下一次单；走完宿主共享服务后请求虽然能合并，但客户端仍在重复调度与
// 重复渲染。运行时把调度收敛成「一个最近到期的定时器 + 一次并集请求」。
//
// 生命周期：由 client/index.js 的 apply 创建（每次 apply 一份），随 ui/positions 运行时一起重建。

// ---- 取数封装（对外契约，与改造前同名同参）----
// 批量行情（面板：指数一组、自选一组；徽标：自选前 12 只一组）
function fetchQuote(symbols, force) { return call(A_QUOTE, { symbols: symbols, force: force === true }) }

// 四大指数（面板指数卡 / 徽标指数区 / 底部指数条共用同一组代码）
function fetchIndices(force) { return call(A_QUOTE, { symbols: XQ_INDEX_SYMBOLS, force: force === true }) }

// 自选列表（面板 refreshMarket、徽标主体）
function fetchWatchlist() { return call(A_WATCHLIST_GET, {}) }

// ---- 运行时持有者：每次 apply 一份 ----
let marketRuntime = null

function getMarketRuntime() { return marketRuntime }

function symbolKey(value) { return String(value == null ? '' : value).trim().toUpperCase() }

function disposer(handle) {
  if (!handle) return null
  if (typeof handle === 'function') return handle
  if (typeof handle.dispose === 'function') return function () { handle.dispose() }
  return null
}

function createMarketRuntime(ctx) {
  // 重新 apply 时清掉上一份实例：定时器与 visibilitychange 监听都必须跟着走，
  // 否则旧实例会在插件重载后继续用旧 ctx 发请求（与「每次 apply 一份」的生命周期约定冲突）。
  if (marketRuntime && typeof marketRuntime.destroy === 'function') {
    try { marketRuntime.destroy() } catch (e) { /* ignore */ }
  }
  const quotes = new Map()       // SYMBOL -> { quote, at, seq }（seq = 写入它的请求序号）
  const touched = new Map()      // SYMBOL -> 最近一次真实取数时刻（含「上游没返回」的代码）
  const subs = []                // { id, symbols, watchlistLimit, needsWatchlist, intervalMs, dueAt, listener }
  let seed = 0
  let timer = null
  let destroyed = false
  let ticking = false            // 一轮调度（可能含自选列表读取 + 行情请求）是否在途
  let tickSubs = []              // 本轮正在服务的订阅（收尾时给它们推进到期时间）

  let status = null
  let statusSeq = 0              // 写入 status 的请求序号（整批共有的市场状态按「最新请求」为准）
  let error = ''
  let errorSeq = 0
  let receivedAt = 0
  let pending = 0                // 在途取数笔数（loading 由它派生，慢请求不会互相把状态改回「不忙」）

  let reqSeq = 0                 // 请求序号：只用来做**逐 symbol**的迟到判定（见 fetchSymbols）

  let watchlist = null           // string[]（null = 尚未读到）
  let watchlistReadSeq = 0       // 读取序号
  let watchlistAppliedSeq = 0    // 已应用到内存的序号（add/remove/pull 会推进它，让迟到读取作废）
  let watchlistInflight = null
  let watchlistDueAt = 0         // 0 = 有自选消费者时立刻读一次（首次订阅立即读取）
  let watchlistAt = 0

  function hasWatchlistConsumer() {
    for (let i = 0; i < subs.length; i++) if (subs[i].needsWatchlist) return true
    return false
  }

  function symbolsOf(sub) {
    if (Array.isArray(sub.symbols)) return sub.symbols
    if (sub.watchlistLimit > 0) return (watchlist || []).slice(0, sub.watchlistLimit)
    return []
  }

  function notify() {
    const list = subs.slice()
    for (let i = 0; i < list.length; i++) {
      try { list[i].listener() } catch (e) { /* 单个订阅者抛错不影响其他订阅者 */ }
    }
  }

  function snapshotOf(symbols) {
    const out = []
    const list = Array.isArray(symbols) ? symbols : []
    for (let i = 0; i < list.length; i++) {
      const entry = quotes.get(symbolKey(list[i]))
      if (entry) out.push(entry.quote)
    }
    return { list: out, status: status, loading: pending > 0, error: error, receivedAt: receivedAt }
  }

  // 一次真实取数（force=true 时绕开宿主缓存的已完成部分）
  function fetchSymbols(symbols, force) {
    const list = []
    const seen = Object.create(null)
    for (let i = 0; i < symbols.length; i++) {
      const sym = symbolKey(symbols[i])
      if (!sym || seen[sym]) continue
      seen[sym] = true
      list.push(sym)
    }
    if (!list.length) return Promise.resolve(null)
    const my = ++reqSeq
    pending++
    if (!receivedAt) notify()
    let settled = false
    // 每笔请求只结算一次：同一批的 then/catch 都要把 pending 减回去，否则 loading 会永久卡住
    function settle() {
      if (settled) return
      settled = true
      if (pending > 0) pending--
      notify()
    }
    return fetchQuote(list, force === true).then(function (data) {
      if (destroyed) { settle(); return null }
      const at = Date.now()
      const rows = (data && data.list) || []
      for (let i = 0; i < rows.length; i++) {
        const q = rows[i]
        const sym = symbolKey(q && q.symbol)
        if (!sym) continue
        const prev = quotes.get(sym)
        // **逐 symbol** 判定迟到：只有比「写入这只代码的那次请求」更新的请求才能覆盖它。
        // 用全局序号会误伤互不相交的请求 —— 先发的指数批晚到，会被后发的自选批整个丢掉，
        // 表现为「指数卡一直空着，自选却正常」。
        if (prev && prev.seq > my) continue
        quotes.set(sym, { quote: q, at: at, seq: my })
      }
      // 上游没返回的代码也记下取数时刻：无效代码不因此被每一轮反复请求
      for (let i = 0; i < list.length; i++) touched.set(list[i], at)
      // status 是整批共有的市场状态，没有「按 symbol」的概念：取最新那次请求的结果
      if (my >= statusSeq) {
        statusSeq = my
        if (data && data.status !== undefined) status = data.status
      }
      receivedAt = at
      if (my >= errorSeq) { errorSeq = my; error = '' }   // 更早的失败晚到，不覆盖这次成功
      settle()
      return data
    }, function (e) {
      if (destroyed) { settle(); return null }
      // 失败保留旧值（不能把失败伪装成新数据），只把错误交给界面显示
      if (my >= errorSeq) { errorSeq = my; error = String((e && e.message) || e) }
      settle()
      return null
    })
  }

  // ---- 自选列表 ----
  function readWatchlist() {
    if (watchlistInflight) return watchlistInflight
    const my = ++watchlistReadSeq
    const task = fetchWatchlist().then(function (data) {
      if (destroyed) return null
      if (watchlistInflight === task) watchlistInflight = null
      // 更早的读取晚到：不能覆盖已经应用的（add/remove/pull 之后的）列表
      if (my < watchlistAppliedSeq) return null
      watchlistAppliedSeq = my
      watchlist = ((data && data.symbols) || []).slice()
      watchlistAt = Date.now()
      watchlistDueAt = watchlistAt + WATCHLIST_POLL_MS
      notify()
      return watchlist
    }, function () {
      if (destroyed) return null
      if (watchlistInflight === task) watchlistInflight = null
      // 读取失败也按同一节奏退避，避免空转打穿宿主
      watchlistDueAt = Date.now() + WATCHLIST_POLL_MS
      return null
    })
    watchlistInflight = task
    return task
  }

  function applyWatchlist(symbols) {
    watchlist = Array.isArray(symbols) ? symbols.slice() : []
    watchlistAppliedSeq = ++watchlistReadSeq   // 让更早的读取作废
    watchlistAt = Date.now()
    watchlistDueAt = watchlistAt + WATCHLIST_POLL_MS
    notify()
    // 列表刚变（增/删/登录同步）：立刻按新列表补取一遍，不等下一个 20s/30s 周期
    kickDue()
    return watchlist
  }

  // 把「按列表订阅」的订阅者立即置为到期，然后跑一轮调度（只补过期/新增的代码）
  function kickDue() {
    const at = Date.now()
    for (let i = 0; i < subs.length; i++) {
      if (subs[i].watchlistLimit > 0 && subs[i].dueAt > at) subs[i].dueAt = at
    }
    tick()
  }

  // ---- 调度：一个最近到期的定时器 ----
  function clearTimer() {
    if (timer) { try { timer() } catch (e) { /* ignore */ } timer = null }
  }

  function nextDue() {
    let due = Infinity
    for (let i = 0; i < subs.length; i++) if (subs[i].dueAt < due) due = subs[i].dueAt
    if (hasWatchlistConsumer() && watchlistDueAt < due) due = watchlistDueAt
    return due
  }

  function arm() {
    clearTimer()
    // 一轮调度在途时不排新定时器：它的收尾会重排。
    // 否则「自选列表还没返回」时到期时间不前进，会连续排出 0ms 定时器空转。
    if (destroyed || ticking) return
    const due = nextDue()
    if (!isFinite(due)) return
    timer = disposer(ctx.timeout(tick, Math.max(0, due - Date.now())))
  }

  // 每个 symbol 的「最快需求周期」：只由需要它的订阅决定，20s 订阅不会把别人的 30s 股票提到 20s
  function paceOf(symbol) {
    let pace = Infinity
    for (let i = 0; i < subs.length; i++) {
      const sub = subs[i]
      if (sub.intervalMs < pace && symbolsOf(sub).indexOf(symbol) !== -1) pace = sub.intervalMs
    }
    return pace
  }

  // 本轮要真取的代码：并集 + 去掉「刚取过」的
  function collectNeed(dueSubs, at) {
    const need = []
    const seen = Object.create(null)
    for (let i = 0; i < dueSubs.length; i++) {
      const list = symbolsOf(dueSubs[i])
      for (let j = 0; j < list.length; j++) {
        const sym = symbolKey(list[j])
        if (!sym || seen[sym]) continue
        const at2 = touched.get(sym)
        const age = at2 === undefined ? Infinity : at - at2
        // 已有别的组件刚刚取过：不因为新挂载一个组件就重复刷新
        if (age < Math.min(MARKET_SOFT_TTL_MS, paceOf(sym))) continue
        seen[sym] = true
        need.push(sym)
      }
    }
    return need
  }

  function tick() {
    clearTimer()
    if (destroyed || ticking) return
    const at = Date.now()
    const dueSubs = []
    for (let i = 0; i < subs.length; i++) if (subs[i].dueAt <= at) dueSubs.push(subs[i])
    const needList = hasWatchlistConsumer() && watchlistDueAt <= at
    if (!dueSubs.length && !needList) { arm(); return }

    ticking = true
    tickSubs = dueSubs
    // 自选列表还没读到时，先把它读回来再算本轮要取哪些代码：
    // 「列表返回后只通知组件、不补取报价」会让首屏行情白等一个完整周期（20–30s）。
    const prep = (needList && watchlist === null) ? readWatchlist() : Promise.resolve(null)
    prep.then(runTick, runTick).then(finishTick, finishTick)
  }

  function runTick() {
    if (destroyed) return null
    const need = collectNeed(tickSubs, Date.now())
    if (!need.length) return null
    // 请求完成后才排下一次：慢请求不堆积周期任务
    return fetchSymbols(need, false)
  }

  function finishTick() {
    ticking = false
    const serviced = tickSubs
    tickSubs = []
    if (destroyed) return
    const at = Date.now()
    for (let i = 0; i < serviced.length; i++) {
      const sub = serviced[i]
      if (subs.indexOf(sub) === -1) continue   // 期间被注销：不再为它排期
      sub.dueAt = at + sub.intervalMs
    }
    arm()
  }

  // 页面恢复可见：合并成本轮一次补刷（监听器全局只挂一个）
  function onVisibility() {
    if (destroyed) return
    try { if (typeof document !== 'undefined' && document.hidden) return } catch (e) { /* ignore */ }
    const at = Date.now()
    for (let i = 0; i < subs.length; i++) subs[i].dueAt = at
    watchlistDueAt = at
    tick()
  }
  let visibilityBound = false
  function bindVisibility() {
    if (visibilityBound) return
    try {
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('visibilitychange', onVisibility)
        visibilityBound = true
      }
    } catch (e) { /* ignore */ }
  }
  function unbindVisibility() {
    if (!visibilityBound) return
    try { document.removeEventListener('visibilitychange', onVisibility) } catch (e) { /* ignore */ }
    visibilityBound = false
  }

  const rt = {
    ctx: ctx,

    /**
     * 订阅一组行情。
     * @param {{symbols?:string[], watchlistLimit?:number, needsWatchlist?:boolean, intervalMs:number}} opts
     *        symbols：固定代码集合；watchlistLimit>0 时改为「自选前 N 只」（随自选变化）；
     *        needsWatchlist：需要自选列表本身（会按 WATCHLIST_POLL_MS 统一读取）。
     * @param {function} listener 数据变化时回调（读取请用 getSnapshot）
     * @returns {function} unsubscribe
     */
    subscribe: function (opts, listener) {
      const o = opts || {}
      const sub = {
        id: ++seed,
        symbols: Array.isArray(o.symbols) ? o.symbols.slice() : null,
        watchlistLimit: o.watchlistLimit > 0 ? o.watchlistLimit : 0,
        needsWatchlist: o.needsWatchlist === true,
        intervalMs: o.intervalMs > 0 ? o.intervalMs : 30000,
        dueAt: Date.now(),
        listener: listener || function () {}
      }
      subs.push(sub)
      bindVisibility()
      // 已有可用快照时先广播一次快照（不等定时器）
      if (receivedAt || watchlist) sub.listener()
      tick()
      return function () {
        const i = subs.indexOf(sub)
        if (i !== -1) subs.splice(i, 1)
        if (!subs.length) { clearTimer(); unbindVisibility() }
        else arm()
      }
    },

    getSnapshot: snapshotOf,

    // 手动刷新：等待真实完成的 Promise（用户点「刷新」时就该看到新价）
    refresh: function (symbols, opts) {
      return fetchSymbols(Array.isArray(symbols) ? symbols : [], !!(opts && opts.force))
    },

    getWatchlist: function () { return watchlist === null ? null : watchlist.slice() },
    refreshWatchlist: function () { return readWatchlist() },
    applyWatchlist: applyWatchlist,

    // 测试/诊断用：活跃订阅数、当前定时器是否在跑、列表读取是否在途
    stats: function () {
      return {
        subs: subs.map(function (s) { return { id: s.id, symbols: s.symbols ? s.symbols.length : 0, watchlistLimit: s.watchlistLimit, intervalMs: s.intervalMs } }),
        watchlist: watchlist ? watchlist.length : null,
        symbols: quotes.size,
        loading: pending > 0,
        pending: pending,
        ticking: ticking,
        watchlistInflight: watchlistInflight !== null
      }
    },

    destroy: function () {
      destroyed = true
      clearTimer()
      unbindVisibility()
      subs.length = 0
      quotes.clear()
      touched.clear()
    }
  }

  marketRuntime = rt
  return rt
}

// 本地持仓 + 当日盈亏：**唯一数据源**（运行时持有者 + 单一轮询器）。
//
// 数据流：宿主持有 positions.json（主数据）并负责「持仓 × 雪球行情」的现算，
// 客户端只做三件事：按节奏取视图、把编辑动作发下去、把结果广播给订阅者。
//
// 与改造前 store/pnl.js 的差别（这次重构的核心）：
//   · 打的是宿主**本地**持仓 + 行情，不碰账本 —— 账本 Cookie 废了也不影响实时数字；
//   · 账本只在用户点「从账本同步」时被调用一次（sync()，不参与轮询）；
//   · 仍然只有一个轮询器：头部 chip、底部指数条、两个 tab 同时挂着也只有一份数据、一份请求。
//
// 为什么是「运行时持有者」而不是模块级单例：状态必须每次 apply 一份，模块级单例会在重新 apply
// 时残留旧状态、多实例互相串数据。createPositionsRuntime(ctx) 由 client/index.js 的 apply 重建。

let positionsRuntime = null

function getPositionsRuntime() { return positionsRuntime }

function createPositionsRuntime(ctx) {
  const listeners = []

  // 定时器句柄归一化：ctx.timeout 可能返回 stop 函数，也可能返回带 dispose() 的对象。
  function disposer(handle) {
    if (!handle) return null
    if (typeof handle === 'function') return handle
    if (typeof handle.dispose === 'function') return function () { handle.dispose() }
    return null
  }

  // 宿主给的节奏不可信时（缺字段 / 过密）一律回退 30 秒：宁可慢，也不能把行情打穿。
  function hostDelay(data) {
    const ms = Number(data && data.next_poll_ms)
    if (!isFinite(ms) || ms < 5000) return POSITIONS_POLL_FALLBACK_MS
    return ms
  }

  // 宿主每次成功修改持仓都会把视图 revision +1。客户端据此丢弃「编辑前发出、编辑后才到」的旧响应：
  // 自动刷新挂起 → 用户改股数 → 旧刷新返回，界面不能回退成旧股数。
  function revOf(data) {
    const rev = Number(data && data.revision)
    return isFinite(rev) ? rev : -1
  }
  function stale(incoming) {
    if (!rt.data) return false
    const cur = revOf(rt.data)
    const next = revOf(incoming)
    return cur >= 0 && next >= 0 && next < cur
  }

  const rt = {
    ctx: ctx,
    data: null,                    // 最近一次 positions.get 的返回对象（宿主现算的视图）
    status: 'idle',                // 'idle' | 'loading' | 'ready' | 'error'
    error: '',
    listeners: listeners,
    timer: null,                   // 当前排定的下一次刷新（归一化后的 stop 函数）
    inflight: null,                // 并发去重：多处同时触发时复用同一个 promise
    refs: 0,
    active: false,
    delay: POSITIONS_POLL_FALLBACK_MS,
    visibilityBound: false,

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

    // force=true 绕过行情 10 秒缓存（用户点「刷新」/「立即同步」时用）。
    refresh: function (force) {
      if (rt.inflight) return rt.inflight
      if (rt.data === null) { rt.status = 'loading'; rt.notify() }
      const p = call(A_POSITIONS_GET, force ? { force: true } : {}).then(function (data) {
        // 编辑成功之后才到的旧刷新：丢弃，界面保持修改后的视图（不回退成旧股数）
        if (stale(data)) { rt.inflight = null; return rt.data }
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

    // ---- 编辑动作（宿主落盘后会回传新视图，直接替换本地数据，省掉一次往返）----
    save: function (row, originalCode) {
      const args = { row: row }
      if (originalCode) args.originalCode = originalCode
      return call(A_POSITIONS_SAVE, args).then(function (data) {
        // 编辑结果永远采用（它是最新一版）；宿主 revision 让在途旧刷新作废
        if (stale(data)) return rt.data
        rt.data = data
        rt.status = 'ready'
        rt.error = ''
        rt.notify()
        return data
      })
    },
    remove: function (code) {
      return call(A_POSITIONS_REMOVE, { code: code }).then(function (data) {
        if (stale(data)) return rt.data
        rt.data = data
        rt.status = 'ready'
        rt.error = ''
        rt.notify()
        return data
      })
    },

    // 从账本同步（**唯一**会请求账本的入口，只在用户点击时调用）。
    // 返回 { ok, report, error, view }；失败时 view 仍是最新本地视图（持仓不受影响）。
    sync: function (mode) {
      return call(A_POSITIONS_SYNC, mode ? { mode: mode } : {}).then(function (res) {
        if (res && res.view && !stale(res.view)) {
          rt.data = res.view
          rt.status = 'ready'
          rt.notify()
        }
        return res
      })
    },

    start: function () {
      rt.refs++
      if (rt.refs !== 1) return   // 已有轮询器在跑，chip 与各 tab 共享它
      rt.active = true
      bindVisibility()
      cycle()
    },

    stop: function () {
      rt.refs--
      if (rt.refs > 0) return
      rt.refs = 0
      rt.active = false
      unbindVisibility()
      if (rt.timer) { try { rt.timer() } catch (e) { /* ignore */ } rt.timer = null }
    }
  }

  function arm(ms) {
    if (rt.timer) { try { rt.timer() } catch (e) { /* ignore */ } rt.timer = null }
    rt.delay = ms
    rt.timer = disposer(ctx.timeout(cycle, ms))
  }

  // 页面从后台恢复时不要等完上一次「盘外长睡」：浏览器可能暂停/钳制定时器，
  // 正好会错过 09:30 开盘或把收盘状态留在屏幕上。可见性恢复立即走一次宿主判定，
  // 宿主会按北京时间决定是否真的去取行情。
  function onVisibility() {
    if (!rt.active || pageHidden()) return
    if (rt.timer) { try { rt.timer() } catch (e) { /* ignore */ } rt.timer = null }
    cycle()
  }
  function bindVisibility() {
    if (rt.visibilityBound) return
    try {
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('visibilitychange', onVisibility)
        rt.visibilityBound = true
      }
    } catch (e) { /* ignore */ }
  }
  function unbindVisibility() {
    if (!rt.visibilityBound) return
    try { document.removeEventListener('visibilitychange', onVisibility) } catch (e) { /* ignore */ }
    rt.visibilityBound = false
  }

  // 一次「取数 → 按宿主给的节奏重排」。
  // 页面隐藏时跳过请求但**照旧等这么久**：重排更密没有意义（页面不可见），
  // 重排更疏又会让回到前台的第一屏变旧。
  function cycle() {
    if (!rt.active) return
    if (pageHidden()) { arm(Math.max(rt.delay, POSITIONS_POLL_FALLBACK_MS)); return }
    rt.refresh().then(function () {
      if (!rt.active) return
      arm(rt.status === 'error' ? POSITIONS_POLL_FALLBACK_MS : hostDelay(rt.data))
    })
  }

  positionsRuntime = rt
  return rt
}

/**
 * 订阅持仓视图（chip / 两个 tab / 底部指数条共用）。
 *
 * 放在 store 里而不是某个面板文件里：它现在是「全局唯一数据源」的读入口，
 * 任何组件都不该自己再造一个轮询器（改造前 chip 与 tab 各轮一次就打两遍上游）。
 */
function usePositionsState() {
  const [state, setState] = React.useState(function () {
    const rt = getPositionsRuntime()
    return rt ? rt.getState() : { data: null, status: 'idle', error: '' }
  })
  React.useEffect(function () {
    const rt = getPositionsRuntime()
    if (!rt) return function () { }
    setState(rt.getState())   // 订阅前可能已经有数据（另一个订阅者先拉到了）
    return rt.subscribe(function () { setState(rt.getState()) })
  }, [])
  return state
}

// 价格提醒 RPC 薄封装。规则/事件状态由 XueqiuPanel 持有，避免跨面板实例串状态。

function fetchAlerts() { return call(A_ALERTS_GET, {}) }
function saveAlert(symbol, target, direction, enabled) {
  return call(A_ALERTS_SET, { symbol: symbol, target: target, direction: direction, enabled: enabled })
}
function removeAlert(symbol) { return call(A_ALERTS_REMOVE, { symbol: symbol }) }
function ackAlerts(ids) { return call(A_ALERTS_ACK, { ids: ids }) }

// 价格提醒的浏览器侧通知器（**应用级**运行时）：把宿主新产生的提醒事件弹成系统通知。
//
// ── 为什么必须提到应用级（FORK-NOTES §11）────────────────────────────────────
// 宿主的 lib/alerts.js watcher 负责「是否穿越阈值 + 事件持久化」，它跟页面显示完全无关，一直在跑；
// 浏览器这一侧原来只做两件事：读事件、弹 Notification —— 而这两件事写死在 XueqiuPanel 的
// refreshAlerts 里。于是「面板收起」= 通知静默。行情隐身功能要求「不显示行情，但到价还要提醒我」，
// 这条老耦合必须拆掉：通知器跟 ui.hidden / 面板挂载都无关，只跟页面在不在有关。
//
// ── 语义 ───────────────────────────────────────────────────────────────────
//   · 首轮静默：宿主 events 是持久化历史，页面加载时不能为旧事件刷屏（第一轮只建立基线）。
//   · 之后每出现一个新事件 id 就弹一次；面板的「页面内通知区」由 panel/index.js 订阅同一份快照渲染。
//   · 空转退避：没有规则时按 ALERT_IDLE_POLL_MS（5 分钟）读一次本地文件，既不空转也不错过
//     「在别处新增了规则」；有规则时回到 ALERT_POLL_MS（30 秒，与改造前一致）。

let alertsWatchRuntime = null

function getAlertsWatchRuntime() { return alertsWatchRuntime }

// 事件身份：宿主 id 优先，缺失时退化到内容签名（与改造前 panel 内实现逐字一致）。
function alertEventId(e) {
  if (!e) return ''
  return String(e.id != null ? e.id : (e.event_id != null ? e.event_id : [e.symbol, e.target, e.direction, e.triggered_at || e.created_at || e.time].join('|')))
}

// 在用户手势里请求一次通知权限（隐身按钮点击时调用）：权限弹窗挂在定时器里常被浏览器直接拒绝。
function ensureAlertPermission() {
  const rt = alertsWatchRuntime
  if (rt) rt.ensurePermission()
}

function createAlertsWatchRuntime(ctx) {
  const listeners = []
  // event id → true：既当「首轮基线」也当「已弹过通知」的账本（同一集合，语义天然一致）
  const known = Object.create(null)
  let baselined = false
  let timer = null
  let inflight = null

  // 定时器句柄归一化：ctx.timeout 可能返回 stop 函数，也可能返回带 dispose() 的对象。
  function disposer(handle) {
    if (!handle) return null
    if (typeof handle === 'function') return handle
    if (typeof handle.dispose === 'function') return function () { handle.dispose() }
    return null
  }

  const rt = {
    ctx: ctx,
    state: { rules: [], events: [], loaded: false },
    active: false,

    getState: function () { return rt.state },

    // 订阅即补发：订阅者（面板）晚于首次取数挂载时要能立刻拿到当前快照，否则那一段会空着。
    subscribe: function (fn) {
      listeners.push(fn)
      if (rt.state.loaded) { try { fn(rt.state, []) } catch (e) { /* 单个订阅者抛错不影响其他 */ } }
      return function () {
        const i = listeners.indexOf(fn)
        if (i !== -1) listeners.splice(i, 1)
      }
    },

    refresh: function () {
      if (inflight) return inflight
      const p = fetchAlerts().then(function (data) {
        const rules = (data && Array.isArray(data.rules)) ? data.rules : []
        const events = (data && Array.isArray(data.events)) ? data.events : []
        const fresh = []
        if (!baselined) {
          // 首轮（含页面刷新后的首次）：只建立基线，不为历史事件弹通知。
          baselined = true
          for (let i = 0; i < events.length; i++) known[alertEventId(events[i])] = true
        } else {
          for (let i = 0; i < events.length; i++) {
            const id = alertEventId(events[i])
            if (known[id]) continue
            known[id] = true
            fresh.push(events[i])
          }
        }
        rt.state = { rules: rules, events: events, loaded: true }
        inflight = null
        const fns = listeners.slice()
        for (let i = 0; i < fns.length; i++) {
          try { fns[i](rt.state, fresh) } catch (e) { /* 单个订阅者抛错不影响其他 */ }
        }
        if (fresh.length) fire(fresh)
        return rt.state
      }).catch(function () {
        // 读失败不是致命错误：保留上一份快照，节奏由 cycle 决定下一步（不阻断后续轮询）。
        inflight = null
        return rt.state
      })
      inflight = p
      return p
    },

    // 规则被增删改之后立刻核对一次（不用等下一个 tick，也不必自己维护一份基线）。
    kick: function () {
      if (!rt.active) return Promise.resolve(rt.state)
      if (timer) { try { timer() } catch (e) { /* ignore */ } timer = null }
      return rt.refresh()
    },

    ensurePermission: function () {
      try {
        if (typeof window === 'undefined' || !window.Notification) return
        if (window.Notification.permission !== 'default') return
        if (typeof window.Notification.requestPermission !== 'function') return
        window.Notification.requestPermission().catch(function () { /* 用户拒绝/浏览器不支持：静默 */ })
      } catch (e) { /* ignore */ }
    },

    start: function () {
      if (rt.active) return
      rt.active = true
      bindVisibility()
      cycle()
    },

    stop: function () {
      rt.active = false
      unbindVisibility()
      if (timer) { try { timer() } catch (e) { /* ignore */ } timer = null }
    }
  }

  function fire(events) {
    try {
      if (typeof window === 'undefined' || !window.Notification) return
      const title = '雪球价格提醒'
      const show = function (e) {
        const text = (e.name || e.symbol || '标的') + ' ' + (e.direction === 'below' ? '≤' : '≥') + ' ' + (e.target == null ? '' : e.target) + (e.current == null ? '' : '，现价 ' + e.current)
        return new window.Notification(title, { body: text, tag: 'xq-alert-' + alertEventId(e) })
      }
      if (window.Notification.permission === 'granted') {
        for (let i = 0; i < events.length; i++) { try { show(events[i]) } catch (e) { /* ignore */ } }
      } else if (window.Notification.permission === 'default' && typeof window.Notification.requestPermission === 'function') {
        window.Notification.requestPermission().then(function (permission) {
          if (permission !== 'granted') return
          for (let i = 0; i < events.length; i++) { try { show(events[i]) } catch (e) { /* ignore */ } }
        }).catch(function () { /* ignore */ })
      }
    } catch (e) { /* 浏览器权限/实现异常静默：页面内通知区仍然会列出事件 */ }
  }

  function arm(ms) {
    if (timer) { try { timer() } catch (e) { /* ignore */ } timer = null }
    timer = disposer(ctx.timeout(cycle, ms))
  }

  // 一次「取数 → 按规则数量重排」。取数失败时 state.loaded 仍是上次的值：
  // 从没读成功过就按 30 秒快速重试，读成功过就照规则数量决定节奏。
  function cycle() {
    if (!rt.active) return
    rt.refresh().then(function (state) {
      if (!rt.active) return
      if (!state.loaded) { arm(ALERT_POLL_MS); return }
      arm(state.rules.length ? ALERT_POLL_MS : ALERT_IDLE_POLL_MS)
    })
  }

  // 页面从后台回来时立刻补一次：后台标签页的定时器会被钳制，错过的那段时间要在这里追上。
  function onVisibility() {
    if (!rt.active) return
    if (timer) { try { timer() } catch (e) { /* ignore */ } timer = null }
    cycle()
  }
  function bindVisibility() {
    try { if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', onVisibility) } catch (e) { /* ignore */ }
  }
  function unbindVisibility() {
    try { if (typeof document !== 'undefined' && document.removeEventListener) document.removeEventListener('visibilitychange', onVisibility) } catch (e) { /* ignore */ }
  }

  alertsWatchRuntime = rt
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

// 行情 tab：指数卡 + 自选表格（排序 / 闪烁 / 加删自选 / 行内价格提醒）。
// 显式上下文 p：
//   p.quotes / p.indices / p.flashDir / p.sortK / p.sortAsc / p.setSortK / p.setSortAsc
//   p.openDetail / p.removeWatch / p.manualCode / p.setManualCode / p.addManual
//   p.alertRules / p.alertDrafts / p.setAlertDrafts / p.setAlert / p.removeAlert / p.alertBusy
//
// UI 约定（本轮重构）：
//   · 行点击仍然进详情；名称本身也是可聚焦按钮（键盘可达）。
//   · 不再常驻「详情」按钮：操作区显示铃铛 + 更多菜单。
//   · 铃铛点开在**该行下方**展开提醒编辑区，一次只展开一行；关闭编辑不等于删除已有规则。

/** 铃铛图标：静态内联 SVG（一致线宽，不引图标库、不用 emoji）。 */
function bellIcon(active) {
  return el('svg', {
    key: 'bell', viewBox: '0 0 16 16', width: '13', height: '13', 'aria-hidden': 'true', focusable: 'false',
    fill: active ? 'currentColor' : 'none', stroke: 'currentColor', strokeWidth: '1.3',
    strokeLinecap: 'round', strokeLinejoin: 'round'
  }, [
    el('path', { key: 'p', d: 'M4 6.6a4 4 0 0 1 8 0c0 2.1.5 3.1 1.2 3.9H2.8C3.5 9.7 4 8.7 4 6.6z' }),
    el('path', { key: 'c', d: 'M6.6 12.6a1.6 1.6 0 0 0 2.8 0' })
  ])
}

function MarketTab(p) {
  // 当前展开提醒编辑区的标的（一次只展开一行）
  const [openAlert, setOpenAlert] = React.useState('')
  const [menuFor, setMenuFor] = React.useState('')
  const [menuUp, setMenuUp] = React.useState(false)   // 菜单向上展开（最后一行下方没空间）

  React.useEffect(function () {
    if (!menuFor) return function () { }
    function onKey(e) { if (e.key === 'Escape') setMenuFor('') }
    function onDown(e) {
      const t = e && e.target
      if (t && typeof t.closest === 'function' && t.closest('.xq-menu-wrap')) return
      setMenuFor('')
    }
    // 滚动会让「按钮位置」失效（菜单是相对按钮定位的）：直接收起，避免菜单停在旧位置被裁剪
    function onScroll() { setMenuFor('') }
    try {
      window.addEventListener('keydown', onKey)
      document.addEventListener('pointerdown', onDown, true)
      document.addEventListener('scroll', onScroll, true)
    } catch (e) { /* 无 DOM 时忽略 */ }
    return function () {
      try {
        window.removeEventListener('keydown', onKey)
        document.removeEventListener('pointerdown', onDown, true)
        document.removeEventListener('scroll', onScroll, true)
      } catch (e) { /* ignore */ }
    }
  }, [menuFor])

  function toggleMenu(symbol, e) {
    const open = menuFor === symbol
    if (open) { setMenuFor(''); return }
    // 表格有 overflow: hidden，最后一行的菜单向下展开会被裁掉 → 按剩余空间决定展开方向
    setMenuUp(menuUpward(e && e.currentTarget ? e.currentTarget : null, 0))
    setMenuFor(symbol)
  }

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
  function ruleFor(symbol) {
    return (p.alertRules || []).find(function (r) { return r && r.symbol === symbol }) || null
  }
  function draftFor(q) {
    const r = ruleFor(q.symbol)
    const own = p.alertDrafts && p.alertDrafts[q.symbol]
    return own || { direction: r && r.direction === 'below' ? 'below' : 'above', target: r && r.target != null ? String(r.target) : '' }
  }
  function changeDraft(q, patch) {
    const d = draftFor(q)
    p.setAlertDrafts(Object.assign({}, p.alertDrafts || {}, { [q.symbol]: Object.assign({}, d, patch) }))
  }
  function closeAlert() { setOpenAlert('') }
  function alertEditor(q) {
    const r = ruleFor(q.symbol)
    const d = draftFor(q)
    const busy = p.alertBusy && p.alertBusy[q.symbol]
    return el('div', {
      key: 'alert', className: 'xq-alert-editor', role: 'group',
      'aria-label': '价格提醒设置',
      onClick: function (e) { e.stopPropagation() },
      onKeyDown: function (e) { if (e.key === 'Escape') { e.stopPropagation(); closeAlert() } }
    }, [
      el('span', { key: 'lb', className: 'xq-alert-editor-label' }, (q.name || q.symbol) + ' 提醒'),
      el('select', { key: 'dir', className: 'xq-alert-dir', value: d.direction, disabled: busy, 'aria-label': '方向', onChange: function (e) { changeDraft(q, { direction: e.target.value }) } }, [
        el('option', { key: 'a', value: 'above' }, '≥'),
        el('option', { key: 'b', value: 'below' }, '≤')
      ]),
      el('input', {
        key: 'target', className: 'xq-alert-target', type: 'number', step: 'any', placeholder: '价位',
        value: d.target, disabled: busy, 'aria-label': '提醒价位',
        onChange: function (e) { changeDraft(q, { target: e.target.value }) },
        onKeyDown: function (e) { if (e.key === 'Enter') p.setAlert(q.symbol, d.target, d.direction, true) }
      }),
      el('button', { key: 'set', className: 'xq-btn-mini', disabled: busy, title: r ? '更新提醒' : '设置提醒', onClick: function () { p.setAlert(q.symbol, d.target, d.direction, true) } }, r ? '更新' : '设置'),
      r ? el('button', { key: 'rm', className: 'xq-btn-mini', disabled: busy, title: '取消已有提醒', onClick: function () { p.removeAlert(q.symbol) } }, '取消提醒') : null,
      el('span', { key: 'sp', className: 'xq-spacer' }),
      el('button', { key: 'close', className: 'xq-btn-mini xq-icon-btn', title: '关闭编辑（Esc）', 'aria-label': '关闭提醒编辑', onClick: closeAlert }, '✕')
    ])
  }
  const idxKids = p.indices.map(function (q) {
    return el('div', {
      key: q.symbol, className: 'xq-idx-card', role: 'button', tabIndex: 0,
      title: '查看 ' + (q.name || q.symbol) + ' 详情',
      'aria-label': '查看 ' + (q.name || q.symbol) + ' 详情',
      onClick: function () { p.openDetail(q.symbol) },
      onKeyDown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.openDetail(q.symbol) } }
    }, [
      el('div', { key: 'n', className: 'xq-idx-name' }, q.name),
      el('div', { key: 'r', className: 'xq-idx-row' }, [
        el('span', { key: 'c', className: 'xq-idx-cur ' + colorOf(q.percent) }, fmt(q.current)),
        el('span', { key: 'p', className: 'xq-idx-pct xq-pct-chip ' + colorOf(q.percent) }, fmtPct(q.percent))
      ])
    ])
  })
  const rows = []
  sorted.forEach(function (q) {
    const rule = ruleFor(q.symbol)
    const open = openAlert === q.symbol
    const menuOpen = menuFor === q.symbol
    rows.push(el('div', {
      key: q.symbol, className: 'xq-grid-row',
      onClick: function () { p.openDetail(q.symbol) }
    }, [
      el('div', { key: 'n' }, [
        el('button', {
          key: 'a', className: 'xq-name xq-row-name-btn', type: 'button',
          title: (q.name || q.symbol) + ' · 查看详情',
          onClick: function (e) { e.stopPropagation(); p.openDetail(q.symbol) }
        }, q.name || q.symbol),
        el('div', { key: 'b', className: 'xq-sub' }, q.symbol)
      ]),
      el('div', { key: 'c', className: colorOf(q.percent) + (p.flashDir[q.symbol] === 1 ? ' xq-flash-up' : p.flashDir[q.symbol] === -1 ? ' xq-flash-down' : '') }, fmt(q.current)),
      el('div', { key: 'p' }, el('span', { key: 'pp', className: 'xq-pct-chip ' + colorOf(q.percent) }, fmtPct(q.percent))),
      el('div', { key: 'v', className: 'xq-sub' }, fmtVol(q.volume, q.symbol)),
      el('div', { key: 'a2', className: 'xq-actions' }, [
        el('button', {
          key: 'bell', type: 'button',
          className: 'xq-btn-mini xq-icon-btn' + (rule ? ' xq-bell-on' : ''),
          title: rule ? ('已设提醒：' + (rule.direction === 'below' ? '≤' : '≥') + ' ' + rule.target + '（点击编辑）') : '设置价格提醒',
          'aria-label': rule ? '编辑价格提醒' : '设置价格提醒',
          'aria-expanded': open ? 'true' : 'false',
          onClick: function (e) { e.stopPropagation(); setOpenAlert(open ? '' : q.symbol) }
        }, rule ? [bellIcon(true), el('span', { key: 'd', className: 'xq-alert-dot', 'aria-hidden': 'true' })] : bellIcon(false)),
        el('span', { key: 'more', className: 'xq-menu-wrap' }, [
          el('button', {
            key: 'mb', className: 'xq-btn-mini xq-icon-btn', type: 'button', title: '更多操作', 'aria-label': '更多操作',
            'aria-haspopup': 'menu', 'aria-expanded': menuOpen ? 'true' : 'false',
            onClick: function (e) { e.stopPropagation(); toggleMenu(q.symbol, e) }
          }, '⋯'),
          menuOpen ? el('div', { key: 'mu', className: 'xq-menu' + (menuUp ? ' xq-menu-up' : ''), role: 'menu' }, [
            el('button', {
              key: 'rm', className: 'xq-menu-item xq-danger', role: 'menuitem',
              onClick: function (e) { e.stopPropagation(); setMenuFor(''); p.removeWatch(q.symbol) }
            }, '移除自选')
          ]) : null
        ])
      ]),
      open ? alertEditor(q) : null
    ]))
  })
  return el('div', null, [
    el('div', { key: 'idx', className: 'xq-idx' }, idxKids),
    el('div', { key: 'wl', className: 'xq-grid' }, [
      el('div', { key: 'h', className: 'xq-grid-hd' }, [
        el('span', { key: 'c0' }, '名称 / 代码'),
        el('span', { key: 'c1', className: 'xq-sort-h' + (p.sortK === 'current' ? ' xq-sort-on' : ''), role: 'button', tabIndex: 0, onClick: function () { sortBy('current') }, onKeyDown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sortBy('current') } } }, '现价' + arrow('current')),
        el('span', { key: 'c2', className: 'xq-sort-h' + (p.sortK === 'percent' ? ' xq-sort-on' : ''), role: 'button', tabIndex: 0, onClick: function () { sortBy('percent') }, onKeyDown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sortBy('percent') } } }, '涨跌幅' + arrow('percent')),
        el('span', { key: 'c3', className: 'xq-sort-h' }, '成交量'),
        el('span', { key: 'c4', className: 'xq-sort-h' }, '操作')
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

// 今日盈亏：面板头部常驻 chip + 「盈亏」tab。
//
// 口径（改造后）：
//   今日盈亏 = Σ(现价 − 昨收) × 股数       —— 由**本地持仓 × 雪球行情**现算，不碰账本
//   当日涨跌幅 = 今日盈亏 / Σ(昨收 × 股数)
// 与账本账户口径的差别：不含当日已实现与费用（账本那个数只在「从账本同步」时取一次，存在持仓 tab）。
//
// 展示口径沿用 dsh-ths-pnl 的客户端实现：金额带符号 + 千分位 + 两位小数，百分比两位小数；
// 涨跌按 **A 股习惯（涨=红、跌=绿）** —— 与雪球页面一致，但与欧美习惯相反。

// 带符号千分位两位小数（金额）。不用 toFixed 是为了千分位分组。
function fmtYk(value) {
  const n = Number(value) || 0
  const sign = n > 0 ? '+' : (n < 0 ? '-' : '')
  return sign + Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 无符号千分位两位小数（市值 / 成本这类「量」）。
function fmtMoney(value) {
  const n = Number(value)
  if (!isFinite(n)) return '--'
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 涨跌配色类（A 股：涨红跌绿）。
function trendClass(value) {
  const n = Number(value)
  if (!isFinite(n) || n === 0) return ''
  return n > 0 ? 'xq-pnl-up' : 'xq-pnl-down'
}

// 时段文案。盘外时段（盘前/午间/收盘/休市）要显式标出来，否则用户会以为数字停住是坏了。
const SESSION_TEXT = { pre: '盘前', morning: '盘中', lunch: '午间', afternoon: '盘中', after: '收盘', weekend: '休市' }
const OFF_HOURS = { pre: 1, lunch: 1, after: 1, weekend: 1 }

/**
 * 订阅持仓/盈亏视图。返回 state 快照；订阅/退订由 store 的引用计数管轮询器的启停，
 * 所以 chip、两个 tab、底部指数条同时挂着也只有一个轮询器、一份数据。
 * 导出给底部指数条（client/ticker.js）复用：那里也要判断「有没有东西可显示」。
 */
function usePnlState() {
  return usePositionsState()
}

// 头部常驻 chip：一行小字展示今日盈亏，点击切到「盈亏」tab。
function PnlChip() {
  const state = usePnlState()
  const data = state.data
  // totals 可能缺（宿主异常 / 老版本视图）：用空对象兜底，宁可显示 -- 也不能把整块 chip 崩掉。
  const totals = (data && data.totals) || {}

  let label
  let cls = 'xq-pnl-dim'
  let tag = ''
  if (state.status === 'error') {
    label = '今日盈亏 数据异常'
  } else if (!data) {
    label = '今日盈亏 …'
  } else if (!data.rows || data.rows.length === 0) {
    label = '今日盈亏 未录持仓'
  } else if (totals.day_profit === null || totals.day_profit === undefined) {
    // 有持仓但一行行情都没取到：不摆 0，也不摆占位符之外的假数字
    label = '今日盈亏 行情未到'
    tag = '待刷新'
  } else {
    label = '今日 ' + fmtYk(totals.day_profit) + ' (' + fmtPct(totals.day_rate) + ')'
    cls = trendClass(totals.day_profit) || 'xq-pnl-dim'
    tag = OFF_HOURS[data.session] ? (SESSION_TEXT[data.session] || '') : ''
  }

  let title = '今日盈亏 = Σ(现价 − 昨收) × 股数（本地持仓 × 雪球行情，点击查看盈亏页）'
  if (data && data.as_of) title += '\n行情时间：' + new Date(data.as_of).toLocaleString('zh-CN')
  if (data && OFF_HOURS[data.session]) title += '\n非交易时段 · 显示的是最近一次行情'
  if (data && data.rows && data.rows.length === 0) title += '\n还没有持仓：去「持仓」tab 录入，或从账本同步一次'
  if (totals && totals.missing > 0) {
    title += '\n有 ' + totals.missing + ' 只取不到现价，合计不完整'
  }
  if (data && totals && totals.day_base) {
    title += '\n当日涨跌幅 = 今日盈亏 ÷ Σ(昨收 × 股数)，与「市值」不是同一个分母'
  }
  title += '\n不含当日已实现与费用（账本账户口径在「持仓」tab 的同步区）'
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

/**
 * 「盈亏」tab：大字盈亏 + 口径说明 + 数据源状态 + 行情刷新间隔。
 *
 * 账本的 Cookie / 组合不在这里 —— 它们只服务「从账本同步」，放在「持仓」tab 的同步区，
 * 免得用户以为「今日盈亏还得配 Cookie」。
 */
function PnlTab(p) {
  const state = usePnlState()
  const data = state.data
  const totals = (data && data.totals) || {}
  const [busy, setBusy] = React.useState(false)
  const [intervalDraft, setIntervalDraft] = React.useState('')
  const [msg, setMsg] = React.useState(null)

  // 打开本 tab 时取一次宿主设置（刷新间隔 + 边界值），顺便读一下账本同步状态。
  React.useEffect(function () {
    let alive = true
    call(A_PNL_VERIFY, {}).then(function (d) {
      if (!alive || !d) return
      if (isFinite(Number(d.poll_ms)) && Number(d.poll_ms) > 0) setIntervalDraft(String(Number(d.poll_ms) / 1000))
    }).catch(function () { /* 未配置凭据时宿主会报错，这里静默：本 tab 不依赖凭据 */ })
    return function () { alive = false }
  }, [])

  function saveInterval() {
    if (busy) return
    setBusy(true)
    setMsg(null)
    call(A_PNL_CONFIG, { pollSec: intervalDraft }).then(function (json) {
      setMsg({ ok: true, text: '行情刷新间隔已设为 ' + json.poll_sec + ' 秒' })
      if (isFinite(Number(json.poll_sec))) setIntervalDraft(String(json.poll_sec))
    }).catch(function (e) {
      setMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setBusy(false) })
  }

  // ---- 大字区：金额 + 涨跌幅 + 时段 ----
  let amountText
  let amountCls = 'xq-pnl-dim'
  let subText = ''
  let subBad = false
  let hasValue = false
  const hasRows = data && data.rows && data.rows.length > 0
  if (state.status === 'error') {
    amountText = '--'
    subText = '数据异常：' + state.error
    subBad = true
  } else if (!data) {
    amountText = '…'
    subText = '加载中…'
  } else if (!hasRows) {
    amountText = '未录持仓'
    subText = '去「持仓」tab 手工录入，或在那边点一次「从账本同步」'
  } else if (totals.day_profit === null || totals.day_profit === undefined) {
    amountText = '--'
    subText = '雪球行情没取到，稍后自动重试（持仓数据不受影响）'
    subBad = true
  } else {
    amountText = fmtYk(totals.day_profit)
    amountCls = trendClass(totals.day_profit) || 'xq-pnl-dim'
    hasValue = true
  }
  const sessionText = data && SESSION_TEXT[data.session] ? SESSION_TEXT[data.session] : ''
  const hero = el('div', { className: 'xq-pnl-hero' }, [
    el('span', { key: 'a', className: 'xq-pnl-amt ' + amountCls }, amountText),
    hasValue ? el('span', { key: 'p', className: 'xq-pnl-pct ' + amountCls }, fmtPct(totals.day_rate)) : null,
    sessionText ? el('span', { key: 's', className: 'xq-pnl-tag' }, sessionText) : null
  ])

  // ---- 次级统计 ----
  const stats = [
    ['持仓盈亏', hasRows && totals.hold_profit !== null ? fmtYk(totals.hold_profit) : '--',
      hasRows && totals.hold_rate !== null ? fmtPct(totals.hold_rate) : '', hasRows ? totals.hold_profit : null],
    ['持仓市值', hasRows ? fmtMoney(totals.value) : '--', '', null],
    ['持仓成本', hasRows ? fmtMoney(totals.cost_value) : '--', '', null],
  ].map(function (it, i) {
    return el('div', { key: 's' + i, className: 'xq-stat' }, [
      el('div', { key: 'k', className: 'xq-stat-k' }, it[0]),
      el('div', { key: 'v', className: 'xq-pos-num ' + (it[3] === null ? '' : (trendClass(it[3]) || '')) },
        it[2] ? (it[1] + ' ' + it[2]) : it[1])
    ])
  })

  const metaParts = []
  if (hasRows) metaParts.push('共 ' + totals.held + ' 只计入合计')
  if (totals && totals.missing > 0) metaParts.push(totals.missing + ' 只缺现价')
  if (data && data.as_of) metaParts.push('行情 ' + new Date(data.as_of).toLocaleString('zh-CN'))
  if (data && isFinite(Number(data.poll_ms))) metaParts.push('刷新间隔 ' + Math.round(Number(data.poll_ms) / 1000) + ' 秒')
  const meta = metaParts.length ? el('div', { className: 'xq-pnl-meta' }, metaParts.join(' · ')) : null

  const intervalRow = el('div', { className: 'xq-pnl-field' }, [
    el('label', { key: 'l' }, '行情刷新间隔'),
    el('input', {
      key: 'i', className: 'xq-pnl-num', type: 'number', min: '5', max: '3600', step: '1',
      value: intervalDraft,
      onChange: function (e) { setIntervalDraft(e.target.value) },
      onKeyDown: function (e) { if (e.key === 'Enter') saveInterval() }
    }),
    el('span', { key: 'u', className: 'xq-pnl-note' }, '秒（5–3600）：盘中按这个节奏刷新行情，盘外自动睡到下一个 09:30/13:00/15:00'),
    el('button', { key: 'b', className: 'xq-btn', disabled: busy, onClick: saveInterval }, busy ? '保存中…' : '保存')
  ])
  const msgEl = msg ? el('div', { key: 'm', className: 'xq-pnl-msg' }, [
    el('span', { key: 'v', className: msg.ok ? 'xq-pnl-ok' : 'xq-pnl-bad' }, (msg.ok ? '✓ ' : '✗ ') + msg.text)
  ]) : null

  const cloud = (data && data.cloud) || null
  const cloudNote = cloud
    ? (cloud.synced_at
      ? '上次从账本同步：' + new Date(cloud.synced_at).toLocaleString('zh-CN')
        + (cloud.account && cloud.account.pnl_yk !== undefined ? '（账户口径今日盈亏 ' + fmtYk(cloud.account.pnl_yk) + '）' : '')
      : '还没成功同步过账本')
    : '还没从账本同步过'

  const notes = [
    el('div', { key: 'n1', className: 'xq-pnl-note' },
      '今日盈亏 = Σ(现价 − 昨收) × 股数，全部由「本地持仓 × 雪球行情」现算，不再向账本要数 —— ' +
      '账本凭据过期也不会让这里的数字停摆。'),
    el('div', { key: 'n2', className: 'xq-pnl-note' },
      '口径差别：本页是「持仓浮动」，不含当日已实现盈亏与费用；账本账户口径含这两项，' +
      '所以两者会差一点（清仓那部分尤其明显）。' + cloudNote + '。'),
    el('div', { key: 'n3', className: 'xq-pnl-note' },
      '持仓的增删改与「从账本同步」都在「持仓」tab；同步只在你自己点的时候发生。')
  ]

  return el('div', { className: 'xq-pnl' }, [hero, el('div', { key: 'st', className: 'xq-pos-stats' }, stats), meta, intervalRow, msgEl].concat(notes))
}

// 「持仓」tab：**本地持仓**（主数据）的查看、手工增删改，以及「从账本同步」。
//
// 定位（改造后）：持仓是本地文件里的一份可编辑数据；价格与盈亏由雪球行情现算（宿主算，
// 见 lib/pnl/index.js）。这里的股数与成本价就是「输入」—— 改完立即反映到今日盈亏。
//
// 账本只有两个入口，都在本 tab 的「从账本同步」区里，且**只在用户点击时**才发请求：
//   · 导入 / 校对（merge）：账本有则更新 qty/cost，账本没有的本地行保留；
//   · 用账本覆盖（replace）：整表以账本为准。
// 同步失败（Cookie 过期 / 403 / 断网）只影响这个按钮的结果，**持仓与今日盈亏照常**。
//
// 本组件自取运行时（usePositionsState），不读父级任何上下文字段：
// panel/index.js 的 TAB_CTX.positions 返回空对象即可。

/** 金额：无符号 + 千分位 + 两位小数。 */
function money(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 金额：带符号 + 千分位（盈亏用）。 */
function signedMoney(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  const sign = n > 0 ? '+' : (n < 0 ? '-' : '')
  return sign + Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 股数：整数 + 千分位（A 股 1 手 = 100 股，这里显示的是**股数**）。 */
function qtyText(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

/** 价格：低价品种（ETF/基金/港股）保留三位小数，其余两位。 */
function priceText(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  return Math.abs(n) < 10 ? n.toFixed(3) : n.toFixed(2)
}

function rateText(v) {
  if (v === null || v === undefined) return ''
  const n = Number(v)
  if (!isFinite(n)) return ''
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}

/**
 * 涨跌单元：金额在上、涨跌幅在下，颜色由**涨跌方向**决定（A 股习惯：涨红跌绿，见 styles.css
 * 的 .xq-up/.xq-down/.xq-flat）。金额与涨跌幅都取不到时显示 `--`，不假装是 0。
 */
function changeCell(profit, rate, showRate, title) {
  const hasAmount = profit !== null && profit !== undefined && isFinite(Number(profit))
  const rateTxt = showRate ? rateText(rate) : ''
  if (!hasAmount && !rateTxt) {
    return el('span', { className: 'xq-pos-r xq-pos-num xq-pos-chg xq-flat', title: title }, '--')
  }
  return el('span', { className: 'xq-pos-r xq-pos-num xq-pos-chg ' + colorOf(hasAmount ? profit : rate), title: title }, [
    el('span', { key: 'a', className: 'xq-pos-amt' }, hasAmount ? signedMoney(profit) : '--'),
    rateTxt ? el('span', { key: 'b', className: 'xq-pos-rate' }, rateTxt) : null
  ])
}

/** 时间戳 → 「MM-DD HH:mm」；取不到给空串。 */
function stampText(iso) {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (!isFinite(t)) return ''
  const d = new Date(t)
  function p(n) { return n < 10 ? '0' + n : String(n) }
  return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

const BLANK_FORM = { code: '', name: '', qty: '', cost: '' }

// 「持仓」tab：合计 + 可编辑的逐只持仓表 + 从账本同步区。
function PositionsTab(p) {
  const state = usePositionsState()
  const data = state.data
  const totals = (data && data.totals) || {}

  const [form, setForm] = React.useState(null)       // null = 表单关闭；否则 {code,name,qty,cost}
  const [originalCode, setOriginalCode] = React.useState('')  // 编辑时原代码（改代码用）
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState(null)         // { ok, text }
  const [syncOpen, setSyncOpen] = React.useState(false)
  const [cookieDraft, setCookieDraft] = React.useState('')
  const [book, setBook] = React.useState(null)       // pnl.verify 的结果（凭据 / 组合 / 上次同步）
  const [menuFor, setMenuFor] = React.useState('')   // 行内「更多」菜单：当前展开的代码（一次只开一个）
  const [menuUp, setMenuUp] = React.useState(false)  // 向上展开（最后一行的下方没空间）

  // 菜单的键盘/点击外部收起：只在有菜单展开时挂监听，避免常驻 document 监听。
  React.useEffect(function () {
    if (!menuFor) return function () { }
    function onKey(e) { if (e.key === 'Escape') setMenuFor('') }
    function onDown(e) {
      const t = e && e.target
      if (t && typeof t.closest === 'function' && t.closest('.xq-menu-wrap')) return
      setMenuFor('')
    }
    // 持仓表在窄容器里是横向滚动容器（另一个轴也会被算成裁剪轴）：滚动后落点失效，直接收起
    function onScroll() { setMenuFor('') }
    try {
      window.addEventListener('keydown', onKey)
      document.addEventListener('pointerdown', onDown, true)
      document.addEventListener('scroll', onScroll, true)
    } catch (e) { /* 无 DOM 时忽略 */ }
    return function () {
      try {
        window.removeEventListener('keydown', onKey)
        document.removeEventListener('pointerdown', onDown, true)
        document.removeEventListener('scroll', onScroll, true)
      } catch (e) { /* ignore */ }
    }
  }, [menuFor])

  function toggleMenu(code, e) {
    if (menuFor === code) { setMenuFor(''); return }
    // 表格会裁剪绝对定位的子元素：最后一行的菜单向下展开会被切掉 → 按剩余空间翻向
    setMenuUp(menuUpward(e && e.currentTarget ? e.currentTarget : null, 0))
    setMenuFor(code)
  }

  // 打开同步区时才去校验凭据（不打开就一次账本请求都不发 —— 连校验都不做）
  React.useEffect(function () {
    if (!syncOpen) return function () { }
    let alive = true
    call(A_PNL_VERIFY, {}).then(function (d) {
      if (alive && d) setBook(d)
    }).catch(function (e) {
      if (alive) setBook({ configured: false, valid: false, error: String((e && e.message) || e), portfolios: [], fundKey: '' })
    })
    return function () { alive = false }
  }, [syncOpen])

  function openAdd() {
    setMsg(null)
    setOriginalCode('')
    setForm(Object.assign({}, BLANK_FORM))
  }
  function openEdit(row) {
    setMsg(null)
    setOriginalCode(row.code)
    setForm({ code: row.code, name: row.name || '', qty: row.qty === null ? '' : String(row.qty), cost: row.cost === null ? '' : String(row.cost) })
  }
  function closeForm() { setForm(null); setOriginalCode('') }

  function submit() {
    if (busy || !form) return
    const rt = getPositionsRuntime()
    if (!rt) return
    setBusy(true)
    rt.save({ code: form.code, name: form.name, qty: form.qty, cost: form.cost === '' ? null : form.cost }, originalCode || undefined).then(function () {
      setMsg({ ok: true, text: originalCode ? '已保存 ' + String(form.code).toUpperCase() : '已添加 ' + String(form.code).toUpperCase() })
      closeForm()
    }).catch(function (e) {
      setMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setBusy(false) })
  }

  function removeRow(row) {
    const rt = getPositionsRuntime()
    if (!rt || busy) return
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('从持仓里删除 ' + (row.name || row.code) + '？')) return
    setBusy(true)
    rt.remove(row.code).then(function () {
      setMsg({ ok: true, text: '已删除 ' + (row.name || row.code) })
    }).catch(function (e) {
      setMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setBusy(false) })
  }

  function refreshNow() {
    const rt = getPositionsRuntime()
    if (!rt || busy) return
    setBusy(true)
    rt.refresh(true).then(function () { setBusy(false) })
  }

  // ---- 账本同步 ----
  function saveCookie() {
    if (busy) return
    setBusy(true)
    setMsg(null)
    call(A_PNL_CONFIG, { cookie: cookieDraft.trim() }).then(function (json) {
      setBook(json)
      setCookieDraft('')
      setMsg({ ok: Boolean(json.valid), text: json.valid ? ('账本 Cookie 有效，' + (json.portfolios || []).length + ' 个组合') : ('校验失败：' + (json.error || '未知原因')) })
    }).catch(function (e) {
      setMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setBusy(false) })
  }

  function chooseFund(key) {
    if (busy) return
    setBusy(true)
    call(A_PNL_CONFIG, { fundKey: key }).then(function (json) {
      setBook(function (prev) { return Object.assign({}, prev || {}, { fundKey: json.fundKey, valid: prev ? prev.valid : false, portfolios: (prev && prev.portfolios) || [] }) })
    }).catch(function (e) {
      setMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setBusy(false) })
  }

  function doSync(mode) {
    const rt = getPositionsRuntime()
    if (!rt || busy) return
    if (mode === 'replace' && typeof window !== 'undefined' && window.confirm
      && !window.confirm('用账本覆盖本地全部持仓？手工录入的行会被清掉。')) return
    setBusy(true)
    setMsg(null)
    rt.sync(mode).then(function (res) {
      if (res && res.ok) {
        const rep = res.report || {}
        const parts = ['新增 ' + (rep.added || []).length, '更新 ' + (rep.updated || []).length]
        if ((rep.kept || []).length) parts.push('本地保留 ' + rep.kept.length)
        if ((rep.cleared || []).length) parts.push('已清仓 ' + rep.cleared.length)
        setMsg({ ok: true, text: '同步完成：' + parts.join(' · ') })
      } else {
        setMsg({ ok: false, text: '同步失败（持仓与盈亏不受影响）：' + ((res && res.error) || '未知原因') })
      }
    }).catch(function (e) {
      setMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setBusy(false) })
  }

  if (!data) {
    return el('div', { className: 'xq-loading' },
      state.status === 'error' ? ('持仓加载失败：' + state.error) : '持仓加载中…')
  }

  const rows = (Array.isArray(data.rows) ? data.rows.slice() : []).sort(function (a, b) {
    return (Number(b.value) || 0) - (Number(a.value) || 0)
  })

  // ---- 合计（视觉重点：今日盈亏 / 持仓盈亏两项突出，市值与成本放右侧辅助区）----
  const heroItem = function (key, label, amount, rate, value) {
    const cls = (value === null || value === undefined) ? '' : (colorOf(value) || '')
    return el('div', { key: key, className: 'xq-pos-hero-main' }, [
      el('div', { key: 'k', className: 'xq-pos-hero-k' }, label),
      el('div', { key: 'v', className: 'xq-pos-hero-amt ' + cls }, [
        el('span', { key: 'a' }, amount),
        rate ? el('span', { key: 'p', className: 'xq-pos-hero-pct' }, rate) : null
      ])
    ])
  }
  const hasRows = data.rows.length > 0
  const hero = el('div', { key: 'hero', className: 'xq-pos-hero' }, [
    heroItem('day', '今日盈亏', hasRows ? signedMoney(totals.day_profit) : '--', hasRows ? rateText(totals.day_rate) : '', hasRows ? totals.day_profit : null),
    heroItem('hold', '持仓盈亏', rows.length ? signedMoney(totals.hold_profit) : '--', rows.length ? rateText(totals.hold_rate) : '', rows.length ? totals.hold_profit : null),
    el('div', { key: 'aux', className: 'xq-pos-hero-aux' }, [
      el('div', { key: 'm' }, [
        el('span', { key: 'k', className: 'xq-pos-aux-k' }, '持仓市值 '),
        el('span', { key: 'v', className: 'xq-pos-aux-v' }, rows.length ? money(totals.value) : '--')
      ]),
      el('div', { key: 'c' }, [
        el('span', { key: 'k', className: 'xq-pos-aux-k' }, '持仓成本 '),
        el('span', { key: 'v', className: 'xq-pos-aux-v' }, rows.length ? money(totals.cost_value) : '--')
      ])
    ])
  ])

  // ---- 表单（新增 / 编辑共用）----
  function field(key, label, placeholder, type) {
    return el('label', { key: key, className: 'xq-pos-field' }, [
      el('span', { key: 'l', className: 'xq-pos-field-k' }, label),
      el('input', {
        key: 'i', className: 'xq-pos-input', type: type || 'text', placeholder: placeholder,
        value: form[key],
        onChange: function (e) {
          const v = e.target.value
          setForm(function (prev) { const next = Object.assign({}, prev); next[key] = v; return next })
        },
        onKeyDown: function (e) { if (e.key === 'Enter') submit() }
      })
    ])
  }
  const formEl = form ? el('div', { key: 'form', className: 'xq-pos-form' }, [
    el('div', { key: 'hd', className: 'xq-pos-form-hd' }, originalCode ? ('编辑 ' + originalCode) : '添加持仓'),
    el('div', { key: 'f', className: 'xq-pos-form-row' }, [
      field('code', '代码', '600519 / 00700 / AAPL'),
      field('name', '名称（可空）', '留空自动按代码取'),
      field('qty', '股数', '100', 'number'),
      field('cost', '成本价（可空）', '摊薄成本', 'number'),
    ]),
    el('div', { key: 'bt', className: 'xq-pos-form-btns' }, [
      el('button', { key: 'ok', className: 'xq-btn', disabled: busy, onClick: submit }, busy ? '保存中…' : '保存'),
      el('button', { key: 'no', className: 'xq-btn', disabled: busy, onClick: closeForm }, '取消'),
      el('span', { key: 'hint', className: 'xq-pnl-note' }, '代码唯一；港股填 00700 或 HK00700 都行。只输代码+股数也能用，成本价留空则「持仓盈亏」显示 --。')
    ])
  ]) : null

  // ---- 表头 / 表体 ----
  const head = el('div', { key: 'hd', className: 'xq-pos-grid xq-pos-hd' }, [
    el('span', { key: 'n' }, '名称 / 代码'),
    el('span', { key: 'q', className: 'xq-pos-r', title: '股数' }, '股数'),
    el('span', { key: 'c', className: 'xq-pos-r', title: '持仓成本价（摊薄成本）' }, '成本价'),
    el('span', { key: 'p', className: 'xq-pos-r' }, '现价'),
    el('span', { key: 'd', className: 'xq-pos-r', title: '当日盈亏 / 当日涨跌幅 =（现价 − 昨收）× 股数' }, '当日盈亏'),
    el('span', { key: 'v', className: 'xq-pos-r' }, '市值'),
    el('span', { key: 'y', className: 'xq-pos-r', title: '持仓盈亏 / 持仓收益率（相对成本价）' }, '持仓盈亏'),
    el('span', { key: 'o', className: 'xq-pos-r' }, '操作')
  ])

  const body = rows.map(function (row, i) {
    const hasQty = row.qty !== null && row.qty !== undefined && isFinite(Number(row.qty))
    const cleared = hasQty && Number(row.qty) <= 0
    let dayTitle = '当日盈亏 / 当日涨跌幅 =（现价 − 昨收）× 股数'
    if (row.prev_close !== null && row.prev_close !== undefined) dayTitle += '；昨收 ' + priceText(row.prev_close)
    if (row.xq_symbol) dayTitle += '\n行情代码 ' + row.xq_symbol
    const menuOpen = menuFor === row.code
    return el('div', { key: 'r' + row.code, className: 'xq-pos-grid xq-pos-row' + (cleared ? ' xq-pos-cleared' : '') }, [
      el('span', { key: 'n', className: 'xq-pos-name' }, [
        el('span', { key: 'nm', className: 'xq-pos-nm', title: row.name || row.code }, row.name || row.code || '—'),
        el('span', { key: 'cd', className: 'xq-pos-code' }, row.code || ''),
        cleared ? el('span', { key: 'd', className: 'xq-pos-days' }, '已清仓') : null
      ]),
      el('span', { key: 'q', className: 'xq-pos-r xq-pos-num', title: '股数' }, qtyText(row.qty)),
      el('span', { key: 'c', className: 'xq-pos-r xq-pos-num xq-pos-cost', title: '持仓成本价（摊薄成本）' }, priceText(row.cost)),
      el('span', { key: 'p', className: 'xq-pos-r xq-pos-num' }, priceText(row.price)),
      el('span', { key: 'd', className: 'xq-pos-cell' },
        cleared
          ? changeCell(null, null, false, '已清仓（股数 0）：不计入合计，可删掉这一行')
          : changeCell(row.day_profit, row.day_rate, true, dayTitle)),
      el('span', { key: 'v', className: 'xq-pos-r xq-pos-num' }, money(row.value)),
      el('span', { key: 'y', className: 'xq-pos-cell' }, changeCell(row.hold_profit, row.hold_rate, !cleared, '持仓盈亏 / 持仓收益率（相对成本价）')),
      el('span', { key: 'o', className: 'xq-pos-r xq-pos-ops' }, [
        el('button', { key: 'e', className: 'xq-btn-mini', disabled: busy, onClick: function () { openEdit(row) } }, '编辑'),
        // 破坏性操作收进「更多」菜单；菜单可用键盘打开（Enter/空格），Esc 或点外部关闭。
        el('span', { key: 'm', className: 'xq-menu-wrap' }, [
          el('button', {
            key: 'mb', className: 'xq-btn-mini xq-icon-btn', disabled: busy,
            title: '更多操作', 'aria-label': '更多操作', 'aria-haspopup': 'menu', 'aria-expanded': menuOpen ? 'true' : 'false',
            onClick: function (e) { e.stopPropagation(); toggleMenu(row.code, e) }
          }, '⋯'),
          menuOpen ? el('div', { key: 'mu', className: 'xq-menu' + (menuUp ? ' xq-menu-up' : ''), role: 'menu' }, [
            el('button', {
              key: 'del', className: 'xq-menu-item xq-danger', role: 'menuitem',
              onClick: function (e) { e.stopPropagation(); setMenuFor(''); removeRow(row) }
            }, '删除持仓')
          ]) : null
        ])
      ])
    ])
  })

  // ---- 同步区 ----
  const b = book || {}
  const portfolios = b.portfolios || []
  const cloud = data.cloud || null
  const syncSection = syncOpen ? el('div', { key: 'sync', className: 'xq-pos-sync' }, [
    el('div', { key: 't', className: 'xq-pnl-sec' }, '从账本同步（同花顺投资账本 · 只在点按钮时请求）'),
    el('div', { key: 'st', className: 'xq-pnl-note' },
      b.configured === false
        ? '还没有账本 Cookie。粘一次就能用「同步」；不粘也行 —— 手工录入的持仓一样能算今日盈亏。'
        : (b.valid
          ? '✓ Cookie 有效，' + portfolios.length + ' 个组合'
          : ('✗ ' + (b.error || '待校验')))),
    cloud ? el('div', { key: 'cd', className: 'xq-pnl-note' },
      (cloud.synced_at ? '上次成功同步 ' + new Date(cloud.synced_at).toLocaleString('zh-CN') : '还没成功同步过')
      + (cloud.attempted_at && cloud.error ? '；上次尝试 ' + stampText(cloud.attempted_at) + ' 失败' : '')) : null,
    cloud && cloud.error ? el('div', { key: 'ce', className: 'xq-pos-hint' }, cloud.error) : null,
    el('textarea', {
      key: 'ta', className: 'xq-pnl-ta',
      placeholder: '账本 Cookie（登录 tzzb.10jqka.com.cn 后 F12 → copy(document.cookie)）',
      value: cookieDraft,
      onChange: function (e) { setCookieDraft(e.target.value) }
    }),
    el('div', { key: 'r1', className: 'xq-pnl-row' }, [
      el('button', { key: 's', className: 'xq-btn', disabled: busy || cookieDraft.trim().length === 0, onClick: saveCookie }, '保存并校验'),
      portfolios.length ? el('select', {
        key: 'sel', className: 'xq-pnl-sel', value: b.fundKey || '', disabled: busy || portfolios.length < 2,
        onChange: function (e) { chooseFund(e.target.value) }
      }, portfolios.map(function (it, i) {
        return el('option', { key: String(i), value: it.fund_key }, it.name || it.fund_key)
      })) : null
    ]),
    el('div', { key: 'r2', className: 'xq-pnl-row' }, [
      el('button', { key: 'm', className: 'xq-btn', disabled: busy || b.valid !== true, onClick: function () { doSync('merge') }, title: '账本有则更新股数/成本，账本没有的本地行保留' }, busy ? '同步中…' : '从账本导入 / 校对'),
      el('button', { key: 'r', className: 'xq-btn', disabled: busy || b.valid !== true, onClick: function () { doSync('replace') }, title: '整表以账本为准，手工录入的行会被清掉' }, '用账本覆盖全部')
    ]),
    el('div', { key: 'note', className: 'xq-pnl-note' },
      '同步会更新「股数」与「成本价」这两列（账本是这两个数的来源），价格与盈亏仍然由行情现算。' +
      '同步失败不影响持仓与今日盈亏 —— 这正是把账本降级成「一次性导入工具」的目的。')
  ]) : null

  const headLine = el('div', { key: 'hl', className: 'xq-pos-head' }, [
    el('span', { key: 't', className: 'xq-pos-title' },
      '持仓 ' + rows.length + ' 只' + (data.updated_at ? ' · 本地更新 ' + stampText(data.updated_at) : '')),
    el('span', { key: 'sp', className: 'xq-spacer' }),
    // 「添加持仓」是页面主操作，同步/刷新为次级
    el('button', { key: 'add', className: 'xq-btn xq-btn-primary', disabled: busy, onClick: openAdd }, '＋ 添加持仓'),
    el('button', { key: 'syn', className: 'xq-btn xq-btn-quiet', onClick: function () { setSyncOpen(!syncOpen) }, 'aria-expanded': syncOpen ? 'true' : 'false' }, syncOpen ? '收起同步' : '账本同步'),
    el('button', { key: 'rf', className: 'xq-btn xq-btn-quiet', disabled: busy, onClick: refreshNow }, busy ? '刷新中…' : '刷新行情')
  ])

  const dayMissing = rows.length > 0 && rows.every(function (r) { return r.day_profit === null || r.day_profit === undefined })

  // 口径说明：默认一行摘要，展开可读完整说明（触屏/键盘都能读，不藏在 tooltip 里）
  const notes = [
    el('div', { key: 'n1', className: 'xq-pnl-note' }, '价格与盈亏由雪球行情现算，不落盘；合计按逐行取整后相加。')
  ]
  if (dayMissing) {
    notes.push(el('div', { key: 'nq', className: 'xq-pos-hint' }, '当日盈亏暂不可用（雪球行情取数失败），其余字段不受影响'))
  }
  if (msg) notes.unshift(el('div', { key: 'm', className: msg.ok ? 'xq-pnl-ok' : 'xq-err' }, (msg.ok ? '✓ ' : '✗ ') + msg.text))
  if (rows.length === 0 && !formEl) {
    notes.unshift(el('div', { key: 'n0', className: 'xq-loading' },
      '还没有持仓：点「＋ 添加持仓」手工录入，或展开「账本同步」拉一次账本。'))
  }
  notes.push(el('details', { key: 'n2', className: 'xq-pos-notes-details' }, [
    el('summary', { key: 's', className: 'xq-pnl-note' }, '口径说明'),
    el('div', { key: 'b', className: 'xq-pnl-note' },
      '持仓是本地数据（可增删改）；股数 × 成本价就是「输入」，现价 / 当日盈亏 / 持仓盈亏全部由雪球行情现算，不落盘。'),
    el('div', { key: 'c', className: 'xq-pnl-note' },
      '当日盈亏 =（现价 − 昨收）× 股数；持仓盈亏 =（现价 − 成本价）× 股数。合计按逐行取整后相加，所以和表格里每一行的数字对得上。')
  ]))

  return el('div', null, [
    hero,
    headLine,
    formEl,
    el('div', { key: 'tbl', className: 'xq-pos-table' }, [head].concat(body)),
    syncSection,
    el('div', { key: 'notes', className: 'xq-pos-notes' }, notes)
  ])
}

// XueqiuPanel：面板内容容器（数据 + tab 条 + 查表分发）。
//
// 内层视图（LoginBox / MarketTab / DetailView / HotTab / SearchTab / NewsTab / PnlTab）已提到模块作用域，
// 原来靠父级闭包读的 state/句柄改为「调用点组装显式上下文 p」传入；本文件只保留数据逻辑。
//
// tab 分发表：ui.tab → 组件。注意 DetailView 不在此表 —— 详情由 view 真值门控（旧 if/else 链
// 也是先判 view），且宿主 ui.get 会把 tab 白名单化成 market/hot/search/news/pnl/positions。把 detail 塞进
// 查表会让理论上不可达的 tab='detail' 渲染详情骨架（旧行为是落到快讯页），属于行为变化。

const XQ_TABS = { market: MarketTab, hot: HotTab, search: SearchTab, news: NewsTab, pnl: PnlTab, positions: PositionsTab }

/** 账户图标：静态内联 SVG（统一线宽，不引图标库；emoji 跨平台外观不一致，不用）。 */
function accountIcon() {
  return el('svg', {
    key: 'i', className: 'xq-acc-icon', viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false',
    fill: 'none', stroke: 'currentColor', strokeWidth: '1.4', strokeLinecap: 'round', strokeLinejoin: 'round'
  }, [
    el('circle', { key: 'c', cx: '8', cy: '5.2', r: '2.6' }),
    el('path', { key: 'p', d: 'M2.9 13.4c0-2.4 2.2-3.9 5.1-3.9s5.1 1.5 5.1 3.9' })
  ])
}

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
  // 竞态防护：热榜/搜索的响应序号（旧响应到达时序号已过期则丢弃，防慢请求覆盖新结果）。
  // 行情不再需要它：序号guard 已收敛到页面内共享行情运行时（见 store/market.js）。
  const hotSeq = React.useRef(0)
  const searchSeq = React.useRef(0)
  // 轮询闭包读当前市场（interval 闭包不随状态更新，直接捕获 state 会拿到 stale 值）
  const hotMarketRef = React.useRef(hotMarket)
  hotMarketRef.current = hotMarket
  const [news, setNews] = React.useState([])
  const newsSeq = React.useRef(0)
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
  const [alertRules, setAlertRules] = React.useState([])
  const [alertEvents, setAlertEvents] = React.useState([])
  const [alertNotice, setAlertNotice] = React.useState([])
  const [alertDrafts, setAlertDrafts] = React.useState({})
  const [alertBusy, setAlertBusy] = React.useState({})
  const [ackBusy, setAckBusy] = React.useState(false)   // 确认 RPC 在途：只用于按钮态，判定重入用 ref
  const noticeSeeded = React.useRef(false)
  const ackPending = React.useRef(false)
  const tab = ui.tab
  function setTab(t) { ui.set({ tab: t }) }
  // 规则变更后立刻核对一次：提醒轮询本身归应用级 alerts-watch 运行时，面板只订阅它的快照。
  function kickAlerts() {
    const rt = getAlertsWatchRuntime()
    if (rt) rt.kick()
  }
  // 快照落点：rules/events 直接上屏；fresh 是新事件（= 该弹通知的那批，通知已由运行时发出）。
  // 面板这里只负责把它们追加到「页面内通知区」—— 那是 ack 的入口，不显示就等于永远确认不掉。
  function applyAlerts(state, fresh) {
    const rules = (state && Array.isArray(state.rules)) ? state.rules : []
    const events = (state && Array.isArray(state.events)) ? state.events : []
    setAlertRules(rules)
    setAlertEvents(events)
    // 首份快照只把最近 ALERT_NOTICE_LIMIT 条未确认事件放进通知区（与宿主保留新事件的约定一致：
    // 超出 ALERT_MAX_EVENTS 时 slice(-N)，events 时间升序），避免陈年旧事件撑爆面板；
    // 确认掉这批后重开面板即可看到更早的一批，不会被永久藏住。
    if (!noticeSeeded.current) {
      noticeSeeded.current = true
      if (events.length) setAlertNotice(events.slice(-ALERT_NOTICE_LIMIT))
      return
    }
    if (!fresh || !fresh.length) return
    setAlertNotice(function (prev) {
      const prior = prev || []
      return prior.concat(fresh.filter(function (e) {
        const id = alertEventId(e)
        return !prior.some(function (x) { return alertEventId(x) === id })
      }))
    })
  }
  function setAlert(symbol, rawTarget, direction, enabled) {
    const target = Number(rawTarget)
    if (!isFinite(target) || (direction !== 'above' && direction !== 'below')) {
      setErr('请输入有效提醒价位，并选择 above/below')
      return
    }
    setAlertBusy(function (b) { return Object.assign({}, b, { [symbol]: true }) })
    saveAlert(symbol, target, direction, enabled !== false).then(function (data) {
      setAlertRules((data && data.rules) || [])
      kickAlerts()   // 运行时的规则快照/节奏跟着改：新增规则后要从 5 分钟空闲节奏回到 30 秒
      setErr('')
    }).catch(function (e) {
      setErr(String((e && e.message) || e))
    }).then(function () { setAlertBusy(function (b) { const n = Object.assign({}, b); delete n[symbol]; return n }) })
  }
  function removeAlertRule(symbol) {
    setAlertBusy(function (b) { return Object.assign({}, b, { [symbol]: true }) })
    removeAlert(symbol).then(function (data) {
      setAlertRules((data && data.rules) || [])
      kickAlerts()   // 删掉最后一条后运行时停表；删掉一条也要让节奏/基线跟宿主对齐
      setErr('')
    }).catch(function (e) {
      setErr(String((e && e.message) || e))
    }).then(function () { setAlertBusy(function (b) { const n = Object.assign({}, b); delete n[symbol]; return n }) })
  }
  function acknowledgeAlerts(events) {
    const ids = (events || []).map(function (e) { return e && (e.id != null ? e.id : e.event_id) }).filter(function (id) { return id != null && id !== '' })
    if (!ids.length) return
    if (ackPending.current) return   // 上一笔确认还在路上：不重复提交，也不叠加待删集合
    ackPending.current = true
    setAckBusy(true)
    // key 用 alertEventId 的字符串形态，与下面过滤时算出的 id 同构（宿主 id 万一是数字也不会漏删）
    const acked = {}
    ids.forEach(function (id) { acked[String(id)] = true })
    // 先等 RPC 成功再动本地状态：原来先乐观删除，ack RPC 一失败宿主仍记录着事件，
    // 但事件已被本地「已知」集合认作已处理，下轮既不会再通知也不会把它放回通知区，
    // 表现为「点了确认却没确认掉，而且再也看不见了」。失败时保留事件并报错，可直接重试。
    ackAlerts(ids).then(function (data) {
      const remaining = (data && Array.isArray(data.events)) ? data.events : null
      if (remaining) setAlertEvents(remaining)   // 宿主回传剩余事件，直接以它为准
      else setAlertEvents(function (prev) { return (prev || []).filter(function (e) { return !acked[alertEventId(e)] }) })
      setAlertNotice(function (prev) { return (prev || []).filter(function (e) { return !acked[alertEventId(e)] }) })
      kickAlerts()   // 让运行时的快照与宿主一致（否则它的 events 里还留着已被确认掉的那几条）
      setErr('')
    }).catch(function (e) {
      setErr('确认提醒失败：' + String((e && e.message) || e))
    }).then(function () {
      ackPending.current = false
      setAckBusy(false)
    })
  }

  // 行情（指数 + 自选）走页面内共享运行时：订阅拿快照，不再自己发 quote/watchlist.get。
  // force=true（用户点刷新 / 同步）时绕开宿主缓存的已完成部分，并等真实的完成 Promise。
  function refreshMarket(force) {
    const mkt = getMarketRuntime()
    if (!mkt) return Promise.resolve()
    const wl = mkt.getWatchlist() || watchlist || []
    const symbols = XQ_INDEX_SYMBOLS.concat(wl.slice(0, WATCHLIST_MAX))
    const jobs = [mkt.refresh(symbols, { force: force === true })]
    if (force) jobs.push(mkt.refreshWatchlist())
    return Promise.all(jobs).catch(function (e) {
      setErr(String((e && e.message) || e))
    })
  }

  // 一份快照 → 指数卡 + 行情表（含无效代码占位与价格闪烁）。
  // 空响应/临时异常没有足够信息判断盘中，不要把轮询误降到休市节奏；下一轮成功拿到状态后再切换。
  function applyIndexSnapshot() {
    const mkt = getMarketRuntime()
    if (!mkt) return
    const snap = mkt.getSnapshot(XQ_INDEX_SYMBOLS)
    setIndices(snap.list)
    const st = snap.status
    if (st === 5 || st === 6) setMarketOpen(true)
    else if (st !== null && st !== undefined) setMarketOpen(false)
  }
  function applyWatchSnapshot() {
    const mkt = getMarketRuntime()
    if (!mkt) return
    const wl = (mkt.getWatchlist() || []).slice(0, WATCHLIST_MAX)
    setWatchlist(wl)
    const snap = mkt.getSnapshot(wl)
    const list = snap.list
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
    setErr(snap.error || '')
  }

  function refreshContent() {
    const my = ++hotSeq.current
    const newsMy = ++newsSeq.current
    const market = hotMarketRef.current   // 读当前市场（轮询闭包防 stale）
    return Promise.all([
      call(A_HOT, { market: market, size: HOT_LIST_SIZE }),
      call(A_NEWS, { count: NEWS_PAGE_SIZE })
    ]).then(function (res) {
      if (hotSeq.current !== my) return   // 期间用户切了市场/触发过手动刷新：丢弃旧响应
      if (newsSeq.current !== newsMy) return
      setHot((res[0] && res[0].list) || [])
      setNews((res[1] && res[1].items) || [])
      setNewsMore(false)
      setNewsNoMore(false)
      setErr('')
    }).catch(function (e) {
      if (hotSeq.current === my && newsSeq.current === newsMy) setErr(String((e && e.message) || e))
    })
  }

  // 快讯翻页：max_id = 当前最旧一条 id，返回严格更早的记录
  function loadMoreNews() {
    if (newsMore || newsNoMore || !news.length) return
    const maxId = news[news.length - 1].id
    const my = ++newsSeq.current
    setNewsMore(true)
    call(A_NEWS, { count: NEWS_PAGE_SIZE, max_id: maxId }).then(function (res) {
      if (newsSeq.current !== my) return
      const items = (res && res.items) || []
      const seen = {}
      news.forEach(function (it) { seen[it.id] = true })
      const fresh = items.filter(function (it) { return !seen[it.id] })
      if (!fresh.length) setNewsNoMore(true)
      else setNews(news.concat(fresh))
      setNewsMore(false)
    }).catch(function () {
      if (newsSeq.current === my) setNewsMore(false)
    })
  }

  React.useEffect(function () {
    setLoading(true)
    call(A_LOGIN_STATUS, {}).then(function (d) { setLoginSt(d || { loggedIn: false }) }).catch(function () { setLoginSt({ loggedIn: false }) })
    refreshContent()
      .then(function () { setLoading(false) })
      .catch(function () { setLoading(false) })
    return function () { /* 一次性 */ }
  }, [])

  React.useEffect(function () {
    // 提醒轮询归应用级 alerts-watch 运行时（它与面板挂载、与行情隐身都无关，见 store/alerts-watch.js）；
    // 面板只订阅快照。打开面板时顺手 kick 一次，避免看到上一次 tick 的旧列表。
    const watch = getAlertsWatchRuntime()
    if (!watch) return function () { }
    const off = watch.subscribe(applyAlerts)
    watch.kick()
    return off
  }, [])

  React.useEffect(function () {
    // 行情节奏由页面内共享运行时驱动（一个最近到期的定时器 + 一次并集请求）；
    // 面板 open=false 时本组件被卸载 → 它那份 20s 需求随之注销，徽章/指数条仍按 30s 运行。
    const marketMs = marketOpen ? POLL_MARKET_OPEN_MS : POLL_MARKET_CLOSED_MS
    const mkt = getMarketRuntime()
    if (!mkt) return function () { }
    function onIndices() { applyIndexSnapshot() }
    function onWatch() { applyWatchSnapshot() }
    onIndices()
    onWatch()
    const offA = mkt.subscribe({ symbols: XQ_INDEX_SYMBOLS, intervalMs: marketMs }, onIndices)
    const offB = mkt.subscribe({ watchlistLimit: WATCHLIST_MAX, needsWatchlist: true, intervalMs: marketMs }, onWatch)
    return function () { offA(); offB() }
  }, [marketOpen])

  React.useEffect(function () {
    const contentMs = marketOpen ? POLL_CONTENT_OPEN_MS : POLL_CONTENT_CLOSED_MS
    // 热榜/快讯在隐藏页暂停以降低请求量（行情轮询留给共享运行时，它自己处理可见性恢复）。
    const stopB = rt.ctx.interval(function () { if (!pageHidden()) refreshContent() }, contentMs)
    function onVis() {
      if (!pageHidden()) refreshContent()
    }
    try { document.addEventListener('visibilitychange', onVis) } catch (e) { /* ignore */ }
    return function () {
      if (stopB) stopB()
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

  // 详情驻留期间也要更新报价/分时；原来只在切换标的时请求一次，打开十几分钟后
  // 现价会永久停在旧值。回到前台立即补一次，force 跳过短 TTL。
  React.useEffect(function () {
    if (!view) return function () {}
    let alive = true
    function refreshLive() {
      // 详情报价/分时即使页面隐藏也继续请求；浏览器可能对 timer 做节流。
      Promise.all([
        call(A_QUOTE_DETAIL, { symbol: view, force: true }).catch(function () { return null }),
        call(A_MINUTE, { symbol: view, force: true }).catch(function () { return null })
      ]).then(function (res) {
        if (!alive) return
        const q = res[0] && res[0].quote
        const m = res[1]
        if (!q && !m) return
        setDetail(function (d) {
          if (!d) return d
          return Object.assign({}, d, q ? { quote: q } : {}, m ? { minute: m } : {})
        })
      })
    }
    const liveMs = marketOpen ? POLL_MARKET_OPEN_MS : POLL_MARKET_CLOSED_MS
    const stop = rt.ctx.interval(refreshLive, liveMs)
    function onVis() { if (!pageHidden()) refreshLive() }
    try { document.addEventListener('visibilitychange', onVis) } catch (e) { /* ignore */ }
    return function () {
      alive = false
      if (stop) stop()
      try { document.removeEventListener('visibilitychange', onVis) } catch (e) { /* ignore */ }
    }
  }, [view, marketOpen])

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

  // 自选变更入口统一走这里：任何增删/登录/主动拉取都要让共享运行时知道新列表，
  // 否则运行时还按旧列表取价（漏取新增、白取已删）。
  function syncWatchlist(symbols) {
    const mkt = getMarketRuntime()
    const list = Array.isArray(symbols) ? symbols : []
    if (mkt) mkt.applyWatchlist(list)
    setWatchlist(list)
    return list
  }

  function addWatch(symbol) {
    call(A_WATCHLIST_ADD, { symbol: symbol }).then(function (data) {
      syncWatchlist((data && data.symbols) || [])
      refreshMarket()
    }).catch(function (e) { setErr(String((e && e.message) || e)) })
  }

  function removeWatch(symbol) {
    call(A_WATCHLIST_REMOVE, { symbol: symbol }).then(function (data) {
      syncWatchlist((data && data.symbols) || [])
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
      // 登录会镜像云端自选：先把返回的列表应用到运行时，再刷行情
      if (d && Array.isArray(d.symbols)) syncWatchlist(d.symbols)
      refreshMarket(true)
    }).catch(function (e) {
      setLoginMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setLoginBusy(false) })
  }

  function doLogout() {
    setLoginBusy(true)
    call(A_LOGIN_LOGOUT, {}).then(function () {
      setLoginSt({ loggedIn: false })
      setLoginMsg({ ok: true, text: '已退出登录（本地自选股保留）' })
      // 退出后云端镜像停止，但本地列表仍在：让运行时按本地列表继续（宿主缓存 generation 也已切换）
      refreshMarket(true)
    }).catch(function (e) {
      setLoginMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setLoginBusy(false) })
  }

  function doPull() {
    setLoginBusy(true)
    setLoginMsg(null)
    call(A_WATCHLIST_PULL, {}).then(function (d) {
      setLoginMsg({ ok: true, text: '已同步云端自选 ' + (((d && d.symbols) || []).length) + ' 只' })
      syncWatchlist((d && d.symbols) || [])
      refreshMarket(true)
    }).catch(function (e) {
      setLoginMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setLoginBusy(false) })
  }

  const tabs = el('div', { className: 'xq-nav' }, [
    el('div', { key: 'tabs', className: 'xq-tabs', role: 'tablist' }, PANEL_TABS.map(function (t) {
      const on = tab === t[0]
      return el('button', {
        key: t[0], className: 'xq-tab' + (on ? ' xq-tab-active' : ''), role: 'tab',
        'aria-selected': on ? 'true' : 'false',
        onClick: function () { setTab(t[0]); if (view) setView(null) }
      }, t[1])
    })),
    el('span', { key: 'sp', className: 'xq-spacer' }),
    // 第二层：页面导航在左，数据操作（账户 / 刷新）在右。图标用静态内联 SVG，不引图标库、不用 emoji。
    el('div', { key: 'act', className: 'xq-nav-actions' }, [
      el('button', {
        key: 'acc', className: 'xq-btn xq-acc-btn' + (login && login.loggedIn ? ' xq-acc-on' : ''),
        title: login && login.loggedIn ? '已登录：' + (login.screenName || login.uid || '') + '（点击管理）' : '可选：登录雪球后使用云端自选股',
        'aria-label': login && login.loggedIn ? '账户：' + (login.screenName || '已登录') : '账户登录',
        onClick: function () { setLoginMsg(null); setLoginOpen(true) }
      }, [
        accountIcon(),
        el('span', { key: 't' }, login && login.loggedIn ? (login.screenName || '已登录') : '账户')
      ]),
      el('button', {
        key: 'btn', className: 'xq-btn', disabled: loading, title: '刷新全部数据（行情 + 持仓/盈亏）',
        'aria-label': '刷新全部数据',
        onClick: function () {
          setLoading(true)
          // 持仓/盈亏视图一并刷新（refresh 内部已做并发去重，与后台轮询不会重复请求）；
          // force=true 绕过行情 10 秒缓存，用户点了「刷新」就该看到新价。
          const posRt = getPositionsRuntime()
          Promise.all([refreshMarket(true), refreshContent(), posRt ? posRt.refresh(true) : Promise.resolve()]).then(function () { setLoading(false) }).catch(function () { setLoading(false) })
        }
      }, loading ? [el('span', { key: 's', className: 'xq-refresh-spin' }, '⟳'), ' 刷新中'] : '刷新')
    ])
  ])

  const errBox = err ? el('div', { className: 'xq-err' }, err) : null
  const alertBox = alertNotice.length ? el('div', { className: 'xq-alert-notice', role: 'status' }, [
    el('strong', { key: 'title' }, '价格提醒'),
    alertNotice.map(function (e) {
      const id = alertEventId(e)
      return el('div', { key: id, className: 'xq-alert-event' }, [
        el('span', { key: 'text' }, (e.name || e.symbol || '标的') + ' 已触发 ' + (e.direction === 'below' ? '≤' : '≥') + ' ' + (e.target == null ? '' : e.target) + (e.current == null ? '' : '（现价 ' + e.current + '）')),
        el('button', {
          key: 'ack', className: 'xq-btn-mini', disabled: ackBusy,
          title: ackBusy ? '确认请求处理中…' : '确认后从宿主记录中移除该事件',
          onClick: function () { acknowledgeAlerts([e]) }
        }, ackBusy ? '确认中' : '确认')
      ])
    })
  ]) : null

  // 每个 tab 的显式上下文工厂：字段 = 该 tab 函数体里用到的父级 state/句柄
  // （MarketTab/HotTab/SearchTab/NewsTab 的字段清单见各自文件头部注释；PnlTab 自取运行时，故返回空对象）
  const TAB_CTX = {
    market: function () {
      return {
        quotes: quotes, indices: indices, flashDir: flashDir,
        sortK: sortK, sortAsc: sortAsc, setSortK: setSortK, setSortAsc: setSortAsc,
        openDetail: openDetail, removeWatch: removeWatch,
        manualCode: manualCode, setManualCode: setManualCode, addManual: addManual,
        alertRules: alertRules, alertDrafts: alertDrafts, setAlertDrafts: setAlertDrafts,
        setAlert: setAlert, removeAlert: removeAlertRule, alertBusy: alertBusy
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
    },
    positions: function () {
      return {}   // PositionsTab 自身订阅持仓运行时，不需要父级任何字段
    }
  }

  // tab 分发：旧 if/else 链里 market/hot/search 之外的任何 tab 都落到 NewsTab；
  // 这里用 hasOwnProperty 判定，未知 tab（含 undefined/'toString' 这类原型键）统一走 news。
  const tabKey = Object.prototype.hasOwnProperty.call(XQ_TABS, ui.tab) ? ui.tab : 'news'
  const renderTab = XQ_TABS[tabKey]

  // 必须用 el(组件, 属性) **挂载成真正的组件**，不能写成 LoginBox({...}) / renderTab(...) 这样的
  // 裸函数调用 —— 裸调用会把子组件的 hooks 记到 XueqiuPanel 自己的 hook 链表上：切到「盈亏」
  // （PnlTab 有 7 个 hooks）时链表变长、切走时变短，React 直接抛
  // "Rendered fewer hooks than expected"，整棵面板树被卸载且再也打不开。
  // 其它 tab 目前恰好一个 hook 都不用，所以这个坑只在盈亏身上炸——但根因是挂载方式，不是 PnlTab。
  let content
  if (loginOpen) {
    content = el(LoginBox, {
      login: login, cookieInput: cookieInput, setCookieInput: setCookieInput,
      loginMsg: loginMsg, loginBusy: loginBusy,
      doLogin: doLogin, doLogout: doLogout, doPull: doPull,
      setLoginOpen: setLoginOpen, setLoginMsg: setLoginMsg
    })
  } else if (view) {
    content = el(DetailView, {
      detail: detail, view: view, setView: setView,
      chartMode: chartMode, setChartMode: setChartMode,
      klinePeriod: klinePeriod, setKlinePeriod: setKlinePeriod,
      fetchEarlierKline: fetchEarlierKline
    })
  } else {
    const tabProps = TAB_CTX[tabKey]()
    tabProps.key = tabKey   // 每个 tab 一棵独立的 fiber：切换即卸载重挂，不共享 hook 链表
    content = el(renderTab, tabProps)
  }

  // key 变化触发 xq-fade-in 重放：tab/详情切换有轻微淡入
  return el('div', null, [tabs, alertBox, errBox, el('div', { key: 'v-' + (loginOpen ? 'login' : (view ? 'd' : tab)), className: 'xq-view' }, content)])
}

// 隐身状态下的**唯一可见痕迹**：左下角一枚小胶囊，点一下就把行情界面全部恢复。
//
// 为什么需要它：原来隐身后屏幕上什么都不剩，只能靠快捷键（记不住）或对 AI 说话（要打字），
// 恢复成本明显高于隐藏成本 —— 用户实测后要求「左下角一个简单按钮，一按就开」。
//
// 它由 shell.overlay 的徽章门控渲染（见 badge.js 的 MiniBadge），因此：
//   · 全局唯一、跨会话/跨页面都在（设置页也看得见，正好不会走丢）；
//   · **不发任何请求** —— 隐身期间「零请求」这条不变量不受影响（胶囊只是 ui 状态的一个开关）。
//   · 只做「恢复」这一件事，不做开合切换：隐藏动作有面板头和徽章上的按钮，不缺入口。

function RestorePill() {
  const rt = getUiRuntime()
  const ui = rt.ui
  function restore() {
    // 顺手确认通知权限：隐身后提醒照常，但浏览器里请求权限必须发生在用户手势内。
    ensureAlertPermission()
    ui.set({ hidden: false })
  }
  return el('div', {
    className: 'xq-restore',
    title: '行情已隐藏 · 点这里恢复（快捷键 Ctrl/⌘+Alt+Shift+X，或对 AI 说「把行情打开」）',
    role: 'button',
    tabIndex: 0,
    onClick: restore,
    onKeyDown: function (e) {
      if (e && (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar')) { e.preventDefault(); restore() }
    }
  }, [
    el('span', { key: 'dot', className: 'xq-restore-dot' }, null),
    el('span', { key: 't', className: 'xq-restore-txt' }, '行情')
  ])
}

// 迷你悬浮徽章（shell.overlay）：可拖动、右下角手柄调宽度。
// 形态 C：默认区域模式（320px 宽，前 12 只自选静态平铺换行）；⤡ 手柄可调宽 120–480px，双击复位 320。
// 悬停弹层已砍掉：速览靠拉宽徽章，完整功能点徽章开面板。

// ---------- 迷你悬浮徽章（shell.overlay）：可拖动、右下角手柄调宽度 ----------
// 门控与 DockGate 同款：水合完成前不挂载（否则刷新瞬间会先按默认参数画一次再做布局钳制）。
// 行情隐身时不挂实体，只留左下角那枚恢复胶囊 —— 实例不挂载，它那份 POLL_BADGE_MS 轮询自然不存在。
function MiniBadge() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const [, force] = React.useState(0)
  React.useEffect(function () {
    // [fork-fix] 应用级水合入口：shell.overlay 全局只挂一次，不随会话切换重放旧持久化值
    hydrateUi()
    const off = ui.subscribe(function () { force(function (x) { return x + 1 }) })
    return off
  }, [])
  if (!ui.hydrated) return null
  if (ui.hidden) return el(RestorePill, null)
  return el(MiniBadgeBody, null)
}

function MiniBadgeBody() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const [top, setTop] = React.useState([])

  // 自选 + 前 12 只行情都走页面内共享运行时：不再自己 interval、不再各自读 watchlist.get。
  // 「前 12 只」由订阅的 watchlistLimit 表达，自选增删后运行时自动跟着变。
  React.useEffect(function () {
    const mkt = getMarketRuntime()
    if (!mkt) return function () { }
    function sync() {
      const symbols = (mkt.getWatchlist() || []).slice(0, BADGE_WATCH_LIMIT)
      setTop(mkt.getSnapshot(symbols).list)
    }
    sync()
    return mkt.subscribe({ watchlistLimit: BADGE_WATCH_LIMIT, needsWatchlist: true, intervalMs: POLL_BADGE_MS }, sync)
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

  function isBadgeControl(e) {
    const target = e && e.target
    return !!(target && typeof target.closest === 'function' && target.closest('.xq-badge-control'))
  }
  function stopBadgeControl(e) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation()
  }
  function onDown(e) {
    // 按钮等子控件不启动徽章拖拽，也不取得 pointer capture。
    if (isBadgeControl(e)) return
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
  function finishDrag(e, activate) {
    // 未由徽章背景启动的 pointerup（例如工具按钮）不能误触发开合。
    if (!rt.badgeDrag) return
    const moved = rt.badgeMoved
    const pos = rt.badgeDrag.pos
    rt.badgeDrag = null
    rt.badgeMoved = false
    try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) } catch (err) { /* ignore */ }
    if (!moved) {
      if (!activate) return
      // 胶囊点击只恢复徽章；完整徽章背景点击才开合大面板。
      if (ui.badgeCompact) ui.set({ badgeCompact: false })
      else ui.set({ open: !ui.open })
      return
    }
    if (pos) ui.set({ badgePos: pos })   // 松手一次性提交
  }
  function onUp(e) { finishDrag(e, true) }
  function onCancel(e) { finishDrag(e, false) }

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
  const compact = ui.badgeCompact === true
  const effW = (ui.badgeW !== null && ui.badgeW !== undefined) ? ui.badgeW : BADGE_W_DEFAULT
  // 宽度分档在 JS 里算（不能用容器查询：容器查询会把 fixed + width:auto 的胶囊宽度算成 0，
  // 整块塌成 padding 宽，文字全飘在外面）。徽章是 content-box，inline 的 badgeW 就是内容宽度。
  const contentW = Math.max(0, Number(effW) || 0)
  const tight = !compact && contentW < 300   // 两列已放不下（名称 + 价格 + 涨跌幅）→ 单列
  const tiny = !compact && contentW < 170    // 极窄 → 让出交易状态，只留品牌与按钮
  // 区域模式：前 12 只全部平铺（换行）；单行模式：轮动页（页码指示）
  function wItem(q) {
    return el('span', { key: 'w-' + q.symbol, className: 'xq-witem', title: (q.name || q.symbol) + ' ' + fmt(q.current) + (q.percent !== undefined ? '  ' + fmtPct(q.percent) : '') }, [
      el('span', { key: 'n', className: 'xq-badge-hint' }, q.name || q.symbol),
      el('span', { key: 'c', className: 'xq-badge-val' }, fmt(q.current)),
      el('span', { key: 'p', className: 'xq-badge-val ' + colorOf(q.percent) }, fmtPct(q.percent))
    ])
  }
  // 悬浮徽标仅保留标题与自选行情，指数网格属于面板/底部条职责。
  const bodyEls = top.length
    ? el('div', { key: 'wg', className: 'xq-wgrid' }, top.map(wItem))
    : null
  let style = ui.badgePos
    ? { left: ui.badgePos.x, top: ui.badgePos.y, right: 'auto', bottom: 'auto' }
    : null
  if (wide && !compact) {
    if (!style) { style = {} }
    style.maxWidth = effW + 'px'
    style.width = effW + 'px'
  }
  const compactButton = el('button', {
    key: 'compact', type: 'button', className: 'xq-badge-control',
    title: compact ? '展开行情徽章' : '收起为小胶囊',
    'aria-label': compact ? '展开行情徽章' : '收起为小胶囊',
    'aria-expanded': !compact,
    onPointerDown: stopBadgeControl, onPointerMove: stopBadgeControl,
    onPointerUp: stopBadgeControl, onPointerCancel: stopBadgeControl,
    onClick: function (e) { stopBadgeControl(e); ui.set({ badgeCompact: !ui.badgeCompact }) }
  }, compact ? '+' : '−')
  // 隐身：徽章自己也能关掉自己（连指数条一起），无需先展开面板。
  // 点击时顺手请求通知权限 —— 隐身后的到价提醒依赖它，而定时器里请求常被浏览器拒绝。
  const hideButton = el('button', {
    key: 'hide', type: 'button', className: 'xq-badge-control',
    title: '完全隐藏行情（面板、徽章、指数条一起关；恢复：快捷键或让 AI 打开）',
    'aria-label': '完全隐藏行情',
    onPointerDown: stopBadgeControl, onPointerMove: stopBadgeControl,
    onPointerUp: stopBadgeControl, onPointerCancel: stopBadgeControl,
    onClick: function (e) { stopBadgeControl(e); ensureAlertPermission(); ui.set({ hidden: true }) }
  }, '⊘')
  const badgeKids = [
    el('div', { key: 'hd', className: 'xq-badge-hd' }, [
      el('span', { key: 'logo' }, [el('b', { key: 'b' }, '雪球'), 'mini']),
      el('span', { key: 'st', className: 'xq-status' + (aSession() === '盘中' ? ' xq-live' : ''), title: sessionsText() }, (function () { var s = aSession(); return s === '盘中' ? '● 盘中' : (s || '休市') })()),
      el('span', { key: 'sp', className: 'xq-spacer' }),
      // 顺序是契约：[5d] 探针把「第一个 .xq-badge-control」当成折叠按钮，
      // 所以折叠(−)在前、隐身(⊘)在后 —— 视觉上也是「先收小，再藏掉」。
      compactButton,
      hideButton,
      el('span', { key: 'ct', className: 'xq-caret' }, ui.open ? '▾' : '▴')
    ])
  ]
  if (!compact) {
    badgeKids.push(bodyEls, el('span', {
      key: 'grip', className: 'xq-badge-grip', title: '拖动调宽度 · 双击复位',
      onPointerDown: onGripDown, onPointerMove: onGripMove, onPointerUp: onGripUp, onPointerCancel: onGripUp,
      onDoubleClick: onGripDblClick
    }, '⤡'))
  }
  const badgeEl = el('div', {
    ref: badgeRef,
    className: 'xq-badge' + (compact ? ' xq-badge-compact' : '') + (tight ? ' xq-tight' : '') + (tiny ? ' xq-tiny' : ''),
    style: style,
    title: compact ? '点击胶囊恢复行情列表 · 拖动调整位置' : '点击开合行情面板 · 拖动调整位置 · 右下角 ⤡ 调宽度（双击复位）',
    onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onCancel
  }, badgeKids)
  return el('div', { style: { display: 'contents' } }, [badgeEl])
}

// 嵌入式主面板（conversation.input.dock）：输入框上方一整行。
// ---------- 嵌入式主面板（conversation.input.dock）：输入框上方一整行 ----------
// DockGate 常驻挂载：负责 hydrate + 订阅 ui，open=false 或 hidden=true 时渲染 null。
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
  // hidden = 行情隐身：面板/徽章/指数条三个入口一起卸载，行情轮询随之全停（FORK-NOTES §11）。
  if (!ui.hydrated || !ui.open || ui.hidden) return null
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
  // 第一层只放全局状态与显示控制（品牌 / 交易时段 / 今日盈亏 / 隐身 / 收起）；
  // 页面导航与数据操作（tab / 账户 / 刷新）在第二层，由面板里的 .xq-nav 承担。
  const aState = aSession()
  return el('div', { className: 'xq-dock' }, [
    el('div', { key: 'head', className: 'xq-dock-head' }, [
      el('span', { key: 'logo', className: 'xq-logo' }, [el('b', { key: 'b' }, '雪球'), ' mini']),
      el('span', { key: 'st', className: 'xq-status xq-status-long' + (aState === '盘中' ? ' xq-live' : ''), title: 'A股/港股/美股交易时段（本地时区推算，不含节假日）' }, sessionsText() || '行情面板'),
      el('span', { key: 'st2', className: 'xq-status xq-status-short' + (aState === '盘中' ? ' xq-live' : ''), title: sessionsText() || '行情面板' }, aState ? ('A股' + aState) : '行情'),
      el(PnlChip, { key: 'pnl' }),
      el('span', { key: 'sp', className: 'xq-spacer' }),
      // 隐身：一个按钮把三个常驻入口一起关掉（不是收起 —— 收起只关面板，徽章和指数条还在）。
      // 顺带在用户手势里请求一次通知权限（定时器里请求常被浏览器直接拒绝），保证隐身期间到价还能提醒。
      el('button', {
        key: 'hide', className: 'xq-btn-mini', title: '完全隐藏行情：面板、徽章、指数条一起消失，行情请求随之停止（价格提醒仍然生效）。恢复：Ctrl/⌘+Alt+Shift+X（可在 设置→通用→快捷键 改键），或对 AI 说「把行情打开」',
        'aria-label': '完全隐藏行情',
        onClick: function () { ensureAlertPermission(); ui.set({ hidden: true }) }
      }, '隐身'),
      // Esc 提示挪到收起按钮的 tooltip（不再常驻占一行说明）
      el('button', { key: 'min', className: 'xq-btn-mini xq-icon-btn', title: '收起面板（Esc；点右下角徽章重新打开）', 'aria-label': '收起行情面板', onClick: function () { ui.set({ open: false }) } }, '✕')
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
// 除指数外还常驻一条「今日盈亏」：面板收起时（DockGate 直接返回 null）头部 chip 是看不到的，
// 而这条氛围行始终在，所以它是「收起面板也能看到盈亏」的唯一落点。
// 与头部 chip 共用同一个 PnlChip（也就共用同一个轮询器，见 store/positions.js 的引用计数）。

// ---------- 独占一行：宿主那条 .dock 是「不换行的 flex 行」 ----------
// 指数条注册在 conversation.composer.dock，宿主把它铺在输入框下方那条 .dock 行里
// （display:flex / 不换行 / justify-content:center），于是指数条和宿主自己的统计文字
// （"N 轮 M 步 · tok/s"、"… 缓存命中 96%"、成本插件的"本会话 ¥0…"）挤在同一行。
//
// 两个实测坑（都踩过，别再犯）：
//   1. 宿主给槽位条目外面套了一层**无 class、display:contents** 的 div。这一层自己不生成盒子
//      （getBoundingClientRect 全 0、给它设 flex-wrap 完全无效），真正的 flex 容器还要再往上一层。
//      所以不能拿 node.parentElement 当行容器，要沿父链跳过 display:contents 的透明层。
//   2. 只写「自己占满 100% 宽」而不让那一行换行，会把宿主那些可收缩的统计文字挤成 0 宽（比不改更糟）。
//      所以这里改完**当场自检**：自己必须真的落到另一行、且没有任何兄弟被挤成 0 宽，否则原样撤回。
//      撤回与改动在同一个 effect 内完成（中间强制读一次布局），浏览器不会画出中间态。
function flexRowOf(node) {
  let p = node.parentElement
  for (let i = 0; p && i < 8; i++) {
    let d = ''
    try { d = getComputedStyle(p).display || '' } catch (e) { return null }
    if (d.indexOf('flex') >= 0) return p
    if (d !== 'contents') return null   // 只跳过 display:contents 的透明层，别的祖先一律不碰
    p = p.parentElement
  }
  return null
}

// 真正的 flex 条目：行容器的子元素，遇到 display:contents 的透明层就展开它的子元素。
function flexItemsOf(row, depth) {
  const out = []
  const kids = row.children
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i]
    let d = ''
    try { d = getComputedStyle(c).display || '' } catch (e) { d = '' }
    if (d === 'contents' && depth < 3) {
      const inner = flexItemsOf(c, depth + 1)
      for (let j = 0; j < inner.length; j++) out.push(inner[j])
    } else {
      out.push(c)
    }
  }
  return out
}

function ownLine(node) {
  if (typeof getComputedStyle !== 'function' || typeof node.getBoundingClientRect !== 'function') return
  const row = flexRowOf(node)
  if (!row) return
  const prev = {
    wrap: row.style.flexWrap, align: row.style.alignSelf,
    flex: node.style.flex, order: node.style.order
  }
  function restore() {
    row.style.flexWrap = prev.wrap
    row.style.alignSelf = prev.align
    node.style.flex = prev.flex
    node.style.order = prev.order
  }
  // 自己是否已经在另一行、且没把兄弟挤没
  function settled() {
    const a = node.getBoundingClientRect()
    const items = flexItemsOf(row, 0)
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it === node) continue
      const r = it.getBoundingClientRect()
      if (r.width < 1) return false                                        // 兄弟被挤成 0 宽
      if (!(a.bottom <= r.top || r.bottom <= a.top)) return false          // 垂直有重叠 = 还在同一行
    }
    return true
  }
  function attempt(stretch) {
    row.style.flexWrap = 'wrap'          // 让这一行可以换行（宿主自己没设过 flex-wrap）
    if (stretch) {
      // 行容器是「居中收缩」的（父级是 align-items:center 的 column flex）时，宽度由内容决定，
      // 百分比 flex-basis 可能解析不出确定值而换不了行；stretch 让这一行拿到确定宽度（视觉不变，
      // 因为它的 justify-content 本来就是 center）。
      let dir = ''
      try { dir = getComputedStyle(row.parentElement).flexDirection || '' } catch (e) { dir = '' }
      if (dir.indexOf('column') === 0) row.style.alignSelf = 'stretch'
    }
    node.style.flex = '1 0 100%'         // 自己占满一整行
    node.style.order = '9'               // 排到最后：宿主原有统计行不动，指数条落到下面一行
    return settled()
  }
  if (!attempt(false) && !attempt(true)) { restore(); return }
  return restore
}

// ---------- 底部指数条（会话页，输入框下方氛围行） ----------
// 门控：水合完成前不挂载（否则刷新瞬间会先按默认参数请求一次指数），行情隐身时返回 null。
// 注意这个 null 不是「不显示」而是「不存在」—— usePnlState 的订阅也随之消失，
// 持仓/盈亏那条轮询器的 refs 归零、定时器停掉，这才是「零请求」的来源。
function Ticker() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const [, force] = React.useState(0)
  React.useEffect(function () {
    hydrateUi()
    const off = ui.subscribe(function () { force(function (x) { return x + 1 }) })
    return off
  }, [])
  if (!ui.hydrated || ui.hidden) return null
  return el(TickerBody, null)
}

function TickerBody() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const [indices, setIndices] = React.useState([])
  const pnl = usePnlState()
  const rootRef = React.useRef(null)
  // 指数行情走页面内共享运行时：与面板指数卡共用同一份数据/同一个请求，
  // 指数条不再自己 interval（改造前它与面板各刷一遍同一组指数）。
  React.useEffect(function () {
    const mkt = getMarketRuntime()
    if (!mkt) return function () { }
    function sync() { setIndices(mkt.getSnapshot(XQ_INDEX_SYMBOLS).list) }
    sync()
    return mkt.subscribe({ symbols: XQ_INDEX_SYMBOLS, intervalMs: POLL_TICKER_MS }, sync)
  }, [])
  // 指数拉不到时不再整条消失：只要盈亏还有东西可说，这一行就有意义。
  const showPnl = pnl.data !== null || pnl.status === 'loading' || pnl.status === 'error'
  const hasRow = indices.length > 0 || showPnl
  // 这一行真的挂上 DOM 之后（hasRow 由 false 变 true）才做独占一行处理；
  // 依赖 hasRow 而不是 []：首次渲染没数据时返回 null、根本没有节点可处理。
  React.useEffect(function () {
    const node = rootRef.current
    if (!node) return
    return ownLine(node)
  }, [hasRow])
  if (!hasRow) return null
  const kids = indices.map(function (q) {
    return el('span', { key: q.symbol, className: 'xq-tick' }, [
      el('span', { key: 'n', className: 'xq-tick-name' }, q.name),
      el('span', { key: 'c', className: 'xq-tick-cur ' + colorOf(q.percent) }, fmt(q.current)),
      el('span', { key: 'p', className: colorOf(q.percent) }, fmtPct(q.percent))
    ])
  })
  if (showPnl) kids.push(el(PnlChip, { key: 'pnl' }))
  return el('div', { className: 'xq-ticker', ref: rootRef, onClick: function () { ui.set({ open: true }) } }, kids)
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

// 应用级快捷键：行情「隐身」的恢复入口之一（另一个是 xueqiu_display 工具，让 AI 拨开关）。
//
// 为什么用宿主的快捷键服务而不是自己监听 keydown：
//   · 命令会出现在 设置 → 通用 → 快捷键 里 —— 用户能看见键帽、能改键，也能在撞键时自己换一个；
//   · 宿主统一处理焦点区域/输入框/弹窗的仲裁，不会在终端、输入框里误触发；
//   · 隐身之后屏幕上什么都没有，这条「看不见但要记得住」的入口必须是可发现、可改的。
//
// 降级链：shortcuts 服务不存在 → 什么都不做（仍可让 AI 打开）；
//        默认键位与既有命令冲突导致 register 抛错 → 退化为「未绑定」再注册一次，
//        命令照样出现在快捷键表里等用户指派，比彻底没有入口好。

// primary = macOS 上的 ⌘ / 其它平台的 Ctrl。三修饰键 + X：正常输入与常见全局快捷键都不会占用。
const BINDING_PROFILES = ['web:windows', 'web:macos', 'web:linux', 'desktop:windows', 'desktop:macos', 'desktop:linux']

function binding() { return { code: 'KeyX', modifiers: ['primary', 'alt', 'shift'] } }

function makeCommand(withDefaults) {
  const defaults = {}
  if (withDefaults) for (let i = 0; i < BINDING_PROFILES.length; i++) defaults[BINDING_PROFILES[i]] = binding()
  return {
    id: XQ_SHORTCUT_TOGGLE_HIDDEN,
    label: function () { return '雪球行情：显示 / 隐身' },
    aliases: ['xueqiu hidden', '雪球隐身', '行情隐身', '隐藏行情'],
    defaults: defaults,
    // editable 也要放行：用户可能正停在输入框里想「把行情关掉」，此时 region='editable'。
    regions: ['page', 'editable'],
    modals: [],
    resolve: function () {
      return { status: 'handled', run: function () { toggleUiHidden() } }
    }
  }
}

function registerCommand(shortcuts) {
  try {
    return shortcuts.register(makeCommand(true))
  } catch (e) {
    try {
      return shortcuts.register(makeCommand(false))
    } catch (e2) {
      return function () {}
    }
  }
}

function installShortcuts(ctx) {
  try {
    if (typeof ctx.inject !== 'function') return
    ctx.inject(['shortcuts'], function (scoped) {
      const shortcuts = scoped && scoped.shortcuts
      if (!shortcuts || typeof shortcuts.register !== 'function') return
      scoped.effect(function () { return registerCommand(shortcuts) })
    })
  } catch (e) { /* 宿主没有快捷键服务：隐身仍可经 xueqiu_display 工具恢复 */ }
}

// 入口：apply 薄壳（插样式 → 建运行时 → 装槽位/快捷键）+ 默认导出。
// 样式在 apply 开头只插一次；ui store / saveUi / hydratePromise / 拖拽引用等「每次 apply 一份」
// 的状态由 createUiRuntime 重建（见 store/ui.js 的运行时持有者说明）。

const xqClientPlugin = {
  inject: ['timer'],
  apply(ctx) {
    styles.insert(`
/* ============================================================================
 * dsh-market-dock 视觉基线（首轮 UI 重构）
 *
 * 约定：
 *  · 所有 token 只在插件根作用域（.xq-dock / .xq-badge / .xq-ticker / .xq-tv-shell）上声明，
 *    不改宿主全局；颜色继续取 --dsw-alias-*，--xq-* 只是别名，不另硬编码亮/暗色板。
 *  · 间距只用 4 / 8 / 12 / 16 / 24；圆角只有 10（面板）/ 8（卡片）/ 6（按钮）/ 999（胶囊）。
 *  · 字号：正文 13，次要 12，极次要 11；主表数字不低于 12。
 *  · 响应式按**插件容器宽度**判断（container query），不看 window。
 *  · 红涨绿跌语义不变；盈亏色必须用复合选择器（见 .xq-pos-chg.xq-up 等），否则会被
 *    .xq-pos-num 的后置 color 覆盖（真实事故，勿"整理"成单类）。
 * ========================================================================== */

.xq-dock, .xq-badge, .xq-ticker, .xq-restore, .xq-tv-shell {
  --xq-sp-1: 4px;
  --xq-sp-2: 8px;
  --xq-sp-3: 12px;
  --xq-sp-4: 16px;
  --xq-sp-5: 24px;
  --xq-fs: 13px;
  --xq-fs-sm: 12px;
  --xq-fs-xs: 11px;
  --xq-fw-semi: 600;
  --xq-r-panel: 10px;
  --xq-r-card: 8px;
  --xq-r-btn: 6px;
  /* 浅色主题里 bg-layer-1/2/3 是**同一个白**、border-l1 只有 4% 黑（实测取值），
     直接拿它们当「卡片面 / 分隔线」会让层级整体消失：面板、表头、指数卡全糊成一片白。
     所以次级面与描边按 label-primary 的透明度派生 —— 深色主题里两者也成立（无需两套色板）。 */
  --xq-line: color-mix(in srgb, var(--dsw-alias-label-primary) 14%, transparent);
  --xq-line-weak: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);
  --xq-text: var(--dsw-alias-label-primary);
  --xq-text-2: var(--dsw-alias-label-secondary);
  --xq-text-3: var(--dsw-alias-label-tertiary);
  --xq-bg: var(--dsw-alias-bg-layer-1);
  --xq-bg-2: color-mix(in srgb, var(--dsw-alias-label-primary) 5%, var(--dsw-alias-bg-layer-1));
  --xq-brand: var(--dsw-alias-brand-primary);
  --xq-up: var(--dsw-alias-state-error-primary);
  --xq-down: var(--dsw-alias-state-success-primary);
  --xq-warn: var(--dsw-alias-state-warn-primary);
  --xq-t: 120ms ease;
}

/* 等宽数字：所有价格/金额/百分比列 */
.xq-dock, .xq-badge, .xq-ticker { font-variant-numeric: tabular-nums; }

.xq-up { color: var(--dsw-alias-state-error-primary); }
.xq-down { color: var(--dsw-alias-state-success-primary); }
.xq-flat { color: var(--dsw-alias-label-secondary); }

/* ============================================================================
 * 工具结果卡片（tool.call.toolview）
 * ========================================================================== */
.xq-tv-shell {
  border: 1px solid var(--xq-line);
  border-radius: var(--xq-r-panel);
  padding: var(--xq-sp-2) var(--xq-sp-3);
  margin: 4px 0;
  font-size: var(--xq-fs);
  line-height: 1.5;
  color: var(--xq-text);
  background: var(--xq-bg);
  min-width: 0;
}
.xq-tv-head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
.xq-tv-title { font-weight: var(--xq-fw-semi); }
.xq-tv-pill { font-size: var(--xq-fs-xs); padding: 1px 8px; border-radius: 999px; background: var(--xq-bg-2); color: var(--xq-text-2); white-space: nowrap; }
.xq-tv-table { display: flex; flex-direction: column; gap: 2px; }
.xq-tv-row { display: flex; align-items: baseline; gap: 10px; padding: 3px 4px; border-radius: var(--xq-r-btn); }
.xq-tv-row:hover { background: var(--xq-bg-2); }
.xq-tv-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.xq-tv-code { color: var(--xq-text-3); font-size: var(--xq-fs-xs); }
.xq-tv-price { font-weight: var(--xq-fw-semi); font-variant-numeric: tabular-nums; }
.xq-tv-pct { font-variant-numeric: tabular-nums; font-weight: var(--xq-fw-semi); white-space: nowrap; }
.xq-tv-shell svg { max-width: 100%; height: auto; display: block; }
.xq-tv-rank { width: 22px; flex: none; text-align: right; font-variant-numeric: tabular-nums; color: var(--xq-text-3); font-size: var(--xq-fs-sm); }
.xq-tv-rankup { color: var(--dsw-alias-state-error-primary); font-size: var(--xq-fs-xs); flex: none; font-variant-numeric: tabular-nums; }
.xq-tv-rankdn { color: var(--dsw-alias-state-success-primary); font-size: var(--xq-fs-xs); flex: none; font-variant-numeric: tabular-nums; }
.xq-tv-news { display: flex; flex-direction: column; gap: 2px; max-height: 300px; overflow-y: auto; }
.xq-tv-item { display: flex; gap: var(--xq-sp-2); align-items: baseline; padding: 3px 4px; border-radius: var(--xq-r-btn); }
.xq-tv-item:hover { background: var(--xq-bg-2); }
.xq-tv-mark { background: var(--xq-bg-2); }
.xq-tv-time { flex: none; font-size: var(--xq-fs-xs); color: var(--xq-text-3); font-variant-numeric: tabular-nums; }
.xq-tv-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.xq-tv-flag { color: var(--dsw-alias-state-error-primary); font-weight: 700; }

/* ============================================================================
 * 面板容器 + 头部（第一层：全局状态与显示控制）
 * ========================================================================== */
.xq-dock {
  background: var(--xq-bg);
  border: 1px solid var(--xq-line);
  border-radius: var(--xq-r-panel);
  overflow: hidden;
  font-size: var(--xq-fs);
  line-height: 1.5;
  color: var(--xq-text);
  margin-bottom: 6px;
  container-type: inline-size;
  container-name: xqdock;
}
.xq-dock * { box-sizing: border-box; }
.xq-dock-head {
  display: flex;
  align-items: center;
  gap: var(--xq-sp-2);
  padding: 7px var(--xq-sp-3);
  border-bottom: 1px solid var(--xq-line);
  min-height: 38px;
}
.xq-dock-body {
  height: 52vh;
  max-height: 80vh;
  padding: var(--xq-sp-3) var(--xq-sp-4);
  overflow-y: auto;
  container-type: inline-size;
  container-name: xqbody;
}
.xq-dock-resize { display: flex; align-items: center; justify-content: center; height: 10px; cursor: ns-resize; user-select: none; border-top: 1px solid var(--xq-line-weak); }
.xq-dock-resize span { display: block; width: 36px; height: 3px; border-radius: 2px; background: var(--dsw-alias-border-l2); }
.xq-dock-resize:hover span { background: var(--xq-text-3); }

.xq-logo { font-weight: 700; font-size: 14px; letter-spacing: .4px; white-space: nowrap; }
.xq-logo b { color: var(--xq-brand); }
.xq-status {
  font-size: var(--xq-fs-xs);
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--xq-bg-2);
  color: var(--xq-text-2);
  white-space: nowrap;
  max-width: 46vw;
  overflow: hidden;
  text-overflow: ellipsis;
}
.xq-status.xq-live { color: var(--xq-up); }
/* 窄容器只留短状态，完整交易时段文案靠 tooltip（不把长说明压成两行） */
.xq-status-short { display: none; }
.xq-spacer { flex: 1 1 auto; min-width: 0; }
.xq-update { font-size: var(--xq-fs-xs); color: var(--xq-text-3); white-space: nowrap; }

/* ============================================================================
 * 按钮：主操作 30–32px 高；行内图标操作 ≥28×28
 * ========================================================================== */
.xq-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 30px;
  padding: 0 var(--xq-sp-3);
  font: inherit;
  font-size: var(--xq-fs-sm);
  border-radius: var(--xq-r-btn);
  border: 1px solid var(--xq-line);
  background: var(--xq-bg-2);
  color: var(--xq-text);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color var(--xq-t), background var(--xq-t), color var(--xq-t);
}
.xq-btn:hover:not(:disabled) { border-color: var(--xq-brand); }
.xq-btn:disabled { opacity: .5; cursor: default; }
/* 主操作：跟随宿主的实心主色（浅色主题下 brand 是近黑，不是蓝），文字用对照色 */
.xq-btn-primary {
  background: var(--dsw-alias-button-primary-fill, var(--xq-brand));
  border-color: var(--dsw-alias-button-primary-fill, var(--xq-brand));
  color: var(--dsw-alias-label-primary-foreground, var(--xq-bg));
  font-weight: var(--xq-fw-semi);
}
.xq-btn-primary:hover:not(:disabled) { border-color: var(--dsw-alias-button-primary-hover, var(--xq-brand)); filter: brightness(1.06); }
.xq-btn-quiet { background: transparent; border-color: transparent; color: var(--xq-text-2); }
.xq-btn-quiet:hover:not(:disabled) { background: var(--xq-bg-2); border-color: transparent; color: var(--xq-text); }
.xq-btn-mini {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 28px;
  padding: 0 var(--xq-sp-2);
  font: inherit;
  font-size: var(--xq-fs-xs);
  border-radius: var(--xq-r-btn);
  border: 1px solid var(--xq-line-weak);
  background: transparent;
  color: var(--xq-text-2);
  cursor: pointer;
  white-space: nowrap;
  line-height: 1.4;
  transition: color var(--xq-t), border-color var(--xq-t), background var(--xq-t);
}
.xq-btn-mini:hover:not(:disabled) { color: var(--xq-text); border-color: var(--xq-line); background: var(--xq-bg-2); }
.xq-btn-mini:disabled { opacity: .5; cursor: default; }
.xq-icon-btn { width: 28px; min-width: 28px; padding: 0; }
.xq-btn:focus-visible, .xq-btn-mini:focus-visible, .xq-tab:focus-visible, .xq-badge-control:focus-visible,
.xq-pos-name-btn:focus-visible, .xq-idx-card:focus-visible, .xq-menu-item:focus-visible, .xq-restore:focus-visible,
.xq-sort-h:focus-visible { outline: 2px solid var(--xq-brand); outline-offset: 1px; }

/* ============================================================================
 * 第二层：页面导航（tab + 账户 + 刷新）
 * ========================================================================== */
.xq-nav { display: flex; align-items: center; gap: var(--xq-sp-2); margin-bottom: var(--xq-sp-3); border-bottom: 1px solid var(--xq-line); }
.xq-tabs { display: flex; align-items: center; gap: 2px; min-width: 0; overflow-x: auto; scrollbar-width: none; }
.xq-tabs::-webkit-scrollbar { display: none; }
.xq-tab {
  font: inherit;
  font-size: var(--xq-fs);
  padding: 7px 10px;
  border: none;
  background: none;
  color: var(--xq-text-2);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: color var(--xq-t), border-color var(--xq-t);
}
.xq-tab:hover { color: var(--xq-text); }
.xq-tab-active { color: var(--xq-brand); border-bottom-color: var(--xq-brand); font-weight: var(--xq-fw-semi); }
.xq-nav-actions { display: flex; align-items: center; gap: 6px; flex: none; padding-bottom: 3px; }
.xq-acc-btn { font-size: var(--xq-fs-sm); }
.xq-acc-btn.xq-acc-on { border-color: color-mix(in srgb, var(--xq-brand) 45%, transparent); color: var(--xq-brand); }
.xq-acc-mark { font-size: 10px; color: var(--xq-text-3); }
.xq-acc-icon { width: 13px; height: 13px; flex: none; }

/* ============================================================================
 * 指数卡：名称次级 / 现价主要 / 涨跌幅次主要；小容器 2×2
 * ========================================================================== */
.xq-idx { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--xq-sp-2); margin-bottom: var(--xq-sp-3); }
.xq-idx-card {
  min-width: 0;
  background: var(--xq-bg-2);
  border: 1px solid var(--xq-line-weak);
  border-radius: var(--xq-r-card);
  padding: var(--xq-sp-2) 10px;
  cursor: pointer;
  transition: border-color var(--xq-t), background var(--xq-t);
}
.xq-idx-card:hover { border-color: var(--xq-brand); }
.xq-idx-name { font-size: var(--xq-fs-xs); color: var(--xq-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.xq-idx-row { display: flex; align-items: baseline; gap: 6px; margin-top: 2px; flex-wrap: wrap; }
.xq-idx-cur { font-size: 15px; font-weight: var(--xq-fw-semi); font-variant-numeric: tabular-nums; }
.xq-idx-pct { font-size: var(--xq-fs-xs); }

/* 涨跌幅色块（胶囊） */
.xq-pct-chip { display: inline-block; min-width: 52px; text-align: center; padding: 1px 6px; border-radius: 999px; font-size: var(--xq-fs-xs); font-weight: var(--xq-fw-semi); }
.xq-pct-chip.xq-up { background: color-mix(in srgb, var(--xq-up) 12%, transparent); }
.xq-pct-chip.xq-down { background: color-mix(in srgb, var(--xq-down) 12%, transparent); }
.xq-pct-chip.xq-flat { background: var(--xq-bg-2); }
.xq-idx-pct.xq-pct-chip { min-width: 46px; padding: 0 5px; }

/* ============================================================================
 * 行情表（行情 tab）：一行一标的，数值右对齐；窄容器整块横向滚动
 * ========================================================================== */
.xq-grid {
  border: 1px solid var(--xq-line);
  border-radius: var(--xq-r-card);
  overflow: hidden;
  margin-bottom: var(--xq-sp-2);
}
.xq-grid-hd, .xq-grid-row {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) 92px 92px 96px 96px;
  align-items: center;
  gap: var(--xq-sp-2);
  padding: 0 var(--xq-sp-3);
}
.xq-grid-hd {
  font-size: var(--xq-fs-xs);
  color: var(--xq-text-2);
  background: var(--xq-bg-2);
  position: sticky;
  top: 0;
  z-index: 2;
  height: 30px;
}
.xq-grid-row { min-height: 46px; border-top: 1px solid var(--xq-line-weak); cursor: pointer; font-size: var(--xq-fs); transition: background var(--xq-t); }
.xq-grid-row:hover { background: var(--xq-bg-2); }
.xq-grid-row > div:nth-child(n+2) { text-align: right; }
.xq-sort-h { cursor: pointer; user-select: none; white-space: nowrap; text-align: right; }
.xq-sort-h:hover { color: var(--xq-text); }
.xq-sort-on { color: var(--xq-text); font-weight: var(--xq-fw-semi); }
.xq-name { font-weight: var(--xq-fw-semi); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.xq-row-name-btn {
  display: block;
  max-width: 100%;
  padding: 0;
  font: inherit;
  font-weight: var(--xq-fw-semi);
  text-align: left;
  color: inherit;
  background: none;
  border: none;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.xq-row-name-btn:hover { color: var(--xq-brand); }
.xq-sub { font-size: var(--xq-fs-xs); color: var(--xq-text-3); font-variant-numeric: tabular-nums; }
.xq-muted { font-size: var(--xq-fs-sm); color: var(--xq-text-3); }
.xq-actions { display: flex; gap: 4px; justify-content: flex-end; align-items: center; }
.xq-alert-editor {
  display: flex;
  align-items: center;
  gap: var(--xq-sp-2);
  flex-wrap: wrap;
  padding: var(--xq-sp-2) var(--xq-sp-3);
  border-top: 1px solid var(--xq-line-weak);
  background: color-mix(in srgb, var(--xq-bg-2) 70%, transparent);
  grid-column: 1 / -1;
}
.xq-alert-editor-label { font-size: var(--xq-fs-xs); color: var(--xq-text-2); }
.xq-alert-dir, .xq-alert-target {
  font: inherit;
  font-size: var(--xq-fs-sm);
  height: 28px;
  border: 1px solid var(--xq-line);
  border-radius: var(--xq-r-btn);
  background: var(--xq-bg);
  color: var(--xq-text);
  padding: 0 6px;
}
.xq-alert-dir { width: 52px; }
.xq-alert-target { width: 92px; }
.xq-alert-status { display: inline-flex; align-items: center; gap: 4px; font-size: var(--xq-fs-xs); color: var(--xq-text-2); }
.xq-alert-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--xq-warn); flex: none; }
.xq-bell-on { color: var(--xq-warn); border-color: color-mix(in srgb, var(--xq-warn) 45%, var(--xq-line)); }

/* 更多菜单（行内） */
.xq-menu-wrap { position: relative; display: inline-flex; }
.xq-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  z-index: 20;
  min-width: 120px;
  padding: 4px;
  border-radius: var(--xq-r-card);
  border: 1px solid var(--xq-line);
  background: var(--xq-bg);
  box-shadow: 0 6px 18px rgba(0, 0, 0, .18);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
/* 下方空间不够（最后一行/表格底部）时向上展开：表格的 overflow 与面板滚动区都会裁剪
   绝对定位的子元素，翻上去才不会被切掉（落点由 client/menu.js 量出来的）。 */
.xq-menu.xq-menu-up { top: auto; bottom: calc(100% + 4px); }
.xq-menu-item {
  font: inherit;
  font-size: var(--xq-fs-sm);
  text-align: left;
  padding: 6px var(--xq-sp-2);
  min-height: 28px;
  border: none;
  border-radius: var(--xq-r-btn);
  background: none;
  color: var(--xq-text);
  cursor: pointer;
  white-space: nowrap;
}
.xq-menu-item:hover { background: var(--xq-bg-2); }
.xq-menu-item.xq-danger { color: var(--xq-warn); }
.xq-menu-sep { height: 1px; background: var(--xq-line-weak); margin: 2px 0; }

/* 提示 / 空态 / 错误 */
.xq-err {
  font-size: var(--xq-fs-sm);
  color: var(--xq-warn);
  background: color-mix(in srgb, var(--xq-warn) 10%, var(--xq-bg));
  border: 1px solid color-mix(in srgb, var(--xq-warn) 32%, var(--xq-line));
  border-radius: var(--xq-r-btn);
  padding: 6px 10px;
  margin-bottom: var(--xq-sp-2);
}
.xq-alert-notice {
  font-size: var(--xq-fs-sm);
  color: var(--xq-text);
  background: color-mix(in srgb, var(--xq-warn) 12%, var(--xq-bg));
  border: 1px solid color-mix(in srgb, var(--xq-warn) 45%, var(--xq-line));
  border-radius: var(--xq-r-card);
  padding: 8px 10px;
  margin-bottom: var(--xq-sp-2);
}
.xq-alert-notice > strong { font-size: var(--xq-fs-sm); }
.xq-alert-event { display: flex; align-items: center; gap: var(--xq-sp-2); margin-top: 6px; }
.xq-alert-event > span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.xq-loading { font-size: var(--xq-fs-sm); color: var(--xq-text-3); padding: var(--xq-sp-4) 0; text-align: center; }

/* 输入 / 分段控件 */
.xq-input {
  font: inherit;
  font-size: var(--xq-fs);
  min-height: 30px;
  padding: 0 10px;
  border-radius: var(--xq-r-btn);
  border: 1px solid var(--xq-line);
  background: var(--xq-bg-2);
  color: var(--xq-text);
}
.xq-input:focus { outline: none; border-color: var(--xq-brand); }
.xq-search-row { display: flex; gap: 6px; margin-bottom: var(--xq-sp-2); }
.xq-search-row .xq-input { flex: 1; min-width: 0; }
.xq-seg { display: inline-flex; gap: 2px; border: 1px solid var(--xq-line); border-radius: var(--xq-r-btn); padding: 2px; }
.xq-seg button { font: inherit; font-size: var(--xq-fs-sm); border: none; background: none; color: var(--xq-text-2); padding: 4px 10px; border-radius: 5px; cursor: pointer; }
.xq-seg button.xq-seg-on { background: var(--xq-bg-2); color: var(--xq-text); font-weight: var(--xq-fw-semi); }

/* 价格闪烁（沿用既有逻辑，只调时长） */
@keyframes xq-flash-up { 0% { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 18%, transparent); } 100% { background: transparent; } }
@keyframes xq-flash-down { 0% { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 18%, transparent); } 100% { background: transparent; } }
.xq-flash-up { animation: xq-flash-up .8s ease-out; }
.xq-flash-down { animation: xq-flash-down .8s ease-out; }
@keyframes xq-fade-in { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: none; } }
.xq-view { animation: xq-fade-in .15s ease-out; }
@keyframes xq-spin { to { transform: rotate(360deg); } }
.xq-refresh-spin { display: inline-block; animation: xq-spin .8s linear infinite; }

/* ============================================================================
 * 持仓页（本轮视觉重点）
 * ========================================================================== */
.xq-pos-hero {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)) minmax(180px, auto);
  gap: var(--xq-sp-4);
  align-items: end;
  padding-bottom: var(--xq-sp-3);
  margin-bottom: var(--xq-sp-3);
  border-bottom: 1px solid var(--xq-line);
}
.xq-pos-hero-main { min-width: 0; }
.xq-pos-hero-k { font-size: var(--xq-fs-sm); color: var(--xq-text-2); margin-bottom: 4px; }
.xq-pos-hero-amt { font-size: 23px; font-weight: var(--xq-fw-semi); line-height: 1.15; font-variant-numeric: tabular-nums; white-space: nowrap; }
.xq-pos-hero-pct { font-size: var(--xq-fs); font-weight: var(--xq-fw-semi); margin-left: 6px; white-space: nowrap; }
.xq-pos-hero-aux { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; text-align: right; min-width: 0; }
.xq-pos-hero-aux .xq-pos-aux-k { font-size: var(--xq-fs-xs); color: var(--xq-text-3); }
.xq-pos-hero-aux .xq-pos-aux-v { font-size: var(--xq-fs); color: var(--xq-text); font-variant-numeric: tabular-nums; white-space: nowrap; }

.xq-pos-head { display: flex; align-items: center; gap: var(--xq-sp-2); margin-bottom: var(--xq-sp-2); flex-wrap: wrap; }
.xq-pos-title { font-size: var(--xq-fs-sm); color: var(--xq-text-2); font-variant-numeric: tabular-nums; }
.xq-pos-head .xq-spacer { flex: 1 1 auto; }
.xq-pos-stale { font-size: 10px; padding: 1px 7px; border-radius: 999px; background: color-mix(in srgb, var(--xq-warn) 16%, transparent); color: var(--xq-warn); white-space: nowrap; }

/* 8 列：名称/代码 · 股数 · 成本价 · 现价 · 当日盈亏 · 市值 · 持仓盈亏 · 操作
   名称列吸收宽屏多余空间，数值列保持紧凑；窄于最小宽度时只有表格区域横向滚动。 */
.xq-pos-table {
  border: 1px solid var(--xq-line);
  border-radius: var(--xq-r-card);
  overflow-x: auto;
  overflow-y: visible;
  margin-bottom: var(--xq-sp-2);
  scrollbar-width: thin;
}
.xq-pos-grid {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) 76px 84px 84px 128px 108px 128px 72px;
  gap: var(--xq-sp-2);
  align-items: center;
  padding: 0 var(--xq-sp-3);
  min-width: 720px;
}
.xq-pos-hd {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--xq-bg-2);
  font-size: var(--xq-fs-xs);
  color: var(--xq-text-2);
  height: 30px;
}
/* 宽容器不需要横向滚动：让表格不成为滚动容器，表头才能真正吸顶到面板滚动区。
   窄容器保留局部横向滚动（此时吸顶退化为无效，但列不会被藏起来）。 */
@container xqbody (min-width: 900px) {
  .xq-pos-table { overflow: visible; }
}
.xq-pos-row { min-height: 50px; border-top: 1px solid var(--xq-line-weak); font-size: var(--xq-fs); transition: background var(--xq-t); }
.xq-pos-row:hover { background: var(--xq-bg-2); }
.xq-pos-r { text-align: right; }
.xq-pos-cell { display: flex; flex-direction: column; align-items: flex-end; min-width: 0; }
.xq-pos-chg { text-align: right; }
/* 数值单元格声明了 color —— 涨跌色必须用复合选择器（优先级更高），否则会被下面的默认色盖掉。 */
.xq-pos-num { font-variant-numeric: tabular-nums; font-size: var(--xq-fs); color: var(--xq-text); white-space: nowrap; }
.xq-pos-chg.xq-up { color: var(--dsw-alias-state-error-primary); }
.xq-pos-chg.xq-down { color: var(--dsw-alias-state-success-primary); }
.xq-pos-chg.xq-flat { color: var(--dsw-alias-label-secondary); }
.xq-pos-amt { font-weight: var(--xq-fw-semi); }
.xq-pos-rate { display: block; font-size: var(--xq-fs-xs); opacity: .85; }
.xq-pos-name { display: flex; flex-direction: column; min-width: 0; overflow: hidden; line-height: 1.35; }
.xq-pos-nm { display: block; width: 100%; font-size: var(--xq-fs); font-weight: var(--xq-fw-semi); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.xq-pos-code { display: block; width: 100%; font-size: var(--xq-fs-sm); color: var(--xq-text-3); font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.xq-pos-days { font-size: 10px; color: var(--xq-warn); }
.xq-pos-cost { color: var(--xq-text); }
.xq-pos-cleared { opacity: .65; }
.xq-pos-cleared:hover { opacity: 1; }
.xq-pos-ops { display: flex; gap: 4px; justify-content: flex-end; white-space: nowrap; }
.xq-pos-hint { font-size: var(--xq-fs-xs); color: var(--xq-warn); line-height: 1.6; }

/* 新增 / 编辑表单（按列对齐标签） */
.xq-pos-form {
  border: 1px solid var(--xq-line);
  border-radius: var(--xq-r-card);
  padding: var(--xq-sp-3);
  margin-bottom: var(--xq-sp-2);
  background: var(--xq-bg-2);
}
.xq-pos-form-hd { font-size: var(--xq-fs-sm); font-weight: var(--xq-fw-semi); color: var(--xq-text); margin-bottom: var(--xq-sp-2); }
.xq-pos-form-row { display: grid; grid-template-columns: 140px minmax(140px, 1fr) 120px 120px; gap: var(--xq-sp-2); align-items: end; }
.xq-pos-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.xq-pos-field-k { font-size: var(--xq-fs-xs); color: var(--xq-text-2); }
.xq-pos-input {
  width: 100%;
  font: inherit;
  font-size: var(--xq-fs);
  min-height: 30px;
  padding: 0 var(--xq-sp-2);
  border-radius: var(--xq-r-btn);
  border: 1px solid var(--xq-line);
  background: var(--xq-bg);
  color: var(--xq-text);
  font-variant-numeric: tabular-nums;
}
.xq-pos-input:focus { outline: none; border-color: var(--xq-brand); }
.xq-pos-form-btns { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: var(--xq-sp-3); }

/* 同步区（按需展开，不默认暴露 Cookie/组合） */
.xq-pos-sync {
  border: 1px solid var(--xq-line);
  border-radius: var(--xq-r-card);
  padding: var(--xq-sp-3);
  margin-bottom: var(--xq-sp-2);
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: color-mix(in srgb, var(--xq-bg-2) 60%, transparent);
}
.xq-pos-notes { display: flex; flex-direction: column; gap: 6px; }
/* 口径说明：默认一行摘要，展开看完整说明（触屏/键盘都能读，不藏在 tooltip） */
.xq-pos-notes-details { display: flex; flex-direction: column; gap: 4px; }
.xq-pos-notes-details > summary { cursor: pointer; list-style: none; width: fit-content; }
.xq-pos-notes-details > summary::-webkit-details-marker { display: none; }
.xq-pos-notes-details > summary::before { content: "▸ "; }
.xq-pos-notes-details[open] > summary::before { content: "▾ "; }
.xq-pos-notes-details > summary:hover { color: var(--xq-text); }

/* ============================================================================
 * 盈亏页（独立 tab，不合并进持仓）
 * ========================================================================== */
.xq-pnl { display: flex; flex-direction: column; gap: var(--xq-sp-3); max-width: 640px; }
.xq-pnl-hero { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; padding-bottom: var(--xq-sp-3); border-bottom: 1px solid var(--xq-line); }
.xq-pnl-amt { font-size: 24px; font-weight: var(--xq-fw-semi); line-height: 1.1; font-variant-numeric: tabular-nums; }
.xq-pnl-pct { font-size: var(--xq-fs); font-weight: var(--xq-fw-semi); font-variant-numeric: tabular-nums; }
.xq-pnl-up { color: var(--dsw-alias-state-error-primary); }
.xq-pnl-down { color: var(--dsw-alias-state-success-primary); }
.xq-pnl-dim { color: var(--xq-text-2); }
.xq-pnl-ok { color: var(--dsw-alias-state-success-primary); }
.xq-pnl-bad { color: var(--xq-warn); }
.xq-pnl-meta { font-size: var(--xq-fs-xs); color: var(--xq-text-2); font-variant-numeric: tabular-nums; }
.xq-pnl-block { display: flex; flex-direction: column; gap: 6px; }
.xq-pnl-sec { font-size: var(--xq-fs-sm); font-weight: var(--xq-fw-semi); display: flex; align-items: center; gap: 6px; }
.xq-pnl-field { display: flex; align-items: center; gap: var(--xq-sp-2); flex-wrap: wrap; }
.xq-pnl-field label { font-size: var(--xq-fs-sm); color: var(--xq-text-2); flex: none; }
.xq-pnl-sel {
  font: inherit;
  font-size: var(--xq-fs-sm);
  min-height: 30px;
  padding: 0 var(--xq-sp-2);
  border-radius: var(--xq-r-btn);
  border: 1px solid var(--xq-line);
  background: var(--xq-bg-2);
  color: var(--xq-text);
  max-width: 100%;
}
.xq-pnl-num {
  font: inherit;
  font-size: var(--xq-fs-sm);
  width: 96px;
  min-height: 30px;
  padding: 0 var(--xq-sp-2);
  border-radius: var(--xq-r-btn);
  border: 1px solid var(--xq-line);
  background: var(--xq-bg-2);
  color: var(--xq-text);
  font-variant-numeric: tabular-nums;
}
.xq-pnl-num:focus, .xq-pnl-sel:focus { outline: none; border-color: var(--xq-brand); }
.xq-pnl-ta {
  font-family: ui-monospace, Menlo, monospace;
  font-size: var(--xq-fs-sm);
  width: 100%;
  min-height: 64px;
  resize: vertical;
  padding: 6px var(--xq-sp-2);
  border-radius: var(--xq-r-btn);
  border: 1px solid var(--xq-line);
  background: var(--xq-bg-2);
  color: var(--xq-text);
}
.xq-pnl-ta:focus { outline: none; border-color: var(--xq-brand); }
.xq-pnl-note { font-size: var(--xq-fs-xs); color: var(--xq-text-3); line-height: 1.65; }
.xq-pnl-sub { font-size: var(--xq-fs-xs); line-height: 1.6; color: var(--xq-text-2); }
.xq-pnl-sub.xq-pnl-bad { color: var(--xq-warn); }
.xq-pnl-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.xq-pnl-msg { font-size: var(--xq-fs-sm); display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

/* 头部常驻盈亏 chip（面板头 / 指数条共用） */
.xq-pnl-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-size: var(--xq-fs-xs);
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--xq-bg-2);
  color: var(--xq-text-2);
  white-space: nowrap;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
  transition: color var(--xq-t);
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.xq-pnl-chip:hover { color: var(--xq-text); }
.xq-pnl-chip.xq-pnl-up { color: var(--dsw-alias-state-error-primary); font-weight: var(--xq-fw-semi); }
.xq-pnl-chip.xq-pnl-down { color: var(--dsw-alias-state-success-primary); font-weight: var(--xq-fw-semi); }
.xq-pnl-chip.xq-pnl-bad { color: var(--xq-warn); }
.xq-pnl-tag { font-size: 10px; color: var(--xq-text-3); font-weight: 400; }

/* 持仓统计（旧结构：四格；新结构改用 .xq-pos-hero，保留类名兼容） */
.xq-pos-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--xq-sp-2); margin-bottom: var(--xq-sp-2); }
.xq-stat { background: color-mix(in srgb, var(--xq-bg-2) 55%, transparent); border: 1px solid var(--xq-line-weak); border-radius: var(--xq-r-card); padding: 6px 10px; min-width: 0; }
.xq-stat-k { font-size: var(--xq-fs-xs); color: var(--xq-text-3); margin-bottom: 3px; }
.xq-stat-v { font-size: var(--xq-fs); font-weight: var(--xq-fw-semi); font-variant-numeric: tabular-nums; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ============================================================================
 * 快讯 / 热榜 / 搜索 / 详情 / 登录
 * ========================================================================== */
.xq-news { display: flex; flex-direction: column; gap: 2px; max-height: 380px; overflow-y: auto; }
.xq-news-tl { position: relative; padding-left: 0; }
.xq-news-group { font-size: var(--xq-fs-xs); color: var(--xq-text-3); margin: 10px 0 4px; display: flex; align-items: center; gap: 6px; }
.xq-news-group::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-border-l2); flex: none; }
.xq-news-item { font-size: var(--xq-fs); padding: 8px 0; border-bottom: 1px solid var(--xq-line-weak); display: flex; gap: var(--xq-sp-3); align-items: flex-start; }
.xq-news-item:last-child { border-bottom: none; }
.xq-news-item > div:first-child { flex: 1; min-width: 0; line-height: 1.6; }
.xq-news-item.xq-important { border-left: 2px solid var(--xq-warn); padding-left: var(--xq-sp-2); }
.xq-news-text { min-width: 0; flex: 1; line-height: 1.6; }
.xq-news-time { font-size: var(--xq-fs-xs); color: var(--xq-text-3); flex: none; font-variant-numeric: tabular-nums; white-space: nowrap; padding-top: 2px; }
.xq-news-more { font-size: var(--xq-fs-sm); color: var(--xq-text-2); text-align: center; padding: 8px 0 2px; cursor: pointer; user-select: none; }
.xq-news-more:hover { color: var(--xq-text); }

.xq-hot-row { display: flex; align-items: center; gap: var(--xq-sp-2); padding: 0 var(--xq-sp-2); min-height: 40px; border-bottom: 1px solid var(--xq-line-weak); cursor: pointer; font-size: var(--xq-fs); }
.xq-hot-row:last-child { border-bottom: none; }
.xq-hot-row:hover { background: var(--xq-bg-2); }
.xq-rank { font-size: var(--xq-fs-sm); width: 20px; text-align: right; color: var(--xq-text-3); font-variant-numeric: tabular-nums; flex: none; }

/* 详情：报价主视觉 + 统计格 + 图表占主要面积 */
.xq-detail-head { display: flex; align-items: baseline; gap: var(--xq-sp-3); margin-bottom: var(--xq-sp-3); flex-wrap: wrap; padding-bottom: var(--xq-sp-2); border-bottom: 1px solid var(--xq-line); }
.xq-detail-name { font-size: 16px; font-weight: var(--xq-fw-semi); }
.xq-detail-code { font-size: var(--xq-fs-sm); color: var(--xq-text-3); }
.xq-detail-price { display: flex; align-items: baseline; gap: 10px; }
.xq-detail-delta { display: flex; align-items: baseline; gap: 6px; }
.xq-detail-cur { font-size: 26px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
.xq-detail-chg { font-size: var(--xq-fs); font-weight: var(--xq-fw-semi); font-variant-numeric: tabular-nums; }
.xq-detail-pct { font-size: var(--xq-fs); font-weight: var(--xq-fw-semi); font-variant-numeric: tabular-nums; }
.xq-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--xq-sp-2); margin-bottom: var(--xq-sp-3); }
.xq-card { background: var(--xq-bg); border: 1px solid var(--xq-line-weak); border-radius: var(--xq-r-card); padding: var(--xq-sp-3); margin-bottom: var(--xq-sp-3); }
.xq-card-t { font-size: var(--xq-fs-sm); font-weight: var(--xq-fw-semi); margin-bottom: var(--xq-sp-2); display: flex; align-items: center; gap: var(--xq-sp-2); flex-wrap: wrap; }
.xq-card-t::before { content: ""; width: 2px; height: 12px; border-radius: 1px; background: var(--xq-brand); flex: none; }
.xq-periods { display: inline-flex; flex-wrap: wrap; gap: 2px; border: 1px solid var(--xq-line); border-radius: var(--xq-r-btn); padding: 2px; background: var(--xq-bg-2); }
.xq-periods button, .xq-modes button { font: inherit; font-size: var(--xq-fs-sm); border: none; background: none; color: var(--xq-text-2); padding: 4px 9px; border-radius: 5px; cursor: pointer; transition: color var(--xq-t), background var(--xq-t); }
.xq-periods button:hover, .xq-modes button:hover { color: var(--xq-text); }
.xq-periods button.xq-on, .xq-modes button.xq-on { background: color-mix(in srgb, var(--xq-brand) 16%, transparent); color: var(--xq-brand); font-weight: var(--xq-fw-semi); }
.xq-chart { width: 100%; height: auto; display: block; }
.xq-chart-pan { cursor: crosshair; touch-action: none; }
.xq-chart-pan:active { cursor: grabbing; }
.xq-chart-wrap { position: relative; }
.xq-tip { position: absolute; top: 4px; z-index: 5; pointer-events: none; background: var(--dsw-alias-bg-overlay); border: 1px solid var(--xq-line); border-radius: var(--xq-r-btn); padding: 4px var(--xq-sp-2); font-size: var(--xq-fs-xs); line-height: 1.6; color: var(--xq-text); box-shadow: 0 4px 14px rgba(0, 0, 0, .22); white-space: nowrap; }
.xq-tip-d { font-weight: var(--xq-fw-semi); }
.xq-tip-r { display: flex; gap: var(--xq-sp-2); }
.xq-tip-k { color: var(--xq-text-2); }
.xq-chart-labels { display: flex; justify-content: space-between; font-size: var(--xq-fs-xs); color: var(--xq-text-3); margin-top: 3px; }
.xq-ma-legend { display: flex; gap: 10px; font-size: var(--xq-fs-xs); color: var(--xq-text-2); }
.xq-klc { height: 300px; width: 100%; min-width: 0; cursor: grab; }
.xq-klc.xq-dragging { cursor: grabbing; }
.xq-klc-min { height: 230px; }
.xq-kol { display: flex; flex-wrap: wrap; gap: 6px; }
.xq-kol-chip { font-size: var(--xq-fs-sm); padding: 4px 10px; border-radius: 999px; border: 1px solid var(--xq-line); background: var(--xq-bg); cursor: pointer; }
.xq-kol-chip:hover { border-color: var(--xq-brand); }
.xq-verif { font-size: 10px; color: var(--xq-brand); margin-left: 4px; }

/* 账号登录（可选） */
.xq-login { display: flex; flex-direction: column; gap: var(--xq-sp-2); max-width: 560px; }
.xq-login-hd { font-size: var(--xq-fs); font-weight: var(--xq-fw-semi); }
.xq-login-tip { font-size: var(--xq-fs-sm); color: var(--xq-text-2); line-height: 1.7; background: var(--xq-bg-2); border: 1px solid var(--xq-line-weak); border-radius: var(--xq-r-card); padding: var(--xq-sp-2) 10px; }
.xq-login-tip b { color: var(--xq-text); }
.xq-login-tip ol { margin: 4px 0 0; padding-left: 18px; }
.xq-login-tip a { color: var(--xq-brand); }
.xq-login textarea {
  font-family: ui-monospace, Menlo, monospace;
  font-size: var(--xq-fs-sm);
  width: 100%;
  min-height: 64px;
  resize: vertical;
  padding: 6px var(--xq-sp-2);
  border-radius: var(--xq-r-btn);
  border: 1px solid var(--xq-line);
  background: var(--xq-bg-2);
  color: var(--xq-text);
}
.xq-login textarea:focus { outline: none; border-color: var(--xq-brand); }
.xq-login-msg { font-size: var(--xq-fs-sm); }
.xq-login-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.xq-login-user { font-size: var(--xq-fs-sm); color: var(--xq-text); }
.xq-login-ok { color: var(--dsw-alias-state-success-primary); }
.xq-login-bad { color: var(--xq-warn); }

/* ============================================================================
 * 悬浮徽章：两列分组，固定「名称 / 价格 / 涨跌幅」三列，数字右对齐
 * ========================================================================== */
.xq-badge {
  position: fixed;
  right: 16px;
  bottom: 64px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: var(--xq-sp-2) 10px;
  max-width: calc(100vw - 24px);
  border-radius: var(--xq-r-panel);
  background: var(--xq-bg);
  border: 1px solid var(--xq-line);
  box-shadow: 0 4px 14px rgba(0, 0, 0, .16);
  font-size: 12px;
  line-height: 1.4;
  color: var(--xq-text);
  cursor: grab;
  user-select: none;
  pointer-events: auto;
  z-index: 1200;
  /* 内容不许溢出到卡片外：宽度不够时宁可截断文字，也不要出现「文字飘在胶囊外面」 */
  overflow: hidden;
}
/* 注意：**不要**在这个元素上放 container-type。
   徽章是 position: fixed + width: auto（收紧成胶囊）时按内容收缩的，而 inline-size 容器
   的固有宽度被 containment 归零 → 胶囊会塌成 padding 宽度，内容全部溢出到盒子外。
   宽度分档改由 badge.js 按实际宽度打 class（xq-tight / xq-tiny）。 */
.xq-badge:active { cursor: grabbing; }
.xq-badge b { color: var(--xq-brand); }
.xq-badge-hd { display: flex; align-items: center; gap: 6px; min-height: 20px; }
.xq-badge .xq-logo { font-size: 12.5px; letter-spacing: .3px; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.xq-badge .xq-status { font-size: 10px; padding: 0 6px; }
.xq-badge-val { font-weight: var(--xq-fw-semi); font-variant-numeric: tabular-nums; white-space: nowrap; }
.xq-badge-hint { color: var(--xq-text-2); }
.xq-caret { font-size: 10px; color: var(--xq-text-3); flex-shrink: 0; }
.xq-badge-control {
  flex: none;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid var(--xq-line);
  border-radius: 999px;
  background: transparent;
  color: var(--xq-text-2);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
  cursor: pointer;
  transition: color var(--xq-t), border-color var(--xq-t);
}
.xq-badge-control:hover { border-color: var(--xq-brand); color: var(--xq-text); }
.xq-badge-control:focus-visible { outline: 2px solid var(--xq-brand); outline-offset: 1px; }
/* 收紧成小胶囊：宽度按内容走（不能给固定宽度，否则中等长度的品牌名会被挤爆）；
   上限只防超长内容顶到屏幕外，不再用 190px 把内容压进去。 */
.xq-badge-compact { width: auto !important; max-width: min(360px, calc(100vw - 24px)); padding: 4px 8px; border-radius: 999px; gap: 0; }
.xq-badge-compact .xq-badge-hd { gap: 6px; white-space: nowrap; }
.xq-badge-grip {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 16px;
  height: 16px;
  cursor: ew-resize;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  color: var(--xq-text-3);
  font-size: 9px;
  line-height: 1;
  opacity: 0;
  transition: opacity var(--xq-t);
}
.xq-badge:hover .xq-badge-grip { opacity: .8; }

/* 两列分组：每组内部三列（名称弹性 / 价格右对齐 / 涨跌幅右对齐） */
.xq-wgrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px var(--xq-sp-3);
  padding: 1px 4px 1px 0;
}
.xq-witem {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: baseline;
  gap: 6px;
  white-space: nowrap;
  min-width: 0;
}
.xq-witem .xq-badge-hint { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.xq-witem > .xq-badge-val { text-align: right; }
.xq-idxgrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px var(--xq-sp-3); padding-bottom: 5px; border-bottom: 1px solid var(--xq-line-weak); }
.xq-idxrow { display: flex; justify-content: space-between; gap: 6px; white-space: nowrap; }

/* 隐身恢复胶囊（位置与恢复逻辑不变） */
.xq-restore {
  position: fixed;
  left: 12px;
  bottom: 12px;
  z-index: 1200;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--xq-line);
  background: var(--xq-bg-2);
  color: var(--xq-text-2);
  font: inherit;
  font-size: var(--xq-fs-xs);
  line-height: 1.4;
  cursor: pointer;
  user-select: none;
  opacity: .65;
  transition: opacity var(--xq-t), border-color var(--xq-t), color var(--xq-t);
}
.xq-restore:hover { opacity: 1; border-color: var(--xq-brand); color: var(--xq-text); }
.xq-restore:focus-visible { outline: 2px solid var(--xq-brand); outline-offset: 2px; }
.xq-restore-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--xq-brand); opacity: .55; flex: none; }
.xq-restore:hover .xq-restore-dot { opacity: 1; }
.xq-restore-txt { white-space: nowrap; }

/* ============================================================================
 * 底部指数条：一条低干扰信息行（不变成第二套卡片）
 * ========================================================================== */
.xq-ticker {
  display: flex;
  gap: var(--xq-sp-4);
  font-size: 11.5px;
  color: var(--xq-text-2);
  padding: 2px 2px;
  flex-wrap: wrap;
  justify-content: center;
  align-items: baseline;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
}
.xq-ticker:hover { color: var(--xq-text); }
.xq-tick { display: inline-flex; gap: 5px; align-items: baseline; }
.xq-tick + .xq-tick { padding-left: var(--xq-sp-4); border-left: 1px solid var(--xq-line-weak); }
.xq-tick + .xq-pnl-chip { padding-left: var(--xq-sp-4); border-left: 1px solid var(--xq-line-weak); border-radius: 0; }
.xq-tick-name { color: var(--xq-text-2); }
.xq-tick-cur { font-weight: var(--xq-fw-semi); }
.xq-ticker .xq-pnl-chip { background: none; padding: 0; max-width: none; font-size: 11.5px; }
.xq-ticker .xq-pnl-chip.xq-pnl-up, .xq-ticker .xq-pnl-chip.xq-pnl-down { font-weight: var(--xq-fw-semi); }

/* ============================================================================
 * 响应式（按容器宽度）
 * ========================================================================== */
@container xqbody (max-width: 1199px) {
  .xq-idx { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .xq-pos-hero { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .xq-pos-hero-aux { grid-column: 1 / -1; flex-direction: row; justify-content: flex-start; gap: var(--xq-sp-4); align-items: baseline; text-align: left; }
}
@container xqbody (max-width: 767px) {
  .xq-dock-body { padding: var(--xq-sp-3); }
  .xq-idx { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .xq-pos-hero { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--xq-sp-3); }
  .xq-pos-hero-amt { font-size: 18px; }
  .xq-pos-hero-aux { flex-wrap: wrap; gap: var(--xq-sp-3); }
  .xq-pos-form-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .xq-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .xq-pos-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@container xqdock (max-width: 767px) {
  .xq-dock-head { gap: 6px; padding: 6px 10px; }
  .xq-status { max-width: 40vw; }
  .xq-status-long { display: none; }
  .xq-status-short { display: inline-block; }
  .xq-nav-actions .xq-btn { padding: 0 10px; }
}
/* 徽章宽度分档：由 badge.js 按实际宽度打 class（见 .xq-badge 处的说明，不能用容器查询） */
.xq-badge.xq-tight .xq-wgrid { grid-template-columns: minmax(0, 1fr); }
/* 窄档：名称独占一行，价格与涨跌幅留在第二行（数字不截断、也不互相压） */
.xq-badge.xq-tight .xq-witem { grid-template-columns: minmax(0, 1fr) auto; row-gap: 0; }
.xq-badge.xq-tight .xq-witem .xq-badge-hint { grid-column: 1 / -1; }
.xq-badge.xq-tight .xq-witem > .xq-badge-val:last-child { grid-column: 2; text-align: right; }
/* 极窄档：状态与品牌让位给行情本身；开合箭头在 120px 会被裁掉，直接不显示（徽章本身可点） */
.xq-badge.xq-tiny .xq-status { display: none; }
.xq-badge.xq-tiny .xq-caret { display: none; }
.xq-badge.xq-tiny .xq-logo { font-size: 12px; }

/* 动效偏好：尊重 prefers-reduced-motion（价格闪烁沿用既有逻辑，不受影响） */
@media (prefers-reduced-motion: reduce) {
  .xq-view, .xq-refresh-spin, .xq-flash-up, .xq-flash-down { animation: none; }
  .xq-btn, .xq-btn-mini, .xq-tab, .xq-badge-control, .xq-restore, .xq-grid-row, .xq-pos-row { transition: none; }
}
`)
    createUiRuntime(ctx)
    // 页面内共享行情运行时：面板/徽章/指数条各订阅自己的代码集合与周期，同一 symbol 只取一次。
    // 宿主侧还有按 symbol 的跨组件/跨页面缓存（lib/quotes.js），两层合起来才是完整的共享行情。
    createMarketRuntime(ctx)
    // 持仓/盈亏的唯一数据源：只建运行时、不取数，首个订阅者（chip / tab / 指数条）挂载时才启动轮询。
    // 它现在读的是「本地持仓 × 雪球行情」的宿主现算视图 —— 账本凭据坏了也不影响实时数字。
    createPositionsRuntime(ctx)
    // 价格提醒的系统通知器：**应用级、随 apply 启动**，与面板挂载和行情隐身都无关
    // （宿主侧 watcher 独立判定阈值，这里只负责把新事件弹成通知）。见 store/alerts-watch.js。
    createAlertsWatchRuntime(ctx).start()
    installSlots(ctx)
    // 行情隐身的恢复入口：快捷键（设置里可改键）。没有这个服务时仍可让 AI 用 xueqiu_display 打开。
    installShortcuts(ctx)
  }
}



return xqClientPlugin

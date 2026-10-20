// 常量表：指数代码 / 周期 / 钳制常量 / 轮询间隔 / 请求规模 / 槽位 id 与 order。
// 说明：客户端没有自己的持久化文件键名 —— 界面状态的键由宿主侧 ui.get/ui.set 决定（见 store/ui.js）。
// 这里所有的值都来自重构前的字面量，一一对应，使用点见各常量后的注释。

// ---- 指数代码表：面板指数卡 / 徽标指数区 / 底部指数条三处共用同一组 ----
export const XQ_INDEX_SYMBOLS = ['SH000001', 'SZ399001', 'SZ399006', 'SH000688']

// ---- 周期表 ----
// 面板周期丸顺序（不含 1m：面板只给这 7 档）
export const KLINE_PERIODS = ['5m', '15m', '30m', '60m', 'day', 'week', 'month']
// 周期显示名：面板周期丸与 KlineCard 共用（KlineCard 会用到 '1m'）
export const PERIOD_LABELS = { '1m': '1分', '5m': '5分', '15m': '15分', '30m': '30分', '60m': '60分', day: '日K', week: '周K', month: '月K' }
// KLineChart setPeriod 的周期映射（挂载顺序要求见 charts/kline.js 里的注释）
export const KLC_PERIOD_MAP = {
  '5m': { type: 'minute', span: 5 }, '15m': { type: 'minute', span: 15 }, '30m': { type: 'minute', span: 30 },
  '60m': { type: 'hour', span: 1 }, day: { type: 'day', span: 1 }, week: { type: 'week', span: 1 }, month: { type: 'month', span: 1 }
}

// ---- 热榜市场表（数组顺序=按钮顺序）/ 市场显示名（KlineCard/HotCard 用）----
export const HOT_MARKETS = [['cn', 'A股'], ['us', '美股'], ['hk', '港股'], ['global', '全球']]
export const HOT_MARKET_LABELS = { cn: 'A股', hk: '港股', us: '美股', global: '全球' }

// ---- 面板 tab 条（key + 文案）----
// 顺序：原有 4 项位置不动，盈亏（pnl）为第 5 项、持仓（positions）为**追加**的第 6 项
// （宿主 ui.get 的 tab 白名单同步放行）。
export const PANEL_TABS = [['market', '行情'], ['hot', '热榜'], ['search', '搜索'], ['news', '快讯'], ['pnl', '盈亏'], ['positions', '持仓']]

// ---- 请求规模参数（属于 call() 参数形状的一部分，与原字面量一致）----
export const NEWS_PAGE_SIZE = 20          // news count
export const HOT_LIST_SIZE = 10           // hot size
export const KLINE_PAGE_SIZE = 500        // kline count（也用于右拖加载更早历史）
export const KOL_SIZE = 6                 // kol count
export const SEARCH_STOCK_SIZE = 8        // search count
export const SEARCH_POST_SIZE = 10        // searchPosts count
export const BADGE_WATCH_LIMIT = 12       // 徽标主体最多展示的自选只数

// ---- 钳制常量 ----
export const BADGE_W_MIN = 120            // 徽章宽下限（grip 拖动 / 水合宽度有效性判定）
export const BADGE_W_MAX = 480            // 徽章宽上限
export const BADGE_W_DEFAULT = 320        // 未设置时的默认区域宽度
export const BADGE_CLAMP_MIN_H = 60       // 水合时按「徽章至少 60px 高」估 y 上限
export const BADGE_DRAG_THRESHOLD = 4     // 拖拽判定阈值（位移绝对值之和 > 4px 才算拖动）
export const EDGE_GAP = 4                 // 距视口边缘的最小留白
export const VIEWPORT_FALLBACK_W = 1200   // 取不到视口时的兜底宽
export const VIEWPORT_FALLBACK_H = 800    // 取不到视口时的兜底高
export const DOCK_H_MIN = 160             // 面板高度下限
export const DOCK_H_MAX = 1200            // 面板高度上限
export const DOCK_H_VP_RATIO = 0.85       // 面板高度不超过视口高的 85%
export const DOCK_H_DEFAULT_RATIO = 0.52  // 未设置时默认视口高的 52%
export const DOCK_H_FALLBACK = 420        // 取不到视口时的默认高度
export const MINUTE_TIP_WRAP_FALLBACK = 640 // 分时 tooltip 左右翻转用的兜底宽度
export const SAVE_UI_DEBOUNCE_MS = 800    // ui.set 落盘 debounce

// ---- 轮询间隔（毫秒）----
export const POLL_MARKET_OPEN_MS = 20000     // 面板：盘中行情
export const POLL_MARKET_CLOSED_MS = 60000   // 面板：休市行情
export const POLL_CONTENT_OPEN_MS = 60000    // 面板：盘中热榜/快讯
export const POLL_CONTENT_CLOSED_MS = 180000 // 面板：休市热榜/快讯
export const POLL_BADGE_MS = 30000           // 徽标
export const POLL_TICKER_MS = 30000          // 底部指数条
export const POLL_DOCK_SESSION_MS = 60000    // 面板头部交易时段文案重算
// 今日盈亏（本地持仓 × 行情）：宿主回传的 next_poll_ms 缺失或过密时的兜底间隔（出错退避也用这个值）
export const POSITIONS_POLL_FALLBACK_MS = 30000
export const ALERT_POLL_MS = 30000
// 没有提醒规则时的空转节奏：行情隐身/面板收起后提醒轮询依然常驻，不能按 30 秒空转。
// 5 分钟一次本地文件读（宿主的 alerts.get 只读 .xueqiu-alerts.json，不出网），
// 同时保留「在别处新增了规则，这个页面也能自己发现」的能力。
export const ALERT_IDLE_POLL_MS = 300000
export const ALERT_NOTICE_LIMIT = 20       // 首次加载仅展示有限待确认事件，避免旧事件撑爆面板

// ---- 行情隐身（FORK-NOTES §11）----
// 快捷键命令 id：注册到宿主快捷键服务，出现在 设置 → 通用 → 快捷键 里（可看键帽、可改键）。
export const XQ_SHORTCUT_TOGGLE_HIDDEN = 'xq.toggleHidden'

// ---- 槽位 id 与 order（7 个注册逐一对应，注册顺序见 slots.js）----
export const SLOT_TOOLVIEW = 'tool.call.toolview'
export const SLOT_INPUT_DOCK = 'conversation.input.dock'
export const SLOT_OVERLAY = 'shell.overlay'
export const SLOT_COMPOSER_DOCK = 'conversation.composer.dock'
export const TOOLVIEW_KEYS = { quote: 'xueqiu_quote', kline: 'xueqiu_kline', hot: 'xueqiu_hot', news: 'xueqiu_news' }
export const PANEL_ID = 'xueqiu-debug-panel'
export const PANEL_ORDER = 30
export const BADGE_ID = 'xueqiu-debug-badge'
export const TICKER_ID = 'xueqiu-debug-ticker'
export const TICKER_ORDER = 1

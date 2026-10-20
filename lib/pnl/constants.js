// 账本（同花顺投资账本）常量 + **本地持仓**的状态文件名。
//
// ⚠ 架构（fork.6 起）：账本从「分时数据源」降级为「一次性导入 / 校对工具」。
//   · 持仓是**本地文件**（positions.json）里的主数据，用户可手动增删改；
//   · 今日盈亏等实时数字由「本地持仓 × 雪球行情」现算，**一次账本请求都不发**；
//   · 只有用户点「从账本同步」时才请求账本 HTTP 接口（见 index.js 的 actPositionsSync）。
//
// 为什么这么改（真实事故，别改回去）：账本要求一个由页面 JS（chameleon）生成的反爬令牌，
// 它寿命很短且由**浏览器**不断重新生成；我们保存的是某一刻的快照，过了窗口就整片 403，
// 而浏览器同一时刻完全正常。历史版本没有任何续期手段（不读 Set-Cookie、没有刷新接口），
// 以前能用是因为上游当年接受长期冻结的快照。把「实时口径」压在这样一份凭据上，等于每小时断一次。
//
// 铁律（INTERFACE.md §0）：本文件属于宿主 lib/ 拼接产物，动态形态下整份源码会被
// `new Function` 求值 —— 因此**禁止 node: import、禁止裸 setTimeout/fetch**，
// 一切 IO 都走 ctx（shell / fs / sandboxPolicy），定时走 ctx.timeout。

/** 组合账户列表端点，用来探测 fund_key / 校验 Cookie。 */
export const ACCOUNT_LIST_URL = 'https://tzzb.10jqka.com.cn/caishen_httpserver/tzzb/caishen_fund/pc/account/v1/account_list'
/**
 * 账户级当日盈亏分时端点。**只在手动同步时顺带取一次**，用来说明「账本口径」与
 * 「本地浮动口径」差多少（账本含当日已实现与费用），不再作为实时数据源。
 */
export const PNL_URL = 'https://tzzb.10jqka.com.cn/caishen_httpserver/tzzb/caishen_fund/pc/asset/v1/time_share'
/**
 * 持仓明细端点。前端 service 层 `requestStockPosition`（PC bundle 里的 `s.jJ`）指向
 * `/caishen_fund/pc/asset/v1/stock_position`，请求体与 time_share 同族，响应 ex_data.position[]
 * 里 `count`=股数、`cost`=持仓成本价（摊薄成本）—— 字段对照见 FORK-NOTES「持仓同步」一节。
 */
export const STOCK_POSITION_URL = 'https://tzzb.10jqka.com.cn/caishen_httpserver/tzzb/caishen_fund/pc/asset/v1/stock_position'
/** 账本网页端同款 UA（account_list 网关只认最小请求头，UA 必须与网页一致）。 */
export const PNL_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'
/** 金额字段的候选名（接口未公开、字段名可能变），按优先级探测。 */
export const YK_KEYS = ['yk', 'today_yk', 'day_yk', 'todayyk', 'yk_today', 'today_profit', 'profit']

/**
 * 实时盈亏的刷新间隔：**行情**的节奏，不是账本的。
 * 默认 30 秒（比原来 60 秒的账本心跳更密，但打的是雪球、有 10 秒缓存与并发闸门兜着）；
 * 用户可在「盈亏」tab 调整（秒），越界夹到 [MIN, MAX]。
 */
export const DEFAULT_POLL_MS = 30_000
/** 刷新间隔下限：5 秒（再密没有意义，雪球侧 10s 缓存会直接命中）。 */
export const MIN_POLL_MS = 5_000
/** 刷新间隔上限（1 小时）。 */
export const MAX_POLL_MS = 3_600_000

/** 状态目录名（**必须与 dsh-ths-pnl 相同**：两边共用同一份 Cookie）。 */
export const PNL_STATE_DIR = 'dsh-ths-pnl'
/** 凭据文件（Cookie / fundKey / pollSec），读-改-写合并式。 */
export const CONFIG_FILE = 'config.json'
/**
 * 本地持仓文件。**这是主数据**：用户手改的就是它，云端同步也是写它。
 * 只存输入字段（code / name / qty / cost），价格与盈亏一律现算、不落盘 ——
 * 否则「编辑股数后现价还是旧的」这种自相矛盾的状态一定会出现。
 */
export const POSITIONS_FILE = 'positions.json'
/**
 * 持仓文件的结构版本号。历次变更：
 *   v3：账本快照（行内是账本派生字段：price/value/hold_profit/day_profit…）；
 *   v4：**本地持仓**（行内只有 code/name/qty/cost，价格与盈亏由行情现算）。
 * v3 → v4 会自动迁移（只取四个输入字段），不需要用户重录。
 */
export const POSITIONS_SCHEMA = 4
/**
 * 云端同步失败后的「冷却提示」时长（10 分钟）。**不拦用户**（同步是用户刻意点的，他有权再试），
 * 只用于在界面上说明「刚失败过，多半还是同一个原因」，避免反复点造成无谓的打点。
 */
export const BLOCKED_BACKOFF_MS = 10 * 60_000
/** Cookie 长度上限：RPC body 上限 1MB，这里再兜一层，防止把整个浏览器 Cookie 灌进状态文件。 */
export const MAX_COOKIE_LEN = 8_192

/**
 * HTTP 状态码探针标记：curl `-w '\n__HTTP__%{http_code}'` 把状态码追加在 stdout 末尾。
 * 没有这个标记就拿不到状态码，也就无法区分「会话失效(401)」「账本网关拒绝(403 + HTML)」
 * 和「接口报错(200 + error_code)」。
 */
export const HTTP_MARK = '__HTTP__'

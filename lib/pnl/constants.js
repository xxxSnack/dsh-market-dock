// 今日盈亏（同花顺投资账本）常量：端点 / UA / 轮询钳制 / 与 dsh-ths-pnl 共用的状态文件名。
//
// 铁律（INTERFACE.md §0）：本文件属于宿主 lib/ 拼接产物，动态形态下整份源码会被
// `new Function` 求值 —— 因此**禁止 node: import、禁止裸 setTimeout/fetch**，
// 一切 IO 都走 ctx（shell / fs / sandboxPolicy），定时走 ctx.timeout。

/** 当日盈亏分时端点（逐字搬自 dsh-ths-pnl，勿改）。 */
export const PNL_URL = 'https://tzzb.10jqka.com.cn/caishen_httpserver/tzzb/caishen_fund/pc/asset/v1/time_share'
/** 组合账户列表端点，用来探测 fund_key / 校验 Cookie。 */
export const ACCOUNT_LIST_URL = 'https://tzzb.10jqka.com.cn/caishen_httpserver/tzzb/caishen_fund/pc/account/v1/account_list'
/** 账本网页端同款 UA（account_list 网关只认最小请求头，UA 必须与网页一致）。 */
export const PNL_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'
/** 金额字段的候选名（接口未公开、字段名可能变），按优先级探测。 */
export const YK_KEYS = ['yk', 'today_yk', 'day_yk', 'todayyk', 'yk_today', 'today_profit', 'profit']

/** 盘中心跳间隔下限：账本接口未公开，调太快会被风控盯上（5 秒）。 */
export const MIN_POLL_MS = 5_000
/** 盘中心跳间隔上限（1 小时）。 */
export const MAX_POLL_MS = 3_600_000
/** 盘中心跳默认值（60 秒）。 */
export const DEFAULT_POLL_MS = 60_000
/** 收盘后隔多久再补拉一次，让收盘价落定（只补一次，之后冻结）。 */
export const CLOSE_SETTLE_MS = 45_000
/** 宿主启动后的补拉延迟：错开插件加载高峰。 */
export const STARTUP_DELAY_MS = 3_000

/** 状态目录名（**必须与 dsh-ths-pnl 相同**：两边共用同一份 Cookie / 快照）。 */
export const PNL_STATE_DIR = 'dsh-ths-pnl'
/** 凭据文件（Cookie / fundKey / pollSec），读-改-写合并式。 */
export const CONFIG_FILE = 'config.json'
/** 快照文件（最后一次已知盈亏），与凭据分离：清 Cookie 不抹掉最后已知值。 */
export const SNAPSHOT_FILE = 'snapshot.json'
/** Cookie 长度上限：RPC body 上限 1MB，这里再兜一层，防止把整个浏览器 Cookie 灌进状态文件。 */
export const MAX_COOKIE_LEN = 8_192

/**
 * HTTP 状态码探针标记：curl `-w '\n__HTTP__%{http_code}'` 把状态码追加在 stdout 末尾。
 * 旧插件用 fetch 的 res.status，宿主侧只能用 curl —— 没有这个标记就拿不到状态码，
 * 也就无法区分「Cookie 过期(401/403)」和「接口报错(200 + error_code)」。
 */
export const HTTP_MARK = '__HTTP__'

// 常量：跨平台 shell 细节、雪球域名、默认自选表、请求管道的全部钳制参数。
// 这些值原先散在 apply 闭包顶部与各调度块里，拆分后集中于此（值逐字未改）。

export const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
export const BASE = 'https://stock.xueqiu.com'
export const SITE = 'https://www.xueqiu.com'
// 跨平台：Windows 上 DSH shell 层是 PowerShell（pwsh -Command），单引号字面量语义与 POSIX 一致；
// 但 PS 5.1 里 curl 是 Invoke-WebRequest 的别名 → 显式 curl.exe（Win10+ 自带）；
// /dev/null 在 Windows 不存在 → NUL。Cookie 值里的引号（正常不会有）剥除以防注入。
const WIN = typeof process !== 'undefined' && process.platform === 'win32'
export const CURL = WIN ? 'curl.exe' : 'curl'
export const NULL_DEV = WIN ? 'NUL' : '/dev/null'
export const DEFAULT_WATCHLIST = ['SH600519', 'SZ300750', 'SZ002594', 'SH601318', '00700', 'AAPL']

// ---- 请求调度：并发 2 + 最小间隔 100ms（对齐雪球网页端行为，留有安全余量）----
export const MIN_GAP_MS = 100
export const MAX_CONCURRENCY = 2
// 看门狗：单个请求最长 30s，超时强制释放槽位，防止悬挂请求冻结整条管线
export const GATE_TIMEOUT_MS = 30000

// ---- TTL 缓存容量上限 ----
export const CACHE_MAX_KEYS = 200

// ---- 云端自选后台同步节流窗口 ----
export const SYNC_INTERVAL_MS = 10 * 60 * 1000

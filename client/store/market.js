// 行情取数函数：本期只放各组件共用的**纯取数**封装（不引入共享 store、不做缓存/合并请求）。
// 每个函数严格等于重构前散落在各组件里的那一次 call(...) 调用（action 与参数形状不变）。
import { call, A_QUOTE, A_WATCHLIST_GET } from '../platform.js'
import { XQ_INDEX_SYMBOLS } from '../constants.js'

// 批量行情（面板：指数一组、自选一组；徽标：指数一组、自选前 12 只一组）
export function fetchQuote(symbols, force) { return call(A_QUOTE, { symbols: symbols, force: force === true }) }

// 四大指数（面板指数卡 / 徽标指数区 / 底部指数条共用同一组代码）
export function fetchIndices(force) { return call(A_QUOTE, { symbols: XQ_INDEX_SYMBOLS, force: force === true }) }

// 自选列表（面板 refreshMarket、徽标主体）
export function fetchWatchlist() { return call(A_WATCHLIST_GET, {}) }

// 宿主调用层：call() 是对 host.call('xq.call', {action,args}) 的唯一封装，外加全部 action 名常量。
// 两种形态共用同一份源码：静态 bundle 由 wrapper 提供 `const host = { call: …fetch('/xq-rpc') }`，
// 动态形态由运行时注入 host 全局。
//
// action 常量集中在这里，方便一眼核对「客户端↔宿主」的 RPC 契约（宿主 dispatch 表见宿主侧）。

export const A_UI_GET = 'ui.get'
export const A_UI_SET = 'ui.set'
export const A_WATCHLIST_GET = 'watchlist.get'
export const A_WATCHLIST_ADD = 'watchlist.add'
export const A_WATCHLIST_REMOVE = 'watchlist.remove'
export const A_WATCHLIST_PULL = 'watchlist.pull'
export const A_QUOTE = 'quote'
export const A_QUOTE_DETAIL = 'quoteDetail'
export const A_KLINE = 'kline'
export const A_MINUTE = 'minute'
export const A_HOT = 'hot'
export const A_NEWS = 'news'
export const A_SEARCH = 'search'
export const A_SEARCH_POSTS = 'searchPosts'
export const A_LOGIN_STATUS = 'login.status'
export const A_LOGIN_SAVE = 'login.save'
export const A_LOGIN_LOGOUT = 'login.logout'
export const A_FINANCE = 'finance'
export const A_KOL = 'kol'

// 注：用具名 async 函数表达式（构建器只认 `export function|const|let|var|class` 开头的导出行）。
export const call = async function (action, args) {
  const r = await host.call('xq.call', { action: action, args: args || {} })
  if (!r || !r.ok) throw new Error((r && r.error) || '调用失败')
  return r.data
}

// RPC dispatch 表 + handleCall 包络（sanitize 后回 { ok, data } / { ok:false, error }）。

import { sanitize } from './normalize.js'

export function installActions(core) {
  // ---- RPC dispatch ----
  const dispatch = {
    quote: core.actQuote, quoteDetail: core.actQuoteDetail, kline: core.actKline, minute: core.actMinute,
    hot: core.actHot, search: core.actSearch, searchPosts: core.actSearchPosts, news: core.actNews,
    kol: core.actKOL, user: core.actUser, finance: core.actFinance,
    'watchlist.get': core.actWatchlistGet, 'watchlist.add': core.actWatchlistAdd, 'watchlist.remove': core.actWatchlistRemove,
    'watchlist.pull': core.actWatchlistPull,
    'login.status': core.actLoginStatus, 'login.save': core.actLoginSave, 'login.logout': core.actLoginLogout,
    'ui.get': core.actUiGet, 'ui.set': core.actUiSet,
    // 今日盈亏（同花顺投资账本）：宿主侧实现在 lib/pnl/，与旧插件 dsh-ths-pnl 共用状态文件
    'pnl.get': core.actPnlGet, 'pnl.verify': core.actPnlVerify, 'pnl.config': core.actPnlSave,
    // 持久化价格提醒：events 只由 alerts.ack 显式确认时删除
    'alerts.get': core.actAlertsGet, 'alerts.set': core.actAlertsSet,
    'alerts.remove': core.actAlertsRemove, 'alerts.ack': core.actAlertsAck,
    debug: async function () {
      return { running: core.running, waiters: core.waiters.length, inflight: Array.from(core.inflight.keys()), cacheKeys: core.cache.size, cookie: core.state.cookie ? 'set' : 'none', login: core.login ? ('uid=' + (core.login.uid || '?')) : 'anonymous' }
    }
  }

  async function handleCall (req) {
    const reqObj = (req && typeof req === 'object') ? req : {}
    const action = reqObj.action
    const args = reqObj.args || {}
    if (!dispatch[action]) return { ok: false, error: '未知操作: ' + action }
    try {
      const data = await dispatch[action](args)
      return { ok: true, data: sanitize(data) }
    } catch (e) {
      return { ok: false, error: String((e && e.message) || e) }
    }
  }

  core.dispatch = dispatch
  core.handleCall = handleCall
}

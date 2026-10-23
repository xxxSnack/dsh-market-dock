// 16 个 endpoint 对应的业务动作（act*）。只做参数整形 + 调 getJSON + 走 normalizer。

import { BASE, SITE } from './constants.js'
import { pickQuote, mapKline, mapPosts, mapKOL, mapFinance } from './normalize.js'

export function installApi(core) {
  // ---- actions ----
  // quote 委托共享行情服务（lib/quotes.js）：按 symbol 缓存/合批/在途共享都在那一层，
  // 这里的对外形状（{status,list}）与改造前逐字一致 —— 面板、持仓、提醒、AI 工具都靠它。
  async function actQuote(args) {
    const a = (args && typeof args === 'object') ? args : {}
    const symbols = Array.isArray(a.symbols) ? a.symbols : [String(a.symbols || '')]
    const res = await core.quotes.fetchQuotes(symbols, { force: a.force === true })
    return { status: res.status, list: res.list }
  }

  async function actQuoteDetail(args) {
    const symbol = String(args.symbol || '')
    const data = await core.getJSON('/v5/stock/quote.json', { symbol: symbol, extend: 'detail' }, { ttl: args.force === true ? 0 : 15000 })
    return { quote: pickQuote(data.data && data.data.quote), market: data.data && data.data.market }
  }

  async function actKline(args) {
    // 周期白名单：上游对未知 period 返回 200+空数据（静默失败），模型手滑传 '1h' 之类
    // 会拿到空数组还以为没数据——未知周期兜底为 day
    const PERIODS = { '1m': 1, '5m': 1, '15m': 1, '30m': 1, '60m': 1, 'day': 1, 'week': 1, 'month': 1 }
    const period = PERIODS[String(args.period)] ? String(args.period) : 'day'
    const count = Math.min(Math.max(parseInt(args.count, 10) || 120, 5), 500)
    const symbol = String(args.symbol || '')
    // begin 按分钟取整，保证 TTL 窗口内缓存 key 稳定（count 为负，返回的是最近 N 根）。
    // args.begin（毫秒时间戳，通常传当前最早一根）：取该根往前的更早历史
    let begin = Math.floor(Date.now() / 60000) * 60000
    if (isFinite(Number(args.begin)) && Number(args.begin) > 0) begin = Math.floor(Number(args.begin) / 60000) * 60000
    const data = await core.getJSON('/v5/stock/chart/kline.json', {
      symbol: symbol, period: period, type: 'before', begin: begin,
      count: -count, indicator: 'kline,pe,pb,ps,pcf,market_capital'
    }, { ttl: period === 'day' ? 300000 : 30000 })
    return mapKline(data)
  }

  async function actMinute(args) {
    const symbol = String(args.symbol || '')
    const data = await core.getJSON('/v5/stock/chart/minute.json', { symbol: symbol, period: '1d' }, { ttl: args.force === true ? 0 : 10000 })
    const d = data && data.data ? data.data : null
    if (!d || !d.items) return { last_close: null, items: [] }
    return {
      last_close: d.last_close,
      items: d.items.map(function (it) {
        return { timestamp: it.timestamp, current: it.current, avg_price: it.avg_price, percent: it.percent, volume: it.volume, high: it.high, low: it.low }
      })
    }
  }

  async function actHot(args) {
    const market = String(args.market || 'cn')
    const typeMap = { global: 10, us: 11, cn: 12, hk: 13 }
    const size = Math.min(Math.max(parseInt(args.size, 10) || 10, 1), 30)
    const data = await core.getJSON('/v5/stock/hot_stock/list.json', { type: typeMap[market] || 12, size: size }, { ttl: 300000 })
    const items = (data && data.data && data.data.items) || []
    return {
      list: items.map(function (it) {
        return { symbol: it.symbol, code: it.code, name: it.name, current: it.current, percent: it.percent, chg: it.chg, exchange: it.exchange, value: it.value, rank_change: it.rank_change, increment: it.increment }
      })
    }
  }

  async function actSearch(args) {
    const q = String(args.q || '')
    if (!q) return { list: [] }
    const data = await core.getJSON('/query/v1/suggest_stock.json', { q: q, count: Math.min(parseInt(args.count, 10) || 8, 20) }, { base: SITE, ttl: 60000 })
    const list = (data && data.data) || []
    return {
      list: list.map(function (it) {
        return { code: it.code, name: it.query || it.name, type: it.type, stock_type: it.stock_type, label: it.label }
      })
    }
  }

  async function actSearchPosts(args) {
    const q = String(args.q || '')
    if (!q) return { list: [] }
    const data = await core.getJSON('/query/v1/search/status.json', { q: q, count: Math.min(parseInt(args.count, 10) || 10, 30) }, { base: SITE, ttl: 120000 })
    return { list: mapPosts(data && data.list) }
  }

  async function actNews(args) {
    const count = Math.min(Math.max(parseInt(args.count, 10) || 20, 1), 50)
    // max_id 翻页游标：-1 取最新一页；传上一页最旧一条 id 继续往回翻
    const maxId = parseInt(args.max_id, 10)
    const cursor = isFinite(maxId) && maxId > 0 ? maxId : -1
    const data = await core.getJSON('/statuses/livenews/list.json', { since_id: -1, max_id: cursor, count: count }, { base: SITE, ttl: 120000 })
    const items = (data && data.items) || []
    return {
      items: items.map(function (it) {
        return { id: it.id, text: it.text, mark: it.mark, created_at: it.created_at, target: it.target, view_count: it.view_count, reply_count: it.reply_count }
      })
    }
  }

  async function actKOL(args) {
    const symbol = String(args.symbol || '')
    const count = Math.min(Math.max(parseInt(args.count, 10) || 8, 1), 20)
    const data = await core.getJSON('/recommend/user/stock_hot_user.json', { symbol: symbol, start: 0, count: count }, { base: SITE, ttl: 3600000 })
    return { list: mapKOL(data) }
  }

  async function actUser(args) {
    const userId = String(args.userId || args.id || '')
    if (!userId) return { user: null, posts: [] }
    const data = await core.getJSON('/statuses/user_timeline.json', { user_id: userId, page: 1, count: Math.min(parseInt(args.count, 10) || 10, 30) }, { base: SITE, ttl: 300000 })
    const statuses = (data && data.statuses) || []
    const first = statuses[0]
    return {
      user: first && first.user ? {
        id: first.user.id, screen_name: first.user.screen_name,
        followers_count: first.user.followers_count, status_count: first.user.status_count,
        verified: first.user.verified, description: first.user.description, profile: first.user.profile
      } : null,
      posts: mapPosts(statuses)
    }
  }

  async function actFinance(args) {
    const symbol = String(args.symbol || '')
    const data = await core.getJSON('/v5/stock/finance/cn/indicator.json', { symbol: symbol, type: 'all', is_detail: 'true', count: 4 }, { ttl: 86400000 })
    const d = data && data.data ? data.data : null
    return {
      quote_name: d ? d.quote_name : null, last_report_name: d ? d.last_report_name : null,
      list: mapFinance(d ? d.list : null)
    }
  }

  core.actQuote = actQuote
  core.actQuoteDetail = actQuoteDetail
  core.actKline = actKline
  core.actMinute = actMinute
  core.actHot = actHot
  core.actSearch = actSearch
  core.actSearchPosts = actSearchPosts
  core.actNews = actNews
  core.actKOL = actKOL
  core.actUser = actUser
  core.actFinance = actFinance
}

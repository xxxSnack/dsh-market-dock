// XueqiuPanel：面板内容容器（数据 + tab 条 + 查表分发）。
//
// 内层视图（LoginBox / MarketTab / DetailView / HotTab / SearchTab / NewsTab / PnlTab）已提到模块作用域，
// 原来靠父级闭包读的 state/句柄改为「调用点组装显式上下文 p」传入；本文件只保留数据逻辑。
//
// tab 分发表：ui.tab → 组件。注意 DetailView 不在此表 —— 详情由 view 真值门控（旧 if/else 链
// 也是先判 view），且宿主 ui.get 会把 tab 白名单化成 market/hot/search/news/pnl。把 detail 塞进
// 查表会让理论上不可达的 tab='detail' 渲染详情骨架（旧行为是落到快讯页），属于行为变化。
import { el, pageHidden } from '../dom.js'
import { call, A_HOT, A_NEWS, A_KLINE, A_QUOTE_DETAIL, A_MINUTE, A_FINANCE, A_KOL, A_SEARCH, A_SEARCH_POSTS, A_LOGIN_STATUS, A_LOGIN_SAVE, A_LOGIN_LOGOUT, A_WATCHLIST_ADD, A_WATCHLIST_REMOVE, A_WATCHLIST_PULL } from '../platform.js'
import { getUiRuntime } from '../store/ui.js'
import { getPnlRuntime } from '../store/pnl.js'
import { fetchQuote, fetchIndices, fetchWatchlist } from '../store/market.js'
import { LoginBox } from './login.js'
import { MarketTab } from './market.js'
import { DetailView } from './detail.js'
import { HotTab } from './hot.js'
import { SearchTab } from './search.js'
import { NewsTab } from './news.js'
import { PnlTab } from './pnl.js'
import { PANEL_TABS, NEWS_PAGE_SIZE, HOT_LIST_SIZE, KLINE_PAGE_SIZE, KOL_SIZE, SEARCH_STOCK_SIZE, SEARCH_POST_SIZE, POLL_MARKET_OPEN_MS, POLL_MARKET_CLOSED_MS, POLL_CONTENT_OPEN_MS, POLL_CONTENT_CLOSED_MS } from '../constants.js'

const XQ_TABS = { market: MarketTab, hot: HotTab, search: SearchTab, news: NewsTab, pnl: PnlTab }

// ---------- 面板内容（数据 + tabs + 详情） ----------
export function XueqiuPanel() {
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
  // 竞态防护：行情/热榜/搜索的响应序号（旧响应到达时序号已过期则丢弃，防慢请求覆盖新结果）
  const marketSeq = React.useRef(0)
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
  const tab = ui.tab
  function setTab(t) { ui.set({ tab: t }) }

  function refreshMarket(force) {
    const my = ++marketSeq.current
    return Promise.all([
      fetchWatchlist(),
      fetchIndices(force)
    ]).then(function (res) {
      if (marketSeq.current !== my) return
      const wl = (res[0] && res[0].symbols) || []
      const status = res[1] ? res[1].status : null
      // 空响应/临时异常没有足够信息判断盘中，不要把轮询误降到休市节奏；
      // 下一轮成功拿到状态后再切换。
      if (status === 5 || status === 6) setMarketOpen(true)
      else if (status !== null && status !== undefined) setMarketOpen(false)
      setWatchlist(wl)
      setIndices((res[1] && res[1].list) || [])
      setErr('')
      if (!wl.length) return
      return fetchQuote(wl, force).then(function (data) {
        if (marketSeq.current !== my) return
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
      if (marketSeq.current === my) setErr(String((e && e.message) || e))
    })
  }

  function refreshContent() {
    const my = ++hotSeq.current
    const newsMy = ++newsSeq.current
    const market = hotMarketRef.current   // 读当前市场（轮询闭包防 stale）
    Promise.all([
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

  // 详情驻留期间也要更新报价/分时；原来只在切换标的时请求一次，打开十几分钟后
  // 现价会永久停在旧值。回到前台立即补一次，force 跳过短 TTL。
  React.useEffect(function () {
    if (!view) return function () {}
    let alive = true
    function refreshLive() {
      if (pageHidden()) return
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
        Promise.all([refreshMarket(true), refreshContent(), pnlRt ? pnlRt.refresh(true) : Promise.resolve()]).then(function () { setLoading(false) }).catch(function () { setLoading(false) })
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
  return el('div', null, [tabs, errBox, el('div', { key: 'v-' + (loginOpen ? 'login' : (view ? 'd' : tab)), className: 'xq-view' }, content)])
}

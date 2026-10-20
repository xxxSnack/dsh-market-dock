// 由 tools/build.mjs 从 lib/ 生成 —— 勿手改；改源后运行 node tools/build.mjs（cordis 动态模块：函数体形式，末尾 return 交出插件对象）
// 常量：跨平台 shell 细节、雪球域名、默认自选表、请求管道的全部钳制参数。
// 这些值原先散在 apply 闭包顶部与各调度块里，拆分后集中于此（值逐字未改）。

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const BASE = 'https://stock.xueqiu.com'
const SITE = 'https://www.xueqiu.com'
// 跨平台：Windows 上 DSH shell 层是 PowerShell（pwsh -Command），单引号字面量语义与 POSIX 一致；
// 但 PS 5.1 里 curl 是 Invoke-WebRequest 的别名 → 显式 curl.exe（Win10+ 自带）；
// /dev/null 在 Windows 不存在 → NUL。Cookie 值里的引号（正常不会有）剥除以防注入。
const WIN = typeof process !== 'undefined' && process.platform === 'win32'
const CURL = WIN ? 'curl.exe' : 'curl'
const NULL_DEV = WIN ? 'NUL' : '/dev/null'
const DEFAULT_WATCHLIST = ['SH600519', 'SZ300750', 'SZ002594', 'SH601318', '00700', 'AAPL']

// ---- 请求调度：并发 2 + 最小间隔 100ms（对齐雪球网页端行为，留有安全余量）----
const MIN_GAP_MS = 100
const MAX_CONCURRENCY = 2
// 看门狗：单个请求最长 30s，超时强制释放槽位，防止悬挂请求冻结整条管线
const GATE_TIMEOUT_MS = 30000

// ---- TTL 缓存容量上限 ----
const CACHE_MAX_KEYS = 200

// ---- 云端自选后台同步节流窗口 ----
const SYNC_INTERVAL_MS = 10 * 60 * 1000

// ---- 持久化价格提醒 ----
const ALERT_POLL_MS = 30 * 1000
const ALERT_MAX_POLL_MS = 10 * 60 * 1000
const ALERT_MAX_RULES = 100
const ALERT_MAX_EVENTS = 500
const ALERT_MAX_SYMBOL_LEN = 64
const ALERT_MAX_NAME_LEN = 160

// 插件配置：全部字段都有默认值，**不配置时行为与重构前完全一致**。
//
// 为什么手写校验而不是 schemastery：本插件的两个形态里，动态形态是把源码拼成单文件用
// `new Function` 求值（见 tools/build.mjs），**无法使用 npm 依赖的 import**。因此配置只做
// 轻量自校验，不引第三方 schema 库。
//
// 配置从哪里来：DSH 的 bundle layer 可以在 cordis.patch.yml 里给插件节点写 config，例如
//     - insert:
//         - id: xueqiu-debug
//           name: 'dsh-xueqiu-debug'
//           config:
//             stateDir: dsh-xueqiu-debug      # 与上游/旧数据彻底隔离
//             watchlist: [SH600519, 00700]
// 未写 config 时用下面的默认值（= 重构前的硬编码值）。


// 状态目录名：$DSH_HOME/<stateDir>/。默认沿用上游的 dsh-xueqiu（存量自选/Cookie/界面位置无缝继承）。
// 想与上游彻底隔离就配成 dsh-xueqiu-debug —— 注意切换后不会自动迁移旧数据。
const DEFAULT_STATE_DIR = 'dsh-xueqiu'

// 今日盈亏（同花顺投资账本）的状态目录名：$DSH_HOME/<pnlStateDir>/。
// **默认必须与旧插件 dsh-ths-pnl 完全相同** —— 两边共用 config.json（Cookie）/snapshot.json，
// 并存期用户不用重粘 Cookie，数值也一致。想隔离才改这里（改完不会自动迁移旧数据）。
const DEFAULT_PNL_STATE_DIR = 'dsh-ths-pnl'

// 默认自选表上限（与重构前 stateWrite 的截断上限一致）
const WATCHLIST_MAX = 200

/** 把外部传入的 raw config 规整成可信的配置对象（任何非法值都退回默认） */
function resolveConfig (raw) {
  const cfg = (raw && typeof raw === 'object') ? raw : {}

  const stateDir = (typeof cfg.stateDir === 'string' && /^[A-Za-z0-9._-]+$/.test(cfg.stateDir))
    ? cfg.stateDir
    : DEFAULT_STATE_DIR

  let watchlist = DEFAULT_WATCHLIST
  if (Array.isArray(cfg.watchlist) && cfg.watchlist.length) {
    const list = cfg.watchlist
      .map(function (s) { return String(s == null ? '' : s).trim() })
      .filter(Boolean)
      .slice(0, WATCHLIST_MAX)
    if (list.length) watchlist = list
  }

  // 今日盈亏状态目录：与 stateDir 同款白名单校验（非法值退回默认，防路径穿越）
  const pnlStateDir = (typeof cfg.pnlStateDir === 'string' && /^[A-Za-z0-9._-]+$/.test(cfg.pnlStateDir))
    ? cfg.pnlStateDir
    : DEFAULT_PNL_STATE_DIR

  return { stateDir: stateDir, watchlist: watchlist, pnlStateDir: pnlStateDir }
}

// 纯函数：上游响应 → 插件内部字段形状的归一化。无状态、不依赖 core，直接具名导出。

// ---- data normalizers ----
function nz(v) { return v === undefined ? null : v }

function sanitize(v) {
  if (v === undefined) return null
  if (v === null || typeof v !== 'object') return v
  if (Array.isArray(v)) {
    const out = []
    for (let i = 0; i < v.length; i++) out.push(sanitize(v[i]))
    return out
  }
  const out = {}
  for (const k in v) {
    if (Object.prototype.hasOwnProperty.call(v, k)) out[k] = sanitize(v[k])
  }
  return out
}

function pickQuote(q) {
  if (!q) return null
  return {
    symbol: nz(q.symbol), name: nz(q.name), code: nz(q.code), exchange: nz(q.exchange), type: nz(q.type),
    current: nz(q.current), percent: nz(q.percent), chg: nz(q.chg),
    open: nz(q.open), last_close: nz(q.last_close), high: nz(q.high), low: nz(q.low),
    volume: nz(q.volume), amount: nz(q.amount), turnover_rate: nz(q.turnover_rate),
    market_capital: nz(q.market_capital), float_market_capital: nz(q.float_market_capital),
    volume_ratio: nz(q.volume_ratio), amplitude: nz(q.amplitude), current_year_percent: nz(q.current_year_percent),
    pe_ttm: nz(q.pe_ttm), pe_lyr: nz(q.pe_lyr), pe_forecast: nz(q.pe_forecast), pb: nz(q.pb), eps: nz(q.eps),
    dividend_yield: nz(q.dividend_yield), high52w: nz(q.high52w), low52w: nz(q.low52w),
    limit_up: nz(q.limit_up), limit_down: nz(q.limit_down), status: nz(q.status)
  }
}

function mapKline(data) {
  const d = data && data.data ? data.data : null
  if (!d || !d.column || !d.item) return { period: null, rows: [] }
  const idx = {}
  for (let i = 0; i < d.column.length; i++) idx[d.column[i]] = i
  const rows = d.item.map(function (it) {
    return {
      timestamp: it[idx.timestamp], open: it[idx.open], high: it[idx.high],
      low: it[idx.low], close: it[idx.close], volume: it[idx.volume],
      amount: it[idx.amount], percent: it[idx.percent], chg: it[idx.chg],
      turnoverrate: it[idx.turnoverrate], pe: it[idx.pe], pb: it[idx.pb],
      market_capital: it[idx.market_capital]
    }
  })
  return { period: null, rows: rows }
}

function mapPosts(list) {
  if (!Array.isArray(list)) return []
  return list.map(function (p) {
    let text = p.description || p.text || ''
    text = String(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200)
    return {
      id: p.id, title: p.title || '', text: text,
      created_at: p.created_at, reply_count: p.reply_count, fav_count: p.fav_count,
      view_count: p.view_count, target: p.target,
      user: p.user ? { id: p.user.id, screen_name: p.user.screen_name, followers_count: p.user.followers_count } : null
    }
  })
}

function mapKOL(arr) {
  if (!Array.isArray(arr)) return []
  return arr.map(function (u) {
    return {
      id: u.id, screen_name: u.screen_name, description: u.description || '',
      followers_count: u.followers_count, status_count: u.status_count,
      verified: u.verified, verified_description: u.verified_description,
      profile: u.profile, profile_image_url: u.profile_image_url
    }
  })
}

function mapFinance(list) {
  if (!Array.isArray(list)) return []
  return list.map(function (r) {
    function v(key) { return (r[key] && r[key][0] !== undefined) ? r[key][0] : null }
    return {
      report_name: r.report_name, report_date: r.report_date,
      avg_roe: v('avg_roe'), basic_eps: v('basic_eps'),
      gross_selling_rate: v('gross_selling_rate'), net_selling_rate: v('net_selling_rate'),
      operating_income_yoy: v('operating_income_yoy'), net_profit_atsopc_yoy: v('net_profit_atsopc_yoy'),
      asset_liab_ratio: v('asset_liab_ratio'), current_ratio: v('current_ratio'),
      total_revenue: v('total_revenue'), net_profit_atsopc: v('net_profit_atsopc'),
      np_per_share: v('np_per_share'), operate_cash_flow_ps: v('operate_cash_flow_ps')
    }
  })
}

// URL 工具 + TTL 缓存 + in-flight 去重。缓存容器挂在 core 上（每次 apply 一份）。


function enc(s) {
  try { return encodeURIComponent(String(s)) } catch (e) { return String(s) }
}

function toQuery(params) {
  const parts = []
  for (const k in params) {
    const v = params[k]
    if (v === undefined || v === null || v === '') continue
    parts.push(enc(k) + '=' + enc(v))
  }
  return parts.length ? '?' + parts.join('&') : ''
}

// ---- TTL 缓存 + in-flight 去重：同一 URL 在途请求共享同一个 Promise ----
function installCache(core) {
  core.cache = new Map()   // key -> { at, value }
  core.inflight = new Map() // key -> Promise

  function cacheGet(key, ttl) {
    const e = core.cache.get(key)
    if (e && ttl > 0 && Date.now() - e.at < ttl) return e.value
    return undefined
  }

  // 淘汰：kline 的 begin 参数按分钟取整，每分钟产生新 URL → 新条目；不清理则无界泄漏。
  // 写入时顺手清一轮过期条目（O(n) 但 n 被 200 上限钳住），再按容量兜底删最旧。
  function cachePut(key, value) {
    core.cache.set(key, { at: Date.now(), value: value })
    if (core.cache.size > CACHE_MAX_KEYS) {
      const now = Date.now()
      for (const k of Array.from(core.cache.keys())) {
        const e = core.cache.get(k)
        // 无 TTL 元信息（各调用点 ttl 不同）：超过 24h 的条目一律可清
        if (now - e.at > 86400000) core.cache.delete(k)
      }
    }
    while (core.cache.size > CACHE_MAX_KEYS) {
      const oldest = core.cache.keys().next().value   // Map 保插入序，最旧在最前
      core.cache.delete(oldest)
    }
  }

  core.cacheGet = cacheGet
  core.cachePut = cachePut
}

// 请求调度闸门：并发上限 + 最小间隔 + 看门狗。调度状态挂在 core 上（debug RPC 会读）。


function installGate(core) {
  const ctx = core.ctx
  core.running = 0
  core.lastStart = 0
  core.waiters = []

  function delay(ms) { return new Promise(function (r) { ctx.timeout(r, ms) }) }

  function release() {
    core.running--
    pump()
  }

  function pump() {
    while (core.running < MAX_CONCURRENCY && core.waiters.length) {
      const next = core.waiters.shift()
      core.running++
      next()
    }
  }

  function gate(fn) {
    return new Promise(function (resolve, reject) {
      core.waiters.push(async function () {
        let released = false
        function rel() {
          if (released) return
          released = true
          core.running--
          pump()
        }
        let settled = false
        let watchdog = null
        function settle(fnName, arg) {
          if (settled) return
          settled = true
          if (watchdog) { try { watchdog() } catch (e) { /* ignore */ } }
          if (fnName === 'resolve') resolve(arg)
          else reject(arg)
        }
        try { watchdog = ctx.timeout(function () { rel(); settle('reject', new Error('[timeout] 请求超时(' + GATE_TIMEOUT_MS + 'ms)，已释放调度槽')) }, GATE_TIMEOUT_MS) } catch (e) { /* ignore */ }
        try {
          const wait = core.lastStart + MIN_GAP_MS - Date.now()
          if (wait > 0) await delay(wait)
          core.lastStart = Date.now()
          settle('resolve', await fn())
        } catch (e) {
          settle('reject', e)
        } finally {
          rel()
        }
      })
      pump()
    })
  }

  core.delay = delay
  core.gate = gate
}

// shell 服务的「前台执行」兼容层。
//
// DSH 0.2 起，shell 服务的 `run(spec)` 改名为 `execute(spec)`，并且**返回值语义也变了**：
//   · 0.1.x：`await shell.run(spec)` → 直接得到结果 { exitCode, stdout: { text }, stderr, timedOut, … }
//   · 0.2.x：`await shell.execute(spec)` → 得到「执行句柄」；前台执行 = `await handle.result()`
//            （句柄另有 readOutput/kill/status，后台执行才用得上，本插件只用前台。）
// 旧 API 下这里会拿到一个没有 result() 的普通对象；新 API 下直接读 exitCode 会得到 undefined，
// 表现为「请求成功但拿到空输出」——比抛错更难查，所以两条路径在这里一次分清。
//
// 兼容策略：有 execute 就走新 API（当前 DSH 的实际情况），否则回落到 run，
// 让插件在 0.1.x 运行时也能工作（动态形态 / 未升级的宿主）。

// 注：用具名 async 函数表达式（构建器只认 `export function|const|let|var|class` 开头的导出行）。
const runShell = async function (shell, spec) {
  if (typeof shell.execute === 'function') {
    const handle = await shell.execute(spec)
    // 防御：万一某个执行器的 execute 直接 resolve 成结果对象（无 result 方法），原样返回
    if (!handle || typeof handle.result !== 'function') return handle
    return handle.result()
  }
  return shell.run(spec)
}

// HTTP 管道：curl 调用（跨平台 shell 细节）、匿名 cookie 播种、错误分类、带重试链的 getJSON。


// ---- 错误分类：cookie_expired / rate_limited / parse / network / empty ----
function classifyError(data) {
  if (!data || !data.error_code || data.error_code === 0) return null
  const code = String(data.error_code)
  const desc = String(data.error_description || '')
  if (code === '400016') return { kind: 'cookie_expired', code: code, desc: desc || 'Cookie 失效', retryable: true }
  if (/频繁|频率|too many|429/i.test(desc) || code === '400017') return { kind: 'rate_limited', code: code, desc: desc || '请求过于频繁', retryable: true }
  return { kind: 'api', code: code, desc: desc || ('雪球错误 ' + code), retryable: false }
}

function installHttp(core) {
  const ctx = core.ctx

  function getShell() { return ctx.get('shell') }

  async function ensureCookie(force) {
    if (core.state.cookie && !force) return core.state.cookie
    if (core.cookieSeeding) return core.cookieSeeding // 并发去重：同一时刻只播种一次
    const shell = getShell()
    if (!shell) return ''
    core.cookieSeeding = (async function () {
    // 播种 URL 兜底链：/hq 无 WAF 挑战、直接发全套匿名 token（PR#2）；
    // 首页 / 在部分地区会被阿里云 WAF JS 挑战接管（只发 acw_tc），作第一备选。
    // 逐个尝试，拿到 xq_a_token 即成功；全部失败返回空串走无 cookie 路径。
    const seedUrls = [
      'https://xueqiu.com/hq',
      'https://www.xueqiu.com/'
    ]
    let seen = {}
    let pairs = []
    for (let i = 0; i < seedUrls.length; i++) {
      const cmd = CURL + " -s -L --max-time 12 -D - -o " + NULL_DEV + " '" + seedUrls[i] + "' -H 'User-Agent: " + UA + "'"
      const spec = shell.resolve({ command: cmd, timeoutMs: 15000, stdoutMaxBytes: 65536 })
      let res = null
      try { res = await runShell(shell, spec) } catch (e) { res = null }
      if (!res || res.exitCode !== 0) continue
      seen = {}
      pairs = []
      const lines = String(res.stdout.text || '').split('\n')
      for (let j = 0; j < lines.length; j++) {
        const m = /^set-cookie:\s*([^=;\s]+)=([^;]*)/i.exec(lines[j].trim())
        if (m && !seen[m[1]]) { seen[m[1]] = true; pairs.push(m[1] + '=' + m[2]) }
      }
      if (seen.xq_a_token) break // 拿到核心 token，播种成功
    }
    // kline 端点要求 cookie 里存在 u=<id>；优先用种子响应里的真实 u，缺失才补随机值
    if (!seen.u) pairs.push('u=' + String(Date.now()) + String(Math.floor(Math.random() * 1e6)))
    core.state.cookie = pairs.join('; ')
    return core.state.cookie
    })()
    const r = core.cookieSeeding
    r.then(function () { core.cookieSeeding = null }, function () { core.cookieSeeding = null })
    return r
  }

  async function curl(url, opts) {
    opts = opts || {}
    const shell = getShell()
    if (!shell) throw new Error('shell 服务不可用，无法访问雪球')
    // 登录态优先：请求头用用户 Cookie；显式 cookie 参数（登录校验）最高；
    // anonymous=true 强制匿名（cookie_expired 降级重试：公开数据不需要登录态）
    const cookie = opts.cookie !== undefined ? opts.cookie
      : (opts.anonymous || !core.login) ? await core.ensureCookie(false)
      : core.login.cookie
    let cmd = CURL + " -s --max-time 12 -X " + (opts.method || 'GET') + " '" + url + "'"
    cmd += " -H 'User-Agent: " + UA + "'"
    cmd += " -H 'Referer: https://www.xueqiu.com/'"
    cmd += " -H 'Accept: application/json'"
    if (cookie) cmd += " -H 'Cookie: " + String(cookie).replace(/['"]/g, '') + "'"
    if (opts.body) {
      cmd += " -H 'Content-Type: application/x-www-form-urlencoded' --data '" + String(opts.body).replace(/'/g, '%27') + "'"
    }
    const spec = shell.resolve({ command: cmd, timeoutMs: 15000, stdoutMaxBytes: 4194304 })
    const result = await runShell(shell, spec)
    if (result.exitCode !== 0) {
      // 不回显 stderr：bash 语法错误会把完整命令行（含内部拼接细节）透给调用方
      throw new Error('curl 失败 (' + result.exitCode + ')')
    }
    return String(result.stdout.text || '')
  }

  async function getJSON(path, params, opts) {
    opts = opts || {}
    const url = (opts.base || BASE) + path + toQuery(params || {})
    const ttl = opts.ttl || 0
    // cookie_expired 降级：登录 Cookie 失效时，公开数据改用匿名种子 Cookie 重试，
    // 避免过期登录态毒化所有匿名可用的行情接口（云端专属接口失败照常抛错）。
    let anonymous = opts.anonymous === true

    async function attempt(depth) {
      const err = await (async function () {
        let text
        try { text = await core.curl(url, { cookie: opts.cookie, anonymous: anonymous }) } catch (e) { return { kind: 'network', message: e.message, retryable: depth < 1 } }
        if (!text) return { kind: 'empty', message: '雪球返回空响应（可能被风控）', retryable: true }
        let data
        try { data = JSON.parse(text) } catch (e) { return { kind: 'parse', message: '响应解析失败: ' + text.slice(0, 120), retryable: false } }
        const cls = classifyError(data)
        if (cls) return { kind: cls.kind, message: cls.desc, code: cls.code, retryable: cls.retryable }
        // kline 陷阱：缺 u cookie 时返回 200 + 空 items 且无 column（静默失败）
        const d = data && data.data
        if (path.indexOf('/chart/kline') !== -1 && d && typeof d === 'object'
          && !Array.isArray(d.column) && String(d.items_size || '0') === '0') {
          return { kind: 'empty_kline', message: '无K线数据（检查代码是否正确，如 SH600519；大陆网络下也可能是 cookie 种子不完整）', retryable: true }
        }
        return { data: data }
      })()

      if (!err.kind) return err.data
      if (!err.retryable || depth >= 2) throw new Error('[' + err.kind + '] ' + err.message)

      if (err.kind === 'cookie_expired' || err.kind === 'empty' || err.kind === 'empty_kline') {
        if (err.kind === 'cookie_expired' && !anonymous && opts.cookie === undefined && core.login) {
          anonymous = true   // 登录 Cookie 被判失效：先降级匿名重试
        }
        await core.ensureCookie(true)   // 重新播种 cookie 后再试
      } else if (err.kind === 'rate_limited') {
        await core.delay(2000 * (depth + 1)) // 指数退避：2s → 4s
      } else if (err.kind === 'network') {
        await core.delay(500)
      }
      return attempt(depth + 1)
    }

    const hit = core.cacheGet(url, ttl)
    if (hit !== undefined) return Promise.resolve(hit)
    const pending = core.inflight.get(url)
    if (pending) return pending
    const p = core.gate(function () { return attempt(0) }).then(function (data) {
      if (ttl > 0) core.cachePut(url, data)
      return data
    })
    p.then(function () { core.inflight.delete(url) }, function () { core.inflight.delete(url) })
    core.inflight.set(url, p)
    return p
  }

  core.ensureCookie = ensureCookie
  core.curl = curl
  core.getJSON = getJSON
}

// 状态文件落点：稳定目录（$DSH_HOME/dsh-xueqiu）优先，工作区回退。读/写/旧路径回读都在这里。

/**
 * $DSH_HOME 基址：`DSH_HOME`，缺失时退回 `(HOME || USERPROFILE) + '/.dsh'`；末尾斜杠剥掉。
 * 拿不到（无环境变量 / process 不可用）返回 ''，调用方自己决定回退策略。
 * 抽成独立纯函数是为了让「今日盈亏」侧复用同一套基址（见 lib/pnl/store.js）。
 */
function dshHomeBase() {
  try {
    const env = (typeof process !== 'undefined' && process && process.env) || {}
    const home = env.DSH_HOME || ((env.HOME || env.USERPROFILE) ? (env.HOME || env.USERPROFILE) + '/.dsh' : '')
    return home ? String(home).replace(/[/\\]+$/, '') : ''
  } catch (e) { return '' }
}

function installState(core) {
  const ctx = core.ctx

  // ---- 状态文件落点：稳定目录优先，工作区回退 ----
  // 旧实现 cwd=工作区根 → 状态文件跟着 dsh web 启动目录漂移（换目录启动=换一套
  // 自选/登录/界面状态）。现在优先写 $DSH_HOME/dsh-xueqiu/（writeText 自动建目录），
  // 沙箱策略拒绝工作区外绝对路径时探测失败，透明回退旧工作区行为（零回归）。
  // 读取顺序：稳定文件 → 缺失则回读旧工作区文件（存量数据无缝迁移，首次保存落到稳定目录）。
  function stableStateDir() {
    try {
      // 目录名可由插件配置覆盖（默认 dsh-xueqiu，与上游存量数据无缝继承；见 lib/config.js）
      const base = dshHomeBase()
      return base ? base + '/' + core.config.stateDir : ''
    } catch (e) { return '' }
  }
  function stateBase(fs, root) {
    if (!core.stateBasePromise) {
      core.stateBasePromise = (async function () {
        const dir = stableStateDir()
        if (!fs || !dir) return ''
        try {
          const probe = await fs.resolve(dir + '/.write-probe', { cwd: root })
          await fs.writeText(probe, String(Date.now()))
          return dir
        } catch (e) { return '' }
      })()
    }
    return core.stateBasePromise
  }
  // 读：稳定文件优先；稳定模式且稳定文件缺失时，回读旧工作区路径（迁移源）
  async function stateRead(name, fs, root) {
    const dir = await stateBase(fs, root)
    if (dir) {
      try { return await fs.readText(await fs.resolve(dir + '/' + name, { cwd: root })) } catch (e) { /* 试旧工作区 */ }
    }
    if (!root) return null
    try { return await fs.readText(await fs.resolve(name, { cwd: root })) } catch (e) { return null }
  }
  // 写：稳定模式写稳定目录；否则旧工作区。返回真实落点（排障暴露用）
  async function stateWrite(name, text, fs, root) {
    const dir = await stateBase(fs, root)
    const target = await fs.resolve(dir ? dir + '/' + name : name, { cwd: root })
    await fs.writeText(target, text)
    return target
  }

  core.stateBase = stateBase
  core.stateRead = stateRead
  core.stateWrite = stateWrite
}

// 可选登录（粘贴浏览器 Cookie）、JWT 解析、云端自选组合读写与迁移回读相关的动作。


function installLogin(core) {
  const ctx = core.ctx

  // ---- 可选登录：粘贴浏览器 Cookie（借鉴 xueqiu-cli 手动模式）----
  // 雪球登录态 = xq_a_token(+xq_id_token/u) 两个 Cookie，本地解析 JWT 即可拿到 uid/昵称/过期时间
  function b64urlDecode(s) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
    const map = {}
    for (let i = 0; i < chars.length; i++) map[chars[i]] = i
    let bits = 0, acc = 0, out = ''
    for (let i = 0; i < s.length; i++) {
      const v = map[s[i]]
      if (v === undefined) continue
      acc = (acc << 6) | v
      bits += 6
      if (bits >= 8) {
        bits -= 8
        out += String.fromCharCode((acc >> bits) & 0xff)
      }
    }
    // UTF-8 多字节还原：先转码单元再 decode
    try { return decodeURIComponent(out.split('').map(function (c) { return '%' + ('0' + c.charCodeAt(0).toString(16)).slice(-2) }).join('')) }
    catch (e) { return out }
  }

  function decodeJwt(token) {
    try {
      const parts = String(token).split('.')
      if (parts.length < 2) return null
      return JSON.parse(b64urlDecode(parts[1]))
    } catch (e) { return null }
  }

  function cookieJar(cookie) {
    const jar = {}
    String(cookie || '').split(';').forEach(function (kv) {
      const i = kv.indexOf('=')
      if (i > 0) jar[kv.slice(0, i).trim()] = kv.slice(i + 1).trim()
    })
    return jar
  }

  function cleanCookieInput(raw) {
    let c = String(raw || '').trim()
    if (/^cookie\s*:/i.test(c)) c = c.replace(/^cookie\s*:\s*/i, '')
    return c.replace(/[\r\n]+/g, ' ').trim()
  }

  // 登录文件真实落点（稳定目录优先，见 stateBase）——排障时绝不靠猜，
  // login.status 会把这个真实路径暴露出去。
  async function loginFilePath() {
    const fs = ctx.get('fs')
    const sp = ctx.get('sandboxPolicy')
    const root = sp && sp.workspaceRoot ? sp.workspaceRoot : null
    if (!fs) return null
    try {
      const dir = await core.stateBase(fs, root)
      return await fs.resolve(dir ? dir + '/.xueqiu-login.json' : '.xueqiu-login.json', { cwd: root })
    } catch (e) { return null }
  }

  async function loadLogin() {
    if (core.login !== null) return core.login
    const fs = ctx.get('fs')
    const sp = ctx.get('sandboxPolicy')
    const root = sp && sp.workspaceRoot ? sp.workspaceRoot : null
    if (fs) {
      try {
        const text = await core.stateRead('.xueqiu-login.json', fs, root)
        const parsed = text == null ? null : JSON.parse(text)
        if (parsed && parsed.cookie && /xq_a_token=/.test(parsed.cookie)) core.login = parsed
      } catch (e) { /* 未登录 */ }
    }
    return core.login
  }

  async function saveLogin() {
    const fs = ctx.get('fs')
    const target = await loginFilePath()
    if (!fs || !target) return
    try {
      await fs.writeText(target, JSON.stringify(core.login || {}))
    } catch (e) { /* 保持内存态 */ }
  }

  // 云端自选股：默认组合 pid 探测 + 股票列表（读端点，pysnowball api_ref 同款）
  // 真实账号的默认自选在 stocks 系统分类里（负数 pid，「全部」id=-1 含沪深/港/美股全部），
  // portfolios 字段仅在老接口形态/个人组合账号出现，作为回退。
  function pickCloudPid(data) {
    const cats = data.stocks || []
    for (let i = 0; i < cats.length; i++) {
      const c = cats[i]
      if (c && (c.name === '全部' || c.id === -1) && (c.pid || c.id)) return c.pid || c.id
    }
    if (cats.length && (cats[0].pid || cats[0].id)) return cats[0].pid || cats[0].id
    const portfolios = data.portfolios || []
    const def = portfolios[0] || null
    return def ? (def.pid || def.id || def.portfolio_id || null) : null
  }

  async function fetchCloudWatchlist() {
    const plist = await core.getJSON('/v5/stock/portfolio/list.json', { system: 'true' }, {})
    const data = (plist && plist.data) || plist || {}
    const pid = pickCloudPid(data)
    if (!pid) return { pid: null, symbols: [] }
    core.cloudPid = pid
    const s = await core.getJSON('/v5/stock/portfolio/stock/list.json', { size: 200, category: 1, pid: pid }, {})
    const stocks = ((s && s.data && s.data.stocks) || (s && s.data) || [])
    const symbols = []
    for (let i = 0; i < stocks.length; i++) {
      const sym = stocks[i] && (stocks[i].stock_symbol || stocks[i].symbol)
      if (sym && symbols.indexOf(sym) === -1) symbols.push(sym)
    }
    return { pid: pid, symbols: symbols }
  }

  async function ensureCloudPid() {
    if (core.cloudPid) return core.cloudPid
    try { await fetchCloudWatchlist() } catch (e) { /* 未登录或接口变动 */ }
    return core.cloudPid
  }

  // 云端加/删自选（尽力而为：端点为网页端行为，失败静默回退本地）
  // 云端加/删自选（真实端点：portfolio/stock/add.json / cancel.json，POST form）
  // 写失败静默（下次云端为准同步会纠正本地），成功则双端一致
  async function cloudWatchAdd(symbol) {
    if (!core.login) return
    await core.curl(BASE + '/v5/stock/portfolio/stock/add.json', { method: 'POST', body: 'symbols=' + enc(symbol) + '&category=1' })
  }

  async function cloudWatchDelete(symbol) {
    if (!core.login) return
    await core.curl(BASE + '/v5/stock/portfolio/stock/cancel.json', { method: 'POST', body: 'symbols=' + enc(symbol) })
  }

  async function actLoginStatus() {
    const lg = await loadLogin()
    const path = await loginFilePath()
    if (!lg) return { loggedIn: false, path: path }
    // 本地 JWT 过期预检：过期则提示重登（不自动清除，等用户确认）
    let expired = false
    const jar = cookieJar(lg.cookie)
    const jwt = jar.xq_id_token ? decodeJwt(jar.xq_id_token) : null
    if (jwt && jwt.exp && Date.now() / 1000 > jwt.exp) expired = true
    // 登录文件缺 uid/screenName 字段时（旧版写入/手工编辑）回退到 JWT 解码值
    let uid = lg.uid || null
    let screenName = lg.screenName || ''
    if (jwt && !expired) {
      if (!uid) uid = jwt.uid || null
      if (!screenName) screenName = String(jwt.cn || jwt.screen_name || jwt.name || '')
    }
    return { loggedIn: !expired, expired: expired, screenName: screenName, uid: uid, path: path, savedAt: lg.savedAt || null }
  }

  async function actLoginSave(args) {
    const cookie = cleanCookieInput(args.cookie)
    if (!cookie || cookie.indexOf('xq_a_token=') === -1) {
      throw new Error('Cookie 中缺少 xq_a_token，请确认复制的是已登录雪球的完整 Cookie 请求头')
    }
    const jar = cookieJar(cookie)
    let uid = null, screenName = ''
    const jwt = jar.xq_id_token ? decodeJwt(jar.xq_id_token) : null
    if (jwt) {
      uid = jwt.uid || null
      screenName = String(jwt.cn || jwt.screen_name || jwt.name || '')
      if (jwt.exp && Date.now() / 1000 > jwt.exp) {
        throw new Error('Cookie 已过期（登录令牌有效期已过），请重新登录雪球后复制新 Cookie')
      }
    }
    if (!uid && jar.u) uid = jar.u
    // 远端校验 + 探测默认自选组合（不走 getJSON 重试链，校验失败直接报给用户）
    const url = BASE + '/v5/stock/portfolio/list.json' + toQuery({ system: 'true' })
    let plist
    try {
      const text = await core.curl(url, { cookie: cookie })
      plist = JSON.parse(text)
    } catch (e) {
      throw new Error('无法访问雪球校验 Cookie: ' + String((e && e.message) || e))
    }
    const cls = classifyError(plist)
    if (cls) throw new Error('Cookie 校验失败 [' + cls.code + ']: ' + cls.desc + '（请确认浏览器处于登录状态后重新复制）')
    core.login = { cookie: cookie, uid: uid, screenName: screenName, savedAt: Date.now() }
    core.cloudPid = null
    await saveLogin()
    // 登录成功即强制同步一次云端自选（云端为准镜像；失败不阻塞登录）
    let symbols = null
    try {
      await core.maybeAutoSync(true)
      symbols = (core.watchlist || {}).symbols
    } catch (e) { /* 云端自选拉取失败，保留本地列表 */ }
    return { loggedIn: true, screenName: screenName, uid: uid, symbols: symbols }
  }

  async function actLoginLogout() {
    core.login = null
    core.cloudPid = null
    await saveLogin()   // 写入 {} 清空
    return { loggedIn: false }
  }

  async function actWatchlistPull() {
    const lg = await loadLogin()
    if (!lg) throw new Error('未登录：请先在「账号」中粘贴 Cookie 登录')
    const changed = await core.maybeAutoSync(true)   // 手动按钮：绕过节流强制同步（云端为准镜像）
    if (changed === false) {
      // 同步判定未变化或失败：仍给按钮一个明确的拉取结果
      const cloud = await core.fetchCloudWatchlist().catch(function () { return { symbols: [] } })
      if (!cloud.symbols.length) throw new Error('同步失败：无法获取云端自选（Cookie 可能已过期）')
    }
    return { symbols: (core.watchlist || {}).symbols || [] }
  }

  core.loadLogin = loadLogin
  core.fetchCloudWatchlist = fetchCloudWatchlist
  core.cloudWatchAdd = cloudWatchAdd
  core.cloudWatchDelete = cloudWatchDelete
  core.actLoginStatus = actLoginStatus
  core.actLoginSave = actLoginSave
  core.actLoginLogout = actLoginLogout
  core.actWatchlistPull = actWatchlistPull
}

// 本地自选表：状态文件读写 + 登录态下「云端为准」的后台自动同步 + 增删动作。


function installWatchlist(core) {
  const ctx = core.ctx

  // ---- watchlist ----
  async function loadWatchlist() {
    if (core.watchlist) return core.watchlist
    // 默认自选表来自插件配置（未配置时即重构前的硬编码 6 只；见 lib/config.js）
    core.watchlist = { symbols: core.config.watchlist.slice() }
    const fs = ctx.get('fs')
    const sp = ctx.get('sandboxPolicy')
    const root = sp && sp.workspaceRoot ? sp.workspaceRoot : null
    if (fs) {
      try {
        const text = await core.stateRead('.xueqiu-watchlist.json', fs, root)
        const parsed = text == null ? null : JSON.parse(text)
        if (parsed && Array.isArray(parsed.symbols) && parsed.symbols.length) {
          core.watchlist = { symbols: parsed.symbols.slice(0, 200), lastSyncAt: Number(parsed.lastSyncAt) || 0 }
        }
      } catch (e) { /* 首次运行或无写权限时使用默认列表 */ }
    }
    return core.watchlist
  }

  async function saveWatchlist() {
    const fs = ctx.get('fs')
    const sp = ctx.get('sandboxPolicy')
    const root = sp && sp.workspaceRoot ? sp.workspaceRoot : null
    if (!fs) return
    try {
      await core.stateWrite('.xueqiu-watchlist.json', JSON.stringify(core.watchlist), fs, root)
    } catch (e) { /* 保持内存态 */ }
  }

  async function actWatchlistGet() {
    const wl = await loadWatchlist()
    await maybeAutoSync()   // 登录态：节流后台同步云端自选（云端为准）
    return { symbols: (core.watchlist || wl).symbols }
  }

  // 后台自动同步（登录态 · 云端为准的双端统一）：
  // - 节流 10 分钟（lastSyncAt 持久化在 .xueqiu-watchlist.json）
  // - 云端列表直接镜像到本地：网页端加/删都会被跟随
  // - 本地 add/remove 本就双写云端；若云端写失败，下次同步会被镜像纠正（统一语义）
  // - 静默失败：cookie 过期等异常不影响 watchlist.get 返回
  async function maybeAutoSync(force) {
    const lg = await core.loadLogin()
    if (!lg || core.syncInflight) return false
    const wl = await loadWatchlist()
    const last = Number(wl.lastSyncAt) || 0
    if (!force && Date.now() - last < SYNC_INTERVAL_MS) return false
    core.syncInflight = true
    try {
      const cloud = await core.fetchCloudWatchlist()
      if (!cloud.symbols.length) {
        // 空结果不镜像（接口异常/账号无自选都不该清空本地），但必须推进 lastSyncAt——
        // 否则 cookie 半失效时节流永不生效，每次 watchlist.get 都重复打上游 2 个请求
        wl.lastSyncAt = Date.now()
        core.watchlist = wl
        await saveWatchlist()
        return false
      }
      const cur = wl.symbols
      const changed = cur.length !== cloud.symbols.length || cloud.symbols.some(function (s, i) { return cur[i] !== s })
      if (changed) {
        core.watchlist = { symbols: cloud.symbols.slice(0, 200), lastSyncAt: Date.now() }
      } else {
        wl.lastSyncAt = Date.now()
        core.watchlist = wl
      }
      await saveWatchlist()
      return changed
    } catch (e) {
      return false   // 静默：debug RPC 可观察 login/cookie 状态
    } finally {
      core.syncInflight = false
    }
  }

  async function actWatchlistAdd(args) {
    const symbol = String(args.symbol || '')
    if (!/^[A-Za-z0-9_.]+$/.test(symbol)) throw new Error('无效代码: ' + symbol)
    const wl = await loadWatchlist()
    if (wl.symbols.indexOf(symbol) === -1) {
      wl.symbols.push(symbol)
      await saveWatchlist()
      core.cloudWatchAdd(symbol).catch(function () { /* 尽力而为：失败由下次同步纠正 */ })   // 云端添加失败不影响本地
    }
    return { symbols: wl.symbols }
  }

  async function actWatchlistRemove(args) {
    const symbol = String(args.symbol || '')
    const wl = await loadWatchlist()
    const i = wl.symbols.indexOf(symbol)
    if (i !== -1) {
      wl.symbols.splice(i, 1)
      await saveWatchlist()
      core.cloudWatchDelete(symbol).catch(function () { /* 尽力而为：失败由下次同步纠正 */ })   // 云端删除失败不影响本地
    }
    return { symbols: wl.symbols }
  }

  core.loadWatchlist = loadWatchlist
  core.maybeAutoSync = maybeAutoSync
  core.actWatchlistGet = actWatchlistGet
  core.actWatchlistAdd = actWatchlistAdd
  core.actWatchlistRemove = actWatchlistRemove
}

// UI 状态持久化（tab/open/hidden/dockH/badgeW/badgePos/badgeCompact）与它的读写动作。字段语义与钳制逐字保留。
//
// hidden 是「行情隐身」开关（见 FORK-NOTES §11）：唯一一个**不是布局**的字段，
// 它决定三个常驻入口（输入框上方面板 / 悬浮徽章 / 底部指数条）是否挂载。
// 宿主只负责存取，不做任何行情调度判断 —— 客户端不挂载组件，轮询自然不起。

function installUiState(core) {
  const ctx = core.ctx

  // ---- UI 状态持久化 ----
  async function loadUiState() {
    if (core.uiState) return core.uiState
    core.uiState = { pos: null, tab: 'market', minimized: false, badgeCompact: false }
    const fs = ctx.get('fs')
    const sp = ctx.get('sandboxPolicy')
    const root = sp && sp.workspaceRoot ? sp.workspaceRoot : null
    if (fs) {
      try {
        const text = await core.stateRead('.xueqiu-ui-state.json', fs, root)
        const parsed = text == null ? null : JSON.parse(text)
        if (parsed && typeof parsed === 'object') core.uiState = parsed
      } catch (e) { /* 默认状态 */ }
    }
    return core.uiState
  }

  async function saveUiState() {
    const fs = ctx.get('fs')
    const sp = ctx.get('sandboxPolicy')
    const root = sp && sp.workspaceRoot ? sp.workspaceRoot : null
    if (!fs) return
    try {
      await core.stateWrite('.xueqiu-ui-state.json', JSON.stringify(core.uiState), fs, root)
    } catch (e) { /* 保持内存态 */ }
  }

  async function actUiGet() {
    const s = await loadUiState()
    const hNum = Number(s.dockH)
    const validTabs = ['market', 'hot', 'search', 'news', 'pnl', 'positions']
    return {
      // 损坏状态文件的非法 tab 一律回退（防类型穿透）
      tab: (typeof s.tab === 'string' && validTabs.indexOf(s.tab) >= 0) ? s.tab : 'market',
      // v1.22.8 引入回归：open 字段曾被上一行的行尾注释吞掉，导致客户端刷新后不恢复面板开合状态
      open: s.open !== false,
      // 隐身开关：缺省必须是 false（老状态文件里没有这个键 → 一切照旧，不能变成隐身）
      hidden: s.hidden === true,
      dockH: (s.dockH !== undefined && isFinite(hNum) && hNum >= 160 && hNum <= 1200) ? hNum : null,
      badgeW: (s.badgeW !== undefined && isFinite(Number(s.badgeW)) && Number(s.badgeW) >= 120 && Number(s.badgeW) <= 480) ? Number(s.badgeW) : null,
      badgeCompact: s.badgeCompact === true,
      badgePos: (s.badgePos && isFinite(Number(s.badgePos.x)) && isFinite(Number(s.badgePos.y)))
        ? { x: Number(s.badgePos.x), y: Number(s.badgePos.y) } : null
    }
  }

  async function actUiSet(args) {
    const s = await loadUiState()
    if (args.tab !== undefined) s.tab = String(args.tab)
    if (args.open !== undefined) s.open = !!args.open
    if (args.badgeCompact !== undefined) s.badgeCompact = !!args.badgeCompact
    // 逐字段白名单：新增字段必须显式登记，否则客户端 ui.set 会「点了没反应也不报错」。
    if (args.hidden !== undefined) s.hidden = !!args.hidden
    if (args.badgePos && typeof args.badgePos === 'object' && isFinite(Number(args.badgePos.x)) && isFinite(Number(args.badgePos.y))) {
      s.badgePos = { x: Number(args.badgePos.x), y: Number(args.badgePos.y) }
    }
    // null = 显式复位（客户端"双击复位/默认高度"会发送 null）；
    // 不能走 Number(null)=0 的钳制路径，否则复位被写成了下限值(120/160)
    if (args.dockH !== undefined) {
      if (args.dockH === null) { s.dockH = null }
      else {
        const dh = Number(args.dockH)
        if (isFinite(dh)) s.dockH = Math.min(Math.max(dh, 160), 1200)
      }
    }
    if (args.badgeW !== undefined) {
      if (args.badgeW === null) { s.badgeW = null }
      else {
        const bw = Number(args.badgeW)
        if (isFinite(bw)) s.badgeW = Math.min(Math.max(bw, 120), 480)
      }
    }
    await saveUiState()
    return { ok: true }
  }

  core.actUiGet = actUiGet
  core.actUiSet = actUiSet
}

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
const ACCOUNT_LIST_URL = 'https://tzzb.10jqka.com.cn/caishen_httpserver/tzzb/caishen_fund/pc/account/v1/account_list'
/**
 * 账户级当日盈亏分时端点。**只在手动同步时顺带取一次**，用来说明「账本口径」与
 * 「本地浮动口径」差多少（账本含当日已实现与费用），不再作为实时数据源。
 */
const PNL_URL = 'https://tzzb.10jqka.com.cn/caishen_httpserver/tzzb/caishen_fund/pc/asset/v1/time_share'
/**
 * 持仓明细端点。前端 service 层 `requestStockPosition`（PC bundle 里的 `s.jJ`）指向
 * `/caishen_fund/pc/asset/v1/stock_position`，请求体与 time_share 同族，响应 ex_data.position[]
 * 里 `count`=股数、`cost`=持仓成本价（摊薄成本）—— 字段对照见 FORK-NOTES「持仓同步」一节。
 */
const STOCK_POSITION_URL = 'https://tzzb.10jqka.com.cn/caishen_httpserver/tzzb/caishen_fund/pc/asset/v1/stock_position'
/** 账本网页端同款 UA（account_list 网关只认最小请求头，UA 必须与网页一致）。 */
const PNL_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'
/** 金额字段的候选名（接口未公开、字段名可能变），按优先级探测。 */
const YK_KEYS = ['yk', 'today_yk', 'day_yk', 'todayyk', 'yk_today', 'today_profit', 'profit']

/**
 * 实时盈亏的刷新间隔：**行情**的节奏，不是账本的。
 * 默认 30 秒（比原来 60 秒的账本心跳更密，但打的是雪球、有 10 秒缓存与并发闸门兜着）；
 * 用户可在「盈亏」tab 调整（秒），越界夹到 [MIN, MAX]。
 */
const DEFAULT_POLL_MS = 30_000
/** 刷新间隔下限：5 秒（再密没有意义，雪球侧 10s 缓存会直接命中）。 */
const MIN_POLL_MS = 5_000
/** 刷新间隔上限（1 小时）。 */
const MAX_POLL_MS = 3_600_000

/** 状态目录名（**必须与 dsh-ths-pnl 相同**：两边共用同一份 Cookie）。 */
const PNL_STATE_DIR = 'dsh-ths-pnl'
/** 凭据文件（Cookie / fundKey / pollSec），读-改-写合并式。 */
const CONFIG_FILE = 'config.json'
/**
 * 本地持仓文件。**这是主数据**：用户手改的就是它，云端同步也是写它。
 * 只存输入字段（code / name / qty / cost），价格与盈亏一律现算、不落盘 ——
 * 否则「编辑股数后现价还是旧的」这种自相矛盾的状态一定会出现。
 */
const POSITIONS_FILE = 'positions.json'
/**
 * 持仓文件的结构版本号。历次变更：
 *   v3：账本快照（行内是账本派生字段：price/value/hold_profit/day_profit…）；
 *   v4：**本地持仓**（行内只有 code/name/qty/cost，价格与盈亏由行情现算）。
 * v3 → v4 会自动迁移（只取四个输入字段），不需要用户重录。
 */
const POSITIONS_SCHEMA = 4
/**
 * 云端同步失败后的「冷却提示」时长（10 分钟）。**不拦用户**（同步是用户刻意点的，他有权再试），
 * 只用于在界面上说明「刚失败过，多半还是同一个原因」，避免反复点造成无谓的打点。
 */
const BLOCKED_BACKOFF_MS = 10 * 60_000
/** Cookie 长度上限：RPC body 上限 1MB，这里再兜一层，防止把整个浏览器 Cookie 灌进状态文件。 */
const MAX_COOKIE_LEN = 8_192

/**
 * HTTP 状态码探针标记：curl `-w '\n__HTTP__%{http_code}'` 把状态码追加在 stdout 末尾。
 * 没有这个标记就拿不到状态码，也就无法区分「会话失效(401)」「账本网关拒绝(403 + HTML)」
 * 和「接口报错(200 + error_code)」。
 */
const HTTP_MARK = '__HTTP__'

/**
 * dsh-ths-pnl — A 股交易时段判定（纯函数，可测试，无依赖）
 *
 * 一切以**北京时间**（UTC+8）为准，不依赖机器本地时区。
 * 中国 1991 年后无夏令时，所以固定偏移即可；读取时用 UTC getter 拿到"北京墙上时间"。
 *
 * 时段划分：
 *   09:30–11:30  上午盘（含 09:30 边界）
 *   11:31–12:59  午间休市
 *   13:00–15:00  下午盘（含 15:00 边界）
 *   其余         盘前 / 收盘后 / 周末
 *
 * 已知边界：**法定节假日无法离线判断** —— 节假日按交易日处理，会照常轮询，
 * 但账本返回的是上一个交易日的收盘值（数值不变，因此界面不会"持续跳动"）。
 */

/** 中国标准时间 UTC+8（毫秒）。 */
const CS_OFFSET_MS = 8 * 60 * 60 * 1000

/** 09:30 开盘。 */
const OPEN_MIN = 9 * 60 + 30
/** 11:30 上午收盘。 */
const MORNING_END_MIN = 11 * 60 + 30
/** 13:00 下午开盘。 */
const AFTERNOON_START_MIN = 13 * 60
/** 15:00 收盘。 */
const CLOSE_MIN = 15 * 60

/**
 * 调度边界（北京时间，必须按时间升序）：定时器与客户端都只在这些时刻醒来。
 *
 * **13:00 必须在这里** —— 它不算"每天必须拉一次"的硬边界，但它是午休的出口：
 * 11:31 起客户端会睡到"下一个边界"，若边界表里没有 13:00，这一觉直接睡到 15:00，
 * 整个下午盘不会发出任何请求，角标就一路冻结在「午间」。
 */
const BOUNDARIES = [
  [9, 30],
  [13, 0],
  [15, 0],
]

function pad(n) {
  return n < 10 ? `0${n}` : String(n)
}

/** 把瞬时时间平移到"北京墙上时间"，随后用 getUTC* 读取即可。 */
function beijing(now = new Date()) {
  return new Date(now.getTime() + CS_OFFSET_MS)
}

/** 由北京墙上时间的年月日构造真实瞬时（UTC Date）。 */
function beijingInstant(year, month /* 1-12 */, day, hour, minute) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - CS_OFFSET_MS)
}

/**
 * 当前所处时段。
 * @returns {{date:string, minutes:number, weekday:number, weekend:boolean,
 *            state:'pre'|'morning'|'lunch'|'afternoon'|'after'|'weekend',
 *            inSession:boolean, isTradingDay:boolean}}
 */
function sessionInfo(now = new Date()) {
  const b = beijing(now)
  const year = b.getUTCFullYear()
  const month = b.getUTCMonth() + 1
  const day = b.getUTCDate()
  const weekday = b.getUTCDay() // 0=周日
  const minutes = b.getUTCHours() * 60 + b.getUTCMinutes()
  const weekend = weekday === 0 || weekday === 6

  let state
  if (weekend) state = 'weekend'
  else if (minutes < OPEN_MIN) state = 'pre'
  else if (minutes <= MORNING_END_MIN) state = 'morning'
  else if (minutes < AFTERNOON_START_MIN) state = 'lunch'
  else if (minutes <= CLOSE_MIN) state = 'afternoon'
  else state = 'after'

  return {
    date: `${year}-${pad(month)}-${pad(day)}`,
    minutes,
    weekday,
    weekend,
    state,
    inSession: state === 'morning' || state === 'afternoon',
    isTradingDay: !weekend,
  }
}

/**
 * 边界容差：**刚过去不到这么久的边界仍算作"下一个"**。
 *
 * 为什么需要：宿主定时器若比边界早 1 毫秒触发，严格"只取未来"的实现会把这次
 * 边界整个跳过、直接排到下一个（明天 09:30），于是 15:00 的收盘拉取就丢了 ——
 * 而"每天 09:30 / 15:00 必须各拉一次"是硬需求。给一点回看窗口即可消除这个竞态。
 */
const BOUNDARY_TOLERANCE_MS = 1500

/**
 * 下一个边界时刻（09:30 / 13:00 / 15:00，跳过周末）。
 * @returns {Date|null} 真实瞬时；找不到（异常）时返回 null。
 */
function nextBoundary(now = new Date()) {
  const b = beijing(now)
  const base = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())
  for (let i = 0; i < 10; i++) {
    const d = new Date(base + i * 24 * 60 * 60 * 1000)
    const dow = d.getUTCDay()
    if (dow === 0 || dow === 6) continue
    for (const [hour, minute] of BOUNDARIES) {
      const instant = beijingInstant(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), hour, minute)
      if (instant.getTime() > now.getTime() - BOUNDARY_TOLERANCE_MS) return instant
    }
  }
  return null
}

/** 距下一个边界的毫秒数（找不到时给一个保守的 1 小时）。 */
function msUntilNextBoundary(now = new Date()) {
  const next = nextBoundary(now)
  if (next === null) return 60 * 60 * 1000
  return Math.max(1000, next.getTime() - now.getTime())
}

/**
 * 该不该去账本拉一次？
 *
 * 规则（按优先级）：
 *   1. 从未有过快照 → 拉一次（否则非交易时段首次安装会一直空白）；
 *   2. 盘中（含 09:30 与 15:00 两个边界）→ 拉；
 *   3. 收盘后且**今天还没拉过收盘值** → 拉一次（保证 15:00 那次落到收盘价）；
 *   4. 开盘后且**今天还没拉过** → 拉一次（保证 09:30 那次，比如服务刚启动）；
 *   5. 其余（盘前 / 午间 / 收盘后已拉过 / 周末已有快照）→ 不拉，用缓存值。
 *
 * @param {object} info - sessionInfo(now)
 * @param {object|null} snap - 已缓存的快照（含 sessionDate / closeDate）
 * @returns {boolean}
 */
function shouldFetch(info, snap) {
  if (snap === null || snap === undefined) return true
  if (info.inSession) return true
  if (!info.isTradingDay) return false
  if (info.minutes >= CLOSE_MIN && snap.closeDate !== info.date) return true
  if (info.minutes >= OPEN_MIN && snap.sessionDate !== info.date) return true
  return false
}

/** 客户端下次轮询间隔：盘中按心跳；盘外直接睡到下一个边界。 */
function nextPollMs(info, now = new Date(), heartbeatMs = 60_000) {
  if (info.inSession) return heartbeatMs
  return Math.max(30_000, msUntilNextBoundary(now) + 1500)
}

// 今日盈亏：Cookie 规整 / 字段锚定解析 + **能拿到 HTTP 状态码**的 curl 请求。
//
// 为什么另起一套 curl 而不复用宿主 lib/http.js：那边的 curl() 是雪球专用（Referer /
// Accept / 重试链 / 并发闸门全是写死的），而且**不输出状态码** —— 账本恰恰要靠状态码
// 区分「Cookie 过期（401/403）」「接口报错（200 + error_code）」和「网关重定向」。
// 所以这里自拼命令，用 `-w '\n__HTTP__%{http_code}'` 探针把状态码一次取回。
//
// 动态形态可用性：import 只走相对路径的宿主模块，shell 走 ctx.get('shell')，无裸 fetch。


/**
 * 凭据存储里可能被 YAML 折行而插入空格，破坏 base64/JWT；
 * 按 ';' 切开、逐段去掉所有空白、再用标准 '; ' 拼回。
 */
function normalizeCookie(cookie) {
  return String(cookie ?? '')
    .split(/;\s*/)
    .map(part => part.replace(/\s+/g, ''))
    .filter(part => part.length > 0)
    .join('; ')
}

/**
 * 取 Cookie 里的一个字段。**必须锚定**：裸 /userid=/ 会匹配到
 * pex_userid 之类的其它 cookie，账本会因此返回 403（上游真实事故）。
 */
function cookieField(cookie, field) {
  const m = String(cookie ?? '').match(new RegExp(`(?:^|;\\s*)${field}=([^;]*)`))
  return m?.[1]
}

/**
 * 从 curl stdout 里切出 body 与 HTTP 状态码。
 * 用 lastIndexOf：接口响应体自身若含 '__HTTP__' 字样也不会被误切。
 * @returns {{status:number, text:string}} status=0 表示没拿到探针（异常输出）
 */
function splitStatus(stdout) {
  const idx = stdout.lastIndexOf('\n' + HTTP_MARK)
  if (idx < 0) return { status: 0, text: stdout }
  const raw = stdout.slice(idx + HTTP_MARK.length + 1)
  return { status: Number(raw.trim()) || 0, text: stdout.slice(0, idx) }
}

/**
 * POST 一个表单（不带 -L：凭据类请求绝不跟随重定向，Cookie 不能外泄到别的 origin）。
 * @param {object} core - 宿主 core（用它的 ctx 取 shell）
 * @param {string} url
 * @param {string} body - x-www-form-urlencoded 请求体
 * @param {string} cookie
 * @param {{minimal?:boolean}} [opts] - minimal=true 时**只带 User-Agent**（account_list 网关要求）
 * @returns {Promise<{status:number, text:string}>}
 */
const pnlRequest = async function (core, url, body, cookie, opts) {
  const o = opts || {}
  const shell = core.ctx.get('shell')
  if (!shell) throw new Error('shell 服务不可用，无法访问投资账本')
  let cmd = CURL + " -s --max-time 15 -X POST '" + url + "'"
  cmd += " -H 'User-Agent: " + PNL_UA + "'"
  if (o.minimal !== true) {
    // account_list 网关只认最小请求头：多带 Accept/Referer 会被拒（上游踩过的坑）
    cmd += " -H 'Accept: application/json, text/plain, */*'"
    cmd += " -H 'Accept-Language: zh-CN,zh;q=0.9'"
    cmd += " -H 'Referer: https://tzzb.10jqka.com.cn/pc/index.html'"
  }
  const ck = normalizeCookie(cookie)
  if (ck) cmd += " -H 'Cookie: " + ck.replace(/['"]/g, '') + "'"
  cmd += " --data '" + String(body).replace(/'/g, '%27') + "'"
  cmd += " -w '\\n" + HTTP_MARK + "%{http_code}'"
  const spec = shell.resolve({ command: cmd, timeoutMs: 20000, stdoutMaxBytes: 1048576 })
  const result = await runShell(shell, spec)
  if (!result || result.exitCode !== 0) {
    // 不回显 stderr：shell 语法错误会把完整命令行（含内部拼接细节）透给调用方
    throw new Error('curl 失败 (' + ((result && result.exitCode) ?? '?') + ')')
  }
  return splitStatus(String((result.stdout && result.stdout.text) || ''))
}

// 今日盈亏：组合列表 / 盈亏采集 / Cookie 校验（同花顺投资账本）。
//
// 三个坑逐字继承自旧插件（都是真实事故）：
//   1. account_list 网关**只认最小请求头**（UA，多带 Accept/Referer 会被拒）；
//   2. Cookie 里的 userid 必须**锚定**解析，否则会读到 pex_userid（→ 403）；
//   3. 凭据类请求**绝不跟随重定向**（Cookie 不能外泄到别的 origin）。


/** 3xx：网关重定向（旧实现 redirect:'manual' 拒绝跟随，这里同样按异常报出来）。 */
const PNL_REDIRECT_STATUS = new Set([301, 302, 303, 307, 308])

/**
 * 403 的响应体是不是账本前置 Nginx 的通用拒绝页（HTML），而不是会话失效的 JSON。
 *
 * 为什么要分：两者处置不同。上游给的这条通用页**不区分原因**（实测），至少两种都会长这样：
 *   - **Cookie 里的令牌过期/轮换**（`v` 这类反爬令牌有 TTL）—— 真实事故就是它：用户重新从账本页面
 *     复制 Cookie 粘贴后立刻恢复，而同一时刻**浏览器一直正常**（浏览器自己会刷新令牌）；
 *   - **突发请求触发限流** —— 这时该停手等待，连发只会延长窗口。
 * 所以文案**不能**断言是哪一种（早先写成「不是 Cookie 过期」，正好把用户引到错误方向、白等 10 分钟），
 * 而要同时给出两条线索与各自的处置。JSON 形态的 403 才是明确的会话失效。
 */
function isWafPage(text) {
  const t = String(text == null ? '' : text).trim()
  if (t === '') return false
  return t.charAt(0) === '<' || /Nginx forbidden/i.test(t)
}

/** 通用 403 拒绝页的用户可读说明（两种可能 + 各自的动作，不替上游下结论）。 */
const GATEWAY_403_TEXT = '账本网关拒绝 (HTTP 403)：Cookie 里的令牌可能已过期'
  + '（从账本页面重新复制 Cookie 即可恢复），也可能只是风控限流（停一会儿会自动恢复）；已暂停重试'

/**
 * POST 表单并解析 JSON（错误语义与旧插件的 postForm 一一对应）。
 * @returns {{ok:true, body:object}|{ok:false, tokenExpired:boolean, blocked:boolean, error:string}}
 */
async function postPnlForm(core, url, payload, cookie, opts) {
  let res
  try {
    res = await pnlRequest(core, url, payload, cookie, opts)
  } catch (error) {
    return { ok: false, tokenExpired: false, blocked: false, error: '网络错误: ' + String((error && error.message) || error) }
  }
  const status = Number(res.status) || 0
  if (PNL_REDIRECT_STATUS.has(status)) {
    return { ok: false, tokenExpired: false, blocked: false, error: '接口重定向未跟随 (HTTP ' + status + ')' }
  }
  if (status === 401) {
    return { ok: false, tokenExpired: true, blocked: false, error: 'TOKEN_EXPIRED (HTTP 401)' }
  }
  if (status === 403) {
    // 403 分两种：通用拒绝页（HTML，原因见 isWafPage 注释）≠ 会话失效（JSON）
    if (isWafPage(res.text)) {
      return { ok: false, tokenExpired: false, blocked: true, error: GATEWAY_403_TEXT }
    }
    return { ok: false, tokenExpired: true, blocked: false, error: 'TOKEN_EXPIRED (HTTP 403)' }
  }
  if (status < 200 || status >= 300) {
    return { ok: false, tokenExpired: false, blocked: false, error: 'HTTP ' + status }
  }
  try {
    return { ok: true, body: JSON.parse(res.text) }
  } catch (e) {
    return { ok: false, tokenExpired: false, blocked: false, error: '响应解析失败' }
  }
}

/** 取 Cookie 里的 userid（锚定解析，见文件头第 2 条）。 */
function pnlUserId(cookie) {
  return cookieField(normalizeCookie(cookie), 'userid') || ''
}

/** account_list 的请求体（旧插件逐字）。 */
function accountPayload(userId) {
  return 'terminal=1&version=0.0.0&userid=' + userId + '&user_id=' + userId
}

/** 从最后一个采样点里探出金额字段。 */
function pickYk(point) {
  for (const key of YK_KEYS) {
    if (point?.[key] !== undefined && point?.[key] !== null) {
      return { value: Number(point[key]) || 0, field: key }
    }
  }
  return { value: 0, field: '' }
}

/** 组合账户列表（fund_key / manualname / brokername）。失败返回空数组（调用方决定文案）。 */
const listPortfolios = async function (core, cookie) {
  const userId = pnlUserId(cookie)
  const r = await postPnlForm(core, ACCOUNT_LIST_URL, accountPayload(userId), cookie, { minimal: true })
  if (!r.ok) return []
  const common = r.body?.ex_data?.common ?? []
  return common
    .map(item => ({
      fund_key: String(item?.fund_key ?? ''),
      manualname: String(item?.manualname ?? ''),
      brokername: String(item?.brokername ?? ''),
    }))
    .filter(p => p.fund_key.length > 0)
}

/**
 * 取一次快照：今日盈亏金额 + 百分比（金额字段名动态探测）。
 * @returns {{pnl_yk:number, pnl_pct:number, error:string, token_expired:boolean, blocked:boolean, yk_field:string}}
 */
const collectPnl = async function (core, cookie, fundKey) {
  const userId = pnlUserId(cookie)
  const payload = accountPayload(userId)
    + '&manual_id=&fundid=&fund_key=' + String(fundKey ?? '') + '&rzrq_fund_key=&custid='
  const r = await postPnlForm(core, PNL_URL, payload, cookie)
  if (!r.ok) {
    return { pnl_yk: 0, pnl_pct: 0, error: r.error, token_expired: r.tokenExpired, blocked: r.blocked, yk_field: '' }
  }
  if (r.body?.error_code !== undefined && String(r.body.error_code) !== '0') {
    return { pnl_yk: 0, pnl_pct: 0, error: String(r.body?.error_msg ?? 'API 错误'), token_expired: false, blocked: false, yk_field: '' }
  }
  const points = r.body?.ex_data?.data ?? []
  if (points.length === 0) {
    return { pnl_yk: 0, pnl_pct: 0, error: '接口返回空数据（可能今日无成交/未上传数据）', token_expired: false, blocked: false, yk_field: '' }
  }
  const last = points[points.length - 1]
  const yk = pickYk(last)
  return {
    pnl_yk: yk.value,
    pnl_pct: Number(last?.zf) || 0,
    error: '',
    token_expired: false,
    blocked: false,
    yk_field: yk.field,
  }
}

/** 容错取数：允许 `HK$1.234`、`1,234.5`、空串这类上游写法；取不到给 null（界面显示 `--`，不假装是 0）。 */
function toNum(value) {
  if (value === undefined || value === null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const cleaned = String(value).replace(/HK\$/gi, '').replace(/,/g, '').trim()
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/**
 * 比率 → 百分数。**账本这一族接口的比率字段都是小数比率**，不是百分数（实测原始字符串对比）：
 *
 *   - `position_rate` 0.9568 / 0.7329 = 总市值/总资产（与 Σcount×price ÷ total_asset 逐位相等）；
 *   - `hold_rate` -0.0623 = 该只持仓收益率（-620/(9330+620) = -6.23% 逐位吻合）；
 *   - `pre_rate` -0.0002 = 当日收益率（同族字段，同为小数）。
 *
 * 上游给的是 4 位小数，直接当百分数渲染会**小 100 倍**（「-0.06%」看着像没波动，实际 -6%）。统一在
 * 这里乘 100，兼容将来改成百分数口径的上游：|n| > 1.5 视为已经是百分数（注意这条启发式的灰色地带——
 * 若上游某天真改发百分数，0~1.5% 的区间会被放大 100 倍；届时按此注释改判据）。
 * 乘完做 6 位取整，消掉 0.086×100 = 8.600000000000001 这类浮点毛刺。
 */
function ratioPct(value) {
  const n = toNum(value)
  if (n === null) return null
  if (Math.abs(n) <= 1.5) return Math.round(n * 100 * 1e6) / 1e6
  return n
}

/**
 * 一行**本地持仓**（positions.json 里的形状）。只有输入字段：
 *
 *   code 证券代码（唯一键）· name 名称 · qty 股数 · cost 持仓成本价（摊薄成本）
 *
 * 价格 / 市值 / 当日盈亏 / 持仓盈亏**一律现算、不落盘**（见 index.js 的 buildView）——
 * 一旦落盘，用户改完股数后现价里还带着旧值，界面就会自相矛盾。
 * 字段名与雪球行情层对齐（code/name），股数与成本价沿用账本口径（count/cost 的语义）。
 *
 * @returns {{code:string,name:string,qty:number|null,cost:number|null}|null} 代码为空返回 null
 */
function normalizeRow(raw) {
  const r = raw || {}
  let code = String(r.code == null ? '' : r.code).trim().toUpperCase()
  // 港股：账本写 `HK00700`、雪球写 `00700`、用户可能两种都填 —— 统一成雪球形态（5 位裸代码），
  // 否则同一个标的会以两个键存在，合并/去重全部失效。
  const hk = /^HK(\d{5})$/.exec(code)
  if (hk) code = hk[1]
  if (!code) return null
  const qty = toNum(r.qty)
  const cost = toNum(r.cost)
  return {
    code: code,
    name: String(r.name == null ? '' : r.name).trim(),
    // 负股数/负成本没有意义（做空、负成本价不在本插件范围内）——收敛到 0 而不是静默取反。
    qty: (qty !== null && qty < 0) ? 0 : qty,
    cost: (cost !== null && cost < 0) ? 0 : cost,
  }
}

/** 规整一整张持仓表：逐行 normalize，按 code 去重（后出现的覆盖先出现的），丢掉认不出的行。 */
function normalizeRows(list) {
  const out = []
  const seen = Object.create(null)
  const arr = Array.isArray(list) ? list : []
  for (const raw of arr) {
    const row = normalizeRow(raw)
    if (!row) continue
    if (seen[row.code] !== undefined) {
      out[seen[row.code]] = row
      continue
    }
    seen[row.code] = out.length
    out.push(row)
  }
  return out
}

/**
 * 一行**账本**持仓 → 本地持仓行。
 *
 * 只取 count（股数）与 cost（持仓成本价 = 摊薄成本，用户明确要的就是这一列），
 * 其余字段一概不取：账本给的价格/盈亏是**它自己的快照时刻**的值，进了本地库就会过期，
 * 而本地口径一律用行情现算（见 dayProfitOf / dayRateOf）。
 *
 * 顺带记住一个口径事实（别再踩）：账本的 pre_profit/pre_rate 是**昨日**盈亏、before_pre_* 是
 * **前日**，不是当日；上游没有逐只当日字段（前端行模型里 dryk/drykb 也是显式 null）。
 */
function mapLedgerRow(row) {
  const r = row || {}
  return normalizeRow({
    code: r.code,
    name: r.name,
    qty: r.count,
    cost: r.cost,
  })
}

/**
 * 账本持仓代码 → 雪球行情代码。
 *
 * 以**代码形态**为准，不依赖账本的 `market` 枚举（实测沪市=2、深市=1，但那是账本内部枚举、
 * 含义未公开，不能当契约）：
 *   6 / 9 开头 → 沪市（600/601/603/605/688 沪A、900 B股）
 *   5 开头     → 沪市基金（510300 等）
 *   0 / 1 / 2 / 3 开头 → 深市（000/002/300 深A、1xx 深市基金/ETF、200 B股）
 *   5 位纯数字 / 带 HK 前缀 → 港股（雪球用 5 位裸代码，如 00700）
 *   字母开头   → 原样（美股等）
 * 认不出来给空串：该只当日盈亏显示 --，不影响其余字段。
 */
function positionSymbol(code, market) {
  const raw = String(code == null ? '' : code).trim().toUpperCase().replace(/^HK/, '')
  if (!raw) return ''
  if (/^\d{5}$/.test(raw)) return raw
  if (/^\d{6}$/.test(raw)) {
    const head = raw.charAt(0)
    if (head === '5' || head === '6' || head === '9') return 'SH' + raw
    if (head === '0' || head === '1' || head === '2' || head === '3') return 'SZ' + raw
    return ''
  }
  if (/^[A-Z][A-Z0-9.]*$/.test(raw)) return raw
  return ''
}

/** 保留两位小数（金额）。 */
function round2(n) { return Math.round(n * 100) / 100 }

/**
 * 当日盈亏（元）。账本接口不给逐只当日值（见 mapLedgerRow），所以一律用行情现算：
 *
 *   当日盈亏 =（雪球现价 − 雪球昨收）× 本地股数
 *
 * 为什么不用「市值 × 行情涨跌幅」：行情涨跌幅只有两位小数，取整误差会被市值放大
 * （实测 君正 -2.95% × 23050 = -700.64，而真实是 -700.00）。用昨收能逐分对齐。
 * 昨收缺失时退化成「市值 × pct/(100+pct)」；两者都缺 → null（界面 --，不假装 0）。
 */
function dayProfitOf(price, qty, lastClose, pct, value) {
  const p = toNum(price)
  const q = toNum(qty)
  const lc = toNum(lastClose)
  if (p !== null && q !== null && lc !== null && lc > 0) return round2((p - lc) * q)
  const v = toNum(value)
  const pc = toNum(pct)
  if (v !== null && pc !== null && pc > -100) return round2(v * pc / (100 + pc))
  return null
}

/** 当日涨跌幅（百分数）= 现价 / 昨收 − 1；昨收缺失时用行情涨跌幅原样。 */
function dayRateOf(price, lastClose, pct) {
  const p = toNum(price)
  const lc = toNum(lastClose)
  if (p !== null && lc !== null && lc > 0) return Math.round((p / lc - 1) * 100 * 1e4) / 1e4
  const pc = toNum(pct)
  return pc === null ? null : pc
}

/**
 * 从账本取一次持仓（**只有用户点「从账本同步」时才会走到这里**，见 index.js 的 actPositionsSync）。
 *
 * 请求体与 time_share **同族**（`terminal/version/userid/user_id/manual_id/fundid/fund_key/
 * rzrq_fund_key/custid`）—— 实测该形状原样可用，故不额外带 `is_merge`（前端默认合仓开关关闭时
 * 也不带，行为一致）。刻意不做任何写操作，本函数只读。
 *
 * 返回的行只有 code/name/qty/cost（本地口径），账户合计单独回传给「同步报告」用 ——
 * 账本给的价格与盈亏是它自己的快照时刻的值，不进本地库。
 *
 * @returns {{rows:Array, summary:object|null, error:string, token_expired:boolean, blocked:boolean}}
 */
const collectPositions = async function (core, cookie, fundKey) {
  const userId = pnlUserId(cookie)
  const payload = accountPayload(userId)
    + '&manual_id=&fundid=&fund_key=' + String(fundKey ?? '') + '&rzrq_fund_key=&custid='
  const r = await postPnlForm(core, STOCK_POSITION_URL, payload, cookie)
  if (!r.ok) {
    return { rows: [], summary: null, error: r.error, token_expired: r.tokenExpired, blocked: r.blocked }
  }
  if (r.body?.error_code !== undefined && String(r.body.error_code) !== '0') {
    return { rows: [], summary: null, error: String(r.body?.error_msg ?? 'API 错误'), token_expired: false, blocked: false }
  }
  const ex = r.body?.ex_data ?? {}
  const rows = Array.isArray(ex.position) ? ex.position.map(mapLedgerRow).filter(Boolean) : []
  return {
    rows: rows,
    summary: {
      // 字段含义**由真实数据自证**（不是猜字段名）：实测
      //   total_value  = Σ(count×price) = 持仓总市值（90217.4）
      //   total_asset  = total_value + money_remain = 总资产（94291.79）
      //   position_rate= total_value / total_asset = 0.9568（**小数比率**）
      //   upload_time  = 账本数据时间（epoch 毫秒字符串）
      money_remain: toNum(ex.money_remain),
      total_value: toNum(ex.total_value),
      total_asset: toNum(ex.total_asset),
      position_rate: toNum(ex.position_rate),
      position_pct: ratioPct(ex.position_rate),
      total_liability: toNum(ex.total_liability),
      upload_time: String(ex.upload_time ?? ''),
    },
    error: '',
    token_expired: false,
    blocked: false,
  }
}

/** 校验 Cookie 是否被账本接受，并顺带回传组合列表。 */
const verifyCookie = async function (core, cookie) {
  const ck = normalizeCookie(cookie)
  if (!ck) return { valid: false, error: '未配置 Cookie', portfolios: [] }
  const userId = pnlUserId(ck)
  if (!userId) return { valid: false, error: 'Cookie 缺少 userid 字段，可能已失效', portfolios: [] }
  const r = await postPnlForm(core, ACCOUNT_LIST_URL, accountPayload(userId), ck, { minimal: true })
  if (!r.ok) {
    return {
      valid: false,
      error: r.tokenExpired ? 'Cookie 已过期，请重新登录投资账本后重新粘贴' : r.error,
      portfolios: [],
    }
  }
  const code = r.body?.error_code
  if (code !== undefined && String(code) !== '0') {
    return { valid: false, error: '账本拒绝请求: ' + String(r.body?.error_msg ?? '未知错误'), portfolios: [] }
  }
  const portfolios = await listPortfolios(core, ck)
  return { valid: true, error: '', portfolios: portfolios, user_id: userId }
}

// 状态文件读写：账本**凭据**（config.json）+ **本地持仓**（positions.json）。
//
// 为什么持仓要独立一份、而且是主数据：持仓大多数时间不变，用户还可能想手改（补一只、改股数、
// 删掉已清仓的）。它是「输入」，价格与盈亏是「输出」——输出绝不落盘（见 constants.js 的说明）。
//
// 旧快照文件 snapshot.json 属于「账本分时口径」时代（每分钟一次的账户级盈亏），已不再读写：
// 留着不动，也不会被本插件删除（旧插件 dsh-ths-pnl 若还在用，它的数据不受影响）。
//
// 落点解析与宿主 state.js 同套路（稳定目录优先 + 沙箱可写性探测 + 工作区回退），
// 但**独立 memo** core.pnlBasePromise：两套东西的默认目录不同、探测失败时机也不同。


/** 目标目录（$DSH_HOME/<pnlStateDir>）；拿不到基址返回 ''（调用方走工作区回退）。 */
function pnlStateDirOf(core) {
  try {
    const base = dshHomeBase()
    const name = (core.config && core.config.pnlStateDir) ? core.config.pnlStateDir : PNL_STATE_DIR
    return base ? base + '/' + name : ''
  } catch (e) { return '' }
}

/** 稳定目录是否可写（写一个 .write-probe 探针），结果 memo 在 core.pnlBasePromise。 */
function pnlStateBase(core) {
  if (!core.pnlBasePromise) {
    core.pnlBasePromise = (async function () {
      const fs = core.ctx.get('fs')
      const sp = core.ctx.get('sandboxPolicy')
      const root = sp && sp.workspaceRoot ? sp.workspaceRoot : null
      const dir = pnlStateDirOf(core)
      if (!fs || !dir) return ''
      try {
        const probe = await fs.resolve(dir + '/.write-probe', { cwd: root })
        await fs.writeText(probe, String(Date.now()))
        return dir
      } catch (e) { return '' }
    })()
  }
  return core.pnlBasePromise
}

/** 读：稳定文件优先；稳定模式且稳定文件缺失时回读旧工作区路径（迁移源）。 */
const pnlStateRead = async function (core, name) {
  const fs = core.ctx.get('fs')
  const sp = core.ctx.get('sandboxPolicy')
  const root = sp && sp.workspaceRoot ? sp.workspaceRoot : null
  if (!fs) return null
  const dir = await pnlStateBase(core)
  if (dir) {
    try { return await fs.readText(await fs.resolve(dir + '/' + name, { cwd: root })) } catch (e) { /* 试旧工作区 */ }
  }
  if (!root) return null
  try { return await fs.readText(await fs.resolve(name, { cwd: root })) } catch (e) { return null }
}

/** 写：稳定模式写稳定目录，否则旧工作区。返回真实落点。 */
const pnlStateWrite = async function (core, name, text) {
  const fs = core.ctx.get('fs')
  const sp = core.ctx.get('sandboxPolicy')
  const root = sp && sp.workspaceRoot ? sp.workspaceRoot : null
  if (!fs) throw new Error('fs 服务不可用，无法保存状态文件')
  const dir = await pnlStateBase(core)
  const target = await fs.resolve(dir ? dir + '/' + name : name, { cwd: root })
  await fs.writeText(target, String(text))
  return target
}

/** 读凭据（config.json）。任何异常都退化成 {}：没配置 ≠ 报错。 */
const loadPnlConfig = async function (core) {
  try {
    const text = await pnlStateRead(core, CONFIG_FILE)
    const parsed = text == null ? null : JSON.parse(text)
    return (parsed && typeof parsed === 'object') ? parsed : {}
  } catch (e) { return {} }
}

/**
 * 写凭据：**读-改-写合并**（与旧插件 saveState 同语义），pretty JSON。
 * 写失败会抛错 —— 用户必须知道「Cookie 没存上」，不能静默成功。
 */
const savePnlConfig = async function (core, patch) {
  const cur = await loadPnlConfig(core)
  const next = Object.assign({}, cur, patch || {})
  await pnlStateWrite(core, CONFIG_FILE, JSON.stringify(next, null, 2))
  return next
}

// ---- 本地持仓（positions.json）----

/** 空持仓表：首次使用 / 文件损坏 / schema 认不出来时的兜底（**不会**让界面报错）。 */
function emptyPositions(extra) {
  return Object.assign({
    schema: POSITIONS_SCHEMA,
    updated_at: null,      // 本地最后一次修改（增删改都会刷新）
    rows: [],              // 输入字段：code / name / qty / cost
    cloud: null,           // 最后一次云端同步的元信息（见 index.js 的 syncMeta）
  }, extra || {})
}

/**
 * 读本地持仓。**永不返回 null**（调用方不必到处判空）：读不到就是空表。
 *
 * 兼容两代结构：
 *   v4 → 直接用；
 *   v3（账本快照）→ 只取 code/name/qty/cost 四个输入字段迁移成 v4，
 *                   派生字段（price/value/hold_profit/day_profit…）一律丢弃 —— 它们是
 *                   账本某个时刻的快照，留着会让「编辑股数后现价不动」自相矛盾。
 * 其它（损坏 / 未来版本 / 空文件）→ 空表。
 */
const loadPositions = async function (core) {
  let parsed = null
  try {
    const text = await pnlStateRead(core, POSITIONS_FILE)
    parsed = text == null ? null : JSON.parse(text)
  } catch (e) { parsed = null }
  if (!parsed || typeof parsed !== 'object') return emptyPositions()

  const rows = normalizeRows(parsed.rows)
  const cloud = (parsed.cloud && typeof parsed.cloud === 'object') ? parsed.cloud : null
  const version = Number(parsed.schema)
  if (version === POSITIONS_SCHEMA) {
    return {
      schema: POSITIONS_SCHEMA,
      updated_at: parsed.updated_at || null,
      rows: rows,
      cloud: cloud,
    }
  }
  // 旧结构（≤ v3）：能迁多少迁多少，`migrated_from` 让界面/日志能说清数据是哪来的。
  return emptyPositions({
    rows: rows,
    cloud: cloud,
    updated_at: parsed.updated_at || null,
    migrated_from: Number.isFinite(version) ? version : 'unknown',
  })
}

/**
 * 写本地持仓。**抛错**（与凭据一致）：写不进去就不能假装保存成功 ——
 * 用户刚改的股数丢了却弹出「已保存」，比直接报错糟糕得多。
 */
const savePositions = async function (core, store) {
  const s = store || {}
  const next = {
    schema: POSITIONS_SCHEMA,
    updated_at: s.updated_at || null,
    rows: normalizeRows(s.rows),
    cloud: (s.cloud && typeof s.cloud === 'object') ? s.cloud : null,
  }
  await pnlStateWrite(core, POSITIONS_FILE, JSON.stringify(next, null, 2))
  return next
}

// 持仓 + 今日盈亏：installPnl(core)
//
// 数据流（全部现算，**一个定时器都没有**）：
//
//   本地持仓 positions.json ──┐
//                              ├─→ buildView() ─→ RPC「positions.get」 ─→ 界面
//   雪球行情 batch/quote      ─┘        （20 只一批，命中 10 秒 TTL 缓存）
//
// 账本（同花顺投资账本）只出现在两处：
//   · actPositionsSync —— 用户**刻意点击**「从账本同步」时，拉一次持仓（顺带账户级今日盈亏）；
//   · actPnlVerify / actPnlSave —— 同步用的凭据（Cookie / 组合）读写与校验。
// 节奏由客户端驱动（宿主回传 poll_ms / next_poll_ms，盘中按心跳、盘外睡到下一个边界），
// 所以浏览器关掉就彻底不发请求 —— 这是对账本最友好的形态，也是本插件的兜底：账本凭据废了，
// 只要本地持仓在，当日盈亏照样实时。
//
// 为什么不再让账本当实时数据源（真实事故，别改回去）：账本要求一个由页面 JS（chameleon）生成、
// 寿命很短的反爬令牌，浏览器会不断重新生成，我们的静态快照过窗口就整片 403。历史版本没有任何
// 续期手段，当年能用只是因为上游接受长期冻结的快照。把实时口径压在这样一份凭据上 = 每小时断一次。
// 详见 FORK-NOTES 的「本地持仓」一节。


/** 保留两位小数（金额）。 */
function round2(n) { return Math.round(n * 100) / 100 }
/** 保留四位小数（百分数）。 */
function round4(n) { return Math.round(n * 10000) / 10000 }

/**
 * 把用户填的秒数规整成合法的毫秒间隔。
 * 非数字 / NaN / 非正数返回 null（调用方回退默认值）；越界夹到 [MIN, MAX]。
 */
function clampPollMs(value) {
  const sec = typeof value === 'string' ? Number(value.trim()) : Number(value)
  if (!Number.isFinite(sec) || sec <= 0) return null
  return Math.min(MAX_POLL_MS, Math.max(MIN_POLL_MS, Math.round(sec * 1000)))
}

/** 生效的行情刷新间隔：存盘秒数（钳制过）> 默认 30 秒。 */
function pnlPollMs(state) {
  const ms = clampPollMs(state && state.pollSec)
  return ms === null ? DEFAULT_POLL_MS : ms
}

/** 批量取行情 → { SYMBOL: quote }。失败/无行情给空表（逐行留 null，不把整次视图判失败）。 */
async function quoteMap(core, symbols, force) {
  const by = Object.create(null)
  const list = Array.isArray(symbols) ? symbols : []
  if (!list.length || typeof core.actQuote !== 'function') return by
  for (let i = 0; i < list.length; i += 20) {
    try {
      // force=false 时命中雪球侧 10 秒 TTL 缓存：面板其它 tab 也在刷同一批标的，能省就省。
      const res = await core.actQuote({ symbols: list.slice(i, i + 20), force: force === true })
      const items = (res && Array.isArray(res.list)) ? res.list : []
      for (const q of items) {
        if (q && q.symbol) by[String(q.symbol).toUpperCase()] = q
      }
    } catch (e) { /* 行情取不到 → 逐行给 null */ }
  }
  return by
}

/** 行合计。**逐行已取整后再相加**，保证界面上的合计 == 各行显示值之和（用户真的会去加）。 */
function totalsOf(rows) {
  let value = null, costValue = null, dayProfit = null, dayBase = null, holdProfit = null
  let held = 0, missing = 0
  for (const r of rows) {
    const qty = toNum(r.qty)
    if (qty === null || qty <= 0) continue
    held++
    if (r.value === null || r.value === undefined) missing++
    if (r.value !== null && r.value !== undefined) value = round2((value || 0) + r.value)
    if (r.cost_value !== null && r.cost_value !== undefined) costValue = round2((costValue || 0) + r.cost_value)
    if (r.day_profit !== null && r.day_profit !== undefined) dayProfit = round2((dayProfit || 0) + r.day_profit)
    if (r.prev_close !== null && r.prev_close !== undefined) dayBase = round2((dayBase || 0) + r.prev_close * qty)
    if (r.hold_profit !== null && r.hold_profit !== undefined) holdProfit = round2((holdProfit || 0) + r.hold_profit)
  }
  return {
    held: held,                 // 计入合计的只数（股数 > 0）
    missing: missing,           // 取不到现价的只数（合计因此不完整）
    value: value,               // 持仓市值 Σ(现价 × 股数)
    cost_value: costValue,      // 持仓成本 Σ(成本价 × 股数)
    day_profit: dayProfit,      // 今日盈亏 Σ(当日盈亏)
    // 今日涨跌幅的基数 = Σ(昨收 × 股数)；与「市值」不同分母，别混用。
    day_base: dayBase,
    day_rate: (dayProfit !== null && dayBase) ? round4(dayProfit / dayBase * 100) : null,
    hold_profit: holdProfit,    // 持仓盈亏 Σ(现值 − 成本)
    hold_rate: (holdProfit !== null && costValue) ? round4(holdProfit / costValue * 100) : null,
  }
}

/**
 * 组装一次「实时视图」：本地持仓 × 行情 → 逐行派生值 + 合计 + 节奏。
 * **不写盘**：派生值不落盘（见 constants.js 的说明），要展示时现算。
 *
 * @param {{force?:boolean}} [opts] force=true 绕过行情 10 秒缓存（用户点了刷新/同步）
 */
async function buildView(core, opts) {
  const o = opts || {}
  const store = await loadPositions(core)
  const rows = store.rows
  const symbols = []
  for (const r of rows) {
    const sym = positionSymbol(r.code)
    if (sym && symbols.indexOf(sym) < 0) symbols.push(sym)
  }
  const quotes = await quoteMap(core, symbols, o.force)
  const view = rows.map(function (r) {
    const sym = positionSymbol(r.code)
    const q = sym ? quotes[sym.toUpperCase()] : null
    const price = q ? toNum(q.current) : null
    const prev = q ? toNum(q.last_close) : null
    const pct = q ? toNum(q.percent) : null
    const qty = toNum(r.qty)
    const value = (price !== null && qty !== null) ? round2(price * qty) : null
    const costValue = (r.cost !== null && r.cost !== undefined && qty !== null) ? round2(r.cost * qty) : null
    const holdProfit = (value !== null && costValue !== null) ? round2(value - costValue) : null
    const holdRate = (holdProfit !== null && costValue) ? round4(holdProfit / costValue * 100) : null
    const dayProfit = dayProfitOf(price, qty, prev, pct, value)
    return {
      code: r.code,
      name: r.name || (q && q.name ? String(q.name) : ''),
      qty: qty,
      cost: r.cost,
      xq_symbol: sym,
      price: price,                        // 现价（雪球）
      prev_close: prev,                    // 昨收（雪球）
      day_pct: pct,                        // 行情涨跌幅（原样，仅在昨收缺失时兜底用）
      // 金额算不出来时，涨跌幅也不摆出来：一个「-- / +1.50%」的组合只会让人误读成当日涨了 1.5%。
      day_profit: dayProfit,
      day_rate: dayProfit === null ? null : dayRateOf(price, prev, pct),
      value: value,
      cost_value: costValue,
      hold_profit: holdProfit,
      hold_rate: holdRate,
    }
  })
  const totals = totalsOf(view)
  const state = await loadPnlConfig(core)
  const now = new Date()
  const info = sessionInfo(now)
  const pollMs = pnlPollMs(state)
  return {
    configured: true,                    // 本地持仓永远「已配置」——没有账本凭据也能用
    rows: view,
    totals: totals,
    // 本地持仓文件的最后修改时间（用户改了什么，界面据此提示）
    updated_at: store.updated_at || null,
    // 行情时间：本视图的计算时刻；missing 见 totals.missing（> 0 说明合计不完整）
    as_of: now.toISOString(),
    session: info.state,
    in_session: info.inSession,
    poll_ms: pollMs,
    next_poll_ms: nextPollMs(info, now, pollMs),
    // 账本同步元信息（可能为 null）：只影响「持仓从哪来」的展示，不影响任何实时数字
    cloud: store.cloud || null,
    migrated_from: store.migrated_from === undefined ? null : store.migrated_from,
  }
}

function installPnl(core) {
  // 一次视图的内存缓存 + 单飞，避免同一时刻两处调用各拉一遍行情
  core.pnl = { view: null, inflight: null }

  async function getView(opts) {
    if (core.pnl.inflight) return core.pnl.inflight
    let task = null
    task = buildView(core, opts).then(function (view) {
      core.pnl.view = view
      if (core.pnl.inflight === task) core.pnl.inflight = null
      return view
    }, function (e) {
      if (core.pnl.inflight === task) core.pnl.inflight = null
      throw e
    })
    core.pnl.inflight = task
    return task
  }

  /** 落盘一张新表并刷新视图（增删改共用）。 */
  async function persist(rows, cloud) {
    const store = await loadPositions(core)
    await savePositions(core, {
      rows: rows,
      cloud: cloud === undefined ? store.cloud : cloud,
      updated_at: new Date().toISOString(),
    })
    // 不 force：刚改完股数/成本时行情没变，用 10 秒缓存即可（同一批标的的 URL 相同，
    // 命中缓存就不再多打一次雪球）。用户点「刷新」才走 force。
    return getView({})
  }

  /**
   * positions.get —— 取「本地持仓 × 行情」的实时视图。
   * @param {{force?:boolean}} [args] force=true 绕过行情缓存（用户点刷新时用）
   */
  async function actPositionsGet(args) {
    const a = (args && typeof args === 'object') ? args : {}
    return getView({ force: a.force === true })
  }

  /**
   * positions.save —— 新增或修改一行本地持仓。
   * @param {{row:{code,name?,qty,cost?}, originalCode?:string}} args
   *        originalCode：改代码时传原来的代码（不改则不传）；不传时按 row.code 定位
   */
  async function actPositionsSave(args) {
    const a = (args && typeof args === 'object') ? args : {}
    const row = normalizeRow(a.row)
    if (!row) throw new Error('请填写证券代码')
    if (row.qty === null) throw new Error('请填写股数（可填 0 表示已清仓）')
    const store = await loadPositions(core)
    const original = String(a.originalCode == null ? row.code : a.originalCode).trim().toUpperCase()
    const idx = store.rows.findIndex(function (r) { return r.code === original })
    const dup = store.rows.findIndex(function (r) { return r.code === row.code })
    if (dup >= 0 && dup !== idx) throw new Error('代码 ' + row.code + ' 已在持仓里')
    // 名称留空时用行情补一个（顺手校验代码认不认得出来；失败就保持空，界面显示代码）
    if (!row.name) {
      const sym = positionSymbol(row.code)
      if (sym) {
        const q = (await quoteMap(core, [sym], false))[sym.toUpperCase()]
        if (q && q.name) row.name = String(q.name)
      }
    }
    const rows = store.rows.slice()
    if (idx >= 0) rows[idx] = row
    else rows.push(row)
    return persist(rows)
  }

  /** positions.remove —— 删掉一行（code 唯一键）。 */
  async function actPositionsRemove(args) {
    const a = (args && typeof args === 'object') ? args : {}
    const code = String(a.code == null ? '' : a.code).trim().toUpperCase()
    if (!code) throw new Error('缺少要删除的代码')
    const store = await loadPositions(core)
    const rows = store.rows.filter(function (r) { return r.code !== code })
    if (rows.length === store.rows.length) throw new Error('持仓里没有 ' + code)
    return persist(rows)
  }

  /**
   * positions.sync —— **唯一**打账本的实时入口（用户刻意点击）。
   *
   * 合并口径（默认 merge）：
   *   · 账本有、本地有 → 用账本覆盖 qty/cost（账本是股数与成本的来源）。
   *   · 账本有、本地无 → 新增（qty=0 的已清仓标的不加，避免把清仓记录塞进表里）。
   *   · 本地有、账本无 → **保留**（可能是手工录入的、或不在这个组合里），在报告里说明。
   * replace 模式：以账本为准整表替换（用户明确要求时才会走）。
   *
   * 失败（403 / 断网 / 接口报错）只写 cloud 元信息，**绝不碰 rows** ——
   * 这正是这次改造的核心：同步坏了，持仓与当日盈亏照常。
   *
   * @param {{mode?:'merge'|'replace'}} [args]
   */
  async function actPositionsSync(args) {
    const a = (args && typeof args === 'object') ? args : {}
    const mode = a.mode === 'replace' ? 'replace' : 'merge'
    const state = await loadPnlConfig(core)
    const cookie = typeof state.cookie === 'string' ? state.cookie : ''
    if (!cookie) throw new Error('未配置账本 Cookie：要先粘贴一次才能从账本同步（手工录入持仓不需要它）')
    const store = await loadPositions(core)
    const now = new Date()
    const prevCloud = store.cloud || {}

    let fundKey = typeof state.fundKey === 'string' ? state.fundKey : ''
    if (!fundKey) {
      const list = await listPortfolios(core, cookie)
      const first = list.length > 0 ? list[0].fund_key : ''
      if (first) {
        fundKey = first
        try { await savePnlConfig(core, { fundKey: first }) } catch (e) { /* 存不下不影响本次 */ }
      }
    }

    const res = await collectPositions(core, cookie, fundKey)
    if (res.error) {
      const cloud = {
        synced_at: prevCloud.synced_at || null,    // 上一次**成功**的时间不变
        attempted_at: now.toISOString(),
        fund_key: fundKey,
        summary: prevCloud.summary || null,
        account: prevCloud.account || null,
        error: res.error,
        token_expired: Boolean(res.token_expired),
        blocked: Boolean(res.blocked),
        blocked_until: res.blocked ? new Date(now.getTime() + BLOCKED_BACKOFF_MS).toISOString() : null,
      }
      await persist(store.rows, cloud)
      return {
        ok: false,
        error: res.error,
        token_expired: Boolean(res.token_expired),
        blocked: Boolean(res.blocked),
        blocked_until: cloud.blocked_until,
        report: null,
        view: core.pnl.view,
      }
    }

    // 账户级今日盈亏：账本口径（含当日已实现与费用），与「持仓浮动」并列展示用。失败不影响同步。
    const acct = await collectPnl(core, cookie, fundKey)

    const ledgerRows = Array.isArray(res.rows) ? res.rows : []
    const byCode = Object.create(null)
    for (const row of store.rows) byCode[row.code] = row
    const updated = []
    const added = []
    const kept = []
    const cleared = []
    let rows
    if (mode === 'replace') {
      rows = ledgerRows.filter(function (r) { return !(r.qty !== null && r.qty <= 0) })
    } else {
      rows = store.rows.slice()
      for (const lr of ledgerRows) {
        const local = byCode[lr.code]
        if (local) {
          local.qty = lr.qty
          local.cost = lr.cost
          if (lr.name) local.name = lr.name
          if (lr.qty !== null && lr.qty <= 0) cleared.push(lr.code)
          updated.push(lr.code)
        } else if (lr.qty !== null && lr.qty > 0) {
          rows.push(lr)
          added.push(lr.code)
        }
      }
      const ledgerCodes = Object.create(null)
      for (const lr of ledgerRows) ledgerCodes[lr.code] = true
      for (const row of store.rows) if (!ledgerCodes[row.code]) kept.push(row.code)
    }

    const cloud = {
      synced_at: now.toISOString(),
      attempted_at: now.toISOString(),
      fund_key: fundKey,
      summary: res.summary || null,
      account: (acct && !acct.error) ? { pnl_yk: acct.pnl_yk, pnl_pct: acct.pnl_pct, at: now.toISOString() } : (prevCloud.account || null),
      error: '',
      token_expired: false,
      blocked: false,
      blocked_until: null,
    }
    const view = await persist(rows, cloud)
    return {
      ok: true,
      report: { mode: mode, updated: updated, added: added, kept: kept, cleared: cleared, ledger_count: ledgerRows.length },
      account: cloud.account,
      view: view,
    }
  }

  // 上面的失败分支已由 persist 刷新过视图，直接取内存里那一份即可。
  /** pnl.verify —— 校验账本 Cookie 并回传组合列表 + 上次同步状态 + 当前节奏。 */
  async function actPnlVerify() {
    const state = await loadPnlConfig(core)
    const cookie = typeof state.cookie === 'string' ? state.cookie : ''
    const result = await verifyCookie(core, cookie)
    const store = await loadPositions(core)
    return {
      configured: Boolean(cookie),
      valid: result.valid,
      error: result.error,
      portfolios: (result.portfolios ?? []).map(function (p) {
        return { fund_key: p.fund_key, name: p.manualname || p.brokername || p.fund_key }
      }),
      fundKey: typeof state.fundKey === 'string' ? state.fundKey : '',
      cloud: store.cloud || null,
      poll_ms: pnlPollMs(state),
      min_sec: MIN_POLL_MS / 1000,
      max_sec: MAX_POLL_MS / 1000,
    }
  }

  /** pnl.config —— 存账本 Cookie / 组合 / 行情刷新间隔，或 clear 清凭据（**不动本地持仓**）。 */
  async function actPnlSave(args) {
    const a = (args && typeof args === 'object') ? args : {}

    // clear：清 Cookie（本地持仓与同步历史都保留 —— 它们跟凭据是两回事）
    if (a.clear === true) {
      await savePnlConfig(core, { cookie: '', fundKey: '' })
      const cleared = await loadPnlConfig(core)
      return {
        ok: true, configured: false, valid: false, error: '', portfolios: [],
        fundKey: '', poll_ms: pnlPollMs(cleared), poll_sec: pnlPollMs(cleared) / 1000,
        min_sec: MIN_POLL_MS / 1000, max_sec: MAX_POLL_MS / 1000,
      }
    }

    const patch = {}
    if (typeof a.cookie === 'string' && a.cookie.trim().length > 0) {
      const cookie = normalizeCookie(a.cookie.trim())
      if (cookie.length > MAX_COOKIE_LEN) {
        throw new Error('Cookie 过长（超过 ' + MAX_COOKIE_LEN + ' 字符），请只粘贴投资账本需要的字段')
      }
      patch.cookie = cookie
    }
    if (typeof a.fundKey === 'string') patch.fundKey = a.fundKey.trim()
    if (a.pollSec !== undefined && a.pollSec !== null && a.pollSec !== '') {
      const ms = clampPollMs(a.pollSec)
      if (ms === null) throw new Error('刷新间隔请填 5–3600 之间的秒数')
      patch.pollSec = ms / 1000
    }
    if (Object.keys(patch).length === 0) throw new Error('没有可保存的字段')
    await savePnlConfig(core, patch)

    // 存了 Cookie 就当场校验：一次调用即可显示「已保存 / Cookie 无效」
    const verify = patch.cookie ? await verifyCookie(core, patch.cookie) : null
    const saved = await loadPnlConfig(core)
    return {
      ok: true,
      configured: typeof saved.cookie === 'string' && saved.cookie.length > 0,
      valid: verify ? verify.valid : false,
      error: verify ? verify.error : '',
      portfolios: verify ? (verify.portfolios ?? []).map(function (p) {
        return { fund_key: p.fund_key, name: p.manualname || p.brokername || p.fund_key }
      }) : [],
      fundKey: typeof saved.fundKey === 'string' ? saved.fundKey : '',
      poll_ms: pnlPollMs(saved),
      poll_sec: pnlPollMs(saved) / 1000,
      min_sec: MIN_POLL_MS / 1000,
      max_sec: MAX_POLL_MS / 1000,
    }
  }

  core.actPositionsGet = actPositionsGet
  core.actPositionsSave = actPositionsSave
  core.actPositionsRemove = actPositionsRemove
  core.actPositionsSync = actPositionsSync
  core.actPnlVerify = actPnlVerify
  core.actPnlSave = actPnlSave
}

// 16 个 endpoint 对应的业务动作（act*）。只做参数整形 + 调 getJSON + 走 normalizer。


function installApi(core) {
  // ---- actions ----
  async function actQuote(args) {
    const symbols = Array.isArray(args.symbols) ? args.symbols : [String(args.symbols || '')]
    const list = symbols.filter(function (s) { return /^[A-Za-z0-9_.]+$/.test(s) })
    if (!list.length) return { list: [], status: null }
    const data = await core.getJSON('/v5/stock/batch/quote.json', { symbol: list.join(',') }, { ttl: args.force === true ? 0 : 10000 })
    const items = (data && data.data && data.data.items) || []
    const first = items[0]
    const status = first && first.market ? first.market.status_id : null
    return {
      status: nz(status),
      list: items.map(function (it) { return pickQuote(it.quote) }).filter(Boolean)
    }
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

// 持久化价格提醒：规则/事件状态、RPC 动作与宿主轮询 watcher。
// 只依赖 core 的状态文件与行情接口；不使用浏览器可见性、全局定时器或 fetch。


function installAlerts(core) {
  const ctx = core.ctx
  const ALERT_FILE = '.xueqiu-alerts.json'
  const symbolRe = /^[A-Za-z0-9_.]+$/
  let writeTail = Promise.resolve()
  let previous = Object.create(null)
  let eventSeq = 0
  let timerStop = null
  let schedulerAlive = true
  let watcherArmed = false
  let pollInflight = null
  let pollDelay = ALERT_POLL_MS

  function emptyStore() { return { rules: [], events: [] } }

  function validSymbol(value) {
    const symbol = String(value == null ? '' : value).trim()
    return symbol && symbol.length <= ALERT_MAX_SYMBOL_LEN && symbolRe.test(symbol) ? symbol : ''
  }

  function finitePositive(value) {
    const n = typeof value === 'number' && Number.isFinite(value) ? value : Number(value)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  function safeName(value, fallback) {
    const name = String(value == null ? '' : value).trim()
    return (name || fallback).slice(0, ALERT_MAX_NAME_LEN)
  }

  function copyRule(rule) {
    return {
      symbol: rule.symbol, name: rule.name, target: rule.target,
      direction: rule.direction, enabled: rule.enabled, armed: rule.armed
    }
  }

  function copyEvent(event) {
    return {
      id: event.id, symbol: event.symbol, name: event.name,
      current: event.current, target: event.target,
      direction: event.direction, at: event.at
    }
  }

  // 事件身份只由唯一 id 表达：**禁止**按 (symbol, direction, target, current) 判重 ——
  // 触发后 rearm、价格再次穿越同一价位是合法事件，按价格签名抑制会把它吞掉。
  // 这里只保证新 id 不与 store 里已有事件冲突：eventSeq 重启后从 0 重新计数，
  // 理论上可能与旧 id 撞车，而 parseStore 的 id 去重会把撞车的那条当成重复事件丢弃。
  function nextEventId(store, symbol) {
    const stamp = Date.now()
    let id = ''
    do {
      eventSeq = (eventSeq + 1) % 1000000
      id = symbol + '-' + stamp + '-' + eventSeq
    } while (store.events.some(function (event) { return event.id === id }))
    return id
  }

  // 读取时严格规整，损坏、超量或字段异常只会退回安全子集。
  function parseStore(text) {
    const out = emptyStore()
    if (typeof text !== 'string' || !text) return out
    let parsed
    try { parsed = JSON.parse(text) } catch (e) { return out }
    if (!parsed || typeof parsed !== 'object') return out

    const seen = Object.create(null)
    if (Array.isArray(parsed.rules)) {
      for (let i = 0; i < parsed.rules.length && out.rules.length < ALERT_MAX_RULES; i++) {
        const raw = parsed.rules[i]
        if (!raw || typeof raw !== 'object') continue
        const symbol = validSymbol(raw.symbol)
        const target = finitePositive(raw.target)
        const direction = raw.direction === 'above' || raw.direction === 'below' ? raw.direction : ''
        if (!symbol || target === null || !direction || seen[symbol]) continue
        seen[symbol] = true
        out.rules.push({
          symbol: symbol,
          name: safeName(raw.name, symbol),
          target: target,
          direction: direction,
          enabled: raw.enabled !== false,
          armed: raw.armed !== false
        })
      }
    }

    const eventIds = Object.create(null)
    if (Array.isArray(parsed.events)) {
      for (let i = 0; i < parsed.events.length && out.events.length < ALERT_MAX_EVENTS; i++) {
        const raw = parsed.events[i]
        if (!raw || typeof raw !== 'object') continue
        const id = String(raw.id == null ? '' : raw.id).slice(0, 200)
        const symbol = validSymbol(raw.symbol)
        const current = finitePositive(raw.current)
        const target = finitePositive(raw.target)
        const direction = raw.direction === 'above' || raw.direction === 'below' ? raw.direction : ''
        const at = typeof raw.at === 'string' && raw.at.length <= 80 ? raw.at : ''
        if (!id || !symbol || current === null || target === null || !direction || !at || eventIds[id]) continue
        eventIds[id] = true
        out.events.push({
          id: id, symbol: symbol, name: safeName(raw.name, symbol),
          current: current, target: target, direction: direction, at: at
        })
      }
    }
    return out
  }

  async function loadStore() {
    if (core.alertStore) return core.alertStore
    if (core.alertStoreLoad) return core.alertStoreLoad
    core.alertStoreLoad = (async function () {
      const fs = ctx.get('fs')
      const sp = ctx.get('sandboxPolicy')
      const root = sp && sp.workspaceRoot ? sp.workspaceRoot : null
      let text = null
      if (fs) {
        try { text = await core.stateRead(ALERT_FILE, fs, root) } catch (e) { text = null }
      }
      core.alertStore = parseStore(text)
      return core.alertStore
    })()
    try { return await core.alertStoreLoad } finally { core.alertStoreLoad = null }
  }

  // 写入串行化；每次排队时捕获快照，避免并发 action/watcher 交叉覆盖。
  function persist() {
    const snapshot = JSON.stringify(core.alertStore || emptyStore())
    const task = writeTail.catch(function () {}).then(async function () {
      const fs = ctx.get('fs')
      if (!fs) return
      const sp = ctx.get('sandboxPolicy')
      const root = sp && sp.workspaceRoot ? sp.workspaceRoot : null
      try { await core.stateWrite(ALERT_FILE, snapshot, fs, root) } catch (e) { /* 沙箱不可写时保持内存态 */ }
    })
    writeTail = task
    return task
  }

  async function actAlertsGet() {
    const store = await loadStore()
    return { rules: store.rules.map(copyRule), events: store.events.map(copyEvent) }
  }

  async function actAlertsSet(args) {
    const a = args && typeof args === 'object' ? args : {}
    const symbol = validSymbol(a.symbol)
    if (!symbol) throw new Error('无效代码: ' + String(a.symbol == null ? '' : a.symbol))
    const target = finitePositive(a.target)
    if (target === null) throw new Error('target 必须是有限正数')
    if (a.direction !== 'above' && a.direction !== 'below') throw new Error('direction 只能是 above 或 below')
    if (a.enabled !== undefined && typeof a.enabled !== 'boolean') throw new Error('enabled 必须是布尔值')
    const store = await loadStore()
    let rule = store.rules.find(function (item) { return item.symbol === symbol })
    if (!rule) {
      if (store.rules.length >= ALERT_MAX_RULES) throw new Error('提醒规则数量已达上限')
      rule = { symbol: symbol, name: symbol, target: target, direction: a.direction, enabled: a.enabled !== false, armed: true }
      store.rules.push(rule)
    } else {
      rule.target = target
      rule.direction = a.direction
      rule.enabled = a.enabled !== false
      rule.armed = true
    }
    // 规则更新后重新建立该标的基线，避免新阈值被旧价格误判。
    delete previous[symbol]
    await persist()
    if (schedulerAlive && !watcherArmed) arm(ALERT_POLL_MS)
    return { rules: store.rules.map(copyRule) }
  }

  async function actAlertsRemove(args) {
    const a = args && typeof args === 'object' ? args : {}
    const symbol = validSymbol(a.symbol)
    if (!symbol) throw new Error('无效代码: ' + String(a.symbol == null ? '' : a.symbol))
    const store = await loadStore()
    store.rules = store.rules.filter(function (rule) { return rule.symbol !== symbol })
    delete previous[symbol]
    // 删空即停表，不等 persist 落盘：否则 IO 窗口里 watcher 还会多跑一轮空轮询，
    // 停表也得靠 wake 的兜底才生效。规则还在时保持原有节奏不变。
    if (!store.rules.length) stopTimer()
    await persist()
    return { rules: store.rules.map(copyRule) }
  }

  async function actAlertsAck(args) {
    const a = args && typeof args === 'object' ? args : {}
    const ids = Array.isArray(a.ids) ? a.ids.map(function (id) { return String(id == null ? '' : id) }).filter(Boolean).slice(0, ALERT_MAX_EVENTS) : []
    const store = await loadStore()
    if (ids.length) {
      store.events = store.events.filter(function (event) { return ids.indexOf(event.id) === -1 })
      await persist()
    }
    return { events: store.events.map(copyEvent) }
  }

  function warn(error) {
    try {
      if (ctx.logger && typeof ctx.logger.warn === 'function') ctx.logger.warn(error instanceof Error ? error : new Error(String(error)))
    } catch (e) { /* 日志失败不影响 watcher */ }
  }

  function stopOf(disposable) {
    if (typeof disposable === 'function') return disposable
    if (disposable && typeof disposable.dispose === 'function') return function () { disposable.dispose() }
    return function () {}
  }

  function stopTimer() {
    if (timerStop) {
      try { timerStop() } catch (e) { /* 已停止 */ }
      timerStop = null
    }
    watcherArmed = false
  }

  function arm(ms) {
    if (!schedulerAlive) return
    stopTimer()
    watcherArmed = true
    timerStop = stopOf(ctx.timeout(function () { wake().catch(warn) }, ms))
  }

  // 是否还需要继续轮询：store 已加载且规则为空 → 停表；store 尚未加载出来 → 继续（等规则被读出来）。
  function shouldKeepPolling() {
    if (!schedulerAlive) return false
    if (!core.alertStore) return true
    return core.alertStore.rules.length > 0
  }

  // watcher 唯一的重挂点：所有分支都经由这里，所以「最后一条规则被删掉」之后
  // 不会再被任何在途 poll 续命（旧实现的三段 if/else 链在 pollInflight 分支上会漏掉这条判断）。
  function scheduleNext() {
    if (shouldKeepPolling()) arm(pollDelay)
    else stopTimer()
  }

  async function pollOnce() {
    const wl = await core.loadWatchlist()
    const store = await loadStore()
    if (!store.rules.length) return
    // 读取自选表并把规则标的并入批量请求，避免提醒依赖浏览器页面是否打开。
    const symbols = []
    const add = function (symbol) { if (symbol && symbols.indexOf(symbol) === -1) symbols.push(symbol) }
    const list = wl && Array.isArray(wl.symbols) ? wl.symbols : []
    for (let i = 0; i < list.length; i++) add(validSymbol(list[i]))
    for (let i = 0; i < store.rules.length; i++) add(store.rules[i].symbol)
    if (!symbols.length) return
    const quoted = await core.actQuote({ symbols: symbols, force: true })
    const items = quoted && Array.isArray(quoted.list) ? quoted.list : []
    const bySymbol = Object.create(null)
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const symbol = validSymbol(item && item.symbol)
      const current = finitePositive(item && item.current)
      if (symbol && current !== null) bySymbol[symbol] = { current: current, name: safeName(item.name, symbol) }
    }

    let dirty = false
    const now = new Date().toISOString()
    for (let i = 0; i < store.rules.length; i++) {
      const rule = store.rules[i]
      const quote = bySymbol[rule.symbol]
      if (!quote) continue
      if (quote.name !== rule.name) { rule.name = quote.name; dirty = true }
      const prev = previous[rule.symbol]
      previous[rule.symbol] = quote.current
      if (!rule.enabled) continue
      if (!rule.armed) {
        // 触发后，回到阈值另一侧才重新武装。
        if ((rule.direction === 'above' && quote.current < rule.target) || (rule.direction === 'below' && quote.current > rule.target)) {
          rule.armed = true
          dirty = true
        }
        continue
      }
      // 首次有效报价只建立基线，禁止启动时误触发。
      if (!Number.isFinite(prev)) continue
      const crossed = rule.direction === 'above'
        ? prev < rule.target && quote.current >= rule.target
        : prev > rule.target && quote.current <= rule.target
      if (!crossed) continue
      // 每次穿越都记录一条事件（同价再次穿越也算）—— 唯一性由 nextEventId 保证，不按价格签名抑制。
      store.events.push({
        id: nextEventId(store, rule.symbol),
        symbol: rule.symbol, name: rule.name, current: quote.current,
        target: rule.target, direction: rule.direction, at: now
      })
      if (store.events.length > ALERT_MAX_EVENTS) store.events = store.events.slice(-ALERT_MAX_EVENTS)
      rule.armed = false
      dirty = true
    }
    if (dirty) await persist()
  }

  async function wake() {
    timerStop = null
    if (!schedulerAlive) return
    if (pollInflight) { scheduleNext(); return }
    const task = pollOnce()
    pollInflight = task
    try {
      await task
      pollDelay = ALERT_POLL_MS
    } catch (e) {
      warn(e)
      pollDelay = Math.min(ALERT_MAX_POLL_MS, Math.max(ALERT_POLL_MS, pollDelay * 2))
    } finally {
      if (pollInflight === task) pollInflight = null
      // 以 store 现状决定是否续挂下一轮：删空规则后在途的这一轮跑完就停表，不会自我续命。
      scheduleNext()
    }
  }

  core.alertStore = null
  core.alertStoreLoad = null
  core.actAlertsGet = actAlertsGet
  core.actAlertsSet = actAlertsSet
  core.actAlertsRemove = actAlertsRemove
  core.actAlertsAck = actAlertsAck

  ctx.effect(function () {
    schedulerAlive = true
    // 无规则时不做空轮询；已有持久化规则则在异步加载完成后启动。
    loadStore().then(function (store) {
      if (schedulerAlive && store.rules.length && !watcherArmed) arm(ALERT_POLL_MS)
    }, function (error) {
      warn(error)
      // 初始读失败也要继续尝试，不能让 watcher 因一次沙箱/IO 抖动永久停止。
      if (schedulerAlive) arm(ALERT_POLL_MS)
    })
    return function () {
      schedulerAlive = false
      stopTimer()
      // cleanup 只停止当前 timer；wake 的 finally 看到 schedulerAlive=false 后不会重新挂起。
    }
  }, 'xueqiu-debug: 价格提醒 watcher')
}

// RPC dispatch 表 + handleCall 包络（sanitize 后回 { ok, data } / { ok:false, error }）。


function installActions(core) {
  // ---- RPC dispatch ----
  const dispatch = {
    quote: core.actQuote, quoteDetail: core.actQuoteDetail, kline: core.actKline, minute: core.actMinute,
    hot: core.actHot, search: core.actSearch, searchPosts: core.actSearchPosts, news: core.actNews,
    kol: core.actKOL, user: core.actUser, finance: core.actFinance,
    'watchlist.get': core.actWatchlistGet, 'watchlist.add': core.actWatchlistAdd, 'watchlist.remove': core.actWatchlistRemove,
    'watchlist.pull': core.actWatchlistPull,
    'login.status': core.actLoginStatus, 'login.save': core.actLoginSave, 'login.logout': core.actLoginLogout,
    'ui.get': core.actUiGet, 'ui.set': core.actUiSet,
    // 持仓 + 今日盈亏：**本地持仓 × 雪球行情**现算（宿主侧实现在 lib/pnl/），不需要账本凭据。
    // 账本只在 positions.sync（用户刻意点击的导入/校对）里出现。
    'positions.get': core.actPositionsGet,
    'positions.save': core.actPositionsSave,
    'positions.remove': core.actPositionsRemove,
    'positions.sync': core.actPositionsSync,
    // 账本凭据（Cookie / 组合 / 行情刷新间隔）：只服务 positions.sync
    'pnl.verify': core.actPnlVerify, 'pnl.config': core.actPnlSave,
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

// Agent 工具共用的输出门面与时间格式化。纯函数，直接具名导出。

// ---- Agent 工具（一期 6 个）：模型在对话中直接查询雪球数据 ----
// 输出统一为 JSON 字符串（对齐 dsh-us-stocks 的 jsonOutput 模式，schema 简单、渲染即文本）。
function xqToolOutput() {
  return {
    schema: { type: 'string' },
    render: function (_args, value) { return [{ type: 'text', text: String(value) }] }
  }
}
function xqIso(ms) {
  // 本地时区格式化（toISOString 是 UTC，中文环境会差 8 小时）
  const d = new Date(Number(ms))
  if (isNaN(d.getTime())) return null
  const p = function (n) { return (n < 10 ? '0' : '') + n }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
}


function makeQuoteTool(core) {
  return {
    name: 'xueqiu_quote',
    description: '获取股票/指数实时行情快照（雪球数据源，支持A股/港股/美股/指数/ETF）。\n\n何时使用：用户问"XX现在多少钱"、"XX今天涨跌多少"、"XX市值/市盈率多少"，或需要多只股票的当前价格做对比、计算持仓市值时。\n\n输入：symbols 为雪球代码，逗号分隔，一次最多 20 只。代码格式：A股 SH600519/SZ300750（贵茅台/宁德），港股 00700（腾讯），美股 AAPL/TSLA，指数 SH000001（上证）。用户只说中文名或 ticker 时，先用 xueqiu_search 查代码。\n\n输出：每只返回 symbol、name、current（现价）、percent（涨跌幅%）、chg（涨跌额）、open/high/low、last_close（昨收）、volume/amount（量/额；volume 单位为股，A股 1手=100股，换算手数请 ÷100）、market_capital（市值）、pe_ttm、pb、turnover_rate。港股美股实时，A股盘中实时。',
    parameters: {
      type: 'object',
      properties: {
        symbols: { type: 'string', description: '雪球代码，逗号分隔，如 "SH600519,00700,AAPL"' }
      },
      required: ['symbols'],
      additionalProperties: true
    },
    output: xqToolOutput(),
    timeoutMs: 30000,
    async execute(args) {
      const list = String(args.symbols || '').split(',').map(function (s) { return s.trim() }).filter(Boolean).slice(0, 20)
      const r = await core.actQuote({ symbols: list })
      const rows = (r.list || []).map(function (q) {
        return {
          symbol: q.symbol, name: q.name, current: q.current, percent: q.percent, chg: q.chg,
          open: q.open, last_close: q.last_close, high: q.high, low: q.low,
          volume: q.volume, amount: q.amount, market_capital: q.market_capital,
          pe_ttm: q.pe_ttm, pb: q.pb, turnover_rate: q.turnover_rate
        }
      })
      return JSON.stringify({ status: r.status, count: rows.length, list: rows })
    }
  }
}


function makeKlineTool(core) {
  return {
    name: 'xueqiu_kline',
    description: '获取历史K线（OHLCV + 涨跌幅），用于走势分析和技术计算。\n\n何时使用：用户问"XX最近的走势"、"最近一个月涨了多少"，或需要计算均线/区间涨跌幅/波动率等技术指标时。只要最新价格就够的话用 xueqiu_quote，别拉K线。\n\n输入：symbol 为单只雪球代码（如 SH600519）；period 可选 1m/5m/15m/30m/60m/day/week/month（默认 day）；count 5–250 根（默认 60，含最新一根）。\n\n输出：按时间升序的数组，每根含 time（本地时区 ISO）、open/high/low/close、volume（单位为股，A股 1手=100股）、percent（该根涨跌幅%）。可直接用于计算区间涨跌 = (末根 close / 首根前收盘 - 1)。',
    parameters: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '雪球代码，如 SH600519' },
        period: { type: 'string', enum: ['1m', '5m', '15m', '30m', '60m', 'day', 'week', 'month'], description: 'K线周期，默认 day' },
        count: { type: 'number', description: '返回根数 5–250，默认 60' }
      },
      required: ['symbol'],
      additionalProperties: true
    },
    output: xqToolOutput(),
    timeoutMs: 30000,
    async execute(args) {
      const r = await core.actKline({
        symbol: String(args.symbol || ''),
        period: String(args.period || 'day'),
        count: Math.min(Math.max(parseInt(args.count, 10) || 60, 5), 250)
      })
      const rows = (r.rows || []).map(function (k) {
        return { time: xqIso(k.timestamp), open: k.open, high: k.high, low: k.low, close: k.close, volume: k.volume, percent: k.percent }
      })
      if (!rows.length) return JSON.stringify({ error: '无K线数据（检查代码是否正确，如 SH600519）' })
      return JSON.stringify({ symbol: String(args.symbol || ''), period: String(args.period || 'day'), count: rows.length, rows: rows })
    }
  }
}


function makeSearchTool(core) {
  return {
    name: 'xueqiu_search',
    description: '按名称/拼音/代码搜索雪球证券，把用户口中的股票名解析为雪球代码。\n\n何时使用：用户提到股票中文名（"茅台"、"腾讯"）、ticker（"AAPL"、"TSLA"）或纯代码（"600519"），而你不确定对应的雪球代码时，先调本工具再调 xueqiu_quote / xueqiu_kline。支持A股/港股/美股/指数/ETF。\n\n输入：q 为搜索词（中文名、全拼如 maotai、代码或 ticker）。\n\n输出：候选列表（代码+名称），按相关度排序；同名/近似名多只时取第一条或多条并列让用户确认。',
    parameters: {
      type: 'object',
      properties: {
        q: { type: 'string', description: '搜索词：中文名、拼音、代码或 ticker' }
      },
      required: ['q'],
      additionalProperties: true
    },
    output: xqToolOutput(),
    timeoutMs: 30000,
    async execute(args) {
      const r = await core.actSearch({ q: String(args.q || ''), count: 10 })
      return JSON.stringify({ count: (r.list || []).length, list: r.list || [] })
    }
  }
}


function makeHotTool(core) {
  return {
    name: 'xueqiu_hot',
    description: '获取雪球热门股票榜（按社区讨论热度排名，非涨幅榜）。\n\n何时使用：用户问"今天什么股票最火"、"大家在讨论什么股票"、"雪球热榜"，或想了解当前市场关注度集中在哪里时。\n\n输入：market 可选 cn（A股，默认）/ hk（港股）/ us（美股）/ global（全球）；size 1–30 条（默认 10）。\n\n输出：每条含 symbol、name、current、percent、rank_change（排名变化，正数=热度上升）。注意这是热度榜：下跌的股票讨论激烈也会上榜。',
    parameters: {
      type: 'object',
      properties: {
        market: { type: 'string', enum: ['cn', 'hk', 'us', 'global'], description: '市场，默认 cn' },
        size: { type: 'number', description: '返回条数 1–30，默认 10' }
      },
      required: [],
      additionalProperties: true
    },
    output: xqToolOutput(),
    timeoutMs: 30000,
    async execute(args) {
      const r = await core.actHot({
        market: String(args.market || 'cn'),
        size: Math.min(Math.max(parseInt(args.size, 10) || 10, 1), 30)
      })
      const rows = (r.list || []).map(function (h) {
        return { symbol: h.symbol, name: h.name, current: h.current, percent: h.percent, rank_change: h.rank_change }
      })
      return JSON.stringify({ market: String(args.market || 'cn'), count: rows.length, list: rows })
    }
  }
}


function makeNewsTool(core) {
  return {
    name: 'xueqiu_news',
    description: '获取雪球7×24实时财经快讯流（A股/港美股/宏观）。\n\n何时使用：用户问"今天有什么财经新闻"、"盘中有什么消息"、"刚才发生了什么"，或需要市场背景信息辅助解读行情时。\n\n输入：count 1–30 条（默认 15，上游每页约 10 条，超出时自动向后翻页补足）；max_id 为翻页游标——需要看更早的历史时，传上一页返回的 oldest_id。\n\n输出：按时间降序的快讯数组，每条含 time、text、mark（1=重要，其余为普通）；返回值带 oldest_id 供继续翻页。',
    parameters: {
      type: 'object',
      properties: {
        count: { type: 'number', description: '返回条数 1–30，默认 15' },
        max_id: { type: 'number', description: '翻页游标：上一页最旧一条的 id' }
      },
      required: [],
      additionalProperties: true
    },
    output: xqToolOutput(),
    timeoutMs: 30000,
    async execute(args) {
      // 上游固定每页 ~10 条且忽略 count 参数：请求多于 10 条时用 max_id 自动翻页补足
      const want = Math.min(Math.max(parseInt(args.count, 10) || 15, 1), 30)
      const rows = []
      let cursor = args.max_id
      for (let page = 0; page < 3 && rows.length < want; page++) {
        const r = await core.actNews({ count: 30, max_id: cursor })
        const items = r.items || []
        if (!items.length) break
        for (let i = 0; i < items.length && rows.length < want; i++) {
          const n = items[i]
          rows.push({ id: n.id, time: xqIso(n.created_at), mark: n.mark, text: String(n.text || '').slice(0, 160) })
        }
        cursor = items[items.length - 1].id
      }
      return JSON.stringify({ count: rows.length, oldest_id: rows.length ? rows[rows.length - 1].id : null, items: rows })
    }
  }
}


function makeKolTool(core) {
  return {
    name: 'xueqiu_kol',
    description: '查询某只股票在雪球社区讨论最热的投资大V（KOL），了解聪明钱的关注面。\n\n何时使用：用户问"XX有哪些大V在关注"、"雪球上谁在讨论XX"，或想从社区视角评估一只股票的关注质量时。\n\n输入：symbol 为雪球代码（如 SH600519，不确定就用 xueqiu_search 查）；count 1–10 条（默认 8）。\n\n输出：KOL 列表，每条含 screen_name（昵称）、followers_count（粉丝数）、verified（是否认证）、description（简介）。',
    parameters: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '雪球代码，如 SH600519' },
        count: { type: 'number', description: '返回条数 1–10，默认 8' }
      },
      required: ['symbol'],
      additionalProperties: true
    },
    output: xqToolOutput(),
    timeoutMs: 30000,
    async execute(args) {
      const r = await core.actKOL({
        symbol: String(args.symbol || ''),
        count: Math.min(Math.max(parseInt(args.count, 10) || 8, 1), 10)
      })
      const rows = (r.list || []).map(function (u) {
        return { screen_name: u.screen_name, followers_count: u.followers_count, verified: !!u.verified, description: String(u.description || '').slice(0, 80) }
      })
      return JSON.stringify({ symbol: String(args.symbol || ''), count: rows.length, list: rows })
    }
  }
}


// 「行情隐身」开关的 Agent 面：用户说「把行情关掉」/「把行情打开」时，模型能直接拨这个开关。
// 只读写 UI 状态，不碰行情、不碰持仓、不碰价格提醒 —— 提醒的判定在宿主 watcher 里，隐身期间照常跑。
function makeDisplayTool(core) {
  return {
    name: 'xueqiu_display',
    description: '读取或切换「雪球行情」的显示开关（隐身）。\n\n何时使用：用户说"把行情关掉/隐个身/别让我看涨跌/行情太吵/关掉那个指数条"→ hidden=true；说"把行情打开/显示出来/恢复行情/我回来了"→ hidden=false；只问"行情开关现在是什么状态"→ 不带参数调用即可。\n\nhidden=true 的效果：输入框上方的行情面板、右下角悬浮徽章、输入框下方的指数条全部不渲染，行情轮询随之停止（零请求、零占屏）。**价格提醒不受影响**：宿主侧 watcher 照常判定，到价依然会发系统通知。\n\n恢复方式：再调一次本工具（hidden=false），或用户按已注册的快捷键（可在 设置 → 通用 → 快捷键 里查看/改键）。\n\n不带 hidden 参数时只读当前状态，不改变任何东西。',
    parameters: {
      type: 'object',
      properties: {
        hidden: { type: 'boolean', description: 'true=完全隐藏行情界面；false=恢复显示；省略=只读当前状态' }
      },
      // 显式空数组：省略参数就是「只读」这条语义要能被 schema 表达（工具层不接受 undefined required）
      required: [],
      additionalProperties: true
    },
    output: xqToolOutput(),
    timeoutMs: 10000,
    async execute(args) {
      const want = args && args.hidden
      if (typeof want !== 'boolean') {
        const cur = await core.actUiGet({})
        return JSON.stringify({ hidden: !!(cur && cur.hidden === true), changed: false })
      }
      await core.actUiSet({ hidden: want })
      return JSON.stringify({
        hidden: want,
        changed: true,
        note: want
          ? '行情界面已隐藏，行情轮询已停止；价格提醒仍然生效（到价会发系统通知）'
          : '行情界面已恢复显示'
      })
    }
  }
}

// 7 个 Agent 工具 spec 的汇总。顺序即注册顺序，是既有习惯的一部分，不要调整
// （新增的 xueqiu_display 追加在末尾：前 6 个的注册顺序在位，不影响任何按序断言的历史语义）。


function makeAgentTools(core) {
  return [
    makeQuoteTool(core),
    makeKlineTool(core),
    makeSearchTool(core),
    makeHotTool(core),
    makeNewsTool(core),
    makeKolTool(core),
    makeDisplayTool(core)
  ]
}

// 双路径注册：动态运行时走 harness 门面（RPC 通道 + 工具），静态安装走 webServer 前缀路由 + tools 服务。
// 判据是 `typeof harness !== 'undefined'`，两条路径互斥——与上游逐字一致，不要合并。


// 动态插件运行时提供 harness 门面；静态安装（bundle layer）没有，
// 改走 webServer 前缀路由，client 用同源 fetch 调 /xq-rpc。
function installRpc(core) {
  const ctx = core.ctx
  if (typeof harness !== 'undefined') {
    ctx.effect(function () {
      return harness.handle('xq.call', core.handleCall)
    })
  } else {
    ctx.inject(['webServer'], function (webCtx) {
      webCtx.effect(function () {
        return webCtx.webServer.register({
        kind: 'prefix',
        path: '/xq-rpc',
        handler: async function (req, res) {
          // 同源栅栏：Host 头必须是回环，Origin 必须存在且同源（防 DNS rebinding/CSRF/无 Origin 的跨进程直调）
          const hostHeader = String(req.headers.host || '')
          const origin = req.headers.origin ? String(req.headers.origin) : ''
          // 端口剥离：要求冒号前存在非冒号字符——裸 IPv6 '::1' 不会被误剥末尾 ':1'（曾致白名单死代码）
          const hostAuth = hostHeader.replace(/^(.*[^:]):\d+$/, '$1')
          const loopback = hostAuth === '127.0.0.1' || hostAuth === 'localhost' || hostAuth === '[::1]' || hostAuth === '::1'
          if (!loopback) { res.writeHead(403); res.end('forbidden'); return }
          // 浏览器对（哪怕同源的）POST fetch 必带 Origin；无 Origin 一律拒绝（curl/本机进程裸调）
          if (!origin || (origin !== 'http://' + hostHeader && origin !== 'https://' + hostHeader)) {
            res.writeHead(403); res.end('forbidden'); return
          }
          const chunks = []
          let received = 0
          for await (const c of req) {
            received += c.length
            if (received > 1048576) { res.writeHead(413); res.end('payload too large'); return }   // 1MB 上限：防失控本地进程 OOM
            chunks.push(c)
          }
          let body = {}
          try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') } catch (e) { body = {} }
          const result = await core.handleCall(body)
          const text = JSON.stringify(result)
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
          res.end(text)
        }
        })
      })
    })
  }
}

// 注册：动态环境走 harness 门面（defineTool 会做标记+校验）；
// 静态 bundle 层没有 harness，参数已是 JSON Schema 根，直接注册 plain 对象
// （tools 服务在静态路径无 defineTool 守卫），用 inject 等服务就绪。
// 统一包装 execute：args 为 null/undefined 时兜底 {}（工具层直解引用会抛 TypeError）
function wrapToolSpec(spec) {
  const raw = spec.execute
  if (!raw) return spec
  return Object.assign({}, spec, { execute: function (args) { return raw.call(this, args || {}) } })
}

function installTools(core) {
  const ctx = core.ctx
  const XQ_AGENT_TOOLS = makeAgentTools(core)
  if (typeof harness !== 'undefined') {
    for (let i = 0; i < XQ_AGENT_TOOLS.length; i++) {
      const spec = XQ_AGENT_TOOLS[i]
      ctx.effect(function () {
        return harness.registerTool(ctx, harness.defineTool(wrapToolSpec(spec)))
      })
    }
  } else {
    ctx.inject(['tools'], function (toolsCtx) {
      for (let i = 0; i < XQ_AGENT_TOOLS.length; i++) {
        const spec = XQ_AGENT_TOOLS[i]
        toolsCtx.effect(function () {
          return toolsCtx.tools.register(wrapToolSpec(spec))
        })
      }
    })
  }
}

// core 装配：原巨型 apply 闭包里的可变共享状态全部收进 core（每次 apply 一份，保持单实例语义），
// 各模块通过 install 函数把自己的函数挂上来，跨模块调用一律走 core.xxx。


function createXqCore(ctx, config) {
  const core = {
    ctx: ctx,
    // 已规整的插件配置（stateDir / watchlist；见 lib/config.js）
    config: config,

    // ---- 共享可变状态（原 apply 闭包变量，名字保持不变以便逐字对照）----
    state: { cookie: '' },
    watchlist: null,
    uiState: null,
    // 可选登录态：粘贴浏览器 Cookie 后启用（云端自选股）。null = 匿名模式
    login: null,
    cloudPid: null,   // 默认自选组合 pid（首次云端操作时探测并缓存）
    cookieSeeding: null,
    stateBasePromise: null,
    // 今日盈亏状态目录的沙箱可写性探测（与 stateBasePromise 独立：目录不同、时机不同）
    pnlBasePromise: null,
    // 持仓 + 今日盈亏：installPnl 挂的 { view, inflight }（本地持仓 × 行情现算的缓存）；null = 尚未安装
    pnl: null,
    // 价格提醒：installAlerts 挂载持久化 store 与加载单飞 Promise
    alertStore: null,
    alertStoreLoad: null,
    syncInflight: false,
    // 请求调度槽位（gate.js 维护，debug RPC 会读）
    running: 0,
    lastStart: 0,
    waiters: [],
    // TTL 缓存与在途去重（cache.js 维护）
    cache: null,
    inflight: null
  }

  // 安装顺序 = 依赖顺序（只为可读性；调用都发生在运行期，函数引用在 install 时建立）
  installCache(core)
  installGate(core)
  installHttp(core)
  installState(core)
  installLogin(core)
  installWatchlist(core)
  installUiState(core)
  // 持仓/盈亏：必须在 installActions 之前（dispatch 表构造时按值捕获 core.actPositionsGet 等）
  installPnl(core)
  installApi(core)
  installAlerts(core)
  installActions(core)
  return core
}

// 入口：cordis 插件对象（与上游同形：inject ['timer'] + apply(ctx)）。
// apply 只做两件事——装配 core、按双路径注册 RPC 与工具。
// 第二个参数是插件配置（cordis 会把 bundle layer 里配的 config 传进来）；未配置时全部走默认值。


const xqHostPlugin = {
  inject: ['timer'],
  apply(ctx, config) {
    const core = createXqCore(ctx, resolveConfig(config))
    installRpc(core)
    installTools(core)
  }
}


return xqHostPlugin

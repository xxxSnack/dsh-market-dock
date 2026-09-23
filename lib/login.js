// 可选登录（粘贴浏览器 Cookie）、JWT 解析、云端自选组合读写与迁移回读相关的动作。

import { BASE } from './constants.js'
import { enc, toQuery } from './cache.js'
import { classifyError } from './http.js'

export function installLogin(core) {
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

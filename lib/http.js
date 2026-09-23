// HTTP 管道：curl 调用（跨平台 shell 细节）、匿名 cookie 播种、错误分类、带重试链的 getJSON。

import { UA, BASE, CURL, NULL_DEV } from './constants.js'
import { toQuery } from './cache.js'

// ---- 错误分类：cookie_expired / rate_limited / parse / network / empty ----
export function classifyError(data) {
  if (!data || !data.error_code || data.error_code === 0) return null
  const code = String(data.error_code)
  const desc = String(data.error_description || '')
  if (code === '400016') return { kind: 'cookie_expired', code: code, desc: desc || 'Cookie 失效', retryable: true }
  if (/频繁|频率|too many|429/i.test(desc) || code === '400017') return { kind: 'rate_limited', code: code, desc: desc || '请求过于频繁', retryable: true }
  return { kind: 'api', code: code, desc: desc || ('雪球错误 ' + code), retryable: false }
}

export function installHttp(core) {
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
      try { res = await shell.run(spec) } catch (e) { res = null }
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
    const result = await shell.run(spec)
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

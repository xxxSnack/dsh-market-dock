// 今日盈亏：Cookie 规整 / 字段锚定解析 + **能拿到 HTTP 状态码**的 curl 请求。
//
// 为什么另起一套 curl 而不复用宿主 lib/http.js：那边的 curl() 是雪球专用（Referer /
// Accept / 重试链 / 并发闸门全是写死的），而且**不输出状态码** —— 账本恰恰要靠状态码
// 区分「Cookie 过期（401/403）」「接口报错（200 + error_code）」和「网关重定向」。
// 所以这里自拼命令，用 `-w '\n__HTTP__%{http_code}'` 探针把状态码一次取回。
//
// 动态形态可用性：import 只走相对路径的宿主模块，shell 走 ctx.get('shell')，无裸 fetch。

import { CURL } from '../constants.js'
import { PNL_UA, HTTP_MARK } from './constants.js'

/**
 * 凭据存储里可能被 YAML 折行而插入空格，破坏 base64/JWT；
 * 按 ';' 切开、逐段去掉所有空白、再用标准 '; ' 拼回。
 */
export function normalizeCookie(cookie) {
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
export function cookieField(cookie, field) {
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
export const pnlRequest = async function (core, url, body, cookie, opts) {
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
  const result = await shell.run(spec)
  if (!result || result.exitCode !== 0) {
    // 不回显 stderr：shell 语法错误会把完整命令行（含内部拼接细节）透给调用方
    throw new Error('curl 失败 (' + ((result && result.exitCode) ?? '?') + ')')
  }
  return splitStatus(String((result.stdout && result.stdout.text) || ''))
}

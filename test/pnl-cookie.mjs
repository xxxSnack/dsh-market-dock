#!/usr/bin/env node
/**
 * 今日盈亏（同花顺投资账本）宿主侧 Cookie / curl 管道回归测试 —— 零依赖，进程内跑完。
 *
 *   cd plugins/dsh-xueqiu-debug && node test/pnl-cookie.mjs
 *
 * 断言合并自旧插件 plugins/dsh-ths-pnl/tests/cookie-helpers.test.mjs，并补上宿主侧
 * 新增的一条关键链路：**curl 必须能取回 HTTP 状态码**（旧实现用 fetch 的 res.status，
 * 换到 curl 后没有 `-w` 探针就分不清「Cookie 过期」和「接口报错」）。
 *
 * 覆盖四个历史坑：
 *  1. YAML 折行会让长 Cookie 值被插入空格/换行 —— normalizeCookie 必须还原；
 *  2. 裸 /userid=/ 会误匹配 pex_userid 之类的 cookie，账本返回 403 ——
 *     cookieField 必须锚定到字段名开头（这里连"不误匹配"的端到端行为一起断言：
 *     只带 pex_userid 的 Cookie 必须在**发请求之前**就被判为缺少 userid）；
 *  3. 凭据类请求绝不跟随重定向 —— 命令行里不能出现 -L；
 *  4. account_list 网关只认最小请求头 —— minimal 模式下不能带 Accept/Referer。
 *
 * 全程无网络：shell 是脚本化的假对象，只回放预置 stdout 并记录命令行。
 */

import { normalizeCookie, cookieField, pnlRequest } from '../lib/pnl/http.js'
import { pickYk, listPortfolios, collectPnl, verifyCookie } from '../lib/pnl/collect.js'
import { PNL_URL, ACCOUNT_LIST_URL, MAX_COOKIE_LEN } from '../lib/pnl/constants.js'

const failures = []
let total = 0

function check(name, cond, detail) {
  total++
  if (cond) console.log('  ✓ ' + name)
  else {
    failures.push(name)
    console.log('  ✗ ' + name + (detail === undefined || detail === '' ? '' : ' :: ' + detail))
  }
}
function section(title) {
  console.log('\n' + title)
}

/* ------------------------------------------------------------------ *
 * 0. 假 shell / 假 core
 * ------------------------------------------------------------------ */

/** 脚本化 shell：按顺序回放 responses（每个 {text, exitCode} 或 Error），并记录命令行。 */
function scriptedShell(responses) {
  const calls = []
  const queue = responses.slice()
  return {
    calls: calls,
    resolve(spec) {
      const command = String((spec && spec.command) || '')
      calls.push({ command: command, spec: spec })
      return { command: command }
    },
    run() {
      if (queue.length === 0) throw new Error('[pnl-cookie] 脚本用尽：出现了预期外的请求')
      const next = queue.shift()
      if (next instanceof Error) throw next
      const entry = next || {}
      return { exitCode: entry.exitCode === undefined ? 0 : entry.exitCode, stdout: { text: String(entry.text === undefined ? '' : entry.text) } }
    },
  }
}

function fakeCore(shell) {
  return { ctx: { get: function (n) { return n === 'shell' ? shell : undefined } } }
}

/** 拼一个「HTTP 响应体 + 状态码探针」的 curl stdout（与真实 curl -w 输出同形）。 */
function httpResponse(status, bodyText) {
  return { exitCode: 0, text: (bodyText === undefined || bodyText === null ? '' : String(bodyText)) + '\n__HTTP__' + String(status) }
}

async function threw(fn) {
  try { await fn() } catch (e) { return String((e && e.message) || e) }
  return null
}

const COOKIE = 'userid=abc; token=T1'
const JSON_HEAD = '{"error_code":"0","ex_data":{"common":[{"fund_key":"FK1","manualname":"长期组合","brokername":"某券商"},{"fund_key":"","manualname":"空组合","brokername":""}]}}'

console.log('今日盈亏：Cookie 规整 / 字段锚定 / 带状态码的 curl')

/* ------------------------------------------------------------------ *
 * 1. normalizeCookie
 * ------------------------------------------------------------------ */
section('[1] normalizeCookie：还原被 YAML 折行的 Cookie')

check('折行的单个值被还原（换行被吃掉）', normalizeCookie('a=1;  b=2\n c=3') === 'a=1; b=2c=3', normalizeCookie('a=1;  b=2\n c=3'))
check('折行出现在值中间', normalizeCookie('v=ab\ncd; userid=42') === 'v=abcd; userid=42', normalizeCookie('v=ab\ncd; userid=42'))
check('统一分隔符与空白', normalizeCookie('a=1;b=2;  c=3') === 'a=1; b=2; c=3', normalizeCookie('a=1;b=2;  c=3'))
check('全空白 → 空串', normalizeCookie('   ') === '')
check('空串 → 空串', normalizeCookie('') === '')
check('undefined → 空串', normalizeCookie(undefined) === '')

/* ------------------------------------------------------------------ *
 * 2. cookieField 必须锚定
 * ------------------------------------------------------------------ */
section('[2] cookieField：不被 *_userid 前缀字段误导（403 回归）')

check('pex_userid 在前也不误匹配', cookieField('pex_userid=999; userid=abc', 'userid') === 'abc', String(cookieField('pex_userid=999; userid=abc', 'userid')))
check('pex_userid 在后也不误匹配', cookieField('userid=abc; pex_userid=999', 'userid') === 'abc', String(cookieField('userid=abc; pex_userid=999', 'userid')))
check('紧跟在 ; 后（无空格）也能读', cookieField('a=1;userid=xyz', 'userid') === 'xyz', String(cookieField('a=1;userid=xyz', 'userid')))
check('只有 pex_userid → undefined（**不许**回退成 999）', cookieField('pex_userid=999', 'userid') === undefined, String(cookieField('pex_userid=999', 'userid')))
check('字段名正好是 pex_userid 时正常读出', cookieField('pex_userid=999; userid=abc', 'pex_userid') === '999', String(cookieField('pex_userid=999; userid=abc', 'pex_userid')))
check('空 Cookie → undefined', cookieField('', 'userid') === undefined)

/* ------------------------------------------------------------------ *
 * 3. pnlRequest：命令行形状 + 状态码解析
 * ------------------------------------------------------------------ */
section('[3] pnlRequest：curl 命令行与状态码探针')

const okShell = scriptedShell([httpResponse(200, '{"ok":1}')])
const okRes = await pnlRequest(fakeCore(okShell), PNL_URL, 'a=1', COOKIE, {})
const okCmd = okShell.calls[0] ? okShell.calls[0].command : ''

check('返回 { status, text }（status=200）', okRes.status === 200 && okRes.text === '{"ok":1}', JSON.stringify(okRes))
check('命令行带状态码探针 -w \'\\n__HTTP__%{http_code}\'', okCmd.indexOf("-w '\\n__HTTP__%{http_code}'") >= 0, okCmd)
check('命令行**不带 -L**（凭据请求绝不跟随重定向）', !/(^|\s)-L(\s|$)/.test(okCmd), okCmd)
check('用 POST + --data 发表单', okCmd.indexOf('-X POST') >= 0 && okCmd.indexOf("--data 'a=1'") >= 0, okCmd)
check('带账本 UA', okCmd.indexOf('-H \'User-Agent: Mozilla/5.0') >= 0, okCmd)
check('非 minimal：带 Accept / Accept-Language / Referer', okCmd.indexOf("-H 'Accept:") >= 0 && okCmd.indexOf("-H 'Accept-Language:") >= 0 && okCmd.indexOf("-H 'Referer: https://tzzb.10jqka.com.cn/pc/index.html'") >= 0, okCmd)
check('带 Cookie 头', okCmd.indexOf("-H 'Cookie: userid=abc; token=T1'") >= 0, okCmd)
check('请求 URL 与超时/输出上限进了 shell spec', okShell.calls[0].spec.command.indexOf(PNL_URL) >= 0 && okShell.calls[0].spec.timeoutMs === 20000 && okShell.calls[0].spec.stdoutMaxBytes === 1048576, JSON.stringify(okShell.calls[0].spec))

const minShell = scriptedShell([httpResponse(200, '{}')])
await pnlRequest(fakeCore(minShell), ACCOUNT_LIST_URL, 'b=2', COOKIE, { minimal: true })
const minCmd = minShell.calls[0] ? minShell.calls[0].command : ''
check('minimal：只带 UA，**不带** Accept / Referer（否则网关拒）', minCmd.indexOf('-H \'User-Agent:') >= 0 && minCmd.indexOf('Accept') < 0 && minCmd.indexOf('Referer') < 0, minCmd)

const noCookieShell = scriptedShell([httpResponse(200, '{}')])
await pnlRequest(fakeCore(noCookieShell), PNL_URL, 'a=1', '', {})
check('无 Cookie 时不发 Cookie 头', noCookieShell.calls[0].command.indexOf('Cookie:') < 0, noCookieShell.calls[0].command)

const bodyMarkShell = scriptedShell([{ exitCode: 0, text: '{"a":"__HTTP__假标记"}\n__HTTP__403' }])
const bodyMarkRes = await pnlRequest(fakeCore(bodyMarkShell), PNL_URL, 'a=1', COOKIE, {})
check('响应体里含 __HTTP__ 也按**最后一个**探针切分', bodyMarkRes.status === 403 && bodyMarkRes.text === '{"a":"__HTTP__假标记"}', JSON.stringify(bodyMarkRes))

const noMarkShell = scriptedShell([{ exitCode: 0, text: 'garbage' }])
const noMarkRes = await pnlRequest(fakeCore(noMarkShell), PNL_URL, 'a=1', COOKIE, {})
check('没有探针 → status=0（异常输出不冒充 200）', noMarkRes.status === 0 && noMarkRes.text === 'garbage', JSON.stringify(noMarkRes))

const failShell = scriptedShell([{ exitCode: 7, text: 'x' }])
check('exitCode≠0 → 抛 "curl 失败 (7)"', (await threw(function () { return pnlRequest(fakeCore(failShell), PNL_URL, 'a=1', COOKIE, {}) })) === 'curl 失败 (7)')
check('无 shell 服务 → 抛可读中文错误', (await threw(function () { return pnlRequest(fakeCore(undefined), PNL_URL, 'a=1', COOKIE, {}) })) === 'shell 服务不可用，无法访问投资账本')

/* ------------------------------------------------------------------ *
 * 4. 业务语义（错误映射逐字对齐旧插件）
 * ------------------------------------------------------------------ */
section('[4] collectPnl / verifyCookie：上游错误语义')

check('pickYk：按 YK_KEYS 优先级取第一个非空字段', pickYk({ today_yk: 12.5, yk: 3, zf: 1 }).field === 'yk' && pickYk({ today_yk: 12.5, yk: 3, zf: 1 }).value === 3, JSON.stringify(pickYk({ today_yk: 12.5, yk: 3, zf: 1 })))
check('pickYk：yk 为 null 时退到下一个候选', pickYk({ yk: null, today_yk: '7' }).field === 'today_yk' && pickYk({ yk: null, today_yk: '7' }).value === 7, JSON.stringify(pickYk({ yk: null, today_yk: '7' })))
check('pickYk：一个都没有 → { value:0, field:"" }', pickYk({ foo: 1 }).value === 0 && pickYk({ foo: 1 }).field === '', JSON.stringify(pickYk({ foo: 1 })))
check('pickYk：undefine 入参不抛', pickYk(undefined).value === 0)

const happyShell = scriptedShell([httpResponse(200, '{"error_code":"0","ex_data":{"data":[{"yk":1,"zf":0.1},{"yk":123.45,"zf":0.87}]}}')])
const happy = await collectPnl(fakeCore(happyShell), COOKIE, 'FK1')
check('collectPnl：取最后一个采样点的金额 + 百分比', happy.pnl_yk === 123.45 && happy.pnl_pct === 0.87 && happy.error === '' && happy.yk_field === 'yk', JSON.stringify(happy))
check('collectPnl：请求体带 fund_key 与 userid（锚定解析出来的）', happyShell.calls[0].command.indexOf('userid=abc') >= 0 && happyShell.calls[0].command.indexOf('user_id=abc') >= 0 && happyShell.calls[0].command.indexOf('fund_key=FK1') >= 0, happyShell.calls[0].command)

const emptyShell = scriptedShell([httpResponse(200, '{"error_code":"0","ex_data":{"data":[]}}')])
const emptyRes = await collectPnl(fakeCore(emptyShell), COOKIE, 'FK1')
check('collectPnl：空数据 → 可读中文错误', emptyRes.error === '接口返回空数据（可能今日无成交/未上传数据）' && emptyRes.pnl_yk === 0, JSON.stringify(emptyRes))

const apiErrShell = scriptedShell([httpResponse(200, '{"error_code":"4001","error_msg":"参数错误"}')])
const apiErr = await collectPnl(fakeCore(apiErrShell), COOKIE, 'FK1')
check('collectPnl：error_code≠0 → 回传 error_msg', apiErr.error === '参数错误' && apiErr.token_expired === false, JSON.stringify(apiErr))

const exp401Shell = scriptedShell([httpResponse(401, '')])
const exp401 = await collectPnl(fakeCore(exp401Shell), COOKIE, 'FK1')
check('collectPnl：401 → token_expired=true + TOKEN_EXPIRED', exp401.token_expired === true && exp401.error === 'TOKEN_EXPIRED (HTTP 401)', JSON.stringify(exp401))

const exp403Shell = scriptedShell([httpResponse(403, '')])
const exp403 = await collectPnl(fakeCore(exp403Shell), COOKIE, 'FK1')
check('collectPnl：403 → token_expired=true', exp403.token_expired === true && exp403.error === 'TOKEN_EXPIRED (HTTP 403)', JSON.stringify(exp403))

const redirShell = scriptedShell([httpResponse(302, '')])
const redir = await collectPnl(fakeCore(redirShell), COOKIE, 'FK1')
check('collectPnl：3xx → 重定向未跟随（不是 token 过期）', redir.error === '接口重定向未跟随 (HTTP 302)' && redir.token_expired === false, JSON.stringify(redir))

const badJsonShell = scriptedShell([httpResponse(200, '<html>not json')])
const badJson = await collectPnl(fakeCore(badJsonShell), COOKIE, 'FK1')
check('collectPnl：响应不是 JSON → 响应解析失败', badJson.error === '响应解析失败', JSON.stringify(badJson))

const boomShell = scriptedShell([new Error('shell 挂了')])
const boom = await collectPnl(fakeCore(boomShell), COOKIE, 'FK1')
check('collectPnl：shell 抛错 → 网络错误: 前缀（不泄漏栈）', boom.error === '网络错误: shell 挂了', JSON.stringify(boom))

// ---- verifyCookie ----
const noUseridShell = scriptedShell([])
const noUserid = await verifyCookie(fakeCore(noUseridShell), 'pex_userid=999; token=T')
check('verifyCookie：只有 pex_userid → 判"缺少 userid"（锚定的端到端证明）', noUserid.valid === false && noUserid.error === 'Cookie 缺少 userid 字段，可能已失效', JSON.stringify(noUserid))
check('verifyCookie：缺少 userid 时**一个请求都不发**（不能把 999 当 userid 打上游）', noUseridShell.calls.length === 0, JSON.stringify(noUseridShell.calls.length))

const noCookie = await verifyCookie(fakeCore(scriptedShell([])), '')
check('verifyCookie：无 Cookie → "未配置 Cookie"', noCookie.valid === false && noCookie.error === '未配置 Cookie', JSON.stringify(noCookie))

const verifyOkShell = scriptedShell([httpResponse(200, JSON_HEAD), httpResponse(200, JSON_HEAD)])
const verifyOk = await verifyCookie(fakeCore(verifyOkShell), COOKIE)
check('verifyCookie：成功 → valid / 组合列表 / user_id', verifyOk.valid === true && verifyOk.error === '' && verifyOk.user_id === 'abc' && verifyOk.portfolios.length === 1, JSON.stringify(verifyOk))
check('verifyCookie：组合过滤掉空 fund_key（空组合不进下拉框）', verifyOk.portfolios[0].fund_key === 'FK1' && verifyOk.portfolios[0].manualname === '长期组合', JSON.stringify(verifyOk.portfolios))
check('verifyCookie：account_list 用 minimal 头（无 Referer）', verifyOkShell.calls[0].command.indexOf('Referer') < 0 && verifyOkShell.calls[0].command.indexOf(ACCOUNT_LIST_URL) >= 0, verifyOkShell.calls[0].command)

const verify403Shell = scriptedShell([httpResponse(403, '')])
const verify403 = await verifyCookie(fakeCore(verify403Shell), COOKIE)
check('verifyCookie：403 → "Cookie 已过期，请重新登录投资账本后重新粘贴"', verify403.valid === false && verify403.error === 'Cookie 已过期，请重新登录投资账本后重新粘贴', JSON.stringify(verify403))

const verifyRejectShell = scriptedShell([httpResponse(200, '{"error_code":"9","error_msg":"无权限"}')])
const verifyReject = await verifyCookie(fakeCore(verifyRejectShell), COOKIE)
check('verifyCookie：error_code≠0 → "账本拒绝请求: msg"', verifyReject.valid === false && verifyReject.error === '账本拒绝请求: 无权限', JSON.stringify(verifyReject))

const listShell = scriptedShell([httpResponse(200, JSON_HEAD)])
const list = await listPortfolios(fakeCore(listShell), COOKIE)
check('listPortfolios：映射 fund_key / manualname / brokername', list.length === 1 && list[0].fund_key === 'FK1' && list[0].brokername === '某券商', JSON.stringify(list))

const listFailShell = scriptedShell([httpResponse(500, '')])
check('listPortfolios：失败 → 空数组（调用方决定文案）', (await listPortfolios(fakeCore(listFailShell), COOKIE)).length === 0)

check('MAX_COOKIE_LEN 是 8192（actPnlSave 的超长 Cookie 闸门）', MAX_COOKIE_LEN === 8192, String(MAX_COOKIE_LEN))

/* ------------------------------------------------------------------ *
 * 汇总
 * ------------------------------------------------------------------ */
console.log('\n' + '-'.repeat(60))
if (failures.length === 0) {
  console.log('结果：全部通过（' + total + ' 项断言）')
} else {
  console.log('结果：' + failures.length + ' 项失败 / 共 ' + total + ' 项断言')
  for (const f of failures) console.log('  ✗ ' + f)
}
process.exit(failures.length === 0 ? 0 : 1)

// 今日盈亏：组合列表 / 盈亏采集 / Cookie 校验（同花顺投资账本）。
//
// 三个坑逐字继承自旧插件（都是真实事故）：
//   1. account_list 网关**只认最小请求头**（UA，多带 Accept/Referer 会被拒）；
//   2. Cookie 里的 userid 必须**锚定**解析，否则会读到 pex_userid（→ 403）；
//   3. 凭据类请求**绝不跟随重定向**（Cookie 不能外泄到别的 origin）。

import { ACCOUNT_LIST_URL, PNL_URL, YK_KEYS } from './constants.js'
import { normalizeCookie, cookieField, pnlRequest } from './http.js'

/** 3xx：网关重定向（旧实现 redirect:'manual' 拒绝跟随，这里同样按异常报出来）。 */
const PNL_REDIRECT_STATUS = new Set([301, 302, 303, 307, 308])

/**
 * POST 表单并解析 JSON（错误语义与旧插件的 postForm 一一对应）。
 * @returns {{ok:true, body:object}|{ok:false, tokenExpired:boolean, error:string}}
 */
async function postPnlForm(core, url, payload, cookie, opts) {
  let res
  try {
    res = await pnlRequest(core, url, payload, cookie, opts)
  } catch (error) {
    return { ok: false, tokenExpired: false, error: '网络错误: ' + String((error && error.message) || error) }
  }
  const status = Number(res.status) || 0
  if (PNL_REDIRECT_STATUS.has(status)) {
    return { ok: false, tokenExpired: false, error: '接口重定向未跟随 (HTTP ' + status + ')' }
  }
  if (status === 401 || status === 403) {
    return { ok: false, tokenExpired: true, error: 'TOKEN_EXPIRED (HTTP ' + status + ')' }
  }
  if (status < 200 || status >= 300) {
    return { ok: false, tokenExpired: false, error: 'HTTP ' + status }
  }
  try {
    return { ok: true, body: JSON.parse(res.text) }
  } catch (e) {
    return { ok: false, tokenExpired: false, error: '响应解析失败' }
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
export function pickYk(point) {
  for (const key of YK_KEYS) {
    if (point?.[key] !== undefined && point?.[key] !== null) {
      return { value: Number(point[key]) || 0, field: key }
    }
  }
  return { value: 0, field: '' }
}

/** 组合账户列表（fund_key / manualname / brokername）。失败返回空数组（调用方决定文案）。 */
export const listPortfolios = async function (core, cookie) {
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
 * @returns {{pnl_yk:number, pnl_pct:number, error:string, token_expired:boolean, yk_field:string}}
 */
export const collectPnl = async function (core, cookie, fundKey) {
  const userId = pnlUserId(cookie)
  const payload = accountPayload(userId)
    + '&manual_id=&fundid=&fund_key=' + String(fundKey ?? '') + '&rzrq_fund_key=&custid='
  const r = await postPnlForm(core, PNL_URL, payload, cookie)
  if (!r.ok) {
    return { pnl_yk: 0, pnl_pct: 0, error: r.error, token_expired: r.tokenExpired, yk_field: '' }
  }
  if (r.body?.error_code !== undefined && String(r.body.error_code) !== '0') {
    return { pnl_yk: 0, pnl_pct: 0, error: String(r.body?.error_msg ?? 'API 错误'), token_expired: false, yk_field: '' }
  }
  const points = r.body?.ex_data?.data ?? []
  if (points.length === 0) {
    return { pnl_yk: 0, pnl_pct: 0, error: '接口返回空数据（可能今日无成交/未上传数据）', token_expired: false, yk_field: '' }
  }
  const last = points[points.length - 1]
  const yk = pickYk(last)
  return {
    pnl_yk: yk.value,
    pnl_pct: Number(last?.zf) || 0,
    error: '',
    token_expired: false,
    yk_field: yk.field,
  }
}

/** 校验 Cookie 是否被账本接受，并顺带回传组合列表。 */
export const verifyCookie = async function (core, cookie) {
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

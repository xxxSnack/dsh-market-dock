// 今日盈亏：组合列表 / 盈亏采集 / Cookie 校验（同花顺投资账本）。
//
// 三个坑逐字继承自旧插件（都是真实事故）：
//   1. account_list 网关**只认最小请求头**（UA，多带 Accept/Referer 会被拒）；
//   2. Cookie 里的 userid 必须**锚定**解析，否则会读到 pex_userid（→ 403）；
//   3. 凭据类请求**绝不跟随重定向**（Cookie 不能外泄到别的 origin）。

import { ACCOUNT_LIST_URL, PNL_URL, STOCK_POSITION_URL, YK_KEYS } from './constants.js'
import { normalizeCookie, cookieField, pnlRequest } from './http.js'

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
 * @returns {{pnl_yk:number, pnl_pct:number, error:string, token_expired:boolean, blocked:boolean, yk_field:string}}
 */
export const collectPnl = async function (core, cookie, fundKey) {
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
export function toNum(value) {
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
export function ratioPct(value) {
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
export function normalizeRow(raw) {
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
export function normalizeRows(list) {
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
export function mapLedgerRow(row) {
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
export function positionSymbol(code, market) {
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
export function dayProfitOf(price, qty, lastClose, pct, value) {
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
export function dayRateOf(price, lastClose, pct) {
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
export const collectPositions = async function (core, cookie, fundKey) {
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

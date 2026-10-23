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

import { DEFAULT_POLL_MS, MIN_POLL_MS, MAX_POLL_MS, BLOCKED_BACKOFF_MS, MAX_COOKIE_LEN } from './constants.js'
import { sessionInfo, nextPollMs } from './session.js'
import { normalizeCookie } from './http.js'
import { loadPnlConfig, savePnlConfig, loadPositions, savePositions } from './store.js'
import { listPortfolios, collectPnl, collectPositions, verifyCookie, positionSymbol, dayProfitOf, dayRateOf, toNum, normalizeRow } from './collect.js'

/** 保留两位小数（金额）。 */
function round2(n) { return Math.round(n * 100) / 100 }
/** 保留四位小数（百分数）。 */
function round4(n) { return Math.round(n * 10000) / 10000 }

/**
 * 把用户填的秒数规整成合法的毫秒间隔。
 * 非数字 / NaN / 非正数返回 null（调用方回退默认值）；越界夹到 [MIN, MAX]。
 */
export function clampPollMs(value) {
  const sec = typeof value === 'string' ? Number(value.trim()) : Number(value)
  if (!Number.isFinite(sec) || sec <= 0) return null
  return Math.min(MAX_POLL_MS, Math.max(MIN_POLL_MS, Math.round(sec * 1000)))
}

/** 生效的行情刷新间隔：存盘秒数（钳制过）> 默认 30 秒。 */
function pnlPollMs(state) {
  const ms = clampPollMs(state && state.pollSec)
  return ms === null ? DEFAULT_POLL_MS : ms
}

/**
 * 批量取行情 → { SYMBOL: quote }。失败/无行情给空表（逐行留 null，不把整次视图判失败）。
 *
 * 走宿主的共享行情服务（lib/quotes.js）：同一批标的可能与面板/徽章/提醒的重叠，服务按 symbol
 * 复用缓存与在途请求。这里仍按 20 只分块调用 —— 一块失败只影响这一块的标的，与改造前一致。
 */
async function quoteMap(core, symbols, force) {
  const by = Object.create(null)
  const list = Array.isArray(symbols) ? symbols : []
  if (!list.length) return by
  for (let i = 0; i < list.length; i += 20) {
    try {
      // force=false 时命中行情服务的 10 秒缓存：面板其它组件也在刷同一批标的，能省就省。
      const res = await core.quotes.fetchQuotes(list.slice(i, i + 20), { force: force === true })
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

export function installPnl(core) {
  // 一次视图的内存缓存 + 单飞，避免同一时刻两处调用各拉一遍行情。
  // revision：持仓数据每次成功修改 +1；编辑前启动的视图/单飞一律作废，不能回填到修改后的界面。
  core.pnl = { view: null, inflight: null, revision: 0 }

  /** 编辑落盘后：让编辑前的视图与在途结果失效（这是「保存返回旧持仓视图」的根因）。 */
  function invalidateView() {
    core.pnl.revision++
    core.pnl.inflight = null
    return core.pnl.revision
  }

  async function getView(opts) {
    const rev = core.pnl.revision
    const cur = core.pnl.inflight
    if (cur && cur.rev === rev) return cur.promise
    const record = { rev: rev, promise: null }
    record.promise = buildView(core, opts).then(function (view) {
      // 兼容方式加字段：客户端据此丢弃「编辑前发出、编辑后才到」的旧刷新
      view.revision = rev
      if (core.pnl.revision === rev) core.pnl.view = view
      if (core.pnl.inflight === record) core.pnl.inflight = null
      return view
    }, function (e) {
      if (core.pnl.inflight === record) core.pnl.inflight = null
      throw e
    })
    core.pnl.inflight = record
    return record.promise
  }

  /** 落盘一张新表并刷新视图（增删改共用）。 */
  async function persist(rows, cloud) {
    invalidateView()
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
      const failedView = await persist(store.rows, cloud)
      return {
        ok: false,
        error: res.error,
        token_expired: Boolean(res.token_expired),
        blocked: Boolean(res.blocked),
        blocked_until: cloud.blocked_until,
        report: null,
        view: failedView,
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

// 纯函数：上游响应 → 插件内部字段形状的归一化。无状态、不依赖 core，直接具名导出。

// ---- data normalizers ----
export function nz(v) { return v === undefined ? null : v }

export function sanitize(v) {
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

export function pickQuote(q) {
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

export function mapKline(data) {
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

export function mapPosts(list) {
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

export function mapKOL(arr) {
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

export function mapFinance(list) {
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

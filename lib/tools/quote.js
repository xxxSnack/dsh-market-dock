import { xqToolOutput } from './common.js'

export function makeQuoteTool(core) {
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

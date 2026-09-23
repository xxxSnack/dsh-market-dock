import { xqToolOutput } from './common.js'

export function makeHotTool(core) {
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

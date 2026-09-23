import { xqToolOutput } from './common.js'

export function makeKolTool(core) {
  return {
    name: 'xueqiu_kol',
    description: '查询某只股票在雪球社区讨论最热的投资大V（KOL），了解聪明钱的关注面。\n\n何时使用：用户问"XX有哪些大V在关注"、"雪球上谁在讨论XX"，或想从社区视角评估一只股票的关注质量时。\n\n输入：symbol 为雪球代码（如 SH600519，不确定就用 xueqiu_search 查）；count 1–10 条（默认 8）。\n\n输出：KOL 列表，每条含 screen_name（昵称）、followers_count（粉丝数）、verified（是否认证）、description（简介）。',
    parameters: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '雪球代码，如 SH600519' },
        count: { type: 'number', description: '返回条数 1–10，默认 8' }
      },
      required: ['symbol'],
      additionalProperties: true
    },
    output: xqToolOutput(),
    timeoutMs: 30000,
    async execute(args) {
      const r = await core.actKOL({
        symbol: String(args.symbol || ''),
        count: Math.min(Math.max(parseInt(args.count, 10) || 8, 1), 10)
      })
      const rows = (r.list || []).map(function (u) {
        return { screen_name: u.screen_name, followers_count: u.followers_count, verified: !!u.verified, description: String(u.description || '').slice(0, 80) }
      })
      return JSON.stringify({ symbol: String(args.symbol || ''), count: rows.length, list: rows })
    }
  }
}

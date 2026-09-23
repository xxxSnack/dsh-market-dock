import { xqToolOutput } from './common.js'

export function makeSearchTool(core) {
  return {
    name: 'xueqiu_search',
    description: '按名称/拼音/代码搜索雪球证券，把用户口中的股票名解析为雪球代码。\n\n何时使用：用户提到股票中文名（"茅台"、"腾讯"）、ticker（"AAPL"、"TSLA"）或纯代码（"600519"），而你不确定对应的雪球代码时，先调本工具再调 xueqiu_quote / xueqiu_kline。支持A股/港股/美股/指数/ETF。\n\n输入：q 为搜索词（中文名、全拼如 maotai、代码或 ticker）。\n\n输出：候选列表（代码+名称），按相关度排序；同名/近似名多只时取第一条或多条并列让用户确认。',
    parameters: {
      type: 'object',
      properties: {
        q: { type: 'string', description: '搜索词：中文名、拼音、代码或 ticker' }
      },
      required: ['q'],
      additionalProperties: true
    },
    output: xqToolOutput(),
    timeoutMs: 30000,
    async execute(args) {
      const r = await core.actSearch({ q: String(args.q || ''), count: 10 })
      return JSON.stringify({ count: (r.list || []).length, list: r.list || [] })
    }
  }
}

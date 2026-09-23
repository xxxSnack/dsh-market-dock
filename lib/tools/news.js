import { xqIso, xqToolOutput } from './common.js'

export function makeNewsTool(core) {
  return {
    name: 'xueqiu_news',
    description: '获取雪球7×24实时财经快讯流（A股/港美股/宏观）。\n\n何时使用：用户问"今天有什么财经新闻"、"盘中有什么消息"、"刚才发生了什么"，或需要市场背景信息辅助解读行情时。\n\n输入：count 1–30 条（默认 15，上游每页约 10 条，超出时自动向后翻页补足）；max_id 为翻页游标——需要看更早的历史时，传上一页返回的 oldest_id。\n\n输出：按时间降序的快讯数组，每条含 time、text、mark（1=重要，其余为普通）；返回值带 oldest_id 供继续翻页。',
    parameters: {
      type: 'object',
      properties: {
        count: { type: 'number', description: '返回条数 1–30，默认 15' },
        max_id: { type: 'number', description: '翻页游标：上一页最旧一条的 id' }
      },
      required: [],
      additionalProperties: true
    },
    output: xqToolOutput(),
    timeoutMs: 30000,
    async execute(args) {
      // 上游固定每页 ~10 条且忽略 count 参数：请求多于 10 条时用 max_id 自动翻页补足
      const want = Math.min(Math.max(parseInt(args.count, 10) || 15, 1), 30)
      const rows = []
      let cursor = args.max_id
      for (let page = 0; page < 3 && rows.length < want; page++) {
        const r = await core.actNews({ count: 30, max_id: cursor })
        const items = r.items || []
        if (!items.length) break
        for (let i = 0; i < items.length && rows.length < want; i++) {
          const n = items[i]
          rows.push({ id: n.id, time: xqIso(n.created_at), mark: n.mark, text: String(n.text || '').slice(0, 160) })
        }
        cursor = items[items.length - 1].id
      }
      return JSON.stringify({ count: rows.length, oldest_id: rows.length ? rows[rows.length - 1].id : null, items: rows })
    }
  }
}

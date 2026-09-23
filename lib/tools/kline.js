import { xqIso, xqToolOutput } from './common.js'

export function makeKlineTool(core) {
  return {
    name: 'xueqiu_kline',
    description: '获取历史K线（OHLCV + 涨跌幅），用于走势分析和技术计算。\n\n何时使用：用户问"XX最近的走势"、"最近一个月涨了多少"，或需要计算均线/区间涨跌幅/波动率等技术指标时。只要最新价格就够的话用 xueqiu_quote，别拉K线。\n\n输入：symbol 为单只雪球代码（如 SH600519）；period 可选 1m/5m/15m/30m/60m/day/week/month（默认 day）；count 5–250 根（默认 60，含最新一根）。\n\n输出：按时间升序的数组，每根含 time（本地时区 ISO）、open/high/low/close、volume（单位为股，A股 1手=100股）、percent（该根涨跌幅%）。可直接用于计算区间涨跌 = (末根 close / 首根前收盘 - 1)。',
    parameters: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '雪球代码，如 SH600519' },
        period: { type: 'string', enum: ['1m', '5m', '15m', '30m', '60m', 'day', 'week', 'month'], description: 'K线周期，默认 day' },
        count: { type: 'number', description: '返回根数 5–250，默认 60' }
      },
      required: ['symbol'],
      additionalProperties: true
    },
    output: xqToolOutput(),
    timeoutMs: 30000,
    async execute(args) {
      const r = await core.actKline({
        symbol: String(args.symbol || ''),
        period: String(args.period || 'day'),
        count: Math.min(Math.max(parseInt(args.count, 10) || 60, 5), 250)
      })
      const rows = (r.rows || []).map(function (k) {
        return { time: xqIso(k.timestamp), open: k.open, high: k.high, low: k.low, close: k.close, volume: k.volume, percent: k.percent }
      })
      if (!rows.length) return JSON.stringify({ error: '无K线数据（检查代码是否正确，如 SH600519）' })
      return JSON.stringify({ symbol: String(args.symbol || ''), period: String(args.period || 'day'), count: rows.length, rows: rows })
    }
  }
}

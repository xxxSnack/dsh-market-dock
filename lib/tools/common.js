// Agent 工具共用的输出门面与时间格式化。纯函数，直接具名导出。

// ---- Agent 工具（一期 6 个）：模型在对话中直接查询雪球数据 ----
// 输出统一为 JSON 字符串（对齐 dsh-us-stocks 的 jsonOutput 模式，schema 简单、渲染即文本）。
export function xqToolOutput() {
  return {
    schema: { type: 'string' },
    render: function (_args, value) { return [{ type: 'text', text: String(value) }] }
  }
}
export function xqIso(ms) {
  // 本地时区格式化（toISOString 是 UTC，中文环境会差 8 小时）
  const d = new Date(Number(ms))
  if (isNaN(d.getTime())) return null
  const p = function (n) { return (n < 10 ? '0' : '') + n }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
}

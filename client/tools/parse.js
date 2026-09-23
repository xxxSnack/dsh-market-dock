// Agent 工具调用卡片的取数：tool-result block → JSON。

// execute 返回 JSON 字符串；从 tool-result block 的 content 里递归找 text 再 parse（us-stocks 同款防御）。
export function xqToolText(content, depth) {
  depth = depth || 0
  if (depth > 3 || !Array.isArray(content)) return undefined
  for (let i = 0; i < content.length; i++) {
    const b = content[i]
    if (!b || typeof b !== 'object') continue
    if (b.type === 'text' && typeof b.text === 'string') return b.text
    const nested = xqToolText(b.content, depth + 1)
    if (nested !== undefined) return nested
  }
  return undefined
}
export function xqParseResult(block) {
  // block 可能是运行中（无 kind）或已完成（kind=tool-result）
  if (!block || typeof block !== 'object') return null
  const text = xqToolText(block.content)
  if (text === undefined) return null
  try {
    const v = JSON.parse(text)
    return (v && typeof v === 'object') ? v : null
  } catch (e) { return null }
}

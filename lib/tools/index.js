// 6 个 Agent 工具 spec 的汇总。顺序即注册顺序，是既有习惯的一部分，不要调整。

import { makeQuoteTool } from './quote.js'
import { makeKlineTool } from './kline.js'
import { makeSearchTool } from './search.js'
import { makeHotTool } from './hot.js'
import { makeNewsTool } from './news.js'
import { makeKolTool } from './kol.js'

export function makeAgentTools(core) {
  return [
    makeQuoteTool(core),
    makeKlineTool(core),
    makeSearchTool(core),
    makeHotTool(core),
    makeNewsTool(core),
    makeKolTool(core)
  ]
}

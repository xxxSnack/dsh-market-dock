// 7 个 Agent 工具 spec 的汇总。顺序即注册顺序，是既有习惯的一部分，不要调整
// （新增的 xueqiu_display 追加在末尾：前 6 个的注册顺序在位，不影响任何按序断言的历史语义）。

import { makeQuoteTool } from './quote.js'
import { makeKlineTool } from './kline.js'
import { makeSearchTool } from './search.js'
import { makeHotTool } from './hot.js'
import { makeNewsTool } from './news.js'
import { makeKolTool } from './kol.js'
import { makeDisplayTool } from './display.js'

export function makeAgentTools(core) {
  return [
    makeQuoteTool(core),
    makeKlineTool(core),
    makeSearchTool(core),
    makeHotTool(core),
    makeNewsTool(core),
    makeKolTool(core),
    makeDisplayTool(core)
  ]
}

import { xqToolOutput } from './common.js'

// 「行情隐身」开关的 Agent 面：用户说「把行情关掉」/「把行情打开」时，模型能直接拨这个开关。
// 只读写 UI 状态，不碰行情、不碰持仓、不碰价格提醒 —— 提醒的判定在宿主 watcher 里，隐身期间照常跑。
export function makeDisplayTool(core) {
  return {
    name: 'xueqiu_display',
    description: '读取或切换「雪球行情」的显示开关（隐身）。\n\n何时使用：用户说"把行情关掉/隐个身/别让我看涨跌/行情太吵/关掉那个指数条"→ hidden=true；说"把行情打开/显示出来/恢复行情/我回来了"→ hidden=false；只问"行情开关现在是什么状态"→ 不带参数调用即可。\n\nhidden=true 的效果：输入框上方的行情面板、右下角悬浮徽章、输入框下方的指数条全部不渲染，行情轮询随之停止（零请求、零占屏）。**价格提醒不受影响**：宿主侧 watcher 照常判定，到价依然会发系统通知。\n\n恢复方式：再调一次本工具（hidden=false），或用户按已注册的快捷键（可在 设置 → 通用 → 快捷键 里查看/改键）。\n\n不带 hidden 参数时只读当前状态，不改变任何东西。',
    parameters: {
      type: 'object',
      properties: {
        hidden: { type: 'boolean', description: 'true=完全隐藏行情界面；false=恢复显示；省略=只读当前状态' }
      },
      // 显式空数组：省略参数就是「只读」这条语义要能被 schema 表达（工具层不接受 undefined required）
      required: [],
      additionalProperties: true
    },
    output: xqToolOutput(),
    timeoutMs: 10000,
    async execute(args) {
      const want = args && args.hidden
      if (typeof want !== 'boolean') {
        const cur = await core.actUiGet({})
        return JSON.stringify({ hidden: !!(cur && cur.hidden === true), changed: false })
      }
      await core.actUiSet({ hidden: want })
      return JSON.stringify({
        hidden: want,
        changed: true,
        note: want
          ? '行情界面已隐藏，行情轮询已停止；价格提醒仍然生效（到价会发系统通知）'
          : '行情界面已恢复显示'
      })
    }
  }
}

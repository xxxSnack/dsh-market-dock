// 入口：apply 薄壳（插样式 → 建运行时 → 装槽位/快捷键）+ 默认导出。
// 样式在 apply 开头只插一次；ui store / saveUi / hydratePromise / 拖拽引用等「每次 apply 一份」
// 的状态由 createUiRuntime 重建（见 store/ui.js 的运行时持有者说明）。
import { createUiRuntime } from './store/ui.js'
import { createPositionsRuntime } from './store/positions.js'
import { createAlertsWatchRuntime } from './store/alerts-watch.js'
import { installSlots } from './slots.js'
import { installShortcuts } from './shortcuts.js'

const xqClientPlugin = {
  inject: ['timer'],
  apply(ctx) {
    // #include-styles ./styles.css
    createUiRuntime(ctx)
    // 持仓/盈亏的唯一数据源：只建运行时、不取数，首个订阅者（chip / tab / 指数条）挂载时才启动轮询。
    // 它现在读的是「本地持仓 × 雪球行情」的宿主现算视图 —— 账本凭据坏了也不影响实时数字。
    createPositionsRuntime(ctx)
    // 价格提醒的系统通知器：**应用级、随 apply 启动**，与面板挂载和行情隐身都无关
    // （宿主侧 watcher 独立判定阈值，这里只负责把新事件弹成通知）。见 store/alerts-watch.js。
    createAlertsWatchRuntime(ctx).start()
    installSlots(ctx)
    // 行情隐身的恢复入口：快捷键（设置里可改键）。没有这个服务时仍可让 AI 用 xueqiu_display 打开。
    installShortcuts(ctx)
  }
}

export default xqClientPlugin

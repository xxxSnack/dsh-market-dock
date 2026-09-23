// 入口：apply 薄壳（插样式 → 建运行时 → 装槽位）+ 默认导出。
// 样式在 apply 开头只插一次；ui store / saveUi / hydratePromise / 拖拽引用等「每次 apply 一份」
// 的状态由 createUiRuntime 重建（见 store/ui.js 的运行时持有者说明）。
import { createUiRuntime } from './store/ui.js'
import { installSlots } from './slots.js'

const xqClientPlugin = {
  inject: ['timer'],
  apply(ctx) {
    // #include-styles ./styles.css
    createUiRuntime(ctx)
    installSlots(ctx)
  }
}

export default xqClientPlugin

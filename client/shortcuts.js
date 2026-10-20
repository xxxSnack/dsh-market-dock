// 应用级快捷键：行情「隐身」的恢复入口之一（另一个是 xueqiu_display 工具，让 AI 拨开关）。
//
// 为什么用宿主的快捷键服务而不是自己监听 keydown：
//   · 命令会出现在 设置 → 通用 → 快捷键 里 —— 用户能看见键帽、能改键，也能在撞键时自己换一个；
//   · 宿主统一处理焦点区域/输入框/弹窗的仲裁，不会在终端、输入框里误触发；
//   · 隐身之后屏幕上什么都没有，这条「看不见但要记得住」的入口必须是可发现、可改的。
//
// 降级链：shortcuts 服务不存在 → 什么都不做（仍可让 AI 打开）；
//        默认键位与既有命令冲突导致 register 抛错 → 退化为「未绑定」再注册一次，
//        命令照样出现在快捷键表里等用户指派，比彻底没有入口好。
import { toggleUiHidden } from './store/ui.js'
import { XQ_SHORTCUT_TOGGLE_HIDDEN } from './constants.js'

// primary = macOS 上的 ⌘ / 其它平台的 Ctrl。三修饰键 + X：正常输入与常见全局快捷键都不会占用。
const BINDING_PROFILES = ['web:windows', 'web:macos', 'web:linux', 'desktop:windows', 'desktop:macos', 'desktop:linux']

function binding() { return { code: 'KeyX', modifiers: ['primary', 'alt', 'shift'] } }

function makeCommand(withDefaults) {
  const defaults = {}
  if (withDefaults) for (let i = 0; i < BINDING_PROFILES.length; i++) defaults[BINDING_PROFILES[i]] = binding()
  return {
    id: XQ_SHORTCUT_TOGGLE_HIDDEN,
    label: function () { return '雪球行情：显示 / 隐身' },
    aliases: ['xueqiu hidden', '雪球隐身', '行情隐身', '隐藏行情'],
    defaults: defaults,
    // editable 也要放行：用户可能正停在输入框里想「把行情关掉」，此时 region='editable'。
    regions: ['page', 'editable'],
    modals: [],
    resolve: function () {
      return { status: 'handled', run: function () { toggleUiHidden() } }
    }
  }
}

function registerCommand(shortcuts) {
  try {
    return shortcuts.register(makeCommand(true))
  } catch (e) {
    try {
      return shortcuts.register(makeCommand(false))
    } catch (e2) {
      return function () {}
    }
  }
}

export function installShortcuts(ctx) {
  try {
    if (typeof ctx.inject !== 'function') return
    ctx.inject(['shortcuts'], function (scoped) {
      const shortcuts = scoped && scoped.shortcuts
      if (!shortcuts || typeof shortcuts.register !== 'function') return
      scoped.effect(function () { return registerCommand(shortcuts) })
    })
  } catch (e) { /* 宿主没有快捷键服务：隐身仍可经 xueqiu_display 工具恢复 */ }
}

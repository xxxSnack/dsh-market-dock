// 隐身状态下的**唯一可见痕迹**：左下角一枚小胶囊，点一下就把行情界面全部恢复。
//
// 为什么需要它：原来隐身后屏幕上什么都不剩，只能靠快捷键（记不住）或对 AI 说话（要打字），
// 恢复成本明显高于隐藏成本 —— 用户实测后要求「左下角一个简单按钮，一按就开」。
//
// 它由 shell.overlay 的徽章门控渲染（见 badge.js 的 MiniBadge），因此：
//   · 全局唯一、跨会话/跨页面都在（设置页也看得见，正好不会走丢）；
//   · **不发任何请求** —— 隐身期间「零请求」这条不变量不受影响（胶囊只是 ui 状态的一个开关）。
//   · 只做「恢复」这一件事，不做开合切换：隐藏动作有面板头和徽章上的按钮，不缺入口。
import { el } from './dom.js'
import { getUiRuntime } from './store/ui.js'
import { ensureAlertPermission } from './store/alerts-watch.js'

export function RestorePill() {
  const rt = getUiRuntime()
  const ui = rt.ui
  function restore() {
    // 顺手确认通知权限：隐身后提醒照常，但浏览器里请求权限必须发生在用户手势内。
    ensureAlertPermission()
    ui.set({ hidden: false })
  }
  return el('div', {
    className: 'xq-restore',
    title: '行情已隐藏 · 点这里恢复（快捷键 Ctrl/⌘+Alt+Shift+X，或对 AI 说「把行情打开」）',
    role: 'button',
    tabIndex: 0,
    onClick: restore,
    onKeyDown: function (e) {
      if (e && (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar')) { e.preventDefault(); restore() }
    }
  }, [
    el('span', { key: 'dot', className: 'xq-restore-dot' }, null),
    el('span', { key: 't', className: 'xq-restore-txt' }, '行情')
  ])
}

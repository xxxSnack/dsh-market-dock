// 行内「更多」菜单的落点计算（面板/持仓两处共用）。
//
// 为什么需要它：菜单是相对按钮绝对定位的，而它一定会被某个祖先裁剪 ——
//   · 行情表 .xq-grid 有 overflow: hidden（圆角）；
//   · 持仓表 .xq-pos-table 在窄容器里是 overflow-x: auto（会把另一个轴也算成 auto）；
//   · 面板内容 .xq-dock-body 是滚动容器。
// 最后一行的菜单向下展开就会掉进裁剪区外面（看不见、点不到）。这里先量出按钮在
// **最近的裁剪祖先**可视区里上下各剩多少空间，下方不够就翻到上方展开。

/** 菜单自身高度估计（一项 = 28px + 上下 padding 8 + 边框 2；多一项按 28 递增）。 */
export function estimateMenuHeight(items) {
  const n = items > 0 ? items : 1
  return 28 * n + 10
}

/**
 * 判断菜单是否应该向上展开。
 * @param {Element} trigger 触发按钮
 * @param {number} menuHeight 菜单高度估计
 * @returns {boolean} true = 向上展开
 */
export function menuUpward(trigger, menuHeight) {
  if (!trigger || typeof trigger.getBoundingClientRect !== 'function') return false
  let rect
  try { rect = trigger.getBoundingClientRect() } catch (e) { return false }
  if (!rect) return false
  const need = (menuHeight > 0 ? menuHeight : estimateMenuHeight(1)) + 6

  let box = null
  try {
    let node = trigger.parentElement
    while (node && node !== document.body && node !== document.documentElement) {
      const cs = window.getComputedStyle(node)
      const clipY = cs.overflowY && cs.overflowY !== 'visible'
      const clipX = cs.overflowX && cs.overflowX !== 'visible'
      if (clipY || clipX) { box = node.getBoundingClientRect(); break }
      node = node.parentElement
    }
  } catch (e) { box = null }

  const top = box ? box.top : 0
  const bottom = box ? box.bottom : (typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : 800)
  const below = bottom - rect.bottom
  const above = rect.top - top
  if (below >= need) return false     // 下方放得下：保持默认向下
  return above > below                // 下方放不下：上方更宽裕就翻上去
}

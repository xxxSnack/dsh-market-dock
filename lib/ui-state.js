// UI 状态持久化（tab/open/dockH/badgeW/badgePos）与它的读写动作。字段语义与钳制逐字保留。

export function installUiState(core) {
  const ctx = core.ctx

  // ---- UI 状态持久化 ----
  async function loadUiState() {
    if (core.uiState) return core.uiState
    core.uiState = { pos: null, tab: 'market', minimized: false }
    const fs = ctx.get('fs')
    const sp = ctx.get('sandboxPolicy')
    const root = sp && sp.workspaceRoot ? sp.workspaceRoot : null
    if (fs) {
      try {
        const text = await core.stateRead('.xueqiu-ui-state.json', fs, root)
        const parsed = text == null ? null : JSON.parse(text)
        if (parsed && typeof parsed === 'object') core.uiState = parsed
      } catch (e) { /* 默认状态 */ }
    }
    return core.uiState
  }

  async function saveUiState() {
    const fs = ctx.get('fs')
    const sp = ctx.get('sandboxPolicy')
    const root = sp && sp.workspaceRoot ? sp.workspaceRoot : null
    if (!fs) return
    try {
      await core.stateWrite('.xueqiu-ui-state.json', JSON.stringify(core.uiState), fs, root)
    } catch (e) { /* 保持内存态 */ }
  }

  async function actUiGet() {
    const s = await loadUiState()
    const hNum = Number(s.dockH)
    const validTabs = ['market', 'hot', 'search', 'news', 'pnl']
    return {
      // 损坏状态文件的非法 tab 一律回退（防类型穿透）
      tab: (typeof s.tab === 'string' && validTabs.indexOf(s.tab) >= 0) ? s.tab : 'market',
      // v1.22.8 引入回归：open 字段曾被上一行的行尾注释吞掉，导致客户端刷新后不恢复面板开合状态
      open: s.open !== false,
      dockH: (s.dockH !== undefined && isFinite(hNum) && hNum >= 160 && hNum <= 1200) ? hNum : null,
      badgeW: (s.badgeW !== undefined && isFinite(Number(s.badgeW)) && Number(s.badgeW) >= 120 && Number(s.badgeW) <= 480) ? Number(s.badgeW) : null,
      badgePos: (s.badgePos && isFinite(Number(s.badgePos.x)) && isFinite(Number(s.badgePos.y)))
        ? { x: Number(s.badgePos.x), y: Number(s.badgePos.y) } : null
    }
  }

  async function actUiSet(args) {
    const s = await loadUiState()
    if (args.tab !== undefined) s.tab = String(args.tab)
    if (args.open !== undefined) s.open = !!args.open
    if (args.badgePos && typeof args.badgePos === 'object' && isFinite(Number(args.badgePos.x)) && isFinite(Number(args.badgePos.y))) {
      s.badgePos = { x: Number(args.badgePos.x), y: Number(args.badgePos.y) }
    }
    // null = 显式复位（客户端"双击复位/默认高度"会发送 null）；
    // 不能走 Number(null)=0 的钳制路径，否则复位被写成了下限值(120/160)
    if (args.dockH !== undefined) {
      if (args.dockH === null) { s.dockH = null }
      else {
        const dh = Number(args.dockH)
        if (isFinite(dh)) s.dockH = Math.min(Math.max(dh, 160), 1200)
      }
    }
    if (args.badgeW !== undefined) {
      if (args.badgeW === null) { s.badgeW = null }
      else {
        const bw = Number(args.badgeW)
        if (isFinite(bw)) s.badgeW = Math.min(Math.max(bw, 120), 480)
      }
    }
    await saveUiState()
    return { ok: true }
  }

  core.actUiGet = actUiGet
  core.actUiSet = actUiSet
}

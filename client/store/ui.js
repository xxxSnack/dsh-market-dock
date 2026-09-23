// UI 共享状态：面板开合 / 当前标签 / 徽章位置尺寸。同时是**运行时持有者（runtime holder）**。
//
// ── 为什么需要持有者 ─────────────────────────────────────────────────────────
// 重构前所有东西都在 apply(ctx) 的闭包里，因此 ui store、saveUi（debounce 包装）、hydratePromise、
// 徽章拖拽引用、面板高度拖拽引用都是「每次 apply 一份」。拆到模块作用域后如果直接写成模块级
// 单例（例如 `const ui = {...}`），就会变成「整个模块生命周期一份」：重新 apply 时旧状态不会
// 重置，多个实例还会互相串状态——这是行为变化。
// 因此这里保留一个模块级变量 `uiRuntime`，由 apply 开头调用 createUiRuntime(ctx) 重建；
// 组件在渲染时通过 getUiRuntime() 取，语义与旧闭包一致：同一 apply 内共享、跨 apply 隔离。
//
// ── fork-fix 集中地（对照 FORK-NOTES.md，四处理由详见行内注释）────────────────
//   1. touched 守卫新增 badgePos/badgeW/dockH（原来是 open/tab 独有）
//   2. ui.set 的落盘条件从 'open' in patch 扩展为位置/尺寸任一
//   3. hydrateUi() 改为应用级、幂等、只跑一次（原来挂在 DockGate 里，切会话会重放）
import { call, A_UI_GET, A_UI_SET } from '../platform.js'
import { viewport } from '../dom.js'
import { SAVE_UI_DEBOUNCE_MS, EDGE_GAP, BADGE_W_MIN, BADGE_W_MAX, BADGE_W_DEFAULT, BADGE_CLAMP_MIN_H, VIEWPORT_FALLBACK_W, VIEWPORT_FALLBACK_H } from '../constants.js'

// 当前 apply 的运行时（每次 apply 一份；组件渲染时经 getUiRuntime() 取）
let uiRuntime = null

export function getUiRuntime() { return uiRuntime }

export function createUiRuntime(ctx) {
  // ---------- 共享 UI 状态：面板开合 / 当前标签 / 徽章位置 ----------
  const ui = {
    open: false, tab: 'market', badgePos: null, badgeW: null, dockH: null, hydrated: false,
    // [fork-fix] 已交互过的字段不被迟到的水合回滚。open/tab 原本就有这两个标志，位置/尺寸缺失。
    openTouched: false, tabTouched: false, badgePosTouched: false, badgeWTouched: false, dockHTouched: false,
    _fns: [],
    subscribe: function (fn) {
      this._fns.push(fn)
      const self = this
      return function () {
        const i = self._fns.indexOf(fn)
        if (i !== -1) self._fns.splice(i, 1)
      }
    },
    notify: function () {
      const fns = this._fns.slice()
      for (let i = 0; i < fns.length; i++) { try { fns[i]() } catch (e) { /* ignore */ } }
    },
    set: function (patch) {
      let ch = false
      for (const k in patch) {
        if (this[k] !== patch[k]) { this[k] = patch[k]; ch = true }
        // 水合前用户已交互过的字段不做回滚（页面刚加载就点开面板/切标签，不被迟到的旧持久化打回）
        if (k === 'open') this.openTouched = true
        if (k === 'tab') this.tabTouched = true
        // [fork-fix] 位置/尺寸同样要守卫：原来只有 open/tab 有，导致切会话时重放的水合
        // 把刚拖到的徽章位置打回旧持久化值（表现为"切会话后弹回右下角"）。
        if (k === 'badgePos') this.badgePosTouched = true
        if (k === 'badgeW') this.badgeWTouched = true
        if (k === 'dockH') this.dockHTouched = true
      }
      if (ch) {
        this.notify()
        // 打开面板的 set 发生在面板组件订阅建立之前（订阅在挂载后才生效）——
        // 若无人续触发 ui.set，open=true 永远不落盘，刷新后面板关着。open 翻转直接触发落盘。
        // [fork-fix] 原来只有 open 直接落盘：位置/尺寸靠 DockPanel 的订阅间接落盘，
        // 而面板收起时 DockPanel 根本不挂载（DockGate 返回 null）→ 拖徽章永不写入。
        // 改为所有被持久化的键都直接排一次落盘，不再依赖某个组件恰好挂着。
        if ('open' in patch || 'badgePos' in patch || 'badgeW' in patch || 'dockH' in patch) {
          try { saveUi() } catch (e) { /* 初始化前忽略 */ }
        }
      }
    }
  }

  const saveUi = ctx.debounce(function () {
    call(A_UI_SET, { tab: ui.tab, open: ui.open, badgePos: ui.badgePos, badgeW: ui.badgeW, dockH: ui.dockH }).catch(function () { /* 忽略 */ })
  }, SAVE_UI_DEBOUNCE_MS)

  uiRuntime = {
    ctx: ctx,
    ui: ui,
    saveUi: saveUi,
    // 应用级水合 promise（幂等：已发起过就直接复用）
    hydratePromise: null,
    // 徽章拖拽引用（实例唯一）
    badgeDrag: null,
    badgeMoved: false,
    // 面板高度拖拽引用（实例唯一，避免组件重渲染丢失状态）
    dockResize: { active: false, startY: 0, startH: 0, h: 0, body: null }
  }
  return uiRuntime
}

// [fork-fix] 水合改为应用级、幂等、只跑一次。
// 下面四行是重构前的原文（"本组件"= 当时承载这段代码的 DockGate；本函数现已随代码搬到 store/ui.js）：
// ui 是全局状态（不属于任何会话），但原来 ui.get 挂在本组件里，而
// conversation.input.dock 的 scope 是 "session" → 每次切会话重挂都会重放一次水合，
// 把内存里刚拖到的新位置覆盖成旧持久化值。移到 shell.overlay 的 MiniBadge（全局只挂一次）触发。
export function hydrateUi() {
  const rt = getUiRuntime()
  const ui = rt.ui
  if (rt.hydratePromise) return rt.hydratePromise
  rt.hydratePromise = call(A_UI_GET, {}).then(function (d) {
    if (d && d.tab && !ui.tabTouched) ui.set({ tab: d.tab })
    if (d && typeof d.open === 'boolean' && !ui.openTouched) ui.set({ open: d.open })
    if (d && d.badgePos && isFinite(Number(d.badgePos.x)) && isFinite(Number(d.badgePos.y)) && !ui.badgePosTouched) {
      // 恢复位置时钳制到当前视口内（视口缩小/分辨率变化后防止徽章落到屏幕外）
      // maxX 必须按徽章实际宽度算：区域模式宽达 480px，固定 -140 会让宽徽章右缘出屏
      const vp = viewport()
      const effW = (typeof d.badgeW === 'number' && isFinite(d.badgeW) && d.badgeW >= BADGE_W_MIN)
        ? Math.min(d.badgeW, BADGE_W_MAX) : BADGE_W_DEFAULT
      const maxX = (vp ? vp.w : VIEWPORT_FALLBACK_W) - effW - EDGE_GAP
      const maxY = (vp ? vp.h : VIEWPORT_FALLBACK_H) - BADGE_CLAMP_MIN_H
      ui.set({ badgePos: {
        x: Math.min(Math.max(EDGE_GAP, Number(d.badgePos.x)), Math.max(EDGE_GAP, maxX)),
        y: Math.min(Math.max(EDGE_GAP, Number(d.badgePos.y)), Math.max(EDGE_GAP, maxY))
      } })
    }
    if (d && typeof d.dockH === 'number' && isFinite(d.dockH) && !ui.dockHTouched) {
      ui.set({ dockH: d.dockH })
    }
    if (d && typeof d.badgeW === 'number' && isFinite(d.badgeW) && !ui.badgeWTouched) {
      ui.set({ badgeW: d.badgeW })
    }
    ui.set({ hydrated: true })
  }).catch(function () { ui.set({ hydrated: true }) })
  return rt.hydratePromise
}

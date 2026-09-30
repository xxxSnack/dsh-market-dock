#!/usr/bin/env node
/**
 * dsh-xueqiu-debug 客户端 bundle 冒烟测试（零依赖，只用 Node 内置模块 + node:vm）
 *
 * 背景：src/client/index.js 是由 scripts/gen-static.py 从 dynamic/client.js 生成的
 * **静态 client bundle**（classic script，注册进 window.__ModuleLoader__）。该文件即将被
 * 大规模拆分重构，但对外契约必须逐字节不变。所以本测试只断言「对外契约」，不碰内部结构：
 *
 *   1. 注册契约：__ModuleLoader__ 恰好一个条目，id 精确等于包名 dsh-xueqiu-debug；
 *   2. 依赖纯度：factory 内 require(...) 只能命中平台 seed 字面量（react 等）；
 *   3. 导出形态：factory(require) 返回（或 .default）是带 apply 的 cordis 插件对象；
 *   4. 槽位契约：真跑 plugin.apply(ctx)，断言恰好 7 次 slots.inject + 7 次 slots.register，
 *      且每条的 name / id / order / key 精确匹配；
 *   5. 样式契约：apply 插入的 <style> 的 data-plugin 精确等于包名；
 *   6. 渲染冒烟：用最小 React 替身真实调用已注册组件，断言渲染不抛异常且产出关键结构。
 *   7. 运行时 hook 契约（[5c]）：替身给**每次组件调用**记一本 hook 账本，断言切 tab 时「每个组件自身的
 *      hook 数」恒定 —— 内联（裸函数调用）的子组件会把 hook 记到父组件头上，于是父组件 hook 数随 tab
 *      变化，正是 React 抛 "Rendered fewer hooks than expected" 的根因。
 *
 * 运行：node test/smoke-client.mjs      （退出码 0=通过，非 0=失败）
 *
 * 沙箱替身与妥协（汇报里会一并打印）：
 *   - fetch：永不出网。替换为进程内假响应（默认解析成功的空数据，避免任何未处理 Promise 拒绝）；
 *   - 定时器：沙箱内 setTimeout/setInterval/requestAnimationFrame/queueMicrotask 只登记不调度，
 *     插件的轮询走 ctx.interval / ctx.debounce（测试内同为登记型替身）→ 测试不会挂住；
 *   - React 替身：createElement 真造元素树、函数组件被真实调用；useState/useReducer 返回初始值
 *     （setter 为 noop）、useRef 每次渲染给新对象、useMemo 真跑、useCallback 原样返回、
 *     useEffect/useLayoutEffect **只登记不执行**（需要时按组件白名单显式 flush，见 FLUSHABLE）；
 *   - DOM 替身：只实现 bundle 用到的极小子集（<style> 捕获、document.head/body/documentElement）；
 *   - KLineChart（canvas）路径不 flush effect：无 canvas 实现，flush 只会踩空，静态渲染已覆盖。
 */
import { readFileSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

// ---------------------------------------------------------------- 常量与路径
const HERE = dirname(fileURLToPath(import.meta.url))
const BUNDLE_PATH = join(HERE, '..', 'src', 'client', 'index.js')
const PKG = 'dsh-xueqiu-debug'

/** 平台 seed 字面量：由 dsh 启动清单 __DSH_BOOT__.staticModules 提供，bundle 只许 require 这些。 */
const SEED_WORDS = new Set(['react', 'react-dom', 'react/jsx-runtime'])

/** 槽位契约（逐条锁定现状，字段名以源码为准）。 */
const EXPECTED_SLOTS = [
  { inject: 'tool.call.toolview', options: { name: 'tool.call.toolview', key: 'xueqiu_quote' } },
  { inject: 'tool.call.toolview', options: { name: 'tool.call.toolview', key: 'xueqiu_kline' } },
  { inject: 'tool.call.toolview', options: { name: 'tool.call.toolview', key: 'xueqiu_hot' } },
  { inject: 'tool.call.toolview', options: { name: 'tool.call.toolview', key: 'xueqiu_news' } },
  { inject: 'conversation.input.dock', options: { name: 'conversation.input.dock', id: 'xueqiu-debug-panel', order: 30 } },
  { inject: 'shell.overlay', options: { name: 'shell.overlay', id: 'xueqiu-debug-badge' } },
  { inject: 'conversation.composer.dock', options: { name: 'conversation.composer.dock', id: 'xueqiu-debug-ticker', order: 1 } },
]

/** 允许 flush effect 的组件（白名单）：这些组件的 effect 只做 fetch + ctx.interval + 订阅，安全。
 *  KLineChart/MinuteChart 的 effect 会去建 canvas 图表，无 DOM/canvas 实现，一律跳过。 */
const FLUSHABLE = new Set(['DockGate', 'DockPanel', 'XueqiuPanel', 'MiniBadge', 'Ticker'])

const MAX_NODES = 20000
const MAX_DEPTH = 80

// ---------------------------------------------------------------- 断言与报告
let passed = 0
const failures = []

function stable(v) {
  if (v === undefined) return 'undefined'
  if (typeof v === 'function') return '[function ' + (v.name || 'anonymous') + ']'
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? String(v)
  if (Array.isArray(v)) return '[' + v.map(stable).join(', ') + ']'
  const keys = Object.keys(v).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ': ' + stable(v[k])).join(', ') + '}'
}
function eqJson(actual, expected, what) {
  const a = stable(actual)
  const b = stable(expected)
  if (a !== b) throw new Error(what + ' → 实际 ' + a + '，期望 ' + b)
}
function eq(actual, expected, what) {
  if (actual !== expected) {
    const short = (v) => {
      const s = stable(v)
      return s.length > 140 ? s.slice(0, 137) + '…' : s
    }
    throw new Error(what + ' → 实际 ' + short(actual) + '，期望 ' + short(expected))
  }
}
function ok(cond, what) {
  if (!cond) throw new Error(what)
}
/** 后续断言的公共前置：第一关（顶层/factory/导出）没过时，后面每一项都以同一条根因失败，
 *  避免刷屏的 TypeError 噪音掩盖真正的原因。 */
let readyGuard = null
function check(name, fn) {
  try {
    if (readyGuard) readyGuard()
    const detail = fn()
    passed++
    console.log('  ✓ ' + name + (detail ? '：' + detail : ''))
  } catch (err) {
    const msg = name + ' :: ' + ((err && err.message) || String(err))
    failures.push(msg)
    console.log('  ✗ ' + msg)
  }
}
function assertReady(booted) {
  if (booted.topLevelError) throw new Error('前置失败：bundle 顶层执行抛错（' + booted.topLevelError.message + '）')
  if (booted.factoryError) throw new Error('前置失败：factory 实例化抛错（' + booted.factoryError.message + '）')
  if (!booted.plugin || typeof booted.plugin.apply !== 'function') throw new Error('前置失败：导出不是带 apply 的插件对象')
  if (!booted.injects || !booted.registers) throw new Error('前置失败：槽位表未建立')
}
function note(msg) {
  console.log('  · ' + msg)
}
function section(title) {
  console.log('\n' + title)
}

// 沙箱里的异步代码若产生未处理的 Promise 拒绝，Node 默认会直接终结进程；这里收集后统一断言。
const unhandled = []
process.on('unhandledRejection', (reason) => {
  unhandled.push(reason)
})

// ---------------------------------------------------------------- 最小 DOM 替身
function createElementShim(doc, tag) {
  const attrs = {}
  const el = {
    ownerDocument: doc,
    tagName: String(tag).toUpperCase(),
    nodeName: String(tag).toUpperCase(),
    nodeType: 1,
    attributes: attrs,
    childNodes: [],
    parentNode: null,
    parentElement: null,
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    _text: '',
    setAttribute(k, v) { attrs[k] = String(v) },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) },
    removeAttribute(k) { delete attrs[k] },
    appendChild(c) {
      this.childNodes.push(c)
      if (c && typeof c === 'object') { c.parentNode = this; c.parentElement = this }
      return c
    },
    insertBefore(c, ref) {
      const at = this.childNodes.indexOf(ref)
      if (at === -1) return this.appendChild(c)
      this.childNodes.splice(at, 0, c)
      if (c && typeof c === 'object') { c.parentNode = this; c.parentElement = this }
      return c
    },
    removeChild(c) {
      const at = this.childNodes.indexOf(c)
      if (at !== -1) this.childNodes.splice(at, 1)
      if (c && typeof c === 'object') { c.parentNode = null; c.parentElement = null }
      return c
    },
    replaceChild(c, old) { this.removeChild(old); return this.appendChild(c) },
    remove() {},
    contains: () => false,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    setPointerCapture() {},
    releasePointerCapture() {},
    hasPointerCapture: () => false,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0 }),
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null,
    focus() {},
    blur() {},
    scrollTo() {},
    get offsetWidth() { return 0 },
    get offsetHeight() { return 0 },
    get clientWidth() { return 0 },
    get clientHeight() { return 0 },
    get isConnected() { return false },
    get textContent() { return this._text },
    set textContent(v) { this._text = String(v); this.childNodes = [] },
  }
  // 记录 style 标签的 appended 顺序：head.appendChild 已经把节点放进 childNodes，够用。
  return el
}

function createDom() {
  const doc = {
    hidden: false,
    visibilityState: 'visible',
    title: 'smoke',
    createElement: (tag) => createElementShim(doc, tag),
    createTextNode: (t) => {
      const el = createElementShim(doc, '#text')
      el._text = String(t)
      return el
    },
    createDocumentFragment: () => createElementShim(doc, '#fragment'),
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    getElementsByClassName: () => [],
  }
  doc.documentElement = createElementShim(doc, 'html')
  doc.head = createElementShim(doc, 'head')
  doc.body = createElementShim(doc, 'body')
  doc.documentElement.appendChild(doc.head)
  doc.documentElement.appendChild(doc.body)
  return doc
}

// ---------------------------------------------------------------- 最小 React 替身
function createReactStub() {
  const reactor = {
    current: null,           // 当前组件渲染作用域
    effects: [],             // 本轮渲染登记的 effect（不执行）
    setStateCalls: [],       // 只记录，不触发重渲染
    renders: 0,              // 被真实调用的函数组件次数
    componentNames: [],
    // [5c] hook 账本：每次「函数组件被真实调用」追加一条 { fn, name, hooks, count }。
    // 归属规则与真实 React 一致 —— hook 记在**当前正在执行 body 的那个组件**头上，
    // 因此被内联（裸函数调用）的子组件不会开新作用域，它的 hook 会算到父组件头上，
    // 表现为父组件的 hook 数随渲染变化（React 会抛 "Rendered fewer hooks than expected"）。
    hookLog: [],
    // [5c] stateful：默认 false = 旧行为（每次渲染都返回初始值、setter 为 noop）。
    // 打开后 useState/useReducer 按「组件函数 + hook 序号」跨渲染记忆值、setter 真正生效；
    // 只有这样才能验证「effect 取到数据 → 复渲染真的把数据渲染出来」这条链路（指数条那段用）。
    stateful: false,
    _slots: new Map(),       // fn → Map(hook 序号 → 值)，仅 stateful 模式使用
  }

  function needScope(hook) {
    const s = reactor.current
    if (!s) throw new Error('React 替身：' + hook + ' 在组件函数之外被调用')
    s.i++
    s.hooks.push(hook)
    return s
  }
  function noopSetter(value) {
    reactor.setStateCalls.push(typeof value === 'function' ? '[fn updater]' : value)
  }
  /** [5c] stateful 模式的 state 槽：按「组件函数 + hook 序号」对位，与 React 的按调用顺序对位同构。 */
  function stateSlot(scope, init) {
    let slots = reactor._slots.get(scope.fn)
    if (!slots) { slots = new Map(); reactor._slots.set(scope.fn, slots) }
    const idx = scope.i - 1   // 本次调用里的 hook 序号（useEffect 也占位，与 React 一致）
    if (!slots.has(idx)) slots.set(idx, typeof init === 'function' ? init() : init)
    return {
      get: () => slots.get(idx),
      set: (v) => { noopSetter(v); slots.set(idx, typeof v === 'function' ? v(slots.get(idx)) : v) },
    }
  }

  function createElement(type, props, ...children) {
    const kids = []
    for (const c of children) flatten(kids, c)
    const out = { $$xqElement: true, type, props: Object.assign({}, props || {}) }
    if (kids.length) out.props.children = kids.length === 1 ? kids[0] : kids
    return out
  }
  function flatten(out, c) {
    if (c === null || c === undefined || typeof c === 'boolean') return
    if (Array.isArray(c)) { for (const x of c) flatten(out, x); return }
    out.push(c)
  }
  function Fragment(props) { return (props && props.children) ?? null }

  const react = {
    createElement,
    Fragment,
    StrictMode: Fragment,
    Suspense: Fragment,
    isValidElement: (v) => !!(v && v.$$xqElement === true),
    cloneElement: (el, props, ...children) => createElement(el.type, Object.assign({}, el.props, props), ...children),
    Children: { map: (c, fn) => (Array.isArray(c) ? c : [c]).map(fn), toArray: (c) => (Array.isArray(c) ? c : [c]) },
    memo: (fn) => fn,
    forwardRef: (fn) => function ForwardRefShim(props) { return fn(props, null) },
    lazy: (fn) => fn,
    createContext: (defaultValue) => ({ $$xqContext: true, defaultValue, Provider: Fragment, Consumer: Fragment }),
    useState(init) {
      const s = needScope('useState')
      if (!reactor.stateful) return [typeof init === 'function' ? init() : init, noopSetter]
      const slot = stateSlot(s, init)
      return [slot.get(), slot.set]
    },
    useReducer(reducer, init, initFn) {
      const s = needScope('useReducer')
      const initial = () => (typeof initFn === 'function' ? initFn(init) : (typeof init === 'function' ? init() : init))
      if (!reactor.stateful) return [initial(), noopSetter]
      const slot = stateSlot(s, initial)
      return [slot.get(), slot.set]
    },
    useRef(init) {
      needScope('useRef')
      return { current: init }
    },
    useEffect(fn, deps) {
      needScope('useEffect')
      reactor.effects.push({ name: reactor.current.name, kind: 'effect', fn, deps })
    },
    useLayoutEffect(fn, deps) {
      needScope('useLayoutEffect')
      reactor.effects.push({ name: reactor.current.name, kind: 'layout', fn, deps })
    },
    useInsertionEffect() { needScope('useInsertionEffect') },
    useMemo(fn) { needScope('useMemo'); return fn() },
    useCallback(fn) { needScope('useCallback'); return fn },
    useContext(c) {
      needScope('useContext')
      return c && Object.prototype.hasOwnProperty.call(c, 'defaultValue') ? c.defaultValue : {}
    },
    useImperativeHandle() { needScope('useImperativeHandle') },
    useDebugValue() { needScope('useDebugValue') },
    useId() { needScope('useId'); return ':xq-smoke:' },
    useTransition() { needScope('useTransition'); return [false, (fn) => fn()] },
    useDeferredValue(v) { needScope('useDeferredValue'); return v },
    useSyncExternalStore(subscribe, getSnapshot) {
      needScope('useSyncExternalStore')
      return typeof getSnapshot === 'function' ? getSnapshot() : undefined
    },
  }

  const reactDom = {
    createPortal: (node) => node,
    render() {},
    hydrate() {},
    unmountComponentAtNode() {},
    findDOMNode: () => null,
    flushSync: (fn) => fn(),
    version: 'smoke-stub',
  }
  const jsxRuntime = {
    Fragment,
    jsx: (type, props) => createElement(type, props),
    jsxs: (type, props) => createElement(type, props),
    jsxDEV: (type, props) => createElement(type, props),
  }

  function invokeComponent(type, props) {
    const prev = reactor.current
    const scope = { fn: type, name: type.name || 'anonymous', i: 0, hooks: [] }
    reactor.current = scope
    reactor.renders++
    reactor.componentNames.push(scope.name)
    try {
      return type(props)
    } catch (err) {
      throw new Error('组件 ' + scope.name + ' 渲染抛错：' + ((err && err.message) || String(err)))
    } finally {
      reactor.current = prev
      // [5c] 成功/抛错都记账：本次调用依次调了哪些 hook（内联子组件不会开新作用域，会记到父组件上）
      reactor.hookLog.push({ fn: type, name: scope.name, hooks: scope.hooks.slice(), count: scope.hooks.length })
    }
  }

  function walk(node, depth, budget) {
    if (node === null || node === undefined || typeof node === 'boolean') return null
    if (++budget.n > MAX_NODES) throw new Error('渲染树节点数超过 ' + MAX_NODES + '，疑似死循环')
    if (depth > MAX_DEPTH) throw new Error('渲染深度超过 ' + MAX_DEPTH)
    if (typeof node === 'string' || typeof node === 'number') return { kind: 'text', text: String(node), children: [] }
    if (Array.isArray(node)) {
      return { kind: 'fragment', children: node.map((c) => walk(c, depth + 1, budget)).filter(Boolean) }
    }
    if (typeof node !== 'object' || node.$$xqElement !== true) return null
    if (typeof node.type === 'function') {
      return walk(invokeComponent(node.type, node.props || {}), depth + 1, budget)
    }
    const props = node.props || {}
    const raw = props.children
    const kids = raw === undefined ? [] : (Array.isArray(raw) ? raw : [raw])
    const children = []
    for (const c of kids) {
      const w = walk(c, depth + 1, budget)
      if (w) children.push(w)
    }
    return { kind: 'host', type: String(node.type), props, children }
  }

  return { react, reactDom, jsxRuntime, reactor, walk }
}

// ---------------------------------------------------------------- 渲染树读取工具
function treeText(node) {
  if (!node) return ''
  if (node.kind === 'text') return node.text
  return node.children.map(treeText).join('')
}
function treeHosts(node, out = []) {
  if (!node) return out
  if (node.kind === 'host') {
    out.push(node)
    for (const c of node.children) treeHosts(c, out)
  } else if (node.kind === 'fragment') {
    for (const c of node.children) treeHosts(c, out)
  }
  return out
}
const classOf = (host) => String((host.props && host.props.className) || '')
function hasClass(node, cls) {
  return treeHosts(node).some((h) => classOf(h).split(/\s+/).includes(cls))
}
function classCount(node, cls) {
  return treeHosts(node).filter((h) => classOf(h).split(/\s+/).includes(cls)).length
}
function textHas(node, needle) {
  return treeText(node).includes(needle)
}

// ---------------------------------------------------------------- 槽位 / ctx 替身
function createSlots() {
  const injects = []
  const registers = []
  const slots = {
    inject(name, cb) {
      if (typeof cb !== 'function') throw new Error('slots.inject 第二个参数不是函数')
      const result = cb()          // 真 dsh：宿主槽位就绪时回调；这里立即回调
      injects.push({ name, result })
      return function dispose() {}
    },
    register(options, render) {
      const handle = { options, render, dispose() {} }
      registers.push(handle)
      return handle
    },
  }
  return { slots, injects, registers }
}

function createCtx({ slots, timerLog, touchLog }) {
  const base = {
    get(name) {
      touchLog.push('get(' + name + ')')
      if (name === 'slots') return slots
      if (name === 'timer') return { interval: base.interval, timeout: base.setTimeout }
      return undefined
    },
    interval(fn, ms) {
      touchLog.push('interval(' + ms + ')')
      timerLog.push({ kind: 'interval', ms })
      return function stop() {}
    },
    setTimeout(fn, ms) {
      touchLog.push('setTimeout(' + ms + ')')
      timerLog.push({ kind: 'timeout', ms })
      return function cancel() {}
    },
    debounce(fn, ms) {
      touchLog.push('debounce(' + ms + ')')
      timerLog.push({ kind: 'debounce', ms })
      return function debounced() { /* 不真正调度：避免测试结束时还有待跑回调 */ }
    },
    throttle(fn) { return fn },
    effect(fn) { touchLog.push('effect()'); return fn() },
    on() { touchLog.push('on()'); return () => {} },
    logger: { info() {}, warn() {}, error() {}, debug() {} },
  }
  // 未知 ctx 成员退化为 no-op 函数并记入 touchLog：重构若新增 ctx 用法不会误报，但会在报告里显形。
  return new Proxy(base, {
    get(target, key) {
      if (key in target) return target[key]
      if (typeof key !== 'string') return undefined
      touchLog.push('unknown-ctx:' + key)
      return function unknownCtxMember() { return function noopDisposer() {} }
    },
  })
}

// ---------------------------------------------------------------- 沙箱装配
function createSandbox(dom, fetchImpl) {
  const logs = []
  const sandbox = {}
  const timerLog = []
  const record = { timerLog, logs, fetchCalls: [], loadCalls: [] }

  sandbox.console = {
    log: (...a) => logs.push(a.map(String).join(' ')),
    info: (...a) => logs.push(a.map(String).join(' ')),
    warn: (...a) => logs.push(a.map(String).join(' ')),
    error: (...a) => logs.push(a.map(String).join(' ')),
    debug: () => {},
  }
  // 定时器全部“登记但不调度”：测试永不挂住，也永不因残留回调在汇总后抛错。
  sandbox.setTimeout = (fn, ms) => { timerLog.push({ kind: 'setTimeout', ms }); return timerLog.length }
  sandbox.clearTimeout = () => {}
  sandbox.setInterval = (fn, ms) => { timerLog.push({ kind: 'setInterval', ms }); return timerLog.length }
  sandbox.clearInterval = () => {}
  sandbox.setImmediate = (fn) => { timerLog.push({ kind: 'setImmediate' }); return timerLog.length }
  sandbox.clearImmediate = () => {}
  sandbox.requestAnimationFrame = (fn) => { timerLog.push({ kind: 'rAF' }); return timerLog.length }
  sandbox.cancelAnimationFrame = () => {}
  sandbox.requestIdleCallback = (fn) => { timerLog.push({ kind: 'rIC' }); return timerLog.length }
  sandbox.cancelIdleCallback = () => {}
  sandbox.queueMicrotask = (fn) => { timerLog.push({ kind: 'queueMicrotask' }) }

  sandbox.MutationObserver = class { constructor(cb) { this.cb = cb } observe() {} disconnect() {} takeRecords() { return [] } }
  sandbox.ResizeObserver = class { constructor(cb) { this.cb = cb } observe() {} unobserve() {} disconnect() {} }
  sandbox.IntersectionObserver = class { constructor(cb) { this.cb = cb } observe() {} unobserve() {} disconnect() {} }
  sandbox.getComputedStyle = () => ({ getPropertyValue: () => '' })
  sandbox.matchMedia = () => ({ matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })

  sandbox.navigator = { userAgent: 'dsh-xueqiu-debug/smoke', language: 'zh-CN', platform: 'smoke', clipboard: { writeText: () => Promise.resolve() } }
  sandbox.location = { href: 'http://127.0.0.1/', origin: 'http://127.0.0.1', pathname: '/', search: '', hash: '' }
  const storage = { getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0 }
  sandbox.localStorage = storage
  sandbox.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0 }
  sandbox.history = { pushState() {}, replaceState() {} }
  sandbox.innerWidth = 1280
  sandbox.innerHeight = 800
  sandbox.devicePixelRatio = 1
  sandbox.addEventListener = () => {}
  sandbox.removeEventListener = () => {}
  sandbox.dispatchEvent = () => true
  sandbox.URL = URL
  sandbox.TextEncoder = TextEncoder
  sandbox.TextDecoder = TextDecoder
  sandbox.AbortController = AbortController

  sandbox.document = dom
  sandbox.fetch = (url, init) => {
    let action = null
    try { action = init && init.body ? JSON.parse(init.body).action : null } catch (e) { action = null }
    record.fetchCalls.push({ url: String(url), method: (init && init.method) || 'GET', action })
    return fetchImpl(String(url), init)
  }

  sandbox.window = sandbox
  sandbox.self = sandbox
  sandbox.globalThis = sandbox
  sandbox.window.__ModuleLoader__ = {
    load(registration) { record.loadCalls.push(registration) },
  }
  return { sandbox, record }
}

/** 假 fetch：进程内响应，绝不出网。默认把一切 action 解析成成功（避免未处理拒绝）。 */
function makeFetch(responder) {
  return function fetchStub(url, init) {
    let body = {}
    try { body = init && init.body ? JSON.parse(init.body) : {} } catch (e) { body = {} }
    let payload
    try { payload = responder(url, body) } catch (e) { payload = { ok: false, error: 'responder 抛错：' + ((e && e.message) || e) } }
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => null },
      json: () => Promise.resolve(payload),
      text: () => Promise.resolve(JSON.stringify(payload)),
    })
  }
}

function safeResponder(url, body) {
  const action = body && body.action
  if (action === 'ui.get') return { ok: true, data: { tab: 'market', open: true, badgePos: null, badgeW: null, badgeCompact: false, dockH: null } }
  if (action === 'watchlist.get') return { ok: true, data: { symbols: ['SH600519', 'SZ300750'] } }
  if (action === 'quote') return { ok: true, data: { status: 5, list: [{ symbol: 'SH000001', name: '上证指数', current: 3210.55, percent: 0.42 }] } }
  if (action === 'hot') return { ok: true, data: { market: 'cn', list: [] } }
  if (action === 'news') return { ok: true, data: { items: [] } }
  if (action === 'login.status') return { ok: true, data: { loggedIn: false } }
  // [5c] 盈亏未配置：指数条行末的今日盈亏 chip 文案因此是确定的「今日盈亏 未配置」。
  // 此前这条 action 落到默认分支（data={}），chip 会渲染成「今日 +0.00 (+0.00%)」——文案随实现漂移，不好断言。
  if (action === 'pnl.get') return { ok: true, data: { configured: false } }
  return { ok: true, data: {} }
}

/** 被测 bundle 的版本指纹：重构期用来判断「这一版跑绿的是哪份产物」。 */
function fingerprintBundle() {
  const buf = readFileSync(BUNDLE_PATH)
  return {
    sha256: createHash('sha256').update(buf).digest('hex').slice(0, 16),
    size: statSync(BUNDLE_PATH).size,
    mtime: statSync(BUNDLE_PATH).mtime.toISOString(),
    firstLine: buf.toString('utf8').split('\n', 1)[0].trim(),
  }
}

/** 装载一次 bundle：真跑顶层 + factory + 空跑 apply，返回所有可断言的面。 */
function boot(label, { withSlots = true } = {}) {
  let code
  try {
    code = readFileSync(BUNDLE_PATH, 'utf8')
  } catch (err) {
    throw new Error('读不到被测 bundle：' + BUNDLE_PATH + '（' + (err.code || err.message) + '）——' +
      '若重构移动/改名了静态 bundle 产物，请同步更新本测试顶部的 BUNDLE_PATH')
  }
  const dom = createDom()
  const { sandbox, record } = createSandbox(dom, makeFetch(safeResponder))
  const react = createReactStub()

  const out = {
    label,
    dom,
    record,
    react,
    topLevelError: null,
    requireSpecs: [],
    module: null,
    plugin: null,
    slots: null,
    injects: null,
    registers: null,
    applyError: null,
    ctxTouches: [],
    styleBefore: 0,
    styleAfter: 0,
  }

  try {
    vm.runInNewContext(code, sandbox, { filename: BUNDLE_PATH })
  } catch (err) {
    out.topLevelError = err
    return out
  }

  out.registration = record.loadCalls[0]
  if (!out.registration || typeof out.registration.factory !== 'function') return out

  const table = { react: react.react, 'react-dom': react.reactDom, 'react/jsx-runtime': react.jsxRuntime }
  const requireStub = (spec) => {
    out.requireSpecs.push(spec)
    if (SEED_WORDS.has(spec)) return table[spec]
    throw new Error('require("' + spec + '") missed the module table')
  }
  try {
    out.module = out.registration.factory(requireStub)
  } catch (err) {
    out.factoryError = err
    return out
  }
  out.plugin = out.module && out.module.default !== undefined ? out.module.default : out.module

  const slotsBag = createSlots()
  out.slots = withSlots ? slotsBag.slots : undefined
  out.injects = slotsBag.injects
  out.registers = slotsBag.registers

  const ctx = createCtx({ slots: out.slots, timerLog: record.timerLog, touchLog: out.ctxTouches })
  out.styleBefore = styleTags(dom).length
  try {
    if (out.plugin && typeof out.plugin.apply === 'function') out.plugin.apply(ctx)
  } catch (err) {
    out.applyError = err
  }
  out.styleAfter = styleTags(dom).length
  return out
}

const styleTags = (dom) => dom.head.childNodes.filter((n) => n && n.tagName === 'STYLE')

const settle = (rounds = 6) => new Promise((resolve) => {
  let n = 0
  const step = () => (++n >= rounds ? resolve() : setTimeout(step, 0))
  setTimeout(step, 0)
})

/** 渲染入口：调用注册的 render 函数并真走一遍元素树。返回 {tree, effects}。 */
function render(booted, index, props) {
  if (!booted.registers) throw new Error('槽位表为空，无法渲染（前置步骤失败）')
  const entry = booted.registers[index]
  if (!entry) throw new Error('第 ' + index + ' 个注册不存在')
  if (typeof entry.render !== 'function') throw new Error('slot ' + index + ' 的 render 不是函数')
  const before = booted.react.reactor.effects.length
  const element = entry.render(props)
  const tree = booted.react.walk(element, 0, { n: 0 })
  const effects = booted.react.reactor.effects.slice(before)
  return { element, tree, effects }
}

/** 只 flush 白名单组件的 effect；其余登记在案并跳过（例如图表组件的 canvas 初始化）。 */
function flushEffects(booted, effects) {
  const skipped = []
  const errors = []
  for (const e of effects) {
    if (!FLUSHABLE.has(e.name)) { skipped.push(e.name + ':' + e.kind); continue }
    try { e.fn() } catch (err) { errors.push(e.name + ' → ' + ((err && err.message) || String(err))) }
  }
  return { skipped, errors }
}

// ---------------------------------------------------------------- 工具块 fixture
const toolBlock = (data, kind = 'tool-result') => ({
  kind,
  content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data) }],
})
const QUOTE_BLOCK = toolBlock({
  status: 5,
  list: [
    { symbol: 'SH600519', name: '贵州茅台', current: 1688.5, percent: 1.234, volume: 1234500 },
    { symbol: 'SZ300750', name: '宁德时代', current: 210.25, percent: -0.5, volume: 99887700 },
  ],
})
const KLINE_BLOCK = toolBlock({
  symbol: 'SH600519',
  period: 'day',
  rows: [
    { time: '2026-08-18', open: 1600, high: 1650, low: 1590, close: 1640, volume: 1000 },
    { time: '2026-08-19', open: 1640, high: 1700, low: 1630, close: 1688.5, volume: 1200 },
    { time: '2026-08-20', open: 1688, high: 1720, low: 1670, close: 1702.25, volume: 900 },
  ],
})
const HOT_BLOCK = toolBlock({
  market: 'cn',
  list: [
    { symbol: 'SH600519', name: '贵州茅台', current: 1688.5, percent: 2.1, rank_change: 3 },
    { symbol: 'SZ000001', name: '平安银行', current: 11.2, percent: -0.8, rank_change: -2 },
  ],
})
const NEWS_BLOCK = toolBlock({
  items: [
    { id: 11, time: '2026-08-21 09:30:15', text: '央行开展逆回购操作', mark: 1 },
    { id: 12, time: '2026-08-21 09:31:00', text: '沪指小幅高开' },
  ],
})

// ================================================================ 主流程
console.log('dsh-xueqiu-debug 客户端 bundle 冒烟测试')
console.log('bundle: ' + BUNDLE_PATH)
let fingerprint
try {
  fingerprint = fingerprintBundle()
} catch (err) {
  console.log('  ✗ 读不到被测 bundle：' + BUNDLE_PATH + '（' + (err.code || err.message) + '）')
  console.log('    若重构移动/改名了静态 bundle 产物，请同步更新本测试顶部的 BUNDLE_PATH。')
  process.exit(1)
}
console.log('版本指纹: sha256=' + fingerprint.sha256 + ' size=' + fingerprint.size + ' mtime=' + fingerprint.mtime)
console.log('产物首行: ' + fingerprint.firstLine)

const main = boot('main', { withSlots: true })

// ---------------------------------------------------------------- 1. 注册与依赖契约
section('[1] 注册契约 / 依赖纯度 / 导出形态')
check('bundle 顶层执行不抛错', () => {
  ok(!main.topLevelError, '顶层抛错：' + (main.topLevelError && main.topLevelError.message))
})
check('__ModuleLoader__.load 恰好调用 1 次', () => eq(main.record.loadCalls.length, 1, 'load 次数'))
check('注册 id 精确等于包名 ' + PKG, () => eq(main.registration && main.registration.id, PKG, '注册 id'))
check('注册表里只有一个条目', () => {
  const ids = main.record.loadCalls.map((r) => r.id)
  ok(new Set(ids).size === 1 && ids.length === 1, '实际注册 [' + ids.join(', ') + ']')
})
check('注册条目带 factory 函数', () => eq(typeof (main.registration && main.registration.factory), 'function', 'typeof factory'))
check('factory(require) 实例化不抛错', () => {
  ok(!main.factoryError, '实例化抛错：' + (main.factoryError && main.factoryError.message))
})
check('require 纯度：只 require 平台 seed 字面量', () => {
  const bad = main.requireSpecs.filter((s) => !SEED_WORDS.has(s))
  ok(bad.length === 0, '出现非 seed 模块 [' + bad.join(', ') + ']')
  return '[' + main.requireSpecs.join(', ') + ']'
})
check('导出 .default 是 cordis 插件对象（带 apply）', () => {
  ok(main.module && main.module.default !== undefined, 'module.default 不存在')
  eq(typeof (main.module.default && main.module.default.apply), 'function', 'typeof default.apply')
})
check('插件 inject 声明 = [\'timer\']', () => eqJson(main.plugin && main.plugin.inject, ['timer'], 'plugin.inject'))

// ---------------------------------------------------------------- 2. 样式契约
readyGuard = () => assertReady(main)
section('[2] 样式契约（apply 期间插入 <style data-plugin>）')
check('apply(ctx) 不抛错', () => {
  ok(!main.applyError, 'apply 抛错：' + (main.applyError && main.applyError.message))
})
check('apply 期间插入的 <style> 恰好 1 个', () => eq(main.styleAfter - main.styleBefore, 1, 'style 增量'))
check('<style data-plugin> 精确等于 ' + PKG, () => {
  const tag = styleTags(main.dom)[main.styleAfter - 1]
  ok(tag, '没有捕获到 <style> 节点')
  eq(tag.getAttribute('data-plugin'), PKG, 'data-plugin')
})
check('<style> 文本是真实 CSS（含 .xq-dock 且长度 > 1000）', () => {
  const tag = styleTags(main.dom)[main.styleAfter - 1]
  const css = String(tag.textContent || '')
  ok(css.includes('.xq-dock'), 'CSS 里没有 .xq-dock')
  ok(css.length > 1000, 'CSS 长度仅 ' + css.length)
  return css.length + ' 字符'
})

// ---------------------------------------------------------------- 3. 槽位契约
section('[3] 槽位契约（apply 真跑：inject + register）')
check('slots.inject 恰好 7 次、slots.register 恰好 7 次', () => {
  eq(main.injects.length, 7, 'inject 次数')
  eq(main.registers.length, 7, 'register 次数')
})
check('每次 inject 的回调都返回对应的 register 句柄', () => {
  for (let i = 0; i < main.injects.length; i++) {
    eq(main.injects[i].result, main.registers[i], '第 ' + (i + 1) + ' 次 inject 的返回值')
  }
})
EXPECTED_SLOTS.forEach((want, i) => {
  check('槽位 #' + (i + 1) + ' ' + want.inject + ' ' + stable(want.options), () => {
    const got = main.registers[i]
    ok(got, '第 ' + (i + 1) + ' 个注册缺失')
    eq(main.injects[i].name, want.inject, 'inject 的槽位名')
    eqJson(got.options, want.options, 'register options')
    eq(got.options.name, want.inject, 'options.name 与 inject 的槽位名一致')
  })
})
check('7 个注册的 render 都是函数且互不相同', () => {
  const fns = main.registers.map((r) => r.render)
  for (let i = 0; i < fns.length; i++) eq(typeof fns[i], 'function', '第 ' + (i + 1) + ' 个 render')
  eq(new Set(fns).size, 7, '不同 render 的数量')
})
check('4 个 toolview 的 key 集合精确', () => {
  const keys = main.registers.slice(0, 4).map((r) => r.options.key)
  eqJson(keys.slice().sort(), ['xueqiu_hot', 'xueqiu_kline', 'xueqiu_news', 'xueqiu_quote'], 'toolview keys')
  return '[' + keys.join(', ') + ']'
})
check('apply 期间未发出任何请求（fetch 0 次）', () => eq(main.record.fetchCalls.length, 0, 'fetch 次数'))
check('apply 只向 ctx 取 slots（未取别的服务）', () => {
  const gets = main.ctxTouches.filter((t) => t.startsWith('get('))
  eqJson(gets, ['get(slots)'], 'ctx.get 调用')
  return main.ctxTouches.join(' ')
})

// ---------------------------------------------------------------- 4. 渲染冒烟
section('[4] 渲染冒烟（最小 React 替身真调组件）')
const [SLOT_QUOTE, SLOT_KLINE, SLOT_HOT, SLOT_NEWS, SLOT_PANEL, SLOT_BADGE, SLOT_TICKER] = [0, 1, 2, 3, 4, 5, 6]

check('toolview xueqiu_quote 渲染出行情表格', () => {
  const { tree } = render(main, SLOT_QUOTE, { block: QUOTE_BLOCK })
  ok(hasClass(tree, 'xq-tv-shell'), '缺 .xq-tv-shell')
  for (const needle of ['雪球行情', '2 只', '贵州茅台', 'SH600519', '1688.50', '+1.23%', '宁德时代', '-0.50%']) {
    ok(textHas(tree, needle), '文本缺 ' + JSON.stringify(needle) + '（实际：' + treeText(tree).slice(0, 200) + '）')
  }
  return classCount(tree, 'xq-tv-row') + ' 行'
})
check('toolview xueqiu_kline 渲染出 K 线卡片（含图表挂载点）', () => {
  const { tree, effects } = render(main, SLOT_KLINE, { block: KLINE_BLOCK })
  ok(hasClass(tree, 'xq-tv-shell'), '缺 .xq-tv-shell')
  ok(hasClass(tree, 'xq-chart-wrap'), '缺 .xq-chart-wrap（KLineChart 未渲染）')
  for (const needle of ['SH600519', '日K', '3 根', '2026-08-18 → 2026-08-20', '1702.25']) {
    ok(textHas(tree, needle), '文本缺 ' + JSON.stringify(needle) + '（实际：' + treeText(tree).slice(0, 200) + '）')
  }
  // 图表组件的 effect 只登记不执行（无 canvas），但必须已被登记
  ok(effects.some((e) => e.name === 'KlineChart'), 'KlineChart 的 effect 未登记')
  return 'effects=' + effects.map((e) => e.name).join('/')
})
check('toolview xueqiu_hot 渲染出热榜与排名变化', () => {
  const { tree } = render(main, SLOT_HOT, { block: HOT_BLOCK })
  ok(hasClass(tree, 'xq-tv-shell'), '缺 .xq-tv-shell')
  for (const needle of ['雪球热榜', 'A股', '2 只', '贵州茅台', '↑3', '↓2']) {
    ok(textHas(tree, needle), '文本缺 ' + JSON.stringify(needle) + '（实际：' + treeText(tree).slice(0, 200) + '）')
  }
})
check('toolview xueqiu_news 渲染出快讯与重要标记', () => {
  const { tree } = render(main, SLOT_NEWS, { block: NEWS_BLOCK })
  ok(hasClass(tree, 'xq-tv-shell'), '缺 .xq-tv-shell')
  for (const needle of ['雪球快讯', '2 条', '09:30', '重要', '央行开展逆回购操作']) {
    ok(textHas(tree, needle), '文本缺 ' + JSON.stringify(needle) + '（实际：' + treeText(tree).slice(0, 200) + '）')
  }
  ok(hasClass(tree, 'xq-tv-mark'), '缺 .xq-tv-mark（mark=1 未高亮）')
})
check('toolview 退化输入不抛错：运行中 / 不可读 / 空列表', () => {
  const running = render(main, SLOT_QUOTE, { block: { content: [] } }).tree
  ok(textHas(running, '查询中'), '运行中应显示「查询中…」，实际：' + treeText(running))
  const broken = render(main, SLOT_QUOTE, { block: toolBlock('{ 不是 JSON') }).tree
  ok(textHas(broken, '结果不可读'), '坏 JSON 应显示「结果不可读」，实际：' + treeText(broken))
  const empty = render(main, SLOT_QUOTE, { block: toolBlock({ list: [] }) }).tree
  ok(textHas(empty, '无行情数据'), '空列表文案缺失，实际：' + treeText(empty))
  const noProps = render(main, SLOT_NEWS, {}).tree
  ok(textHas(noProps, '查询中'), '无 props 应显示「查询中…」，实际：' + treeText(noProps))
})
// 徽标新契约：只保留标题栏 + 自选行情网格；红框指数区域（.xq-idxgrid）已从徽标移除，
// 指数展示属于面板 / 底部指数条（.xq-ticker）职责。空数据静态渲染还没有 .xq-wgrid 可挂
// （自选行情由 effect 异步加载），数据链路（effect → 假响应 → 复渲染）由 [5e] 单独验证。
check('shell.overlay 徽标渲染出 .xq-badge 结构（不再渲染指数网格）', () => {
  const { tree } = render(main, SLOT_BADGE, undefined)
  ok(tree, 'MiniBadge 返回了 null')
  ok(hasClass(tree, 'xq-badge'), '缺 .xq-badge')
  ok(hasClass(tree, 'xq-badge-grip'), '缺 .xq-badge-grip（调宽手柄）')
  ok(hasClass(tree, 'xq-badge-control'), '缺 .xq-badge-control（独立折叠按钮）')
  ok(!hasClass(tree, 'xq-idxgrid'), '徽标不应渲染 .xq-idxgrid（指数区域已移除）')
  ok(textHas(tree, '雪球'), '徽标缺「雪球」字样')
  ok(textHas(tree, '⤡'), '徽标缺手柄字符')
})
check('conversation.composer.dock 指数条空数据时安全返回 null', () => {
  const { tree } = render(main, SLOT_TICKER, undefined)
  eq(tree, null, '空指数时 Ticker 应返回 null')
})
check('conversation.input.dock 面板未水合时返回 null', () => {
  const { tree } = render(main, SLOT_PANEL, undefined)
  eq(tree, null, 'ui.hydrated/open 未就绪时 DockGate 应返回 null')
})
check('静态渲染全程未发请求（fetch 仍为 0 次）', () => eq(main.record.fetchCalls.length, 0, 'fetch 次数'))

// ---------------------------------------------------------------- 5. 水合后的面板渲染
section('[5] 水合后面板渲染（flush effect → 数据加载 → 复渲染）')
const panelResult = await (async () => {
  try {
    const first = render(main, SLOT_PANEL, undefined)
    const flush1 = flushEffects(main, first.effects)
    if (flush1.errors.length) return { error: new Error('DockGate effect flush 抛错：' + flush1.errors.join(' | ')) }
    await settle(8)
    const second = render(main, SLOT_PANEL, undefined)
    const flush2 = flushEffects(main, second.effects)
    if (flush2.errors.length) return { error: new Error('面板内组件 effect flush 抛错：' + flush2.errors.join(' | ')) }
    await settle(8)
    const third = render(main, SLOT_PANEL, undefined)
    return { first, flush1, second, flush2, third }
  } catch (err) {
    return { error: err }
  }
})()

/** 取「水合成功后」那次渲染的树；阶段失败时给出根因而不是 TypeError。 */
function panelTree(round) {
  if (!panelResult || panelResult.error) {
    throw new Error('前置失败：面板水合/复渲染阶段出错（' + ((panelResult && panelResult.error && panelResult.error.message) || '未产出结果') + '）')
  }
  const r = panelResult[round]
  if (!r) throw new Error('前置失败：缺少 ' + round + ' 渲染结果')
  return r.tree
}

check('DockGate 的 effect 已登记（hydrate + interval）', () => {
  ok(panelResult && !panelResult.error, 'effect flush 阶段抛错：' + ((panelResult && panelResult.error && panelResult.error.message) || '未知'))
  ok(panelResult.first.effects.length > 0, '未登记任何 effect')
  return panelResult.first.effects.map((e) => e.name + ':' + e.kind).join(', ')
})
check('flush 后 (ui.get) 水合生效，面板渲染出 .xq-dock', () => {
  const tree = panelTree('second')
  ok(tree, '第二次渲染仍返回 null（ui.get 水合未生效）')
  ok(hasClass(tree, 'xq-dock'), '缺 .xq-dock')
  ok(hasClass(tree, 'xq-dock-head'), '缺 .xq-dock-head')
  ok(hasClass(tree, 'xq-dock-body'), '缺 .xq-dock-body')
  ok(hasClass(tree, 'xq-dock-resize'), '缺 .xq-dock-resize（高度拖拽条）')
})
check('面板渲染出 5 个 tab 与搜索行', () => {
  const tree = panelTree('second')
  for (const needle of ['行情', '热榜', '搜索', '快讯', '盈亏']) ok(textHas(tree, needle), '缺 tab 文案 ' + needle)
  ok(hasClass(tree, 'xq-search-row'), '缺 .xq-search-row')
  eq(classCount(tree, 'xq-tab'), 5, 'tab 数量')
  return treeHosts(tree).length + ' 个宿主节点'
})
check('flush 期间请求全部指向 /xq-rpc（未出网）', () => {
  const urls = [...new Set(main.record.fetchCalls.map((f) => f.url))]
  eqJson(urls, ['/xq-rpc'], 'fetch URL 集合')
  const actions = [...new Set(main.record.fetchCalls.map((f) => f.action))]
  return main.record.fetchCalls.length + ' 次调用，action=[' + actions.join(', ') + ']'
})
check('面板内组件的 effect flush 无抛错', () => {
  if (!panelResult || panelResult.error) throw new Error('前置失败：' + ((panelResult && panelResult.error && panelResult.error.message) || '未产出结果'))
  const names = panelResult.second.effects.map((e) => e.name + ':' + e.kind)
  ok(names.length > 0, '第二次渲染未登记任何 effect')
  return names.join(', ')
})
check('flush 后 effect 里登记了轮询（ctx.interval）', () => {
  const intervals = main.record.timerLog.filter((t) => t.kind === 'interval').map((t) => t.ms)
  ok(intervals.length > 0, '没有任何 ctx.interval 登记')
  return 'interval ms = [' + intervals.join(', ') + ']'
})
check('数据加载完成后复渲染仍稳定（不抛错、面板结构不变）', () => {
  const tree = panelTree('third')
  ok(hasClass(tree, 'xq-dock'), '第三次渲染丢了 .xq-dock')
  eq(classCount(tree, 'xq-tab'), 5, 'tab 数量')
  return treeHosts(tree).length + ' 个宿主节点'
})

// ---------------------------------------------------------------- 5b. 今日盈亏（pnl）接线契约
// 客户端新增的第 5 个 tab（同花顺投资账本「今日总盈亏」）。这里只断言对外可观察的契约：
// 常量字面量、tab 表顺序、头部 chip 与 tab 文案，以及 CSS 里确实落了 .xq-pnl-* 规则。
section('[5b] 今日盈亏接线契约（常量 / tab 顺序 / 头部 chip / 样式）')
const clientSource = (() => {
  try {
    return readFileSync(BUNDLE_PATH, 'utf8')
  } catch (err) {
    return ''
  }
})()

check("A_PNL_* 三个 action 常量值正确（'pnl.get'/'pnl.verify'/'pnl.config'）", () => {
  const want = ["A_PNL_GET = 'pnl.get'", "A_PNL_VERIFY = 'pnl.verify'", "A_PNL_CONFIG = 'pnl.config'"]
  const miss = want.filter((s) => !clientSource.includes(s))
  ok(miss.length === 0, '产物里找不到：' + miss.join(' | '))
  return want.length + ' 个常量'
})
check('PNL_POLL_FALLBACK_MS = 60000（轮询兜底退避）', () => {
  ok(clientSource.includes('PNL_POLL_FALLBACK_MS = 60000'), '产物里找不到 PNL_POLL_FALLBACK_MS = 60000')
  return '60000'
})
check('盈亏轮询在页面恢复前台时立即重取', () => {
  ok(clientSource.includes('function onVisibility()'), '缺 PNL onVisibility')
  ok(clientSource.includes("document.addEventListener('visibilitychange', onVisibility)"), '缺 PNL visibilitychange 监听')
  ok(clientSource.includes('bindVisibility()') && clientSource.includes('unbindVisibility()'), '缺 PNL 监听生命周期管理')
  return 'visibilitychange → 取消旧 timer → cycle()'
})
check('行情请求有序列防护，旧响应不会覆盖新数据', () => {
  for (const token of ['marketSeq.current', 'refreshSeq.current', 'requestSeq.current']) {
    ok(clientSource.includes(token), '产物里缺少 ' + token)
  }
  return '面板 / 徽标 / 底部指数条均有 request sequence'
})
check('详情页驻留期间持续刷新报价/分时', () => {
  ok(clientSource.includes('详情驻留期间也要更新报价/分时'), '缺详情驻留刷新说明')
  ok(clientSource.includes("call(A_QUOTE_DETAIL, { symbol: view, force: true })"), '详情报价未强制刷新')
  ok(clientSource.includes("call(A_MINUTE, { symbol: view, force: true })"), '详情分时未强制刷新')
  return '按行情节奏轮询，回前台立即补拉'
})
check('手动刷新绕过雪球报价短 TTL', () => {
  ok(clientSource.includes('fetchIndices(force)'), '指数 fetch 未透传 force')
  ok(clientSource.includes('refreshMarket(true)'), '手动刷新未传 force')
  return 'force=true'
})
check("PANEL_TABS 含 ['pnl','盈亏']，且前 4 项顺序与字面量未变", () => {
  const line = clientSource.split('\n').find((l) => l.includes('const PANEL_TABS ='))
  ok(line, '产物里找不到 PANEL_TABS 定义行')
  const ordered = ["['market', '行情']", "['hot', '热榜']", "['search', '搜索']", "['news', '快讯']", "['pnl', '盈亏']"]
  let at = -1
  for (const token of ordered) {
    const i = line.indexOf(token, at + 1)
    ok(i > at, 'PANEL_TABS 缺少或顺序不符：' + token + '（实际行：' + line.trim() + '）')
    at = i
  }
  return '5 项，顺序正确'
})
check('pnl 已接进 XQ_TABS / TAB_CTX（渲染分发不落回默认 tab）', () => {
  ok(/const XQ_TABS = \{[^}]*pnl: PnlTab[^}]*\}/.test(clientSource), 'XQ_TABS 未接 pnl: PnlTab')
  ok(/pnl: function \(\) \{\s*return \{\}/.test(clientSource), 'TAB_CTX 未提供 pnl（应为空上下文）')
  return 'XQ_TABS.pnl + TAB_CTX.pnl'
})
check('面板 tab 条文案顺序 = 行情/热榜/搜索/快讯/盈亏', () => {
  const tree = panelTree('second')
  const labels = treeHosts(tree)
    .filter((h) => classOf(h).split(/\s+/).includes('xq-tab'))
    .map((h) => treeText(h))
  eqJson(labels, ['行情', '热榜', '搜索', '快讯', '盈亏'], 'tab 文案顺序')
})
check('头部 xq-dock-head 里渲染出常驻盈亏 chip', () => {
  const tree = panelTree('second')
  ok(hasClass(tree, 'xq-pnl-chip'), '缺 .xq-pnl-chip')
  const head = treeHosts(tree).find((h) => classOf(h).split(/\s+/).includes('xq-dock-head'))
  ok(head, '缺 .xq-dock-head')
  ok(textHas(head, '今日盈亏'), '头部 chip 文案缺「今日盈亏」：' + treeText(head))
  return treeText(head).slice(0, 80)
})
check('样式契约：CSS 里有 .xq-pnl-* 规则且不含模板字面量标记', () => {
  const tag = styleTags(main.dom)[main.styleAfter - 1]
  const css = String(tag.textContent || '')
  ok(css.includes('.xq-pnl-chip'), 'CSS 里没有 .xq-pnl-chip')
  ok(css.includes('.xq-pnl-amt'), 'CSS 里没有 .xq-pnl-amt')
  ok(!css.includes('`') && !css.includes('${'), 'CSS 里出现反引号或 ${（#include-styles 内联会炸）')
  return 'chip + amt + ' + css.length + ' 字符'
})

// ---------------------------------------------------------------- 5c. 运行时 hook 契约
// [5b] 是**静态**契约（在产物文本里找字面量），只能证明「源码里写的是 el(组件, ...)」。
// 本节从**运行时**独立证明根因：hook 必须归属到「正在执行 body 的那个组件」。
// 做法是给 React 替身加一本 hook 账本（reactor.hookLog）：每次函数组件被真实调用就记一条
// { 组件函数, 本次调用里依次调用的 hook }。账本记的是 reactor.current —— 当前正在执行 body 的
// 组件，所以**被内联（裸函数调用）的子组件不会开新作用域，它的 hook 会算到父组件头上**。
// 于是「切到盈亏时 PnlTab 被内联进 XueqiuPanel」必然表现为 XueqiuPanel 的 hook 数随 tab 变化，
// 这正是 React 抛 "Rendered fewer hooks than expected"（整棵面板被卸载、切回也打不开）的根因。
section('[5c] 运行时 hook 契约（切 tab 不改 hook 链表 / 指数条盈亏 chip）')

/** 组件名 → 源文件：失败信息直接指出该改哪个文件（替身只能给出函数引用与函数名）。 */
const COMPONENT_FILE = {
  XueqiuPanel: 'client/panel/index.js',
  MarketTab: 'client/panel/market.js',
  HotTab: 'client/panel/hot.js',
  SearchTab: 'client/panel/search.js',
  NewsTab: 'client/panel/news.js',
  PnlTab: 'client/panel/pnl.js',
  PnlChip: 'client/panel/pnl.js',
  DockGate: 'client/dock.js',
  DockPanel: 'client/dock.js',
  Ticker: 'client/ticker.js',
}
const where = (name) => (COMPONENT_FILE[name] ? name + '（' + COMPONENT_FILE[name] + '）' : name)

/** 当前高亮的 tab 文案（没有 xq-tab-active 时返回 null）。 */
function activeTabLabel(tree) {
  const h = treeHosts(tree).find((x) => classOf(x).split(/\s+/).includes('xq-tab-active'))
  return h ? treeText(h) : null
}
/** 按文案取 tab 按钮宿主节点：props.onClick 就是组件里那个真实点击处理器。 */
function tabButton(tree, label) {
  const btn = treeHosts(tree).find((h) => classOf(h).split(/\s+/).includes('xq-tab') && treeText(h) === label)
  ok(btn, '找不到 tab 按钮「' + label + '」，实际 tab 文案 [' +
    treeHosts(tree).filter((h) => classOf(h).split(/\s+/).includes('xq-tab')).map(treeText).join(', ') + ']')
  ok(typeof btn.props.onClick === 'function', 'tab 按钮「' + label + '」没有 onClick')
  return btn
}
/** 把多次渲染的 hook 账本按**组件函数引用**归组（同名不同函数用 #2 区分，保证失败信息可定位）。 */
function groupHooks(passes) {
  const byFn = new Map()
  for (const p of passes) {
    for (const r of p.recs) {
      let e = byFn.get(r.fn)
      if (!e) { e = { name: r.name, seen: [] }; byFn.set(r.fn, e) }
      e.seen.push({ label: p.label, count: r.count, hooks: r.hooks })
    }
  }
  const dup = new Map()
  for (const e of byFn.values()) dup.set(e.name, (dup.get(e.name) || 0) + 1)
  const nth = new Map()
  for (const e of byFn.values()) {
    if (dup.get(e.name) > 1) { const n = (nth.get(e.name) || 0) + 1; nth.set(e.name, n); e.id = e.name + '#' + n }
    else e.id = e.name
  }
  return byFn
}

// 驱动序列：market → pnl → market → hot → search → news → pnl → news（第 1 步不点击，直接沿用 [5]
// 第三次渲染的 tab）。覆盖全部 5 个 tab 组件，保证「每个 tab 都是独立组件实例」这件事对 5 个都成立。
// 每次都用**真实点击处理器**切 tab（走组件的 onClick → ui.set({tab})），再像 [5] 那样重跑槽位 render
// 重走整棵 dock 树 —— 与 React 里 setState 触发的那次重渲染在「组件 body 会被重新执行」这点上等价。
const TAB_STEPS = [
  { label: '行情', tab: 'market', click: false, comp: 'MarketTab' },
  { label: '盈亏', tab: 'pnl', click: true, comp: 'PnlTab' },
  { label: '行情', tab: 'market', click: true, comp: 'MarketTab' },
  { label: '热榜', tab: 'hot', click: true, comp: 'HotTab' },
  { label: '搜索', tab: 'search', click: true, comp: 'SearchTab' },
  { label: '快讯', tab: 'news', click: true, comp: 'NewsTab' },
  { label: '盈亏', tab: 'pnl', click: true, comp: 'PnlTab' },
  { label: '快讯', tab: 'news', click: true, comp: 'NewsTab' },
]
const tabPasses = []
let tabSeqError = null
await (async () => {
  try {
    let tree = panelTree('third')
    for (let i = 0; i < TAB_STEPS.length; i++) {
      const step = TAB_STEPS[i]
      if (step.click) tabButton(tree, step.label).props.onClick()
      const mark = main.react.reactor.hookLog.length
      const r = render(main, SLOT_PANEL, undefined)
      const flush = flushEffects(main, r.effects)
      await settle(6)
      tree = r.tree
      tabPasses.push({
        label: '第' + (i + 1) + '次(' + step.label + ')',
        tab: step.tab, want: step.label, comp: step.comp,
        active: activeTabLabel(tree),
        recs: main.react.reactor.hookLog.slice(mark),
        flushErrors: flush.errors,
      })
    }
  } catch (err) { tabSeqError = err }
})()
function tabPassesReady() {
  if (tabSeqError) throw new Error('前置失败：切 tab 序列执行出错（' + ((tabSeqError && tabSeqError.message) || tabSeqError) + '）')
  if (tabPasses.length !== TAB_STEPS.length) throw new Error('前置失败：只采集到 ' + tabPasses.length + '/' + TAB_STEPS.length + ' 次渲染')
}

check('切 tab 序列真的切换了面板 tab（每次渲染的高亮 tab 正确）', () => {
  tabPassesReady()
  for (const p of tabPasses) eq(p.active, p.want, p.label + ' 的高亮 tab')
  return tabPasses.map((p) => p.active).join(' → ')
})
check('每次切 tab 后渲染的确实是目标 tab 组件（否则下面的 hook 断言会空转）', () => {
  tabPassesReady()
  for (const p of tabPasses) {
    const names = p.recs.map((r) => r.name)
    ok(names.includes(p.comp), p.label + ' 里没有以 ' + where(p.comp) + ' 身份执行的组件调用；' +
      '本次出现的组件是 [' + [...new Set(names)].join(', ') + ']')
  }
  return tabPasses.map((p) => p.comp).join(' → ')
})
check('每个组件自身的 hook 数在全部 ' + TAB_STEPS.length + ' 次渲染间完全一致', () => {
  tabPassesReady()
  const byFn = groupHooks(tabPasses)
  const bad = []
  for (const e of byFn.values()) {
    const first = e.seen[0]
    const diff = e.seen.find((s) => s.count !== first.count)
    if (!diff) continue
    bad.push(where(e.id) + '：' + first.label + ' 调用 ' + first.count + ' 个 hook [' + first.hooks.join(' ') + ']，' +
      diff.label + ' 调用 ' + diff.count + ' 个 [' + diff.hooks.join(' ') + ']')
  }
  ok(bad.length === 0, '有组件自身的 hook 数随渲染变化 —— 同一组件的 hook 链表变长/变短，React 会抛 ' +
    '"Rendered fewer hooks than expected" 并卸载整棵面板（切回也打不开）：' + bad.join(' | '))
  return byFn.size + ' 个组件 × ' + TAB_STEPS.length + ' 次渲染，每个组件自身的 hook 数全部恒定'
})
// 比「数量相等」更强：hook 的**顺序**也必须一致。React 对「顺序变了但个数没变」（例如把 useState 挪到
// useEffect 后面、或两个 useState 互换）同样报错 —— 只比数量会漏掉这一类。
check('每个组件自身的 hook 序列（种类与顺序）在全部 ' + TAB_STEPS.length + ' 次渲染间完全一致', () => {
  tabPassesReady()
  const byFn = groupHooks(tabPasses)
  const bad = []
  for (const e of byFn.values()) {
    const first = e.seen[0]
    const key = first.hooks.join(' ')
    const diff = e.seen.find((s) => s.hooks.join(' ') !== key)
    if (!diff) continue
    bad.push(where(e.id) + '：' + first.label + ' = [' + first.hooks.join(' ') + ']，' +
      diff.label + ' = [' + diff.hooks.join(' ') + ']')
  }
  ok(bad.length === 0, '有组件的 hook 顺序随渲染变化 —— React 对 hook 顺序变化同样会报错并卸载面板：' + bad.join(' | '))
  const groups = [...byFn.values()]
  const multi = groups.filter((e) => e.seen.length > 1)
  return multi.length + '/' + groups.length + ' 个组件各被渲染多次，每次的 hook 序列逐项相同（' +
    groups.map((e) => e.id + ':' + e.seen[0].hooks.length).join(', ') + '）'
})
check('「盈亏」tab 由独立组件 ' + where('PnlTab') + ' 挂载（hooks 不落在 XueqiuPanel 头上）', () => {
  tabPassesReady()
  const pnlPasses = tabPasses.filter((p) => p.tab === 'pnl')
  const recs = pnlPasses.flatMap((p) => p.recs.filter((r) => r.name === 'PnlTab'))
  ok(recs.length > 0, '切到「盈亏」的 ' + pnlPasses.length + ' 次渲染里，没有任何一次是以 PnlTab 身份执行的组件调用 —— ' +
    'PnlTab 的 hook 被记到了父组件头上（dispatch 用了裸函数调用）；这 ' + pnlPasses.length + ' 次渲染出现的组件是 [' +
    [...new Set(pnlPasses.flatMap((p) => p.recs.map((r) => r.name)))].join(', ') + ']')
  ok(recs[0].count >= 7, 'PnlTab 名下只记到 ' + recs[0].count + ' 个 hook（usePnlState 2 个 + 自己的 5 个，应 ≥ 7）')
  return 'PnlTab 独立挂载，hook 序列 [' + recs[0].hooks.join(' ') + ']'
})
check('XueqiuPanel 自身的 hook 数不随 tab 变化', () => {
  tabPassesReady()
  const seen = []
  for (const p of tabPasses) for (const r of p.recs) if (r.name === 'XueqiuPanel') seen.push({ label: p.label, count: r.count })
  ok(seen.length >= TAB_STEPS.length, 'XueqiuPanel 只被记录了 ' + seen.length + ' 次（应每次渲染一次）')
  const uniq = [...new Set(seen.map((s) => s.count))]
  eq(uniq.length, 1, where('XueqiuPanel') + ' 的 hook 数在不同 tab 下变化：' + seen.map((s) => s.label + '=' + s.count).join(', '))
  return '恒定 ' + uniq[0] + ' 个 hook（' + seen.length + ' 次渲染）'
})
check('切 tab 期间面板内组件 effect flush 无抛错', () => {
  tabPassesReady()
  const errs = tabPasses.flatMap((p) => p.flushErrors)
  ok(errs.length === 0, 'flush 抛错：' + errs.join(' | '))
  return TAB_STEPS.length + ' 次渲染的 effect 全部 flush 完成'
})

// ---- 指数条（client/ticker.js）：非空指数 + 行末今日盈亏 chip ----
// [4] 只覆盖了「既无指数又无盈亏可说 → Ticker 返回 null」那条分支。这里补另一条：假指数响应有数据时，
// 底部指数条要渲染出 .xq-ticker 行，且行末挂的是**独立组件** PnlChip（而不是内联进 Ticker）。
// 注意：替身的 useState 默认每次渲染都返回初始值（setter 为 noop），indices 永远进不到复渲染里，
// 所以这里临时打开 reactor.stateful（见 createReactStub 的注释）——这是替身能力的扩展，不是放宽断言。
const tickerProbe = await (async () => {
  try {
    // 1) 先让共享盈亏运行时「活」起来：跑一次面板里 PnlChip 的 effect（subscribe → 首次 pnl.get）。
    //    Ticker 的 showPnl 依赖它（pnl.data !== null || status 非 idle），否则行末不会有 chip。
    const primer = render(main, SLOT_PANEL, undefined)
    const chipFx = primer.effects.filter((e) => e.name === 'PnlChip')
    if (!chipFx.length) return { error: new Error('面板渲染里没有登记 PnlChip 的 effect（头部 chip 未挂载？）') }
    for (const e of chipFx) e.fn()
    await settle(6)
    // 2) 打开跨渲染记忆 state：Ticker 的 effect 里 setIndices 才会在复渲染时生效
    main.react.reactor.stateful = true
    const fetchBefore = main.record.fetchCalls.length
    const mark = main.react.reactor.hookLog.length
    const first = render(main, SLOT_TICKER, undefined)
    const flush = flushEffects(main, first.effects)
    await settle(6)
    const second = render(main, SLOT_TICKER, undefined)
    return { first, second, flush, recs: main.react.reactor.hookLog.slice(mark), calls: main.record.fetchCalls.slice(fetchBefore) }
  } catch (err) { return { error: err } }
})()

function tickerReady(round) {
  if (!tickerProbe || tickerProbe.error) {
    throw new Error('前置失败：指数条渲染阶段出错（' + ((tickerProbe && tickerProbe.error && tickerProbe.error.message) || '未产出结果') + '）')
  }
  const r = tickerProbe[round]
  if (!r) throw new Error('前置失败：缺少指数条 ' + round + ' 渲染结果')
  return r
}
const tickerRow = (tree) => treeHosts(tree).find((h) => classOf(h).split(/\s+/).includes('xq-ticker'))

check('指数条在假指数有数据时渲染出 .xq-ticker 行与指数项', () => {
  const r = tickerReady('second')
  ok(r.tree, '复渲染仍返回 null（指数数据没进到复渲染里）')
  ok(tickerRow(r.tree), '缺 .xq-ticker 行，实际文本：' + treeText(r.tree))
  ok(classCount(r.tree, 'xq-tick') >= 1, '行内没有指数项（.xq-tick），实际文本：' + treeText(r.tree))
  return classCount(r.tree, 'xq-tick') + ' 个指数项：' + treeText(r.tree).slice(0, 60)
})
check('指数条行末是今日盈亏 chip（.xq-pnl-chip 作为最后一个子节点）', () => {
  const r = tickerReady('second')
  const row = tickerRow(r.tree)
  ok(row, '缺 .xq-ticker 行')
  ok(row.children.length > 0, '.xq-ticker 行没有任何子节点')
  const last = row.children[row.children.length - 1]
  ok(last && last.kind === 'host', '行末子节点不是宿主节点：' + stable(last && last.kind))
  ok(classOf(last).split(/\s+/).includes('xq-pnl-chip'), '行末子节点不是盈亏 chip（class=' + JSON.stringify(classOf(last)) + '）')
  ok(textHas(last, '今日盈亏'), '盈亏 chip 文案缺「今日盈亏」：' + treeText(last))
  return treeText(last)
})
check('指数条里的盈亏 chip 由独立组件 PnlChip 挂载（hooks 不落在 Ticker 头上）', () => {
  tickerReady('first')
  const recs = tickerProbe.recs
  const chip = recs.filter((r) => r.name === 'PnlChip')
  ok(chip.length > 0, '指数条渲染里没有以 PnlChip 身份执行的组件调用（chip 被内联进 Ticker 了？）；' +
    '本次出现的组件是 [' + [...new Set(recs.map((r) => r.name))].join(', ') + ']')
  const ticker = recs.filter((r) => r.name === 'Ticker')
  ok(ticker.length > 0, '指数条渲染里没有 Ticker 的 hook 记录')
  return 'PnlChip ' + chip[0].count + ' 个 hook（' + where('PnlChip') + '），Ticker ' + ticker[0].count + ' 个（' + where('Ticker') + '）'
})
check('指数条只发一次指数请求（action=quote），没有额外网络调用', () => {
  if (!tickerProbe || tickerProbe.error) throw new Error('前置失败：' + ((tickerProbe && tickerProbe.error && tickerProbe.error.message) || '未产出结果'))
  ok(tickerProbe.flush.errors.length === 0, '指数条 effect flush 抛错：' + tickerProbe.flush.errors.join(' | '))
  const calls = tickerProbe.calls
  eqJson([...new Set(calls.map((c) => c.url))], ['/xq-rpc'], '指数条期间的 fetch URL 集合')
  eqJson([...new Set(calls.map((c) => c.action))], ['quote'], '指数条期间的 action 集合')
  eq(calls.length, 1, '指数条期间的 fetch 次数（不应触发 pnl.get / 其它接口）')
  return '1 次 quote'
})

// ---------------------------------------------------------------- 5d. 悬浮徽章折叠与指针事件隔离
// 折叠按钮位于可点击/可拖动徽章内部。测试真实回调，并故意把按钮事件继续送到根节点，
// 验证即使冒泡隔离失效，根节点也不会把 pointerup 当成「打开大面板」。
section('[5d] 悬浮徽章：收起胶囊 / 展开 / 背景开合隔离')
const badgeControlProbe = (() => {
  try {
    const initial = render(main, SLOT_BADGE, undefined).tree
    const rootOf = (tree) => treeHosts(tree).find((h) => classOf(h).split(/\s+/).includes('xq-badge'))
    const controlOf = (tree) => treeHosts(tree).find((h) => classOf(h).split(/\s+/).includes('xq-badge-control'))
    const caretOf = (tree) => {
      const h = treeHosts(tree).find((x) => classOf(x).split(/\s+/).includes('xq-caret'))
      return h ? treeText(h) : null
    }
    const target = { closest: (selector) => selector === '.xq-badge-control' ? target : null }
    let captured = false
    const currentTarget = {
      style: {}, offsetWidth: 320, offsetHeight: 80,
      setPointerCapture() { captured = true },
      hasPointerCapture() { return captured },
      releasePointerCapture() { captured = false },
    }
    const event = (pointerId) => ({
      target, currentTarget, pointerType: 'mouse', button: 0,
      clientX: 20, clientY: 20, pointerId,
      stopPropagation() { this.stopped = true },
    })
    const fullCaret = caretOf(initial)
    const foldRoot = rootOf(initial)
    const foldButton = controlOf(initial)
    if (!foldRoot || !foldButton) throw new Error('完整徽章缺 root 或折叠按钮')
    const down = event(91)
    foldButton.props.onPointerDown(down)
    foldRoot.props.onPointerDown(down) // 故意强制模拟最坏情况的冒泡
    const up = event(91)
    foldButton.props.onPointerUp(up)
    foldRoot.props.onPointerUp(up)     // 没有根节点 pointerdown 时必须忽略
    foldButton.props.onClick({ stopPropagation() {} })
    const compact = render(main, SLOT_BADGE, undefined).tree
    const compactCaret = caretOf(compact)
    const expandButton = controlOf(compact)
    if (!expandButton) throw new Error('胶囊态缺展开按钮')
    expandButton.props.onClick({ stopPropagation() {} })
    const expanded = render(main, SLOT_BADGE, undefined).tree
    // 非控件背景区域仍保留原有行为：开合大面板。
    const expandedRoot = rootOf(expanded)
    const backgroundTarget = { closest: () => null }
    const bgDown = Object.assign(event(92), { target: backgroundTarget })
    const bgUp = Object.assign(event(92), { target: backgroundTarget })
    expandedRoot.props.onPointerDown(bgDown)
    expandedRoot.props.onPointerUp(bgUp)
    const closed = render(main, SLOT_BADGE, undefined).tree
    return { initial, compact, compactCaret, fullCaret, expanded, closed, error: null }
  } catch (err) {
    return { error: err }
  }
})()
function badgeControlReady() {
  if (!badgeControlProbe || badgeControlProbe.error) {
    throw new Error('前置失败：徽章交互探针抛错（' + ((badgeControlProbe && badgeControlProbe.error && badgeControlProbe.error.message) || '未产出结果') + '）')
  }
}
check('标题栏按钮将徽章缩成小胶囊，隐藏指数/自选/调宽手柄', () => {
  badgeControlReady()
  ok(hasClass(badgeControlProbe.compact, 'xq-badge-compact'), '收起后缺 .xq-badge-compact')
  ok(!hasClass(badgeControlProbe.compact, 'xq-idxgrid'), '收起后指数列表仍显示')
  ok(!hasClass(badgeControlProbe.compact, 'xq-wgrid'), '收起后自选列表仍显示')
  ok(!hasClass(badgeControlProbe.compact, 'xq-badge-grip'), '收起后调宽手柄仍显示')
  return '胶囊仅保留标题栏'
})
check('折叠按钮的 pointerdown/up 不会误开合大面板（即使强制冒泡）', () => {
  badgeControlReady()
  eq(badgeControlProbe.compactCaret, badgeControlProbe.fullCaret, '按钮操作前后面板开合 caret')
  ok(hasClass(badgeControlProbe.expanded, 'xq-badge'), '恢复后徽章缺失')
  ok(!hasClass(badgeControlProbe.expanded, 'xq-badge-compact'), '按钮恢复后仍是胶囊')
  eq(caretOfTree(badgeControlProbe.expanded), badgeControlProbe.fullCaret, '展开徽章后面板开合 caret')
  return '按钮只切换徽章形态，不改 ui.open'
})
check('徽章背景区域仍可开合大面板', () => {
  badgeControlReady()
  eq(caretOfTree(badgeControlProbe.closed), badgeControlProbe.fullCaret === '▾' ? '▴' : '▾', '背景点击后的 caret')
  return badgeControlProbe.fullCaret + ' → ' + caretOfTree(badgeControlProbe.closed)
})
function caretOfTree(tree) {
  const h = treeHosts(tree).find((x) => classOf(x).split(/\s+/).includes('xq-caret'))
  return h ? treeText(h) : null
}

// ---------------------------------------------------------------- 5e. 悬浮徽标自选行情网格
// 徽标只保留标题栏 + 自选最新行情网格（.xq-wgrid：名称/现价/涨跌幅），指数网格已移除（见 [4]）。
// 静态渲染时 top 还是空的，.xq-wgrid 要等 MiniBadge 的 effect 拿到自选与报价才渲染 —— 与 [5c] 指数条
// 同一套路：flush MiniBadge 的 effect、走进程内假响应（watchlist.get → quote），再复渲染断言。
// useState 替身需要跨渲染记忆（reactor.stateful，[5c] 已打开），setTop 写进的数据才能进复渲染。
section('[5e] 悬浮徽标自选行情网格（flush MiniBadge effect → 假响应 → 复渲染）')
const badgeGridProbe = await (async () => {
  try {
    main.react.reactor.stateful = true   // 幂等：与 [5c] 相同的替身能力扩展，不是放宽断言
    const fetchBefore = main.record.fetchCalls.length
    const first = render(main, SLOT_BADGE, undefined)
    const flush = flushEffects(main, first.effects)
    await settle(8)
    const second = render(main, SLOT_BADGE, undefined)
    return { first, second, flush, calls: main.record.fetchCalls.slice(fetchBefore) }
  } catch (err) {
    return { error: err }
  }
})()
function badgeGridReady() {
  if (!badgeGridProbe || badgeGridProbe.error) {
    throw new Error('前置失败：徽标行情网格探针抛错（' + ((badgeGridProbe && badgeGridProbe.error && badgeGridProbe.error.message) || '未产出结果') + '）')
  }
}
check('徽标 effect 拿到自选与报价后，复渲染出 .xq-wgrid 自选行情网格', () => {
  badgeGridReady()
  ok(badgeGridProbe.flush.errors.length === 0, 'MiniBadge effect flush 抛错：' + badgeGridProbe.flush.errors.join(' | '))
  ok(hasClass(badgeGridProbe.second.tree, 'xq-wgrid'), '复渲染缺 .xq-wgrid（自选最新行情没进到徽标里）')
  ok(!hasClass(badgeGridProbe.second.tree, 'xq-idxgrid'), '有数据后徽标仍不得渲染 .xq-idxgrid（指数区域已移除）')
  return classCount(badgeGridProbe.second.tree, 'xq-witem') + ' 个自选项'
})
check('自选项渲染出名称/现价/涨跌幅（价格结构来自假报价响应）', () => {
  badgeGridReady()
  ok(classCount(badgeGridProbe.second.tree, 'xq-witem') >= 1, '.xq-wgrid 里没有自选项（.xq-witem），实际文本：' + treeText(badgeGridProbe.second.tree).slice(0, 120))
  const item = treeHosts(badgeGridProbe.second.tree).find((h) => classOf(h).split(/\s+/).includes('xq-witem'))
  ok(item, '找不到 .xq-witem 自选项')
  for (const needle of ['上证指数', '3210.55', '+0.42%']) {
    ok(textHas(item, needle), '自选项文本缺 ' + JSON.stringify(needle) + '（实际：' + treeText(item) + '）')
  }
  ok(hasClass(item, 'xq-badge-val'), '自选项缺 .xq-badge-val（现价/涨跌值）')
  ok(hasClass(item, 'xq-up'), '正涨幅没有着色类 .xq-up（colorOf(0.42) 应判涨）')
  return treeText(item)
})
check('徽标一次刷新只发自选与报价请求（watchlist.get / quote），未出网', () => {
  badgeGridReady()
  const calls = badgeGridProbe.calls
  eqJson([...new Set(calls.map((c) => c.url))], ['/xq-rpc'], '徽标 effect 期间的 fetch URL 集合')
  eqJson([...new Set(calls.map((c) => c.action))].sort(), ['quote', 'watchlist.get'], '徽标 effect 期间的 action 集合')
  eq(calls.length, 2, '徽标 effect 期间的 fetch 次数（应用级水合已由 [5] DockGate 预热，这里不应再有 ui.get）')
  return '2 次调用：watchlist.get → quote'
})

// ---------------------------------------------------------------- 6. slots 缺失时的降级
readyGuard = null
section('[6] 降级路径：ctx.get(\'slots\') === undefined')
const noSlots = boot('no-slots', { withSlots: false })
readyGuard = () => assertReady(noSlots)
check('拿不到 slots 时 apply 静默返回、不抛错', () => {
  ok(!noSlots.topLevelError, '顶层抛错：' + (noSlots.topLevelError && noSlots.topLevelError.message))
  ok(!noSlots.applyError, 'apply 抛错：' + (noSlots.applyError && noSlots.applyError.message))
})
check('拿不到 slots 时 0 次 inject / 0 次 register', () => {
  eq(noSlots.injects.length, 0, 'inject 次数')
  eq(noSlots.registers.length, 0, 'register 次数')
})
check('拿不到 slots 时样式仍先插入（insertStyle 在 slots 校验之前）', () => {
  eq(noSlots.styleAfter - noSlots.styleBefore, 1, 'style 增量')
  eq(styleTags(noSlots.dom)[0].getAttribute('data-plugin'), PKG, 'data-plugin')
})

// ---------------------------------------------------------------- 汇总
readyGuard = null
section('[7] 沙箱替身与妥协（信息）')
note('React 替身：createElement 真造树 + 真调函数组件（本次共调用 ' + main.react.reactor.renders + ' 次）；' +
  'useState/useReducer 返回初始值（setter 为 noop，记录了 ' + main.react.reactor.setStateCalls.length + ' 次 setState）；' +
  'useRef 每次渲染给新对象；useMemo 真跑；useCallback 原样返回；useEffect/useLayoutEffect 只登记不执行')
note('hook 账本（[5c]）：按「组件函数 + 本次调用」记 hook 序列，内联子组件的 hook 归到父组件 —— 与真实 React 的归属规则一致；' +
  '本次共记账 ' + main.react.reactor.hookLog.length + ' 条组件调用')
note('替身能力边界（[5c] 依赖的部分）：没有 fiber/协调，每次渲染都从头重跑组件 body；effect 不做 deps 比对；' +
  'setState 默认不触发重渲染（只有 [5c] 指数条、[5e] 徽标网格探针临时打开 stateful，setter 才真正生效，共 ' +
  (main.react.reactor.stateful ? '已打开' : '未打开') + '）。' +
  '所以 hook 账本能证明的是「hook 归属 + 每次调用各自的 hook 数」，而不是 React 真正的 hook 链表实现。')
note('effect 仅对白名单组件 flush：' + [...FLUSHABLE].join(', ') + '；图表组件（KlineChart 等）的 canvas effect 跳过')
note('fetch 被替换为进程内假响应（共 ' + main.record.fetchCalls.length + ' 次，URL 集合 [' +
  [...new Set(main.record.fetchCalls.map((f) => f.url))].join(', ') + ']），绝不出网')
note('定时器只登记不调度：' + JSON.stringify(main.record.timerLog.reduce((acc, t) => { acc[t.kind] = (acc[t.kind] || 0) + 1; return acc }, {})))
note('ctx 被触达的成员：' + main.ctxTouches.join(', '))
if (main.record.logs.length) note('bundle 内 console 输出 ' + main.record.logs.length + ' 条：' + main.record.logs.slice(0, 3).join(' | '))

check('沙箱内没有未处理的 Promise 拒绝', () => {
  eq(unhandled.length, 0, '未处理拒绝：' + unhandled.map((r) => (r && r.message) || String(r)).join(' | '))
})

section('[8] 结果')
console.log('  被测产物: sha256=' + fingerprint.sha256 + ' size=' + fingerprint.size + ' mtime=' + fingerprint.mtime)
if (failures.length === 0) {
  console.log('  全部通过：' + passed + ' 项断言')
  console.log('\nclient bundle 契约冒烟测试通过。')
  process.exit(0)
} else {
  console.log('  通过 ' + passed + ' 项，失败 ' + failures.length + ' 项：')
  for (const f of failures) console.log('    - ' + f)
  console.log('\n契约被破坏（若确认是有意变更，请同步更新本测试的期望值）。')
  process.exit(1)
}

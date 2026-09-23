#!/usr/bin/env node
// 按 dsh 客户端模块系统（@deepseek-ai/dsh-client-modules）的真实契约，在 Node 里
// 空跑 src/client/index.js：不启动 dsh、不开浏览器，就能查出「插件整块加载失败」这类
// 只在 GUI 里显形的错误。
//
// 契约要点（见 dsh-client-modules/lib/client.js 的 arrive/register/makeRequire）：
//   1. bundle 必须以**包名**为 id 调 window.__ModuleLoader__.load({ id, factory })，
//      否则 loader 抛 `bundle <url> loaded without registering "<pkg>"`。
//   2. factory 里 require(...) 只能命中平台 seed 字面量（react 等）或已注册的模块；
//      多出别的 spec 说明 bundle 不纯，运行时会 `require("<spec>") missed the module table`。
//
// 用法：node tools/verify-bundle.mjs        （只读，退出码非 0 表示契约不满足）
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const PKG = 'dsh-xueqiu-debug'
/** 平台 seed 字面量：由 dsh 启动清单 __DSH_BOOT__.staticModules 提供。 */
const SEED_WORDS = new Set(['react', 'react-dom', 'react/jsx-runtime'])

const here = dirname(fileURLToPath(import.meta.url))
const bundlePath = join(here, '..', 'src', 'client', 'index.js')
const code = readFileSync(bundlePath, 'utf8')

const styleTags = []
const fakeDoc = {
  head: { appendChild: (el) => styleTags.push(el), removeChild() {} },
  body: { appendChild() {}, removeChild() {} },
  createElement: (tag) => ({
    tag,
    attrs: {},
    children: [],
    _text: '',
    setAttribute(k, v) { this.attrs[k] = v },
    getAttribute(k) { return this.attrs[k] ?? null },
    appendChild(c) { this.children.push(c) },
    removeChild() {},
    remove() {},
    addEventListener() {},
    removeEventListener() {},
    set textContent(v) { this._text = v },
    get textContent() { return this._text },
    style: {},
  }),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
  removeEventListener() {},
}

const registry = new Map()
const strip = (id) => (id.endsWith('/client') ? id.slice(0, -7) : id)

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  queueMicrotask,
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
  cancelAnimationFrame: () => {},
  MutationObserver: class { observe() {} disconnect() {} takeRecords() { return [] } },
  ResizeObserver: class { observe() {} disconnect() {} },
  fetch: () => Promise.reject(new Error('verify-bundle: 沙箱内无网络')),
  navigator: { userAgent: 'verify-bundle', language: 'zh-CN' },
  location: { href: 'http://127.0.0.1/', origin: 'http://127.0.0.1', pathname: '/' },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  document: fakeDoc,
}
sandbox.window = sandbox
sandbox.self = sandbox
sandbox.globalThis = sandbox
sandbox.window.__ModuleLoader__ = {
  load: (registration) => registry.set(strip(registration.id), registration),
}

const problems = []
const oks = []
const ok = (m) => oks.push(m)
const bad = (m) => problems.push(m)

try {
  vm.runInNewContext(code, sandbox, { filename: bundlePath })
} catch (e) {
  bad(`bundle 顶层执行抛错：${e.message}`)
}

// 1) 注册契约
const ids = [...registry.keys()]
if (ids.length === 1 && ids[0] === PKG) ok(`注册 id = ${ids[0]}`)
else bad(`注册到的 id 是 [${ids.join(', ')}]，期望恰好一个 ${PKG}`)

// 2) 实例化 + 依赖纯度
const reg = registry.get(PKG)
if (reg) {
  const required = []
  const reactStub = new Proxy({ Fragment: {} }, { get: (t, k) => (k in t ? t[k] : () => null) })
  try {
    const mod = reg.factory((spec) => {
      required.push(spec)
      if (SEED_WORDS.has(spec)) return reactStub
      throw new Error(`require("${spec}") missed the module table`)
    })
    const plugin = mod?.default ?? mod
    if (plugin && typeof plugin.apply === 'function') {
      ok(`导出 cordis 插件（inject=[${(plugin.inject ?? []).join(', ')}]）`)
    } else {
      bad('导出不是带 apply 的 cordis 插件')
    }
  } catch (e) {
    bad(`factory 实例化抛错：${e.message}`)
  }
  const outside = required.filter((s) => !SEED_WORDS.has(s))
  ok(`factory 用到的 require spec：[${required.join(', ')}]`)
  if (outside.length) bad(`require 了非 seed 模块 [${outside.join(', ')}] —— 运行时会在 get 表里落空`)
}

// 3) 样式归属：loader 按 style[data-plugin=<id>] 认领本插件的 <style>
const styleTag = styleTags[0]
if (!styleTag) ok('本次未注入 <style>（apply 未在空跑中执行，正常）')
else {
  const tag = styleTag.getAttribute('data-plugin')
  if (tag === PKG) ok(`<style data-plugin> = ${tag}`)
  else bad(`<style data-plugin> 是 ${tag}，期望 ${PKG}`)
}

for (const m of oks) console.log(`  ✓ ${m}`)
if (problems.length) {
  console.log('')
  for (const m of problems) console.log(`  ✗ ${m}`)
  console.log(`\n${problems.length} 项契约不满足。`)
  process.exit(1)
}
console.log('\nclient bundle 契约校验通过。')

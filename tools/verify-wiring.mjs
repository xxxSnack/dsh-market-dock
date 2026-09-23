#!/usr/bin/env node
/**
 * tools/verify-wiring.mjs — 面板接线完整性 lint（零依赖）。
 *
 *   node tools/verify-wiring.mjs
 *
 * 面板内层组件被提升为模块作用域、改用显式上下文参数 `p` 之后，必须保证
 *   「函数体里用到的 p.X」⊆「调用点 TAB_CTX.<tab>() 提供的字段」。
 * 漏一个字段在运行时只表现为 `undefined`（不一定抛错），是最难靠渲染冒烟发现的回归，
 * 所以单独做机械核对 —— 这也是 FORK-NOTES §3.3「新增 tab」配方卡里那条约定的执行者：
 * 每个 tab 文件的头注释要列出它用到的 `p.*` 字段。
 *
 * 路径按**脚本自身位置**解析（不是进程 CWD），所以在仓库根或插件目录下跑都一样。
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, 'client', 'panel')
const read = (f) => readFileSync(join(DIR, f), 'utf8')

// ── 从对象字面量文本里抽出顶层键名（支持 `a: b`、`a`、`a(){}`、嵌套值）──
function keysOf (objText) {
  const keys = []
  let depth = 0
  let quote = null
  let token = ''
  const flush = () => {
    const t = token.trim()
    if (t) {
      const name = t.split(':')[0].trim().replace(/^['"]|['"]$/g, '')
      if (/^[A-Za-z_$][\w$]*$/.test(name)) keys.push(name)
    }
    token = ''
  }
  for (let i = 0; i < objText.length; i++) {
    const c = objText[i]
    if (quote) { if (c === '\\') { i++; continue } if (c === quote) quote = null; token += c; continue }
    if (c === '"' || c === "'" || c === '`') { quote = c; token += c; continue }
    if (c === '{' || c === '(' || c === '[') {
      // 值内部的括号不影响顶层切分，但要把内容原样吞掉
      if (depth === 0) { flush(); depth++; continue }
      depth++; token += c; continue
    }
    if (c === '}' || c === ')' || c === ']') { depth--; token += c; continue }
    if (c === ',' && depth === 0) { flush(); continue }
    token += c
  }
  flush()
  return keys
}

/** 取 `start` 处配对括号/花括号之间的内容（start 指向开括号） */
function sliceBalanced (src, start) {
  const open = src[start]
  const close = open === '{' ? '}' : ')'
  let depth = 0
  let quote = null
  for (let i = start; i < src.length; i++) {
    const c = src[i]
    if (quote) { if (c === '\\') { i++; continue } if (c === quote) quote = null; continue }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue }
    if (c === open) depth++
    else if (c === close) { depth--; if (depth === 0) return src.slice(start + 1, i) }
  }
  return ''
}

const idx = read('index.js')
let problems = 0
const report = (label, used, provided) => {
  const missing = [...used].filter((k) => !provided.has(k)).sort()
  const extra = [...provided].filter((k) => !used.has(k)).sort()
  const ok = missing.length === 0
  if (!ok) problems++
  console.log(`  ${ok ? '✓' : '✗'} ${label}：用到 ${used.size} 个字段 / 提供 ${provided.size} 个` +
    (missing.length ? `\n      缺少: ${missing.join(', ')}` : '') +
    (extra.length ? `\n      多余(无害): ${extra.join(', ')}` : ''))
}

const usedIn = (file) => {
  const src = read(file)
  const set = new Set()
  for (const m of src.matchAll(/\bp\.([A-Za-z_$][\w$]*)/g)) set.add(m[1])
  return set
}

// 1) 各 tab：TAB_CTX 工厂
const tabStart = idx.indexOf('const TAB_CTX = {')
const tabBody = sliceBalanced(idx, idx.indexOf('{', tabStart))
const factoryRe = /([A-Za-z_$][\w$]*)\s*:\s*function\s*\([^)]*\)\s*\{/g
const factories = new Map()
let m
while ((m = factoryRe.exec(tabBody))) {
  const name = m[1]
  const retIdx = tabBody.indexOf('return {', m.index)
  const objText = sliceBalanced(tabBody, tabBody.indexOf('{', retIdx))
  factories.set(name, new Set(keysOf(objText)))
}

console.log('=== tab 上下文（TAB_CTX）===')
const FILE_OF = { market: 'market.js', hot: 'hot.js', search: 'search.js', news: 'news.js', pnl: 'pnl.js' }
for (const [tab, provided] of factories) {
  const file = FILE_OF[tab]
  if (!file) { console.log(`  · TAB_CTX 里的 ${tab} 未在核对清单中（可能是有意新增）`); continue }
  report(`panel/${file} ← TAB_CTX.${tab}`, usedIn(file), provided)
}

// 2) LoginBox / DetailView：调用点直接传对象
console.log('=== 显式调用（LoginBox / DetailView）===')
for (const [comp, file] of [['LoginBox', 'login.js'], ['DetailView', 'detail.js']]) {
  const callIdx = idx.indexOf(`${comp}({`)
  if (callIdx < 0) { console.log(`  ✗ 找不到 ${comp}({...}) 调用点`); problems++; continue }
  const provided = new Set(keysOf(sliceBalanced(idx, idx.indexOf('{', callIdx))))
  report(`panel/${file} ← ${comp}({...})`, usedIn(file), provided)
}

// 3) XQ_TABS 覆盖：旧 if/else 支持的分支必须都在查表里
console.log('=== tab 查表覆盖 ===')
const tabsMapIdx = idx.indexOf('const XQ_TABS = {')
const tabsMap = keysOf(sliceBalanced(idx, idx.indexOf('{', tabsMapIdx)))
const expect = ['market', 'hot', 'search', 'news', 'pnl']
const missTab = expect.filter((t) => !tabsMap.includes(t))
if (missTab.length) { console.log(`  ✗ XQ_TABS 缺少: ${missTab.join(', ')}`); problems++ } else console.log(`  ✓ XQ_TABS 覆盖 ${expect.join('/')}`)
const fb = idx.includes("hasOwnProperty.call(XQ_TABS, ui.tab) ? ui.tab : 'news'")
if (fb) console.log('  ✓ 未知 tab 兜底为 news（与旧 else 分支等价）')
else { console.log('  ✗ 未找到「未知 tab → news」的兜底写法'); problems++ }

console.log(problems ? `\n${problems} 项需要确认。` : '\n接线完整 ✓')
process.exit(problems ? 1 : 0)

#!/usr/bin/env node
/**
 * tools/build.mjs — dsh-market-dock 的唯一构建入口（零依赖，纯 Node）
 *
 * 背景：上游用 `scripts/gen-static.py` 从 `dynamic/` 生成 `src/`，但该生成器**没有随 npm 包发布**，
 * 于是历史上每次改动都要在 `dynamic/` 与 `src/` 两侧手工同步（见 FORK-NOTES.md）——这是本 fork
 * 最大的扩展性税。本脚本取代它，并把关系反转：
 *
 *     手写源 = lib/（host）+ client/（client）+ assets/
 *     生成物 = src/index.js、src/client/index.js、dynamic/host.js、dynamic/client.js
 *
 * 四个产物都由本脚本生成，**不要手改**（各自带 "由 tools/build.mjs 生成" 头注释）。
 *
 * 为什么不用 esbuild/rollup：插件运行环境无外网（装不了依赖），且 DSH 的客户端模块系统对
 * bundle 有「依赖纯度」硬性约束（factory 里只能 require react 系 seed，见 tools/verify-bundle.mjs）。
 * 因此这里实现一个**受控子集的拼接器**，代价是源码必须遵守下面的模块约定，
 * 好处是零依赖、可逐字节复现、构建期就能查出错。
 *
 * ── 源码模块约定（构建器会强制校验，违反即报错退出）────────────────────────────
 *  1. 只用**具名导出**：`export function f` / `export const c` / `export class K`；
 *     模块内可以 `import { a, b } from './x.js'`（单行、相对路径、带 .js 后缀）。
 *  2. 不许 `export default`（入口文件除外，且必须是单行 `export default 标识符`）、
 *     不许 `export { ... }` 列表、不许 `export * from`、不许动态 `import()`、不许 `require()`。
 *  3. 拼接顺序由本文件的 HOST_MODULES / CLIENT_MODULES 决定；**被 import 的模块必须排在前面**
 *     （构建期校验，防 TDZ 类问题）。
 *  4. 同一个拼接组内导出名不得重复 —— 拼接后是同一个作用域，重名即冲突（构建期校验）。
 *  5. 样式文件用指令行引入（构建期把文件内容内联为模板字面量）：
 *         // #include-styles ./styles.css
 *
 * ── 产物形态 ───────────────────────────────────────────────────────────────
 *  host   静态（src/index.js）  ：真实 ESM 薄入口，re-export lib/index.js 的默认导出。
 *                                DSH bundle layer 走这条（同工作区 dsh-ths-pnl 已是多文件 ESM 先例）。
 *  host   动态（dynamic/host.js）：单文件模块体（`new Function` 可 eval），末尾 `return <plugin>`。
 *  client 静态（src/client/index.js）：classic script，注册到 window.__ModuleLoader__.load({id,factory})，
 *                                factory 为 CJS 形式；内联 KLineChart UMD；提供 styles/host/React 门面 shim。
 *  client 动态（dynamic/client.js）  ：单文件模块体，styles/host/React 由动态运行时注入为全局。
 *
 *  关键设计：client 源码在两种形态下**逐字节相同**——静态形态通过在 wrapper 里补
 *  `const styles = { insert: insertStyle }` 与 `const host = { call: rpcFetch }` 两个 shim 来消除差异，
 *  而不是改写源码。这样「动态版与静态版行为漂移」在构造上就不可能发生。
 *
 * 用法：
 *   node tools/build.mjs                  # 构建全部四个产物
 *   node tools/build.mjs --only=host      # 只构建 host 两件（并行开发时避免互相覆盖）
 *   node tools/build.mjs --only=client
 *   node tools/build.mjs --check          # 只校验产物是否为最新（CI/提交前用），过期则退出码 1
 *   node tools/build.mjs --extract-asset  # 一次性：从历史 bundle 反提 assets/klinecharts.min.js
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PKG = 'dsh-market-dock'
const GEN_HEAD = '// 由 tools/build.mjs 从 {src} 生成 —— 勿手改；改源后运行 node tools/build.mjs'

// ── 小工具 ────────────────────────────────────────────────────────────────
const problems = []
const notes = []
const bad = (m) => problems.push(m)
const note = (m) => notes.push(m)
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const writeIfChanged = (rel, text) => {
  const p = join(ROOT, rel)
  const old = existsSync(p) ? readFileSync(p, 'utf8') : null
  if (old === text) return { rel, changed: false }
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, text, 'utf8')
  return { rel, changed: true }
}

// ── 源模块清单：来自 lib/manifest.txt 与 client/manifest.txt ────────────────
// 清单与源码放在一起（而不是写死在本文件里），这样 host 与 client 两侧可以各自演进、
// 并行开发时不会互相改同一个文件。格式：一行一个相对该目录的模块路径，**最后一行是入口模块**。
const readManifest = (dir) => {
  const p = join(ROOT, dir, 'manifest.txt')
  if (!existsSync(p)) {
    bad(`缺少 ${dir}/manifest.txt（一行一个模块路径，顺序=拼接顺序，最后一行是入口模块）`)
    return []
  }
  return readFileSync(p, 'utf8')
    // 按 CRLF 也切：若按 '\n' 切，行尾的 '\r' 会让下一行的 /#.*$/ 匹配不上（`.` 不匹配 \r），
    // 于是注释行被当成模块名 —— 真实踩过（用 PowerShell Set-Content 改清单时写进了 CRLF）。
    .split(/\r?\n/)
    .map((s) => s.replace(/#.*$/, '').trim())
    .filter(Boolean)
    .map((rel) => `${dir}/${rel}`)
}

const HOST_MODULES = []
const CLIENT_MODULES = []

// ── 模块解析：把 ESM 子集拆成「声明集合」，供拼接与校验 ─────────────────────
const IMPORT_NAMED = /^import\s*\{([^}]*)\}\s*from\s*'([^']+)'\s*$/
const EXPORT_DECL = /^export\s+(function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/

function parseModule (rel) {
  const raw = read(rel)
  const lines = raw.split('\n')
  const out = []
  const imports = []          // { name, from }
  const exports = []          // name
  let defaultExport = null    // 入口文件的 `export default 标识符`
  let styleIncludes = 0

  for (const line of lines) {
    // 样式内联指令：// #include-styles ./styles.css  →  styles.insert(`<css>`)
    const inc = line.match(/^(\s*)\/\/\s*#include-styles\s+(\S+)\s*$/)
    if (inc) {
      const cssRel = resolve(ROOT, dirname(rel), inc[2])
      const css = readFileSync(cssRel, 'utf8')
      if (css.includes('`') || css.includes('${')) {
        bad(`${rel}: 样式文件 ${inc[2]} 含有反引号或 \${，无法安全内联为模板字面量`)
        continue
      }
      out.push(`${inc[1]}styles.insert(\``)
      out.push(css.replace(/\n$/, ''))
      out.push('`)')
      styleIncludes++
      continue
    }

    const imp = line.match(IMPORT_NAMED)
    if (imp) {
      for (const n of imp[1].split(',').map((s) => s.trim()).filter(Boolean)) {
        if (n.includes(' as ')) { bad(`${rel}: 不支持 import 重命名（${line.trim()}）`); continue }
        imports.push({ name: n, from: imp[2] })
      }
      continue
    }

    if (/^import\b/.test(line)) { bad(`${rel}: 只支持单行具名 import，收到：${line.trim()}`); continue }
    if (/^export\s+default\b/.test(line)) {
      const m = line.match(/^export\s+default\s+([A-Za-z_$][\w$]*)\s*$/)
      if (!m) { bad(`${rel}: export default 必须是单行「export default 标识符」`); continue }
      defaultExport = m[1]
      continue
    }
    if (/^export\s*\{/.test(line) || /^export\s*\*/.test(line)) {
      bad(`${rel}: 不支持 export 列表 / export *，请用具名导出：${line.trim()}`)
      continue
    }
    const decl = line.match(EXPORT_DECL)
    if (decl) {
      exports.push(decl[2])
      out.push(line.replace(/^export\s+/, ''))
      continue
    }
    if (/^export\b/.test(line)) { bad(`${rel}: 无法识别的 export 形式：${line.trim()}`); continue }
    if (/\brequire\s*\(/.test(line)) { bad(`${rel}: 源码里不许用 require()（构建器负责包装）：${line.trim()}`); continue }

    out.push(line)
  }

  return { rel, code: out.join('\n'), imports, exports, defaultExport, styleIncludes }
}

/** 解析 + 校验一组模块，返回拼接后的代码与入口默认导出名 */
function bundle (label, moduleList, { entry }) {
  const parsed = []
  const seenExports = new Map()
  let defaultName = null
  let defaultOwner = null

  for (const rel of moduleList) {
    if (!existsSync(join(ROOT, rel))) { bad(`${label}: 缺少源码模块 ${rel}`); continue }
    const m = parseModule(rel)
    parsed.push(m)
    for (const name of m.exports) {
      if (seenExports.has(name)) bad(`${label}: 导出名冲突 "${name}"（${seenExports.get(name)} 与 ${rel}）—— 拼接后同一作用域`)
      else seenExports.set(name, rel)
    }
    if (m.defaultExport) {
      if (rel !== entry) bad(`${label}: 只有入口模块 ${entry} 可以 export default（${rel} 也写了）`)
      defaultName = m.defaultExport
      defaultOwner = rel
    }
    if (m.styleIncludes) note(`${label}: ${rel} 内联了 ${m.styleIncludes} 个样式文件`)
  }

  // 依赖顺序（拼接序必须保证被 import 者在前）
  const indexOf = new Map(moduleList.map((rel, i) => [rel, i]))
  for (const m of parsed) {
    for (const im of m.imports) {
      const targetRel = resolve(ROOT, dirname(m.rel), im.from).slice(ROOT.length + 1).replace(/\\/g, '/')
      if (!indexOf.has(targetRel)) { bad(`${label}: ${m.rel} import 了未列入构建清单的模块 ${im.from}`); continue }
      if (indexOf.get(targetRel) >= indexOf.get(m.rel)) {
        bad(`${label}: ${m.rel} import 的 ${im.from} 必须排在它前面（当前顺序会 TDZ/未定义）`)
      }
      const target = parsed.find((p) => p.rel === targetRel)
      if (target && !target.exports.includes(im.name)) {
        bad(`${label}: ${m.rel} import 的 "${im.name}" 在 ${targetRel} 里并不导出`)
      }
    }
  }

  if (!defaultName) bad(`${label}: 入口模块 ${entry} 缺少「export default 标识符」`)
  if (defaultOwner && defaultOwner !== entry) bad(`${label}: 默认导出出现在 ${defaultOwner}`)

  return { code: parsed.map((p) => p.code).join('\n'), defaultName, modules: parsed.length }
}

// ── 产物模板 ──────────────────────────────────────────────────────────────
const ASSET = 'assets/klinecharts.min.js'

/** 静态 client bundle：与上游 gen-static.py 产物同构（已逐字节反推验证） */
function emitStaticClient (body, pluginName) {
  const asset = read(ASSET)
  return [
    GEN_HEAD.replace('{src}', 'client/') + '（client 静态 bundle）',
    '// 静态 bundle 格式：classic script 注册到 __ModuleLoader__，factory 为 CJS 形式。',
    '// 形态契约见 tools/verify-bundle.mjs：注册 id 必须是包名、require 只许 react 系 seed、',
    '// <style> 必须带 data-plugin=包名（loader 按它认领/回收样式）。',
    'window.__ModuleLoader__.load({',
    `  id: '${PKG}',`,
    '  factory: function (require) {',
    '    var module = { exports: {} }',
    '    var exports = module.exports',
    "    const React = require('react')",
    '',
    '    // 动态运行时 styles.insert 的替代：自管 <style> 标签（随插件停用移除交给卸载流程）',
    '    let _styleTag = null',
    '    function insertStyle (css) {',
    "      if (typeof document === 'undefined' || !document.head) return",
    "      _styleTag = document.createElement('style')",
    `      _styleTag.setAttribute('data-plugin', '${PKG}')`,
    '      _styleTag.textContent = css',
    '      document.head.appendChild(_styleTag)',
    '    }',
    '',
    `    // vendored KLineChart v10 UMD（${ASSET}，Apache-2.0）`,
    '    ;(function () {',
    '      var module = undefined, exports = undefined, define = undefined',
    asset.replace(/\n$/, ''),
    '    }).call(typeof window !== "undefined" ? window : this)',
    '',
    '    // 静态安装没有动态运行时的 styles/host 门面：在这里 shim 成本地实现，',
    '    // 于是 client/ 源码在动态与静态两种形态下逐字节相同（漂移在构造上不可能发生）。',
    '    const styles = { insert: insertStyle }',
    '    const host = {',
    '      call: function (channel, payload) {',
    "        if (channel !== 'xq.call') return Promise.resolve({ ok: false, error: '未知通道: ' + channel })",
    "        return fetch('/xq-rpc', {",
    "          method: 'POST',",
    "          headers: { 'Content-Type': 'application/json' },",
    '          body: JSON.stringify(payload)',
    '        }).then(function (res) { return res.json() })',
    '      }',
    '    }',
    '',
    body,
    '',
    `    exports.default = ${pluginName}`,
    '    return module.exports',
    '  }',
    '})',
    ''
  ].join('\n')
}

/** 动态 client 模块体：styles/host/React 由动态运行时注入为全局 */
function emitDynamicClient (body, pluginName) {
  return [
    GEN_HEAD.replace('{src}', 'client/') + '（cordis 动态模块：函数体形式，末尾 return 交出插件对象）',
    body,
    '',
    `return ${pluginName}`,
    ''
  ].join('\n')
}

/** 静态 host 入口：真实 ESM 薄壳（DSH bundle layer 用 Node ESM 解析 main） */
function emitStaticHost () {
  return [
    GEN_HEAD.replace('{src}', 'lib/') + '（host 静态入口）',
    '// DSH bundle layer 通过 package.json 的 main 以真实 ESM 加载本文件，',
    '// 实现全部在 lib/ 里（同工作区 dsh-ths-pnl 已是多文件 ESM 的既成先例）。',
    "export { default } from '../lib/index.js'",
    ''
  ].join('\n')
}

/** 动态 host 模块体：单文件、new Function 可 eval */
function emitDynamicHost (body, pluginName) {
  return [
    GEN_HEAD.replace('{src}', 'lib/') + '（cordis 动态模块：函数体形式，末尾 return 交出插件对象）',
    body,
    '',
    `return ${pluginName}`,
    ''
  ].join('\n')
}

// ── 一次性：从历史 bundle 反提 KLineChart 资产 ─────────────────────────────
function extractAsset () {
  const src = read('src/client/index.js')
  const open = '    ;(function () {\n      var module = undefined, exports = undefined, define = undefined\n'
  const close = '    }).call(typeof window !== "undefined" ? window : this)'
  const i = src.indexOf(open)
  const j = src.indexOf(close)
  if (i < 0 || j < 0) { bad('无法在 src/client/index.js 中定位 KLineChart IIFE'); return }
  const asset = src.slice(i + open.length, j)
  mkdirSync(join(ROOT, 'assets'), { recursive: true })
  writeFileSync(join(ROOT, ASSET), asset, 'utf8')
  console.log(`已反提 ${ASSET}（${asset.length} 字节，${asset.split('\n').length - 1} 行）`)
}

// ── 主流程 ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7)
const checkOnly = args.includes('--check')

if (args.includes('--extract-asset')) { extractAsset(); process.exit(problems.length ? 1 : 0) }

if (!existsSync(join(ROOT, ASSET))) bad(`缺少 ${ASSET}（首次迁移可运行：node tools/build.mjs --extract-asset）`)

const results = []
const wantHost = !only || only === 'host'
const wantClient = !only || only === 'client'
// 只在本次要构建的那一侧读 manifest —— 这样 --only=host 不会因为 client/ 尚在施工而失败
if (wantHost) HOST_MODULES.push(...readManifest('lib'))
if (wantClient) CLIENT_MODULES.push(...readManifest('client'))

if (wantHost && !problems.length && HOST_MODULES.length) {
  const h = bundle('host', HOST_MODULES, { entry: HOST_MODULES[HOST_MODULES.length - 1] })
  if (h.defaultName) {
    results.push(writeIfChanged('dynamic/host.js', emitDynamicHost(h.code, h.defaultName)))
    results.push(writeIfChanged('src/index.js', emitStaticHost()))
    note(`host: ${h.modules} 个源模块 → 2 个产物`)
  }
}

if (wantClient && !problems.length && CLIENT_MODULES.length) {
  const c = bundle('client', CLIENT_MODULES, { entry: CLIENT_MODULES[CLIENT_MODULES.length - 1] })
  if (c.defaultName) {
    results.push(writeIfChanged('dynamic/client.js', emitDynamicClient(c.code, c.defaultName)))
    results.push(writeIfChanged('src/client/index.js', emitStaticClient(c.code, c.defaultName)))
    note(`client: ${c.modules} 个源模块 → 2 个产物`)
  }
}

if (problems.length) {
  console.error('\n构建失败：\n')
  for (const p of problems) console.error(`  ✗ ${p}`)
  process.exit(1)
}

for (const n of notes) console.log(`  · ${n}`)
if (checkOnly) {
  const stale = results.filter((r) => r.changed)
  if (stale.length) {
    console.error('\n产物已过期（请运行 node tools/build.mjs）：')
    for (const s of stale) console.error(`  ✗ ${s.rel}`)
    process.exit(1)
  }
  console.log('  产物均为最新 ✓')
} else {
  for (const r of results) console.log(`  ${r.changed ? '写入' : '未变'} ${r.rel}`)
  console.log('\n构建完成。')
}

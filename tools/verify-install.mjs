#!/usr/bin/env node
// 校验 dsh-market-dock 是否已被 DSH web profile 正确接管。
// 用法：node tools/verify-install.mjs [profileName]   （默认 web）
// 只读，不修改任何东西。退出码非 0 表示存在问题。
import { readFileSync, existsSync, lstatSync, readlinkSync, realpathSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'

const PKG = 'dsh-market-dock'
const UPSTREAM = 'dsh-xueqiu'
const profileName = process.argv[2] || 'web'

const home = process.env.DSH_HOME || (process.env.USERPROFILE || process.env.HOME)
  ? (process.env.DSH_HOME || join(process.env.USERPROFILE || process.env.HOME, '.dsh'))
  : null
if (!home) { console.error('✗ 无法确定 DSH_HOME'); process.exit(2) }

const profileDir = join(home, 'profiles', profileName)
const manifestPath = join(profileDir, 'package.json')
const problems = []
const oks = []
const ok = (m) => oks.push(m)
const bad = (m) => problems.push(m)

console.log(`DSH_HOME     : ${home}`)
console.log(`profile      : ${profileDir}`)
console.log('')

// 1) profile manifest
if (!existsSync(manifestPath)) {
  bad(`profile manifest 不存在：${manifestPath}`)
} else {
  const m = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const bundles = m.dsh?.profile?.bundles ?? []
  const dep = m.dependencies?.[PKG]
  if (bundles.includes(PKG)) ok(`bundles 已包含 ${PKG}`)
  else bad(`bundles 未包含 ${PKG}（当前：${bundles.join(' | ')}）`)
  if (bundles.includes(UPSTREAM)) bad(`bundles 仍包含上游 ${UPSTREAM} —— 会重复注册同名工具/槽位，请移除`)
  else ok(`bundles 已不再包含上游 ${UPSTREAM}`)
  if (dep) ok(`dependencies.${PKG} = ${dep}`)
  else bad(`dependencies 缺少 ${PKG}`)
  if (m.dependencies?.[UPSTREAM]) bad(`dependencies 仍保留上游 ${UPSTREAM} = ${m.dependencies[UPSTREAM]}`)
}

// 2) node_modules 链接
const linkPath = join(profileDir, 'node_modules', PKG)
if (!existsSync(linkPath)) {
  bad(`node_modules 里没有 ${PKG}（需要 symlink/junction 指向本目录）`)
} else {
  const st = lstatSync(linkPath)
  if (st.isSymbolicLink()) ok(`node_modules/${PKG} 是符号链接 -> ${readlinkSync(linkPath)}`)
  else ok(`node_modules/${PKG} 存在（实体目录，pnpm 安装形态）`)
}

// 3) 按 DSH 的方式解析 bundle 目录 + 读它的 patch 声明
const req = createRequire(join(profileDir, 'noop.js'))
let pkgJsonPath = null
try {
  pkgJsonPath = req.resolve(`${PKG}/package.json`)
  ok(`require.resolve('${PKG}/package.json') -> ${pkgJsonPath}`)
} catch (e) {
  bad(`无法从 profile 解析 ${PKG}/package.json：${e.message}`)
}

if (pkgJsonPath) {
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
  const pkgDir = dirname(pkgJsonPath)
  const real = (() => { try { return realpathSync(pkgDir) } catch { return pkgDir } })()
  console.log(`解析到       : ${pkgDir}`)
  console.log(`真实路径     : ${real}`)
  console.log('')

  const here = dirname(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')))
  if (resolve(real).toLowerCase() === resolve(here).toLowerCase()) ok('解析结果就是本 fork 目录（不是上游副本）')
  else bad(`解析到的是 ${real}，而本 fork 在 ${here}`)

  if (pkg.name === PKG) ok(`包名 = ${pkg.name}`)
  else bad(`包名是 ${pkg.name}，期望 ${PKG}`)
  console.log(`版本         : ${pkg.version}`)

  const declared = pkg.dsh?.bundle?.patch
  if (!declared) bad('package.json 缺少 dsh.bundle.patch')
  else {
    const patchPath = join(pkgDir, declared)
    if (!existsSync(patchPath)) bad(`patch 文件不存在：${patchPath}`)
    else {
      const y = readFileSync(patchPath, 'utf8')
      if (y.includes('id: market-dock')) ok('cordis.patch.yml 的 id 是 market-dock')
      else bad('cordis.patch.yml 的 id 不是 market-dock')
      if (y.includes(PKG)) ok(`cordis.patch.yml 引用了 ${PKG}`)
      else bad(`cordis.patch.yml 未引用 ${PKG}`)
    }
  }

  // 4) 客户端 bundle 的模块注册契约：必须用**包名**当 id 调 __ModuleLoader__.load。
  // loader 按行 id（= 包名）查 factories 表，名字不符即报
  // `bundle ... loaded without registering "<pkg>"`，整个插件加载失败。
  const clientEntry = join(real, 'src/client/index.js')
  if (existsSync(clientEntry)) {
    const s = readFileSync(clientEntry, 'utf8')
    const m = s.match(/window\.__ModuleLoader__\.load\(\s*\{[^}]*?\bid:\s*'([^']+)'/)
    if (!m) bad('src/client/index.js 里找不到 __ModuleLoader__.load({ id: \'…\' })')
    else if (m[1] === PKG) ok(`client bundle 注册 id = ${m[1]}`)
    else bad(`client bundle 注册 id 是 ${m[1]}，期望 ${PKG} —— 会报 "loaded without registering"`)
    const tagged = s.match(/setAttribute\('data-plugin',\s*'([^']+)'\)/)
    if (!tagged) bad('src/client/index.js 里找不到 <style data-plugin> 标记')
    else if (tagged[1] !== PKG) bad(`样式标签 data-plugin 是 ${tagged[1]}，期望 ${PKG}（HMR 回收样式时归属不上本插件）`)
    else ok(`样式标签 data-plugin = ${tagged[1]}`)
  }

  // 5) 关键文件 + fork 修复标记
  for (const f of ['src/index.js', 'src/client/index.js', 'dynamic/host.js', 'dynamic/client.js', 'FORK-NOTES.md']) {
    if (existsSync(join(real, f))) ok(`存在 ${f}`)
    else bad(`缺少 ${f}`)
  }
  for (const f of ['src/client/index.js', 'dynamic/client.js']) {
    const p = join(real, f)
    if (!existsSync(p)) continue
    const s = readFileSync(p, 'utf8')
    const marks = {
      'badgePosTouched 守卫': s.includes('this.badgePosTouched = true'),
      '位置/尺寸直接落盘': s.includes("'badgePos' in patch"),
      'badgeCompact 水合防回滚': s.includes('!ui.badgeCompactTouched'),
      'badgeCompact 直接落盘': s.includes("'badgeCompact' in patch") && s.includes('badgeCompact: ui.badgeCompact'),
      '折叠按钮事件隔离': s.includes("target.closest('.xq-badge-control')") && s.includes('if (!rt.badgeDrag) return'),
      '应用级幂等水合': s.includes('function hydrateUi()'),
      'MiniBadge 触发水合': s.includes('hydrateUi()   //'),
      'PNL 前台恢复立即轮询': s.includes('function onVisibility()') && s.includes("document.addEventListener('visibilitychange', onVisibility)"),
      '行情响应序列防护': s.includes('marketSeq.current') && s.includes('refreshSeq.current') && s.includes('requestSeq.current'),
      '详情驻留刷新': s.includes('详情驻留期间也要更新报价/分时') && s.includes('force: true'),
    }
    for (const [k, v] of Object.entries(marks)) {
      if (v) ok(`${f}: ${k} ✓`)
      else bad(`${f}: 缺少 fork 修复「${k}」`)
    }
  }
}

console.log('')
for (const m of oks) console.log(`  ✓ ${m}`)
if (problems.length) {
  console.log('')
  for (const m of problems) console.log(`  ✗ ${m}`)
  console.log(`\n${problems.length} 项问题需要处理。`)
  process.exit(1)
}
console.log('\n全部检查通过：DSH web profile 已由 dsh-market-dock 接管。重启 dsh web 并刷新页面生效。')
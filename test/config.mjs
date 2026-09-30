#!/usr/bin/env node
// 插件配置（lib/config.js）行为测试：默认值必须与重构前完全一致，配置必须真的生效，
// 非法值必须安全回退（含路径穿越）。
//   node test/config.mjs
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve as presolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const HERE = presolve(new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const PLUGIN = presolve(join(HERE, '..'))
const SANDBOX = join(PLUGIN, '..', '..', 'tmp', 'refactor-xueqiu', 'config-test')
const HOME = join(SANDBOX, 'home')
const WORK = join(SANDBOX, 'work')

rmSync(SANDBOX, { recursive: true, force: true })
mkdirSync(HOME, { recursive: true })
mkdirSync(WORK, { recursive: true })
process.env.DSH_HOME = HOME
process.chdir(WORK)

const failures = []
let section = ''
const check = (name, cond, detail) => {
  if (cond) console.log(`  ✓ ${name}`)
  else { failures.push(`${section} / ${name}`); console.log(`  ✗ ${name}${detail ? ' :: ' + detail : ''}`) }
}

/** 真实 fs 的小替身（语义对齐 DSH fs 服务：resolve(p,{cwd}) / readText / writeText） */
const fakeFs = {
  resolve: async (p, opts) => presolve((opts && opts.cwd) || WORK, p),
  readText: async (abs) => readFileSync(abs, 'utf8'),
  writeText: async (abs, text) => {
    mkdirSync(presolve(abs, '..'), { recursive: true })
    writeFileSync(abs, text, 'utf8')
    return abs
  }
}

/** 跑一次 apply，返回 RPC 调用入口与工具注册表 */
async function boot (config) {
  const realFetch = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('config-test: 不应发网络请求') }
  const routes = []
  const tools = []
  const ctx = {
    timeout: (fn, ms) => () => {},
    interval: (fn, ms) => () => {},
    debounce: (fn) => Object.assign((...a) => fn(...a), { cancel () {} }),
    effect: (fn) => { try { return fn() } catch (e) { return undefined } },
    get: (name) => (name === 'fs' ? fakeFs : name === 'sandboxPolicy' ? { workspaceRoot: WORK } : name === 'shell' ? { execute: () => ({ result: async () => { throw new Error('no shell') } }), run: () => { throw new Error('no shell') }, resolve: async (p) => p } : undefined),
    inject: (deps, cb) => {
      if (deps.includes('webServer')) cb({ effect: (f) => f(), webServer: { register: (cfg) => { routes.push(cfg); return () => {} } } })
      if (deps.includes('tools')) cb({ effect: (f) => f(), tools: { register: (spec) => { tools.push(spec); return () => {} } } })
    }
  }
  const mod = await import(pathToFileURL(join(PLUGIN, 'src', 'index.js')).href + '?t=' + Math.random())
  mod.default.apply(ctx, config)
  globalThis.fetch = realFetch
  const handler = routes[0] && routes[0].handler
  const rpc = async (body) => {
    let out = null
    const res = { writeHead () {}, end (t) { out = t } }
    const req = (async function* () { yield Buffer.from(JSON.stringify(body)) })()
    req.headers = { host: '127.0.0.1:3080', origin: 'http://127.0.0.1:3080' }
    await handler(req, res)
    return JSON.parse(out)
  }
  return { rpc, tools }
}

console.log('插件配置测试（lib/config.js）')
console.log(`假 DSH_HOME: ${HOME}\n`)

// [1] 未配置：必须与重构前一致
section = '[1] 未配置 → 默认值（向后兼容）'
{
  const { rpc, tools } = await boot(undefined)
  const wl = await rpc({ action: 'watchlist.get' })
  check('默认自选表 = 6 只内置票', wl.ok && JSON.stringify(wl.data.symbols) === JSON.stringify(['SH600519', 'SZ300750', 'SZ002594', 'SH601318', '00700', 'AAPL']), JSON.stringify(wl.data && wl.data.symbols))
  const stamp = Date.now()
  await rpc({ action: 'ui.set', args: { tab: 'hot' } })
  const dir = join(HOME, 'dsh-xueqiu')
  check('状态目录 = $DSH_HOME/dsh-xueqiu（沿用上游，存量数据可继承）', readFileSync(join(dir, '.xueqiu-ui-state.json'), 'utf8').includes('hot'))
  check('工具照常注册 6 个', tools.length === 6)
}

// [2] 配置生效
section = '[2] 配置 → 生效'
{
  const { rpc } = await boot({ stateDir: 'dsh-xueqiu-debug', watchlist: ['SH600519', '00700', 'AAPL'] })
  const wl = await rpc({ action: 'watchlist.get' })
  check('配置的自选表生效', wl.ok && JSON.stringify(wl.data.symbols) === JSON.stringify(['SH600519', '00700', 'AAPL']), JSON.stringify(wl.data && wl.data.symbols))
  await rpc({ action: 'ui.set', args: { tab: 'search' } })
  const p = join(HOME, 'dsh-xueqiu-debug', '.xueqiu-ui-state.json')
  check('配置的状态目录生效（与上游目录隔离）', readFileSync(p, 'utf8').includes('search'))
}

// [3] 非法值安全回退
section = '[3] 非法配置 → 回退默认（安全）'
{
  const cases = [
    [{ stateDir: '../evil', watchlist: ['X'] }, 'dsh-xueqiu', '路径穿越 stateDir'],
    [{ stateDir: 'a/b', watchlist: ['X'] }, 'dsh-xueqiu', '含分隔符 stateDir'],
    [{ stateDir: 42, watchlist: ['X'] }, 'dsh-xueqiu', '非字符串 stateDir'],
    [{ stateDir: '', watchlist: ['X'] }, 'dsh-xueqiu', '空 stateDir']
  ]
  for (const [cfg, expectDir, label] of cases) {
    const { rpc } = await boot(cfg)
    await rpc({ action: 'ui.set', args: { tab: 'news' } })
    let landed = 'dsh-xueqiu'
    try { readFileSync(join(HOME, expectDir, '.xueqiu-ui-state.json'), 'utf8') } catch (e) { landed = '未落到预期目录' }
    const escaped = (() => { try { readFileSync(presolve(HOME, '..', 'evil', '.xueqiu-ui-state.json'), 'utf8'); return true } catch (e) { return false } })()
    check(`${label} → 落到 dsh-xueqiu 且未越界`, landed === 'dsh-xueqiu' && !escaped)
  }
  const { rpc } = await boot({ stateDir: 'dsh-xueqiu', watchlist: [] })
  const wl = await rpc({ action: 'watchlist.get' })
  check('空 watchlist → 回退默认 6 只', wl.ok && wl.data.symbols.length === 6)
  const { rpc: rpc2 } = await boot({ stateDir: 'ok', watchlist: [null, '  ', 'SH600519'] })
  const wl2 = await rpc2({ action: 'watchlist.get' })
  check('自选表里的空值/空白被清理', wl2.ok && JSON.stringify(wl2.data.symbols) === JSON.stringify(['SH600519']), JSON.stringify(wl2.data && wl2.data.symbols))
}

console.log('')
if (failures.length) {
  console.log(`${failures.length} 项失败：`)
  for (const f of failures) console.log('  ✗ ' + f)
  process.exit(1)
}
console.log('全部通过 ✓')

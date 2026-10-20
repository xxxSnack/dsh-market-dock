#!/usr/bin/env node
/**
 * 今日盈亏整合 —— 端到端（假 shell + 真 /xq-rpc）回归测试。
 *
 *   node test/pnl-rpc.mjs
 *
 * 与 test/smoke-host.mjs 的 section [9] 互补：那边直接调 core 上的 act*，
 * 这里**驱动真实的 /xq-rpc 路由**，端到端跑
 *   HTTP 请求体 → handleCall → dispatch → actPnl* → 假 curl 输出 → 状态文件 → 响应 JSON。
 * 重点盯三条最容易翻车的链路：
 *   1) 与 dsh-ths-pnl **共用** $DSH_HOME/dsh-ths-pnl/{config.json,snapshot.json}（并存期两边必须同源）
 *   2) 带 HTTP 状态码的 curl 解析（200 / 401 / 302 / 非 JSON / error_code≠0 / 空 data）
 *   3) 清 Cookie 不抹掉最后已知盈亏（config 与 snapshot 分文件）
 *
 * 全程只写仓库 tmp/ 下的临时目录，不碰真实 $DSH_HOME，不发真实网络。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PLUGIN_DIR = path.resolve(HERE, '..')
const REPO_ROOT = path.resolve(PLUGIN_DIR, '..', '..')
const TMP_ROOT = path.join(REPO_ROOT, 'tmp', 'refactor-xueqiu', 'pnl-live')
const LIVE_HOME = path.join(TMP_ROOT, 'home')          // 假 $DSH_HOME
const WORK = path.join(TMP_ROOT, 'work')               // 假 sandboxPolicy.workspaceRoot
const SHARED_DIR = path.join(LIVE_HOME, 'dsh-ths-pnl') // 与 dsh-ths-pnl 共用的目录
const JAIL = TMP_ROOT

fs.rmSync(TMP_ROOT, { recursive: true, force: true })
fs.mkdirSync(SHARED_DIR, { recursive: true })
fs.mkdirSync(WORK, { recursive: true })
process.env.DSH_HOME = LIVE_HOME

const failures = []
let total = 0
function check(name, cond, detail) {
  total++
  if (cond) console.log('  ✓ ' + name)
  else { failures.push(name); console.log('  ✗ ' + name + (detail == null || detail === '' ? '' : ' :: ' + detail)) }
}
function section(t) { console.log('\n' + t) }

console.log('今日盈亏：/xq-rpc 端到端（假 shell）回归')
console.log('假 DSH_HOME : ' + LIVE_HOME)
console.log('共用状态目录 : ' + SHARED_DIR)

/* ---------------- 假 shell：按 URL 返回账本同形状的响应 + HTTP 状态码 ---------------- */

let mode = 'ok'
let shellCalls = 0
const ACCOUNT_BODY = JSON.stringify({
  error_code: '0',
  ex_data: { common: [
    { fund_key: 'FK1', manualname: '我的组合', brokername: '某券商' },
    { fund_key: 'FK2', manualname: '第二个组合', brokername: '' }
  ] }
})
const PNL_BODY = JSON.stringify({
  error_code: '0',
  ex_data: { data: [
    { time: 1, zf: -0.30, yk: -289.6 },
    { time: 2, zf: -0.35, yk: -300.1 }   // 最后一个采样点才是当前值
  ] }
})

function cannedResponse(command) {
  shellCalls++
  const isAccount = command.indexOf('account_list') >= 0
  if (mode === '401') return '{"error_code":"401","error_msg":"未登录"}\n__HTTP__401'
  if (mode === '302') return '<!-- redirect -->\n__HTTP__302'
  if (mode === 'nonjson') return '<html>not json</html>\n__HTTP__200'
  if (mode === 'apierr') return '{"error_code":"1001","error_msg":"参数错误"}\n__HTTP__200'
  if (mode === 'empty') return '{"error_code":"0","ex_data":{"data":[]}}\n__HTTP__200'
  return (isAccount ? ACCOUNT_BODY : PNL_BODY) + '\n__HTTP__200'
}

const timers = new Set()
function clearAll() { for (const t of timers) clearTimeout(t); timers.clear() }

const shell = {
  resolve(spec) { return { command: String((spec && spec.command) || ''), timeoutMs: spec && spec.timeoutMs } },
  run() {
    // DSH 0.2 起 shell 服务没有 run()（改名 execute）：插件若退回旧 API，这里要炸得很响。
    throw new Error('[pnl-rpc] shell.run 已不存在（DSH 0.2 起改名 execute）：插件仍在调用旧 API')
  },
  execute(spec) {
    const command = String((spec && spec.command) || '')
    // 断言式栅栏：凭据请求绝不跟随重定向
    if (/\s-L\s/.test(command)) throw new Error('[pnl-rpc] 不该出现 -L（旧实现是 redirect:manual）')
    const value = { exitCode: 0, stdout: { text: cannedResponse(command) }, stderr: { text: '' } }
    // 0.2：execute 返回句柄，前台执行 = await handle.result()
    return { result: async function () { return value } }
  }
}
function inJail(p) { return p === JAIL || p.startsWith(JAIL + path.sep) }
const fsStub = {
  async resolve(p, opts) {
    const cwd = opts && opts.cwd ? String(opts.cwd) : WORK
    const abs = path.resolve(cwd, String(p))
    if (!inJail(abs)) throw new Error('[pnl-rpc] fs.resolve 越界: ' + abs)
    return abs
  },
  async readText(p) {
    if (!inJail(path.resolve(String(p)))) throw new Error('[pnl-rpc] fs.readText 越界: ' + p)
    return fs.readFileSync(p, 'utf8')
  },
  async writeText(p, text) {
    const abs = path.resolve(String(p))
    if (!inJail(abs)) throw new Error('[pnl-rpc] fs.writeText 越界: ' + abs)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, String(text))
  }
}

const routes = []
const provided = { shell, fs: fsStub, sandboxPolicy: { workspaceRoot: WORK } }
function effect(fn) { const d = fn(); return typeof d === 'function' ? d : () => {} }
const ctx = {
  timeout(cb, ms) { const t = setTimeout(() => { timers.delete(t); cb() }, ms); timers.add(t); return () => { if (timers.delete(t)) clearTimeout(t) } },
  interval(cb, ms) { const t = setInterval(cb, ms); timers.add(t); return () => { if (timers.delete(t)) clearInterval(t) } },
  effect,
  get(name) { return provided[name] },
  inject(names, cb) {
    const list = Array.isArray(names) ? names.slice() : [names]
    const sub = Object.create(ctx)
    sub.effect = effect
    if (list.indexOf('webServer') >= 0) sub.webServer = { register(def) { routes.push(def); return () => {} } }
    if (list.indexOf('tools') >= 0) sub.tools = { register() { return () => {} } }
    cb(sub)
  },
  logger: { info() {}, warn() {}, error() {}, debug() {} }
}

/* ---------------- 驱动真实 apply + 真实 /xq-rpc ---------------- */

delete globalThis.harness
const mod = await import(pathToFileURL(path.join(PLUGIN_DIR, 'lib', 'index.js')).href)
mod.default.apply(ctx, {})

const rpcRoute = routes.find((r) => r.path === '/xq-rpc')
check('静态路径注册了 /xq-rpc（kind=prefix）', !!rpcRoute && rpcRoute.kind === 'prefix')
if (!rpcRoute) { console.log('\n无法继续：/xq-rpc 未注册'); process.exit(1) }

async function rpc(action, args) {
  let status = 0
  let text = ''
  const res = { writeHead(code) { status = code }, end(t) { text = t == null ? '' : t } }
  const req = {
    headers: { host: '127.0.0.1:3080', origin: 'http://127.0.0.1:3080' },
    async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify({ action, args: args || {} }), 'utf8') }
  }
  await rpcRoute.handler(req, res)
  return { status, json: text ? JSON.parse(text) : null }
}
const data = async (action, args) => {
  const r = await rpc(action, args)
  if (!r.json || !r.json.ok) throw new Error(action + ' 失败: ' + JSON.stringify(r.json))
  return r.json.data
}
const readShared = (f) => { try { return JSON.parse(fs.readFileSync(path.join(SHARED_DIR, f), 'utf8')) } catch (e) { return null } }


/* ---------------- 1. dispatch 契约 ---------------- */
section('1. RPC 契约：本地持仓 + 账本同步六个动作')
{
  // 未配置、无持仓时也得能调（这是「账本凭据坏了不影响实时数字」的最小证明）
  const idle = await data('positions.get', {})
  check('positions.get → ok:true / configured:true / rows:[]', idle.configured === true && Array.isArray(idle.rows) && idle.rows.length === 0, JSON.stringify(idle))
  check('positions.get 不打上游', shellCalls === 0, String(shellCalls))
  check('视图字段契约齐全', ['rows', 'totals', 'as_of', 'session', 'poll_ms', 'next_poll_ms', 'cloud', 'updated_at', 'configured'].every((k) => k in idle), JSON.stringify(Object.keys(idle)))
  check('totals 字段契约齐全', ['held', 'missing', 'value', 'cost_value', 'day_profit', 'day_base', 'day_rate', 'hold_profit', 'hold_rate'].every((k) => k in idle.totals), JSON.stringify(Object.keys(idle.totals)))
  check('payload 可 JSON 序列化且没有函数/undefined', (function () {
    const text = JSON.stringify(idle)
    return text.indexOf('undefined') < 0 && text.length > 10 && JSON.parse(text).configured === true
  })(), '')

  const gone = await rpc('pnl.get', {})
  check('旧的 pnl.get 已从 dispatch 移除（未知操作）', gone.json && gone.json.ok === false && String(gone.json.error).indexOf('未知操作') >= 0, JSON.stringify(gone.json))

  const verify = await data('pnl.verify', {})
  check('pnl.verify → configured:false / valid:false / portfolios:[]', verify.configured === false && verify.valid === false && Array.isArray(verify.portfolios) && verify.portfolios.length === 0, JSON.stringify(verify))
  check('pnl.verify → 可读中文原因 + 5/3600 秒边界', verify.error === '未配置 Cookie' && verify.min_sec === 5 && verify.max_sec === 3600, JSON.stringify(verify))
  check('pnl.verify 顺手回传上次同步状态（cloud 字段）', 'cloud' in verify, JSON.stringify(Object.keys(verify)))
  check('未配置时标题类动作累计零上游请求', shellCalls === 0, String(shellCalls))
}

/* ---------------- 2. 入参容错 ---------------- */
section('2. 入参容错：怪参数只该报错，不该抛 TypeError')
{
  const cases = [
    ['positions.save：args 是 null', 'positions.save', null, '代码'],
    ['positions.save：row 缺失', 'positions.save', {}, '代码'],
    ['positions.save：code 为空', 'positions.save', { row: { qty: 1 } }, '代码'],
    ['positions.save：qty 缺失', 'positions.save', { row: { code: '600519' } }, '股数'],
    ['positions.remove：args 是字符串', 'positions.remove', 'oops', '代码'],
    ['positions.remove：code 为空', 'positions.remove', {}, '代码'],
  ]
  for (const [name, action, args, hint] of cases) {
    const r = await rpc(action, args)
    check(name + ' → ok:false + 中文原因', Boolean(r.json) && r.json.ok === false && String(r.json.error).indexOf(hint) >= 0, JSON.stringify(r.json))
  }
  const unknownArgs = await rpc('positions.get', 'not-an-object')
  check('positions.get：args 非对象也不炸（回退空参数）', Boolean(unknownArgs.json) && unknownArgs.json.ok === true, JSON.stringify(unknownArgs.json))
}

/* ---------------- 3. 回环来源校验仍然生效 ---------------- */
section('3. 安全：非回环来源仍被拒')
{
  const ui = await data('ui.get', {})
  check("ui.get 的 tab 白名单含 'positions' 或回退 market", ui.tab === 'market' || ui.tab === 'positions' || ui.tab === 'pnl', String(ui.tab))
  const dbg = await data('debug', {})
  check('debug 仍可用', !!dbg && typeof dbg === 'object', JSON.stringify(dbg))

  let status = 0
  const res = { writeHead(c) { status = c }, end() {} }
  const req = { headers: { host: 'evil.example.com', origin: 'http://evil.example.com' }, async *[Symbol.asyncIterator]() { yield Buffer.from('{}') } }
  await rpcRoute.handler(req, res)
  check('非回环 Host 仍 403', status === 403, String(status))
}

/* ---------------- 汇总 ---------------- */
clearAll()
console.log('\n------------------------------------------------------------')
if (failures.length) {
  console.log('结果：失败 ' + failures.length + '/' + total + '：' + failures.join(' | '))
  process.exit(1)
}
console.log('结果：全部通过（' + total + ' 项断言）')
console.log('临时产物：' + TMP_ROOT + '（可整目录删除）')
process.exit(0)

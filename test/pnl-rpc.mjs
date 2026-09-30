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

/* ---------------- 1. 未配置 ---------------- */
section('1. 未配置 Cookie')
{
  const d = await data('pnl.get', {})
  check('configured=false', d.configured === false, JSON.stringify(d))
  check('error 为空串', d.error === '', JSON.stringify(d.error))
  check('pnl_yk 是 number|null', d.pnl_yk === null || typeof d.pnl_yk === 'number', typeof d.pnl_yk)
  check('next_poll_ms 是数字', typeof d.next_poll_ms === 'number', typeof d.next_poll_ms)
  check('session 是六态之一', ['pre', 'morning', 'lunch', 'afternoon', 'after', 'weekend'].indexOf(d.session) >= 0, String(d.session))
  check('未配置时不打上游', shellCalls === 0, 'shellCalls=' + shellCalls)
}

/* ---------------- 2. 保存配置：越界夹取 + 当场校验 ---------------- */
section('2. pnl.config 保存（含 pollSec 下界夹取）')
{
  const d = await data('pnl.config', { cookie: 'userid=u1; v=tok_abc; pex_userid=DECOY', fundKey: 'FK1', pollSec: 1 })
  check('ok=true', d.ok === true, JSON.stringify(d))
  check('pollSec=1 被夹到 5', d.poll_sec === 5, String(d.poll_sec))
  check('poll_ms=5000', d.poll_ms === 5000, String(d.poll_ms))
  check('valid=true（假 account_list 通过）', d.valid === true, JSON.stringify(d))
  check('portfolios 解析出 2 个组合', Array.isArray(d.portfolios) && d.portfolios.length === 2, JSON.stringify(d.portfolios))
  check('组合名取 manualname', d.portfolios && d.portfolios[0] && d.portfolios[0].name === '我的组合', JSON.stringify(d.portfolios && d.portfolios[0]))

  const cfg = readShared('config.json')
  check('config.json 落到与旧插件共用的 $DSH_HOME/dsh-ths-pnl/', fs.existsSync(path.join(SHARED_DIR, 'config.json')))
  check('config.json 字段与旧插件一致 {cookie,fundKey,pollSec}', !!cfg && typeof cfg.cookie === 'string' && cfg.fundKey === 'FK1' && cfg.pollSec === 5, JSON.stringify(cfg))
  check('cookie 里带的是锚定读出的 userid（含 pex_userid 干扰）', !!cfg && cfg.cookie.indexOf('userid=u1') >= 0 && cfg.cookie.indexOf('pex_userid') >= 0)
}

/* ---------------- 3. 取一次盈亏：走通 curl 状态码解析 + 快照落盘 ---------------- */
section('3. pnl.get 首次取数（无快照 → 必须打上游）')
{
  const before = shellCalls
  const d = await data('pnl.get', {})
  check('configured=true', d.configured === true, JSON.stringify(d))
  check('确实打了上游', shellCalls > before, 'delta=' + (shellCalls - before))
  check('pnl_yk 取最后一个采样点 -300.1', d.pnl_yk === -300.1, String(d.pnl_yk))
  check('pnl_pct 取 last.zf = -0.35', d.pnl_pct === -0.35, String(d.pnl_pct))
  check("yk_field 命中 'yk'", d.yk_field === 'yk', String(d.yk_field))
  check('token_expired=false', d.token_expired === false, JSON.stringify(d.token_expired))
  check('error 为空', d.error === '', String(d.error))
  check('updated_at 非空', typeof d.updated_at === 'string' && d.updated_at.length > 0, String(d.updated_at))
  check('frozen 是 boolean', typeof d.frozen === 'boolean', typeof d.frozen)

  const snap = readShared('snapshot.json')
  const need = ['pnl_yk', 'pnl_pct', 'error', 'token_expired', 'yk_field', 'fetched_at', 'sessionDate', 'closeDate']
  const missing = snap ? need.filter((k) => !(k in snap)) : need
  check('snapshot.json 形状与旧插件一致（8 个字段齐）', missing.length === 0, '缺: ' + missing.join(','))
  check('snapshot.pnl_yk=-300.1', !!snap && snap.pnl_yk === -300.1, JSON.stringify(snap && snap.pnl_yk))
}

/* ---------------- 4. 时段缓存：非交易时段不该重复打上游 ---------------- */
section('4. 时段缓存')
{
  const before = shellCalls
  const d = await data('pnl.get', {})
  const session = d && d.session
  const inSession = session === 'morning' || session === 'afternoon'
  check(inSession ? '盘中允许再次请求（或命中缓存）' : '盘外直接回快照、不再打上游',
    inSession ? shellCalls >= before : shellCalls === before,
    'session=' + session + ' delta=' + (shellCalls - before))
}

/* ---------------- 5. pollSec 上界夹取 / 非数字抛错 ---------------- */
section('5. pollSec 校验')
{
  const d = await data('pnl.config', { pollSec: 99999 })
  check('pollSec=99999 夹到 3600', d.poll_sec === 3600 && d.poll_ms === 3600000, JSON.stringify(d))
  const r = await rpc('pnl.config', { pollSec: 'abc' })
  check('pollSec 非数字 → ok:false', !!r.json && r.json.ok === false, JSON.stringify(r.json))
  check('错误文案提到 5–3600', !!r.json && /5.*3600/.test(String(r.json.error)), String(r.json && r.json.error))
}

/* ---------------- 6. Cookie 失效 / 重定向 / API 错误 / 空数据 ---------------- */
section('6. 异常响应')
{
  mode = '401'
  const v = await data('pnl.verify', {})
  check('401 → valid=false', v.valid === false, JSON.stringify(v))
  check('401 → 提示已过期', /过期/.test(String(v.error)), String(v.error))
  mode = '302'
  const v2 = await data('pnl.verify', {})
  check('302 → valid=false 且不崩', v2.valid === false && !!v2.error, JSON.stringify(v2))
  mode = 'nonjson'
  const v3 = await data('pnl.verify', {})
  check('非 JSON → valid=false', v3.valid === false, JSON.stringify(v3))
  mode = 'apierr'
  const g = await data('pnl.get', { force: true })
  check('error_code≠0 → error 非空', !!g.error, JSON.stringify(g.error))
  mode = 'empty'
  const g2 = await data('pnl.get', { force: true })
  check('空 data → error 非空（提示无数据）', !!g2.error, JSON.stringify(g2.error))
  mode = 'ok'
  const g3 = await data('pnl.get', { force: true })
  check('force:true 恢复后能重新取到数', g3.pnl_yk === -300.1, JSON.stringify(g3.pnl_yk))
}

/* ---------------- 7. 清 Cookie 不抹掉最后已知盈亏 ---------------- */
section('7. clear 语义（config 与 snapshot 分文件）')
{
  const d = await data('pnl.config', { clear: true })
  check('clear 后 configured=false', d.configured === false, JSON.stringify(d))
  check('clear 后 config.json 不再带 cookie', !readShared('config.json') || !readShared('config.json').cookie, JSON.stringify(readShared('config.json')))
  const snap = readShared('snapshot.json')
  check('clear 后 snapshot.json 仍在', !!snap, JSON.stringify(snap))
  check('clear 后最后已知盈亏仍可读', !!snap && snap.pnl_yk === -300.1, JSON.stringify(snap && snap.pnl_yk))
  const g = await data('pnl.get', {})
  check('clear 后 pnl.get 报未配置', g.configured === false, JSON.stringify(g))
}

/* ---------------- 8. 既有契约回归 ---------------- */
section('8. 既有契约回归')
{
  const r = await rpc('nope.nope', {})
  check('未知 action 仍返回 未知操作', !!r.json && r.json.ok === false && /未知操作/.test(String(r.json.error)), JSON.stringify(r.json))
  const ui = await data('ui.get', {})
  check("ui.get 的 tab 白名单含 'pnl' 或回退 market", ui.tab === 'market' || ui.tab === 'pnl', String(ui.tab))
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

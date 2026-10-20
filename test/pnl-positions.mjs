#!/usr/bin/env node
/**
 * 本地持仓 + 当日盈亏（本地持仓 × 雪球行情）—— 端到端（假 shell + 真 /xq-rpc）回归测试。
 *
 *   node test/pnl-positions.mjs
 *
 * 这次改造的核心承诺，一条一条钉住：
 *   1) **没有账本凭据也能用**：手工录入持仓 → 当日盈亏实时算，全程 0 次账本请求；
 *   2) **派生值不落盘**：positions.json 里只有 code/name/qty/cost，改完股数不会留下旧现价；
 *   3) **账本只在「同步」时出现**：positions.sync 才打账本，且同步失败（403）**一个字段都不碰本地持仓**；
 *   4) **口径**：当日盈亏 =（现价 − 昨收）× 股数（不是「市值 × 涨跌幅」，那个会被两位小数放大）；
 *      合计 = 逐行取整后相加（用户真的会去加，不能差几分）；
 *   5) **迁移**：v3 账本快照（里面有 price/value/hold_profit/day_profit 等派生字段）→ v4 只留输入字段。
 *
 * 全程只写仓库 tmp/ 下的临时目录，不碰真实 $DSH_HOME，不发真实网络。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PLUGIN_DIR = path.resolve(HERE, '..')
const REPO_ROOT = path.resolve(PLUGIN_DIR, '..', '..')
const TMP_ROOT = path.join(REPO_ROOT, 'tmp', 'refactor-xueqiu', 'positions-live')
const LIVE_HOME = path.join(TMP_ROOT, 'home')           // 假 $DSH_HOME
const WORK = path.join(TMP_ROOT, 'work')                // 假 sandboxPolicy.workspaceRoot
const SHARED_DIR = path.join(LIVE_HOME, 'dsh-ths-pnl')
const JAIL = TMP_ROOT

fs.rmSync(TMP_ROOT, { recursive: true, force: true })
fs.mkdirSync(SHARED_DIR, { recursive: true })
fs.mkdirSync(WORK, { recursive: true })
process.env.DSH_HOME = LIVE_HOME

// 先放一份 v3（账本快照结构）的文件：验证「老数据自动迁移成 v4，只留输入字段」。
// 派生字段（price/value/hold_profit/day_profit…）必须被丢掉 —— 它们是账本某一刻的快照。
fs.writeFileSync(path.join(SHARED_DIR, 'positions.json'), JSON.stringify({
  schema: 3,
  as_of: '2026-10-19T02:30:00.000Z',
  attempted_at: '2026-10-19T02:30:00.000Z',
  fund_key: 'FK1',
  summary: { total_asset: 94929.03, total_value: 69570.6 },
  rows: [{ code: '601216', name: '君正集团', qty: 5000, cost: 4.713, price: 4.61, value: 23050, day_profit: -700, day_rate: -2.95, hold_profit: -515, hold_rate: -2.18, prev_close: 4.75 }],
  error: '',
  blocked: false,
}, null, 2), 'utf8')

const failures = []
let total = 0
function check(name, cond, detail) {
  total++
  if (cond) console.log('  ✓ ' + name)
  else { failures.push(name); console.log('  ✗ ' + name + (detail == null || detail === '' ? '' : ' :: ' + detail)) }
}
function section(t) { console.log('\n' + t) }

console.log('本地持仓 + 当日盈亏：/xq-rpc 端到端（假 shell）回归')
console.log('假 DSH_HOME : ' + LIVE_HOME)

/* ---------------- 假 shell：按 URL 返回同形状响应 + HTTP 状态码 ---------------- */

let mode = 'ok'
const commands = []
function posCalls() { return commands.filter(c => c.indexOf('stock_position') >= 0).length }
function accountCalls() { return commands.filter(c => c.indexOf('account_list') >= 0).length }
function timeShareCalls() { return commands.filter(c => c.indexOf('time_share') >= 0).length }
function quoteCalls() { return commands.filter(c => c.indexOf('batch/quote.json') >= 0).length }
function resetCounts() { commands.length = 0 }

const ACCOUNT_BODY = JSON.stringify({
  error_code: '0',
  ex_data: { common: [{ fund_key: 'FK1', manualname: '我的组合', brokername: '某券商' }] }
})

// 账本持仓（只取 count/cost，其余字段故意给上：验证我们确实不搬派生值）
const POS_BODY = JSON.stringify({
  error_code: '0',
  error_msg: 'success',
  ex_data: {
    upload_time: '1792045716000',
    money_remain: '4074.39',
    total_value: '570866.00',
    total_asset: '574940.39',
    position_rate: '0.9929',
    position: [
      { code: '600519', name: '贵州茅台', market: '1', price: '1304.66', count: '100', cost: '1201.30', value: '130466.00', hold_profit: '10336.00', hold_rate: '0.0860', pre_profit: '31.83', pre_rate: '0.0250' },
      { code: 'HK00700', name: '腾讯控股', market: '33', price: 'HK$440.40', count: '1,000', cost: 'HK$380.10', value: 'HK$440,400.00' },
      // 已清仓（qty=0）：merge 时不新增，replace 时也不落进表里
      { code: '603866', name: '桃李面包', market: '2', count: '0', cost: '0', price: '4.22', value: '0' },
      // 账本独有、本地没有的
      { code: '000983', name: '山西焦煤', market: '1', count: '1500', cost: '6.633', price: '6.22', value: '9330.00' },
    ]
  }
})

const TIME_SHARE_BODY = JSON.stringify({
  error_code: '0',
  ex_data: { data: [{ time: '14:59', yk: -2182.20, zf: -2.25 }] }
})

// 雪球批量报价。昨收给足精度：当日盈亏必须是「(现价−昨收)×股数」，
// 而不是「市值×涨跌幅」（后者会被两位小数放大：实测君正差 0.64 元）。
const QUOTE_BODY = JSON.stringify({
  data: {
    items: [
      { quote: { symbol: 'SH600519', name: '贵州茅台', current: 1304.66, percent: 4.37, chg: 54.66, last_close: 1250.00 } },
      { quote: { symbol: '00700', name: '腾讯控股', current: 440.40, percent: 10.10, chg: 40.40, last_close: 400.00 } },
      { quote: { symbol: 'SZ000001', name: '平安银行', current: 12.18, percent: 1.50, chg: 0.18, last_close: 12.00 } },
      { quote: { symbol: 'SH601216', name: '君正集团', current: 4.61, percent: -2.95, chg: -0.14, last_close: 4.75 } },
      { quote: { symbol: 'SZ000983', name: '山西焦煤', current: 6.22, percent: -3.57, chg: -0.23, last_close: 6.45 } },
    ]
  }
})

function cannedResponse(command) {
  commands.push(command)
  const isAccount = command.indexOf('account_list') >= 0
  const isPos = command.indexOf('stock_position') >= 0
  const isShare = command.indexOf('time_share') >= 0
  const isQuote = command.indexOf('batch/quote.json') >= 0
  if (mode === '401' && isPos) return '{"error_code":"401"}\n__HTTP__401'
  if (mode === '403' && isPos) return '<h1>Nginx forbidden.</h1> <br/>request info: 1.2.3.4\n__HTTP__403'
  if (mode === 'expired403' && isPos) return '{"error_code":"400016","error_msg":"登录已失效"}\n__HTTP__403'
  if (mode === 'apierr' && isPos) return '{"error_code":"1001","error_msg":"账号异常"}\n__HTTP__200'
  if (command.indexOf('xueqiu.com/hq') >= 0) {
    return 'HTTP/2 200\nset-cookie: xq_a_token=SEED;\nset-cookie: u=42;\n'
  }
  // 行情挂了：雪球这条链路**不追加** `__HTTP__` 状态标记，这里改成返回不可解析内容
  if (isQuote) return (mode === 'quotefail') ? '{"error":"boom"' : QUOTE_BODY
  if (isShare) return TIME_SHARE_BODY + '\n__HTTP__200'
  if (isAccount) return ACCOUNT_BODY + '\n__HTTP__200'
  if (isPos) return POS_BODY + '\n__HTTP__200'
  return '{"error_code":"0","ex_data":{"data":[]}}\n__HTTP__200'
}

const timers = new Set()
const shell = {
  resolve(spec) { return { command: String((spec && spec.command) || ''), timeoutMs: spec && spec.timeoutMs } },
  run() { throw new Error('[positions] shell.run 已不存在（DSH 0.2 起改名 execute）') },
  execute(spec) {
    const command = String((spec && spec.command) || '')
    if (/\s-L\s/.test(command)) throw new Error('[positions] 不该出现 -L（凭据请求不跟随重定向）')
    const value = { exitCode: 0, stdout: { text: cannedResponse(command) }, stderr: { text: '' } }
    return { result: async function () { return value } }
  }
}
function inJail(p) { return p === JAIL || p.startsWith(JAIL + path.sep) }
const fsStub = {
  async resolve(p, opts) {
    const cwd = opts && opts.cwd ? String(opts.cwd) : WORK
    const abs = path.resolve(cwd, String(p))
    if (!inJail(abs)) throw new Error('[positions] fs.resolve 越界: ' + abs)
    return abs
  },
  async readText(p) {
    if (!inJail(path.resolve(String(p)))) throw new Error('[positions] fs.readText 越界: ' + p)
    return fs.readFileSync(p, 'utf8')
  },
  async writeText(p, text) {
    const abs = path.resolve(String(p))
    if (!inJail(abs)) throw new Error('[positions] fs.writeText 越界: ' + abs)
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

delete globalThis.harness
const mod = await import(pathToFileURL(path.join(PLUGIN_DIR, 'lib', 'index.js')).href)
mod.default.apply(ctx, {})

const rpcRoute = routes.find((r) => r.path === '/xq-rpc')
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
const expectFail = async (action, args) => {
  const r = await rpc(action, args)
  if (r.json && r.json.ok) throw new Error(action + ' 本该失败却成功了: ' + JSON.stringify(r.json.data))
  return r.json ? r.json.error : 'no-json'
}
const readPos = () => { try { return JSON.parse(fs.readFileSync(path.join(SHARED_DIR, 'positions.json'), 'utf8')) } catch (e) { return null } }
const readCfg = () => { try { return JSON.parse(fs.readFileSync(path.join(SHARED_DIR, 'config.json'), 'utf8')) } catch (e) { return null } }
const row = (d, code) => d.rows.find(r => r.code === code) || null

/* ---------------- 1. v3 迁移 ---------------- */
section('1. v3（账本快照）自动迁移成 v4（本地持仓）')
{
  resetCounts()
  const d = await data('positions.get', {})
  check('migrated_from=3', d.migrated_from === 3, String(d.migrated_from))
  check('迁移后 1 行', d.rows.length === 1, JSON.stringify(d.rows.map(r => r.code)))
  check('只留输入字段（qty/cost）', d.rows[0].qty === 5000 && d.rows[0].cost === 4.713, JSON.stringify(d.rows[0]))
  check('派生值由行情现算（price=4.61）', d.rows[0].price === 4.61, String(d.rows[0].price))
  check('当日盈亏 =（4.61−4.75）×5000 = -700', d.rows[0].day_profit === -700, String(d.rows[0].day_profit))
  check('迁移不写盘（只读时不动文件）', readPos().schema === 3, String(readPos().schema))
  check('迁移时**一次**账本请求都不发', posCalls() === 0 && accountCalls() === 0 && timeShareCalls() === 0,
    `pos=${posCalls()} acct=${accountCalls()} share=${timeShareCalls()}`)
}

/* ---------------- 2. 空表 + 手工录入（无凭据） ---------------- */
section('2. 清空后手工录入：没有账本 Cookie 也能算')
{
  fs.unlinkSync(path.join(SHARED_DIR, 'positions.json'))
  resetCounts()
  const empty = await data('positions.get', {})
  check('空表不报错（configured=true）', empty.configured === true && Array.isArray(empty.rows) && empty.rows.length === 0, JSON.stringify(empty))
  check('空表合计全 null', empty.totals.value === null && empty.totals.day_profit === null, JSON.stringify(empty.totals))
  check('空表不打上游', quoteCalls() === 0 && posCalls() === 0, `quote=${quoteCalls()} pos=${posCalls()}`)

  const d = await data('positions.save', { row: { code: '600519', qty: 100, cost: 1201.3 } })
  const r = row(d, '600519')
  check('保存成功并回传视图', d.rows.length === 1 && r !== null, JSON.stringify(d.rows))
  check('名称留空时用行情补（贵州茅台）', r.name === '贵州茅台', String(r.name))
  check('现价 1304.66', r.price === 1304.66, String(r.price))
  check('市值 = 1304.66×100', r.value === 130466, String(r.value))
  check('持仓盈亏 = 130466 − 120130', r.hold_profit === 10336, String(r.hold_profit))
  check('持仓收益率 8.604%', r.hold_rate === 8.604, String(r.hold_rate))
  check('当日盈亏 =（1304.66−1250）×100 = 5466', r.day_profit === 5466, String(r.day_profit))
  check('当日涨跌幅 = 1304.66/1250−1 = 4.3728%', Math.abs(r.day_rate - 4.3728) < 1e-9, String(r.day_rate))
  check('合计：市值/当日/持仓', d.totals.value === 130466 && d.totals.day_profit === 5466 && d.totals.hold_profit === 10336,
    JSON.stringify(d.totals))
  check('合计的当日涨跌幅基数 = 昨收市值 125000', d.totals.day_base === 125000, String(d.totals.day_base))
  check('录入全程 0 次账本请求', posCalls() === 0 && accountCalls() === 0 && timeShareCalls() === 0,
    `pos=${posCalls()} acct=${accountCalls()} share=${timeShareCalls()}`)
}

/* ---------------- 3. 落盘形状：派生值绝不落盘 ---------------- */
section('3. positions.json 只存输入字段')
{
  const p = readPos()
  check('schema=4', p.schema === 4, String(p.schema))
  check('updated_at 有值', typeof p.updated_at === 'string' && p.updated_at.length > 10, String(p.updated_at))
  check('行内只有 code/name/qty/cost', JSON.stringify(Object.keys(p.rows[0]).sort()) === JSON.stringify(['code', 'cost', 'name', 'qty']),
    JSON.stringify(Object.keys(p.rows[0])))
  check('没有 price / value / day_profit 落盘', p.rows[0].price === undefined && p.rows[0].value === undefined && p.rows[0].day_profit === undefined)
}

/* ---------------- 4. 改股数 / 改代码 / 重名 / 删除 ---------------- */
section('4. 编辑：改股数、改代码、重名拒绝、删除')
{
  const up = await data('positions.save', { row: { code: '600519', qty: 200, cost: 1201.3 }, originalCode: '600519' })
  check('改股数后 1 行（不新增）', up.rows.length === 1, JSON.stringify(up.rows.map(r => r.code)))
  check('股数 200、当日盈亏随之翻倍', up.rows[0].qty === 200 && up.rows[0].day_profit === 10932, JSON.stringify(up.rows[0]))
  check('写盘也是 200', readPos().rows[0].qty === 200, String(readPos().rows[0].qty))

  // 名称：用户填的优先，不被行情覆盖
  const named = await data('positions.save', { row: { code: '600519', name: '茅台(自定义)', qty: 200, cost: 1201.3 } })
  check('用户填的名称不被行情覆盖', named.rows[0].name === '茅台(自定义)', String(named.rows[0].name))

  const second = await data('positions.save', { row: { code: '000001', qty: 500, cost: 11.0 } })
  check('加第二只', second.rows.length === 2, JSON.stringify(second.rows.map(r => r.code)))

  // 把 000001 改成已存在的 600519 → 必须拒绝，否则两行同代码会让「按代码合并」失效
  const err = await expectFail('positions.save', { row: { code: '600519', qty: 1, cost: 1 }, originalCode: '000001' })
  check('改成已存在的代码被拒绝', err.indexOf('已在持仓里') >= 0, err)
  check('拒绝时表没被改坏', readPos().rows.length === 2, String(readPos().rows.length))

  const moved = await data('positions.save', { row: { code: '000002', name: '万科A', qty: 500, cost: 11 }, originalCode: '000001' })
  check('改代码（000001 → 000002）', moved.rows.length === 2 && row(moved, '000002') !== null && row(moved, '000001') === null,
    JSON.stringify(moved.rows.map(r => r.code)))

  const del = await data('positions.remove', { code: '000002' })
  check('删除成功', del.rows.length === 1 && row(del, '000002') === null, JSON.stringify(del.rows.map(r => r.code)))
  const delErr = await expectFail('positions.remove', { code: '不存在' })
  check('删不存在的代码报错', delErr.indexOf('没有') >= 0, delErr)
}

/* ---------------- 5. 边界：qty 0 / 负数 / 缺失 ---------------- */
section('5. 边界：股数 0 合法、负数收敛、缺失拒绝')
{
  const zero = await data('positions.save', { row: { code: '601216', name: '君正集团', qty: 0, cost: 4.713 } })
  const z = row(zero, '601216')
  check('qty=0 允许（= 已清仓记录）', z !== null && z.qty === 0, JSON.stringify(z))
  check('qty=0 不计入合计', zero.totals.held === 1, 'held=' + zero.totals.held)
  check('qty=0 的当日盈亏是 0（不是 null）', z.day_profit === 0, String(z.day_profit))

  const neg = await data('positions.save', { row: { code: '601216', qty: -5, cost: 4.713 } })
  check('负股数收敛到 0', row(neg, '601216').qty === 0, String(row(neg, '601216').qty))

  const missing = await expectFail('positions.save', { row: { code: '601216', cost: 1 } })
  check('股数缺失被拒绝', missing.indexOf('股数') >= 0, missing)
  const noCode = await expectFail('positions.save', { row: { qty: 1 } })
  check('代码缺失被拒绝', noCode.indexOf('代码') >= 0, noCode)

  // cost 允许缺失：有股数但不知道成本 → 持仓盈亏给 null，不假装 0
  const noCost = await data('positions.save', { row: { code: '601216', name: '君正集团', qty: 5000 } })
  const nc = row(noCost, '601216')
  check('成本缺失 → 持仓盈亏 null', nc.cost === null && nc.hold_profit === null, JSON.stringify(nc))
  check('成本缺失不影响当日盈亏', nc.day_profit === -700, String(nc.day_profit))
  await data('positions.remove', { code: '601216' })
}

/* ---------------- 6. 行情失败：持仓不受影响 ---------------- */
section('6. 行情挂了：持仓照常，当日盈亏留空')
{
  mode = 'quotefail'
  const d = await data('positions.get', { force: true })
  const r = row(d, '600519')
  check('持仓行还在（1 行）', d.rows.length === 1, JSON.stringify(d.rows.map(x => x.code)))
  check('股数/成本不受影响', r.qty === 200 && r.cost === 1201.3, JSON.stringify({ qty: r.qty, cost: r.cost }))
  check('现价与当日盈亏为 null（不假装 0）', r.price === null && r.day_profit === null, JSON.stringify({ price: r.price, day: r.day_profit }))
  check('当日涨跌幅也不摆出来', r.day_rate === null, String(r.day_rate))
  check('合计标记缺数（missing=1）', d.totals.missing === 1, String(d.totals.missing))
  check('行情失败时合计不编 0', d.totals.day_profit === null && d.totals.value === null, JSON.stringify(d.totals))
  mode = 'ok'
  const back = await data('positions.get', { force: true })
  check('行情恢复后当日盈亏回来', row(back, '600519').day_profit === 10932, String(row(back, '600519').day_profit))
}

/* ---------------- 7. 合计 = 逐行取整后相加 ---------------- */
section('7. 合计口径：逐行取整后相加（用户真的会去加）')
{
  // 构造两只带零头的：0.509×18400 = 9365.6、4.61×5000 = 23050，逐行取整后相加必须等于合计
  await data('positions.save', { row: { code: '159865', name: '养殖ETF', qty: 18400, cost: 0.543 } })
  const d = await data('positions.get', { force: true })
  const sumDay = d.rows.reduce((s, r) => s + (r.day_profit === null ? 0 : r.day_profit), 0)
  const sumValue = d.rows.reduce((s, r) => s + (r.value === null ? 0 : r.value), 0)
  check('合计当日盈亏 == 各行显示值之和', Math.abs(d.totals.day_profit - sumDay) < 1e-9, `${d.totals.day_profit} vs ${sumDay}`)
  check('合计市值 == 各行显示值之和', Math.abs(d.totals.value - sumValue) < 1e-9, `${d.totals.value} vs ${sumValue}`)
  await data('positions.remove', { code: '159865' })
}

/* ---------------- 8. 节奏：poll_ms / next_poll_ms ---------------- */
section('8. 节奏：宿主回传 poll_ms / next_poll_ms')
{
  const d = await data('positions.get', {})
  check('默认 30 秒', d.poll_ms === 30000, String(d.poll_ms))
  check('next_poll_ms 是正数', typeof d.next_poll_ms === 'number' && d.next_poll_ms > 0, String(d.next_poll_ms))
  check('session 字段存在', typeof d.session === 'string' && d.session.length > 0, String(d.session))

  const saved = await data('pnl.config', { pollSec: 120 })
  check('pollSec=120 生效', saved.poll_ms === 120000, String(saved.poll_ms))
  const d2 = await data('positions.get', {})
  check('视图回传新间隔', d2.poll_ms === 120000, String(d2.poll_ms))
  const clamped = await data('pnl.config', { pollSec: 1 })
  check('过小的间隔被夹到 5 秒', clamped.poll_ms === 5000, String(clamped.poll_ms))
  await data('pnl.config', { pollSec: 30 })
}

/* ---------------- 9. 账本同步：merge ---------------- */
section('9. 从账本同步（merge）：只在用户点击时打账本')
{
  // 先放一只「账本里没有」的本地持仓，验证合并时它被保留并出现在报告里
  await data('positions.save', { row: { code: '159865', name: '养殖ETF', qty: 18400, cost: 0.543 } })
  resetCounts()
  const cfg = await data('pnl.config', { cookie: 'userid=U1; v=abc' })
  check('存 Cookie 并校验通过', cfg.ok === true && cfg.valid === true, JSON.stringify(cfg))
  check('校验只打 account_list（校验 + 探组合各一次）', accountCalls() === 2 && posCalls() === 0, `acct=${accountCalls()} pos=${posCalls()}`)

  const d = await data('positions.sync', {})
  check('同步成功', d.ok === true, JSON.stringify(d.error))
  check('打了 1 次 stock_position', posCalls() === 1, String(posCalls()))
  check('顺带取 1 次账户级今日盈亏', timeShareCalls() === 1, String(timeShareCalls()))
  const rep = d.report
  check('报告：更新 600519', rep.updated.indexOf('600519') >= 0, JSON.stringify(rep))
  check('报告：新增 00700 与 000983', rep.added.indexOf('00700') >= 0 && rep.added.indexOf('000983') >= 0, JSON.stringify(rep.added))
  check('报告：已清仓的不新增（603866）', row(d.view, '603866') === null, JSON.stringify(d.view.rows.map(r => r.code)))
  check('本地独有（159865）被保留并报告', row(d.view, '159865') !== null && rep.kept.indexOf('159865') >= 0, JSON.stringify(rep.kept))
  check('账本的 count 进了本地 qty（1500）', row(d.view, '000983').qty === 1500, String(row(d.view, '000983').qty))
  check('账本的摊薄成本进了本地 cost（6.633）', row(d.view, '000983').cost === 6.633, String(row(d.view, '000983').cost))
  check('账本派生值没进本地（无 price 落盘）', readPos().rows.every(r => r.price === undefined))
  check('云端矩阵写进 cloud.summary', d.view.cloud && d.view.cloud.summary && d.view.cloud.summary.total_asset === 574940.39,
    JSON.stringify(d.view.cloud && d.view.cloud.summary))
  check('账户级今日盈亏另存（-2182.2）', d.view.cloud.account && d.view.cloud.account.pnl_yk === -2182.2, JSON.stringify(d.view.cloud && d.view.cloud.account))
  check('cloud.synced_at 有值', typeof d.view.cloud.synced_at === 'string' && d.view.cloud.synced_at.length > 10)

  // 同步后当日盈亏仍然由行情现算，不是账本给的
  const q = row(d.view, '000983')
  check('同步后当日盈亏 =（6.22−6.45）×1500 = -345', q.day_profit === -345, String(q.day_profit))
}

/* ---------------- 10. 同步失败：一个字段都不碰 ---------------- */
section('10. 同步失败（403）：本地持仓与当日盈亏完全不受影响')
{
  const before = readPos()
  for (const m of ['403', 'expired403', '401', 'apierr']) {
    mode = m
    const r = await rpc('positions.sync', {})
    check('[' + m + '] 同步失败但 RPC 正常返回', r.json && r.json.ok === true, JSON.stringify(r.json && r.json.error))
    const d = r.json.data
    check('[' + m + '] ok=false', d.ok === false, String(d.ok))
    check('[' + m + '] 持仓行数不变', d.view.rows.length === before.rows.length, `${d.view.rows.length} vs ${before.rows.length}`)
    check('[' + m + '] 当日盈亏照常算出来', d.view.totals.day_profit !== null, JSON.stringify(d.view.totals))
    const after = readPos()
    check('[' + m + '] 落盘的行没被改', JSON.stringify(after.rows) === JSON.stringify(before.rows))
    check('[' + m + '] cloud.error 有值', typeof after.cloud.error === 'string' && after.cloud.error.length > 0, String(after.cloud.error))
    check('[' + m + '] 保留上次成功同步时间', after.cloud.synced_at === before.cloud.synced_at, `${after.cloud.synced_at} vs ${before.cloud.synced_at}`)
    // 403 的分类沿用原来的判据：HTML 通用页 → blocked（原因不唯一）；401 / 403+JSON → 会话失效
    check('[' + m + '] blocked 标记正确', after.cloud.blocked === (m === '403'), String(after.cloud.blocked))
    check('[' + m + '] token_expired 标记正确', after.cloud.token_expired === (m === '401' || m === 'expired403'), String(after.cloud.token_expired))
  }
  mode = 'ok'
}

/* ---------------- 11. replace 模式 ---------------- */
section('11. replace 模式：以账本为准整表替换')
{
  const d = await data('positions.sync', { mode: 'replace' })
  const codes = d.view.rows.map(r => r.code).sort()
  check('整表 = 账本（600519/000983/00700），不含已清仓 603866', JSON.stringify(codes) === JSON.stringify(['000983', '00700', '600519']), JSON.stringify(codes))
  check('报告 mode=replace', d.report.mode === 'replace', String(d.report.mode))
  check('本地独有的 000002 被替换掉', row(d.view, '000002') === null)
  const p = readPos()
  check('写盘 3 行', p.rows.length === 3, String(p.rows.length))
}

/* ---------------- 12. 未配置 Cookie 时一切照常 ---------------- */
section('12. 清掉凭据后：本地持仓与实时盈亏照常')
{
  const cleared = await data('pnl.config', { clear: true })
  check('凭据已清', cleared.configured === false, JSON.stringify(cleared))
  check('清凭据不动本地持仓', readPos().rows.length === 3, String(readPos().rows.length))
  resetCounts()
  const d = await data('positions.get', { force: true })
  check('没有 Cookie 也能取视图', d.rows.length === 3, String(d.rows.length))
  check('当日盈亏照常', d.totals.day_profit !== null, JSON.stringify(d.totals))
  check('get 不打任何账本接口', posCalls() === 0 && accountCalls() === 0 && timeShareCalls() === 0,
    `pos=${posCalls()} acct=${accountCalls()} share=${timeShareCalls()}`)
  const err = await expectFail('positions.sync', {})
  check('没有 Cookie 时同步报错（但只是同步）', err.indexOf('Cookie') >= 0, err)
}

/* ---------------- 13. 损坏 / 未来结构 ---------------- */
section('13. 坏文件 / 未知结构：退化成空表，不炸')
{
  const f = path.join(SHARED_DIR, 'positions.json')
  fs.writeFileSync(f, '{ this is not json', 'utf8')
  const d1 = await data('positions.get', {})
  check('坏 JSON → 空表', Array.isArray(d1.rows) && d1.rows.length === 0, JSON.stringify(d1.rows))
  fs.writeFileSync(f, JSON.stringify({ schema: 99, rows: [{ code: '600519', qty: 1, cost: 2 }] }), 'utf8')
  const d2 = await data('positions.get', {})
  check('未知 schema → 仍能读出行（按当前口径归一）', d2.rows.length === 1 && d2.rows[0].qty === 1, JSON.stringify(d2.rows))
  check('未知 schema 标记 migrated_from', d2.migrated_from === 99, String(d2.migrated_from))
}

console.log('\n' + (failures.length ? '  ✗ ' + failures.length + ' 项失败 / ' : '全部通过 · ') + total + ' 项检查')
if (failures.length) {
  for (const f of failures) console.log('   - ' + f)
  process.exit(1)
}

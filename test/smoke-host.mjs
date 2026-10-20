#!/usr/bin/env node
/**
 * dsh-xueqiu-debug 宿主侧冒烟测试 —— 零依赖，只用 Node 内置模块。
 *
 *   cd plugins/dsh-xueqiu-debug && node test/smoke-host.mjs
 *
 * 退出码：0 = 全部通过；非 0 = 有断言失败。输出风格 `  ✓ ...` / `  ✗ ...` + 末尾汇总。
 *
 * 为什么只断言这些：src/index.js 即将被大规模重构（拆文件、改内部结构），
 * 所以本文件刻意**只锁对外契约**，不碰任何内部符号（闭包内变量、函数名、文件划分）：
 *
 *   1) cordis 插件形状：export default { inject: ['timer'], apply(ctx) }
 *   2) 两条互斥的环境路径各跑一遍 apply：
 *        · 静态安装（无 globalThis.harness）
 *            ctx.inject(['webServer'], cb) → webServer.register({ kind:'prefix', path:'/xq-rpc', handler })
 *            ctx.inject(['tools'],     cb) → tools.register(spec) × 7
 *        · 动态运行时（注入假 globalThis.harness）
 *            harness.handle('xq.call', fn)
 *            harness.registerTool(ctx, harness.defineTool(spec)) × 7
 *   3) 7 个 Agent 工具的注册名 / JSON Schema 根 / output / execute(null) 兜底
 *   4) RPC 契约：通道名 xq.call；/xq-rpc 的回环 Host 栅栏、Origin 同源栅栏、
 *      未知 action、ui.get / ui.set / debug / watchlist.get 的响应包络
 *   5) 今日盈亏 RPC（pnl.get / pnl.verify / pnl.config）：未配置不发请求、
 *      **磁盘无快照时必拉一次**、force 跳过 shouldFetch、pollSec 越界钳制、
 *      与旧插件 dsh-ths-pnl 共用状态文件（config.json / snapshot.json 分离）
 *   6) 状态文件隔离：全程只写临时目录，不碰真实 $DSH_HOME，也不往仓库里掉 .xueqiu-*.json
 *
 * 安全：ctx.get('shell') 是**只会抛错**的假对象 —— 任何真实 shell / 网络都不会发生；
 *       ctx.get('fs') 是带监牢检查的真 fs 外壳 —— 越界路径一律抛错。
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/* ------------------------------------------------------------------ *
 * 0. 硬隔离：先搭好临时世界，再 import 插件
 * ------------------------------------------------------------------ */

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PLUGIN_DIR = path.resolve(HERE, '..')
const REPO_ROOT = path.resolve(PLUGIN_DIR, '..', '..')
const TMP_ROOT = path.join(REPO_ROOT, 'tmp', 'refactor-xueqiu')
const SMOKE_HOME = path.join(TMP_ROOT, 'smoke-home') // 假 $DSH_HOME
const WORK_DIR = path.join(TMP_ROOT, 'work') // 假 cwd / 假 sandboxPolicy.workspaceRoot
const STATE_DIR = path.join(SMOKE_HOME, 'dsh-xueqiu') // 插件状态文件应在的落点
const JAIL = path.resolve(TMP_ROOT) // 假 fs 的写白名单
const REAL_XQ_HOME = path.join(os.homedir(), '.dsh', 'dsh-xueqiu')
const STATE_FILE_RE = /^\.xueqiu-.*\.json$/

const failures = []
let total = 0

function check(name, cond, detail) {
  total++
  if (cond) console.log('  ✓ ' + name)
  else {
    failures.push(name)
    console.log('  ✗ ' + name + (detail === undefined || detail === '' ? '' : ' :: ' + detail))
  }
}
function section(title) {
  console.log('\n' + title)
}

/* ------------------------------------------------------------------ *
 * 1. 工具：假 fs / 假 shell / 假 ctx / 假 req-res
 * ------------------------------------------------------------------ */

const timers = new Set()
function clearTimers() {
  for (const t of timers) clearTimeout(t)
  timers.clear()
}

function inJail(p) {
  const abs = path.resolve(String(p))
  return abs === JAIL || abs.startsWith(JAIL + path.sep)
}

/** 真 fs 的监牢外壳：只允许临时目录，越界一律抛错（插件内部对 fs 失败都有兜底）。 */
function makeFsStub() {
  return {
    async resolve(p, opts) {
      const cwd = opts && opts.cwd ? String(opts.cwd) : WORK_DIR
      const abs = path.resolve(cwd, String(p))
      if (!inJail(abs)) throw new Error('[smoke] fs.resolve 越界被拒: ' + abs)
      return abs
    },
    async readText(p) {
      if (!inJail(p)) throw new Error('[smoke] fs.readText 越界被拒: ' + p)
      return fs.readFileSync(p, 'utf8') // 不存在 → ENOENT 抛错，插件内部 catch
    },
    async writeText(p, text) {
      const abs = path.resolve(String(p))
      if (!inJail(abs)) throw new Error('[smoke] fs.writeText 越界被拒: ' + abs)
      fs.mkdirSync(path.dirname(abs), { recursive: true })
      fs.writeFileSync(abs, String(text))
    },
  }
}

function makeCtx(opts) {
  const o = opts || {}
  const rec = {
    injectNames: [],
    effectCalls: 0,
    getNames: [],
    toolSpecs: [],
    routes: [],
    shellResolve: [],
    shellRun: [],
    shellRunSpecs: [],   // 脚本化回放时真正"发出去"的 shell spec
    disposers: [],       // ctx.effect 返回的回收函数（pnl 定时器清理用）
    effectLabels: [],    // ctx.effect 的标签（用于断言"某个模块还挂没挂后台副作用"）
    timers: [],          // manualTimers 模式下排过的定时器（永不自动触发）
    timerStops: [],      // manualTimers 模式下被停止函数清掉的定时器间隔
  }
  // 默认假 shell 只会抛错（零网络保证）；显式传 opts.shellResponses 时改成"脚本回放"。
  const responses = Array.isArray(o.shellResponses) ? o.shellResponses.slice() : null
  const shell = {
    resolve(spec) {
      rec.shellResolve.push(String((spec && spec.command) || ''))
      return { __smokeStub: true, command: String((spec && spec.command) || '') }
    },
    run() {
      // DSH 0.2 起 shell 服务没有 run()（改名 execute）：插件若退回旧 API，这里要炸得很响。
      throw new Error('[smoke] shell.run 已不存在（DSH 0.2 起改名 execute）：插件仍在调用旧 API')
    },
    execute(spec) {
      const command = String((spec && spec.command) || '')
      rec.shellRun.push(command)
      let value
      if (responses) {
        // 回放预置 stdout：形如 `body\n__HTTP__200`，与真实 curl -w 输出同形
        if (responses.length === 0) throw new Error('[smoke] shell 脚本用尽：出现了预期外的请求')
        const next = responses.shift() || {}
        rec.shellRunSpecs.push(spec)
        value = {
          exitCode: next.exitCode === undefined ? 0 : next.exitCode,
          stdout: { text: String(next.text === undefined ? '' : next.text) },
        }
      } else {
        throw new Error('[smoke] shell.execute 被拦截：测试内禁止真实 shell / 网络')
      }
      // 0.2 的 execute 返回「执行句柄」；前台执行 = await handle.result()（与真实 pwsh/bash 执行器同形）
      return { result: async function () { return value } }
    },
  }
  const provided = {
    shell,
    fs: makeFsStub(),
    sandboxPolicy: { workspaceRoot: WORK_DIR },
  }

  function effect(fn, label) {
    rec.effectCalls++
    if (label) rec.effectLabels.push(String(label))
    const dispose = fn()
    if (typeof dispose === 'function') {
      rec.disposers.push(dispose) // 记下来：收尾时可显式回收
      return dispose
    }
    return () => {}
  }

  const ctx = {
    timeout(cb, ms) {
      // manualTimers：不排真定时器，只登记 + 返回停止函数 —— 让用例完全确定，
      // 不会有后台轮询在断言进行到一半时突然触发。
      // manualTimersMinMs：**短于这个阈值**的定时器仍走真定时器 —— 请求调度闸门（gate.js）
      // 用 100ms 的最小间隔做节流，如果连它也被"只登记不触发"，请求就会永远等下去。
      if (o.manualTimers && ms >= (o.manualTimersMinMs === undefined ? 0 : o.manualTimersMinMs)) {
        const entry = { cb: cb, ms: ms, live: true }
        rec.timers.push(entry)
        return () => {
          if (entry.live) {
            entry.live = false
            rec.timerStops.push(ms)
          }
        }
      }
      const t = setTimeout(() => {
        timers.delete(t)
        cb()
      }, ms)
      timers.add(t)
      return () => {
        if (timers.delete(t)) clearTimeout(t)
      }
    },
    effect,
    get(name) {
      rec.getNames.push(name)
      return provided[name]
    },
    inject(names, cb) {
      const list = Array.isArray(names) ? names.slice() : [names]
      rec.injectNames.push(list)
      const sub = Object.create(ctx)
      sub.effect = effect
      if (list.indexOf('webServer') >= 0) {
        sub.webServer = {
          register(def) {
            rec.routes.push(def)
            return () => {}
          },
        }
      }
      if (list.indexOf('tools') >= 0) {
        sub.tools = {
          register(spec) {
            rec.toolSpecs.push(spec)
            return () => {}
          },
        }
      }
      cb(sub)
    },
    logger: { info() {}, warn() {}, error() {}, debug() {} },
  }
  return { ctx, rec }
}

/** 假 req：headers + 异步可迭代 body（路由用 `for await (const c of req)` 读体）。 */
function makeReq(opts) {
  const o = opts || {}
  const raw = o.body === undefined || o.body === null ? '' : String(o.body)
  const buf = Buffer.from(raw, 'utf8')
  return {
    method: o.method || 'POST',
    url: o.url || '/xq-rpc',
    headers: o.headers || {},
    async *[Symbol.asyncIterator]() {
      if (buf.length) yield buf
    },
  }
}

function callRoute(handler, req, timeoutMs) {
  return new Promise((resolve) => {
    let done = false
    let timer = null
    const finish = (res) => {
      if (done) return
      done = true
      if (timer) {
        timers.delete(timer)
        clearTimeout(timer)
      }
      resolve(res)
    }
    timer = setTimeout(() => {
      finish({ statusCode: 0, headers: null, body: '[smoke] handler 超时未响应', timedOut: true })
    }, timeoutMs || 8000)
    timers.add(timer)
    const res = {
      statusCode: 0,
      headers: null,
      body: '',
      writeHead(code, headers) {
        this.statusCode = code
        this.headers = headers || null
      },
      end(b) {
        this.body = b === undefined || b === null ? '' : String(b)
        finish(this)
      },
    }
    Promise.resolve()
      .then(() => handler(req, res))
      .catch((e) => {
        res.statusCode = 0
        res.body = '[smoke] handler 抛错: ' + String((e && e.stack) || e)
        finish(res)
      })
  })
}

function jsonOf(res) {
  try {
    return JSON.parse(res.body)
  } catch (e) {
    return null
  }
}

/* ------------------------------------------------------------------ *
 * 2. 隔离基线（写任何东西之前先留底）
 * ------------------------------------------------------------------ */

function listStateFiles(dir) {
  if (!fs.existsSync(dir)) return []
  try {
    return fs.readdirSync(dir).filter((n) => STATE_FILE_RE.test(n)).sort()
  } catch (e) {
    return []
  }
}
function snapshotDir(dir) {
  if (!fs.existsSync(dir)) return null
  const out = {}
  try {
    for (const n of fs.readdirSync(dir).sort()) {
      try {
        out[n] = fs.statSync(path.join(dir, n)).size
      } catch (e) {
        out[n] = -1
      }
    }
  } catch (e) {
    return null
  }
  return out
}
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b)

const baseline = {
  repo: listStateFiles(REPO_ROOT),
  plugin: listStateFiles(PLUGIN_DIR),
  realHome: snapshotDir(REAL_XQ_HOME),
}

// 只清自己的临时子目录（tmp/refactor-xueqiu 下可能有别人的产物）
fs.rmSync(SMOKE_HOME, { recursive: true, force: true })
fs.rmSync(WORK_DIR, { recursive: true, force: true })
fs.mkdirSync(SMOKE_HOME, { recursive: true })
fs.mkdirSync(WORK_DIR, { recursive: true })
process.env.DSH_HOME = SMOKE_HOME
process.chdir(WORK_DIR)

console.log('dsh-xueqiu-debug 宿主冒烟测试')
console.log('  假 DSH_HOME : ' + SMOKE_HOME)
console.log('  假工作目录  : ' + WORK_DIR)
console.log('  被测源码    : ' + path.join(PLUGIN_DIR, 'src', 'index.js'))

const mod = await import(pathToFileURL(path.join(PLUGIN_DIR, 'src', 'index.js')).href)
const plugin = mod.default

const EXPECTED_TOOLS = ['xueqiu_quote', 'xueqiu_kline', 'xueqiu_search', 'xueqiu_hot', 'xueqiu_news', 'xueqiu_kol', 'xueqiu_display']
const EXPECTED_WATCHLIST = ['SH600519', 'SZ300750', 'SZ002594', 'SH601318', '00700', 'AAPL']
const HOST = { host: '127.0.0.1:3080' }
const SAME_ORIGIN = { host: '127.0.0.1:3080', origin: 'http://127.0.0.1:3080' }

function checkToolSpecs(label, specs) {
  check(label + '：恰好注册 7 个工具', specs.length === 7, '实际 ' + specs.length)
  const names = specs.map((s) => (s && s.name) || null)
  check(label + '：name 精确等于 7 个契约名（含注册顺序）', sameJson(names, EXPECTED_TOOLS), JSON.stringify(names))
  const bad = []
  for (const s of specs) {
    if (!s || typeof s !== 'object') {
      bad.push('存在非对象 spec')
      continue
    }
    const n = s.name || '?'
    if (typeof s.description !== 'string' || !s.description.trim()) bad.push(n + ': description 非空字符串')
    const p = s.parameters
    if (!p || typeof p !== 'object' || p.type !== 'object') bad.push(n + ': parameters 不是 JSON Schema 根(type=object)')
    else {
      const props = p.properties
      if (!props || typeof props !== 'object' || Object.keys(props).length === 0) bad.push(n + ': parameters.properties 为空')
      else if (Object.keys(props).some((k) => !props[k] || typeof props[k].type !== 'string')) bad.push(n + ': 有属性缺 type')
      if (!Array.isArray(p.required)) bad.push(n + ': parameters.required 不是数组')
      else if (props && Object.keys(props).length) {
        const missing = p.required.filter((r) => !(r in props))
        if (missing.length) bad.push(n + ': required 未在 properties 声明 ' + missing.join(','))
      }
    }
    if (typeof s.execute !== 'function') bad.push(n + ': execute 不可调用')
    if (!s.output || typeof s.output !== 'object' || !s.output.schema || s.output.schema.type !== 'string' || typeof s.output.render !== 'function') {
      bad.push(n + ': output 形状不合(schema/render)')
    }
    if (typeof s.timeoutMs !== 'number' || !(s.timeoutMs > 0)) bad.push(n + ': timeoutMs 非正数')
  }
  check(label + '：每个工具的 description / parameters / output / execute 形状合规', bad.length === 0, bad.join('; '))
}

try {
  /* ---------------------------------------------------------------- *
   * 3. 插件形状
   * ---------------------------------------------------------------- */
  section('[1] cordis 插件形状')
  check('default 导出是 { inject, apply }', Boolean(plugin) && typeof plugin.apply === 'function' && Array.isArray(plugin.inject))
  check('inject 精确等于 [timer]', sameJson(plugin.inject, ['timer']), JSON.stringify(plugin.inject))
  check('模块命名空间只有 default 导出', sameJson(Object.keys(mod).sort(), ['default']), JSON.stringify(Object.keys(mod)))

  /* ---------------------------------------------------------------- *
   * 4. 静态路径：apply → webServer 路由 + tools 注册
   * ---------------------------------------------------------------- */
  section('[2] 静态路径（无 globalThis.harness）')
  check('前置：globalThis.harness 不存在', typeof globalThis.harness === 'undefined')
  const stat = makeCtx()
  plugin.apply(stat.ctx)

  check('inject 依赖面 = [webServer, tools]', sameJson(stat.rec.injectNames.map((n) => n.join('+')).sort(), ['tools', 'webServer']), JSON.stringify(stat.rec.injectNames))
  check('注册动作发生在 ctx.effect 内（可回收）', stat.rec.effectCalls >= 2, 'effectCalls=' + stat.rec.effectCalls)

  const route = stat.rec.routes[0]
  check('webServer.register 恰好一次', stat.rec.routes.length === 1, '实际 ' + stat.rec.routes.length)
  check('路由 kind 精确等于 prefix', route && route.kind === 'prefix', route && String(route.kind))
  check('路由 path 精确等于 /xq-rpc', route && route.path === '/xq-rpc', route && String(route.path))
  check('路由带可调用 handler', Boolean(route) && typeof route.handler === 'function')
  checkToolSpecs('静态 tools.register', stat.rec.toolSpecs)

  const handler = route.handler
  const rpc = (headers, payload, opts) =>
    callRoute(handler, makeReq(Object.assign({ headers, body: typeof payload === 'string' ? payload : JSON.stringify(payload) }, opts || {})))

  /* ---------------------------------------------------------------- *
   * 5. 动态路径：apply → harness.handle + harness.registerTool
   * ---------------------------------------------------------------- */
  section('[3] 动态路径（注入假 globalThis.harness）')
  const dyn = makeCtx()
  const hrec = { handles: [], defined: [], registered: [] }
  globalThis.harness = {
    handle(channel, fn) {
      hrec.handles.push({ channel, fn })
      return () => {}
    },
    defineTool(spec) {
      hrec.defined.push(spec)
      return spec
    },
    registerTool(ctx, spec) {
      hrec.registered.push({ ctx, spec })
      return () => {}
    },
  }
  try {
    plugin.apply(dyn.ctx)
  } finally {
    delete globalThis.harness
  }
  check('用例收尾：globalThis.harness 已删除（不污染其它用例）', typeof globalThis.harness === 'undefined')

  check('harness.handle 恰好注册一个通道', hrec.handles.length === 1, '实际 ' + hrec.handles.length)
  check('通道名精确等于 xq.call', hrec.handles[0] && hrec.handles[0].channel === 'xq.call', hrec.handles[0] && String(hrec.handles[0].channel))
  check('通道值是可调用函数（RPC 入口）', Boolean(hrec.handles[0]) && typeof hrec.handles[0].fn === 'function')
  check('harness.registerTool 调用 7 次', hrec.registered.length === 7, '实际 ' + hrec.registered.length)
  check('每个 spec 都先过 harness.defineTool', hrec.defined.length === 7, '实际 ' + hrec.defined.length)
  checkToolSpecs('动态 harness.registerTool', hrec.registered.map((r) => r.spec))
  check('动态路径不注册 webServer 路由（两路径互斥）', dyn.rec.routes.length === 0, '实际 ' + dyn.rec.routes.length)
  check('动态路径不使用 ctx.inject（两路径互斥）', dyn.rec.injectNames.length === 0, JSON.stringify(dyn.rec.injectNames))

  const callDynamic = hrec.handles[0].fn

  /* ---------------------------------------------------------------- *
   * 6. /xq-rpc 栅栏
   * ---------------------------------------------------------------- */
  section('[4] /xq-rpc 同源栅栏')
  const evilHost = await rpc({ host: 'evil.com', origin: 'http://evil.com' }, { action: 'debug' })
  check('非回环 Host → 403', evilHost.statusCode === 403, String(evilHost.statusCode))

  const rebind = await rpc({ host: '127.0.0.1:3080.evil.com', origin: 'http://127.0.0.1:3080.evil.com' }, { action: 'debug' })
  check('host 前缀伪造（DNS rebinding 形）→ 403', rebind.statusCode === 403, String(rebind.statusCode))

  const noOrigin = await rpc(HOST, { action: 'debug' })
  check('缺 Origin → 403', noOrigin.statusCode === 403, String(noOrigin.statusCode))

  const crossOrigin = await rpc({ host: '127.0.0.1:3080', origin: 'http://127.0.0.1:9999' }, { action: 'debug' })
  check('跨源 Origin（同主机异端口）→ 403', crossOrigin.statusCode === 403, String(crossOrigin.statusCode))

  // 源码放行 http/https 双 scheme（只要 host 部分与 Host 头逐字符一致）——反代/隧道形态，
  // 这里锁的就是这个「现状」：https Origin 对同一 Host 头是**允许**的，不是漏洞。
  const httpsOrigin = await rpc({ host: '127.0.0.1:3080', origin: 'https://127.0.0.1:3080' }, { action: 'debug' })
  check('同 host 头的 https Origin → 放行（反代形态，源码允许双 scheme）', httpsOrigin.statusCode === 200, String(httpsOrigin.statusCode))

  const nullOrigin = await rpc({ host: '127.0.0.1:3080', origin: 'null' }, { action: 'debug' })
  check('Origin: null（沙箱 iframe / file 页）→ 403', nullOrigin.statusCode === 403, String(nullOrigin.statusCode))

  const suffixOrigin = await rpc({ host: '127.0.0.1:3080', origin: 'http://127.0.0.1:3080.evil.com' }, { action: 'debug' })
  check('Origin 尾缀伪造（127.0.0.1:3080.evil.com）→ 403', suffixOrigin.statusCode === 403, String(suffixOrigin.statusCode))

  check('403 响应体是 forbidden 且未泄漏细节', evilHost.body === 'forbidden' && noOrigin.body === 'forbidden', JSON.stringify([evilHost.body, noOrigin.body]))

  const localhost = await rpc({ host: 'localhost:3080', origin: 'http://localhost:3080' }, { action: 'debug' })
  check('localhost 回环 + 同源 → 放行', localhost.statusCode === 200, String(localhost.statusCode))

  const v6 = await rpc({ host: '[::1]:3080', origin: 'http://[::1]:3080' }, { action: 'debug' })
  check('IPv6 回环 [::1]:3080 + 同源 → 放行（端口剥离不误伤）', v6.statusCode === 200, String(v6.statusCode))

  /* ---------------------------------------------------------------- *
   * 7. RPC 动作契约（全程无网络：只打内存 / 状态文件）
   * ---------------------------------------------------------------- */
  section('[5] RPC 动作契约（静态路径）')
  const unknown = await rpc(SAME_ORIGIN, { action: 'unknown.action' })
  const unknownJson = jsonOf(unknown)
  check('未知 action → 200 且 ok:false', unknown.statusCode === 200 && unknownJson && unknownJson.ok === false, unknown.statusCode + ' ' + unknown.body)
  check('未知 action 的 error 文案可用', Boolean(unknownJson) && typeof unknownJson.error === 'string' && unknownJson.error.length > 0, unknownJson && unknownJson.error)
  check('未知 action 不带 data 字段', Boolean(unknownJson) && unknownJson.data === undefined)

  const noAction = await rpc(SAME_ORIGIN, '')
  check('空 body → 200 且 ok:false（不抛不 500）', noAction.statusCode === 200 && jsonOf(noAction) && jsonOf(noAction).ok === false, noAction.statusCode + ' ' + noAction.body)

  const badJson = await rpc(SAME_ORIGIN, '{not json')
  check('非法 JSON body → 200 且 ok:false（不抛不 500）', badJson.statusCode === 200 && jsonOf(badJson) && jsonOf(badJson).ok === false, badJson.statusCode + ' ' + badJson.body)

  const tooBig = await rpc(SAME_ORIGIN, 'x'.repeat(1048577))
  check('body > 1MB → 413（OOM 防护）', tooBig.statusCode === 413, String(tooBig.statusCode))

  const uiGet = await rpc(SAME_ORIGIN, { action: 'ui.get' })
  const uiJson = jsonOf(uiGet)
  check('ui.get → 200 + ok:true + JSON 头', uiGet.statusCode === 200 && uiJson && uiJson.ok === true && /application\/json/.test((uiGet.headers && uiGet.headers['Content-Type']) || ''), uiGet.statusCode + ' ' + String(uiGet.headers && uiGet.headers['Content-Type']))
  check('ui.get 响应 no-store（不被中间层缓存）', Boolean(uiGet.headers) && uiGet.headers['Cache-Control'] === 'no-store', String(uiGet.headers && uiGet.headers['Cache-Control']))
  check('ui.get data 带 tab（合法白名单值）', Boolean(uiJson && uiJson.data) && ['market', 'hot', 'search', 'news'].indexOf(uiJson.data.tab) >= 0, JSON.stringify(uiJson && uiJson.data))
  check('ui.get data 带 open（布尔）', Boolean(uiJson && uiJson.data) && typeof uiJson.data.open === 'boolean', JSON.stringify(uiJson && uiJson.data && uiJson.data.open))
  check('ui.get data 带 dockH / badgeW / badgeCompact / badgePos 键', Boolean(uiJson && uiJson.data) && ['dockH', 'badgeW', 'badgeCompact', 'badgePos'].every((k) => k in uiJson.data), JSON.stringify(Object.keys((uiJson && uiJson.data) || {})))
  check('ui.get badgeCompact 默认 false（兼容旧状态文件）', Boolean(uiJson && uiJson.data) && uiJson.data.badgeCompact === false, JSON.stringify(uiJson && uiJson.data))

  const dbg = await rpc(SAME_ORIGIN, { action: 'debug' })
  const dbgJson = jsonOf(dbg)
  const dbgData = (dbgJson && dbgJson.data) || {}
  check('debug → 200 + ok:true', dbg.statusCode === 200 && dbgJson && dbgJson.ok === true, dbg.statusCode + ' ' + dbg.body)
  check('debug 带 running / cacheKeys / cookie 等排障键', ['running', 'waiters', 'inflight', 'cacheKeys', 'cookie', 'login'].every((k) => k in dbgData), JSON.stringify(Object.keys(dbgData)))
  check('debug 初值：无在途请求 & 无 cookie & 匿名', dbgData.running === 0 && dbgData.cacheKeys === 0 && Array.isArray(dbgData.inflight) && dbgData.inflight.length === 0 && dbgData.cookie === 'none' && dbgData.login === 'anonymous', JSON.stringify(dbgData))

  const wl = await rpc(SAME_ORIGIN, { action: 'watchlist.get' })
  const wlJson = jsonOf(wl)
  check('watchlist.get → 200 + ok:true + 默认自选列表', wl.statusCode === 200 && wlJson && wlJson.ok === true && sameJson(wlJson.data && wlJson.data.symbols, EXPECTED_WATCHLIST), wl.body)

  // 动态路径同款动作（同一条 dispatch，走 harness.handle 入口）
  const uiDyn = await callDynamic({ action: 'ui.get' })
  check('动态：ui.get → ok:true 且 data 带 tab/open', Boolean(uiDyn) && uiDyn.ok === true && Boolean(uiDyn.data) && typeof uiDyn.data.open === 'boolean' && typeof uiDyn.data.tab === 'string', JSON.stringify(uiDyn))
  const dbgDyn = await callDynamic({ action: 'debug' })
  check('动态：debug → ok:true 且带 running/cacheKeys/cookie', Boolean(dbgDyn) && dbgDyn.ok === true && ['running', 'cacheKeys', 'cookie'].every((k) => k in (dbgDyn.data || {})), JSON.stringify(dbgDyn))
  const unknownDyn = await callDynamic({ action: 'unknown.action' })
  check('动态：未知 action → ok:false（与 HTTP 路径同一语义）', Boolean(unknownDyn) && unknownDyn.ok === false && typeof unknownDyn.error === 'string', JSON.stringify(unknownDyn))
  const emptyDyn = await callDynamic(null)
  check('动态：入参为 null → ok:false（不抛 TypeError）', Boolean(emptyDyn) && emptyDyn.ok === false, JSON.stringify(emptyDyn))

  /* ---------------------------------------------------------------- *
   * 8. ui.set 往返 + 状态文件落点
   * ---------------------------------------------------------------- */
  section('[6] ui.set 往返 + 状态落点')
  const uiSet = await rpc(SAME_ORIGIN, { action: 'ui.set', args: { tab: 'news', dockH: 400, badgeCompact: true } })
  const uiSetJson = jsonOf(uiSet)
  check('ui.set → 200 + ok:true + data.ok:true', uiSet.statusCode === 200 && uiSetJson && uiSetJson.ok === true && uiSetJson.data && uiSetJson.data.ok === true, uiSet.body)
  const uiAfter = jsonOf(await rpc(SAME_ORIGIN, { action: 'ui.get' }))
  check('ui.set → ui.get 往返（含徽章折叠状态）', Boolean(uiAfter && uiAfter.data) && uiAfter.data.tab === 'news' && uiAfter.data.dockH === 400 && uiAfter.data.badgeCompact === true, JSON.stringify(uiAfter && uiAfter.data))

  // 行情隐身开关（FORK-NOTES §11）：宿主只负责存取，缺省必须是 false ——
  // 老状态文件里没有这个键，读成 true 会让所有人升级后瞬间「行情消失」。
  check('ui.get 带 hidden 且默认 false', Boolean(uiAfter && uiAfter.data) && uiAfter.data.hidden === false, JSON.stringify(uiAfter && uiAfter.data && uiAfter.data.hidden))
  const hiddenSet = jsonOf(await rpc(SAME_ORIGIN, { action: 'ui.set', args: { hidden: true } }))
  check('ui.set {hidden:true} → ok:true', Boolean(hiddenSet && hiddenSet.ok === true), JSON.stringify(hiddenSet))
  const hiddenAfter = jsonOf(await rpc(SAME_ORIGIN, { action: 'ui.get' }))
  check('ui.set {hidden:true} → ui.get 往返', Boolean(hiddenAfter && hiddenAfter.data) && hiddenAfter.data.hidden === true, JSON.stringify(hiddenAfter && hiddenAfter.data))

  const uiStatePath = path.join(STATE_DIR, '.xueqiu-ui-state.json')
  check('状态文件写在假 $DSH_HOME/dsh-xueqiu 下', fs.existsSync(uiStatePath), uiStatePath)
  if (fs.existsSync(uiStatePath)) {
    let saved = null
    try {
      saved = JSON.parse(fs.readFileSync(uiStatePath, 'utf8'))
    } catch (e) {
      saved = null
    }
    check('落盘内容与 ui.set 一致（含 badgeCompact）', Boolean(saved) && saved.tab === 'news' && saved.dockH === 400 && saved.badgeCompact === true, JSON.stringify(saved))
    // hidden 必须真的写进磁盘（刷新页面后仍隐身），而不是只活在内存里
    check('hidden 落盘为 true（刷新后仍然隐身）', Boolean(saved) && saved.hidden === true, JSON.stringify(saved))
  }
  const unhide = jsonOf(await rpc(SAME_ORIGIN, { action: 'ui.set', args: { hidden: false } }))
  const unhidden = jsonOf(await rpc(SAME_ORIGIN, { action: 'ui.get' }))
  check('ui.set {hidden:false} 能复位（false 不会被当成「未传」吞掉）', Boolean(unhide && unhide.ok === true) && Boolean(unhidden && unhidden.data) && unhidden.data.hidden === false, JSON.stringify(unhidden && unhidden.data))
  check('稳定目录探测文件 .write-probe 存在（未走工作区回退）', fs.existsSync(path.join(STATE_DIR, '.write-probe')))
  check('假工作区目录内没有 .xueqiu-* 文件（回退路径未启用）', listStateFiles(WORK_DIR).length === 0, JSON.stringify(listStateFiles(WORK_DIR)))

  /* ---------------------------------------------------------------- *
   * 9. 工具 execute 的空参数兜底（wrapToolSpec）+ 零网络证明
   * ---------------------------------------------------------------- */
  section('[7] 工具 execute 空参数兜底（不触网）')
  const specByName = {}
  for (const s of stat.rec.toolSpecs) specByName[s.name] = s

  const quietCalls = [
    ['xueqiu_quote', '{"status":null,"count":0,"list":[]}'],
    ['xueqiu_search', '{"count":0,"list":[]}'],
  ]
  for (const [name, expected] of quietCalls) {
    const spec = specByName[name]
    let out = null
    let err = null
    try {
      out = await spec.execute(null)
    } catch (e) {
      err = e
    }
    check('[' + name + '] execute(null) 返回空结果且不发网络', err === null && out === expected, err ? String(err.message) : String(out))
  }
  check('以上空入参调用零 shell 调用（证明未触网）', stat.rec.shellRun.length === 0, JSON.stringify(stat.rec.shellRun))

  // xueqiu_display：不传参数 = 只读（不改状态、不触网），传 hidden 才拨开关。
  const displaySpec = specByName['xueqiu_display']
  const readBack = await displaySpec.execute(null)
  const readJson = JSON.parse(readBack)
  check('xueqiu_display 空参数 → 只读（changed:false + hidden 布尔）', readJson.changed === false && typeof readJson.hidden === 'boolean', readBack)
  await displaySpec.execute({ hidden: true })
  check('xueqiu_display {hidden:true} → ui.get 立刻反映', jsonOf(await rpc(SAME_ORIGIN, { action: 'ui.get' })).data.hidden === true)
  const back = JSON.parse(await displaySpec.execute({ hidden: false }))
  check('xueqiu_display {hidden:false} → 拨回来（changed:true）', back.changed === true && back.hidden === false && jsonOf(await rpc(SAME_ORIGIN, { action: 'ui.get' })).data.hidden === false, JSON.stringify(back))
  check('xueqiu_display 全程不碰行情接口（零 shell 调用）', stat.rec.shellRun.length === 0, JSON.stringify(stat.rec.shellRun))

  for (const s of stat.rec.toolSpecs) {
    let err = null
    try {
      await s.execute(null)
    } catch (e) {
      err = e
    }
    check('[' + s.name + '] execute(null) 不抛 TypeError（wrapToolSpec 兜底）', !(err instanceof TypeError), err ? String(err.message) : 'ok')
  }
  check('触网工具确实被 shell 拦截（没有任何命令真的执行）', stat.rec.shellRun.length > 0 && stat.rec.shellRun.every((c) => typeof c === 'string'), '拦截 ' + stat.rec.shellRun.length + ' 次')
  check('拦截到的命令都是 curl 命令行（未走别的外呼通道）', stat.rec.shellRun.every((c) => /^curl(\.exe)?\s/.test(c)), JSON.stringify(stat.rec.shellRun.slice(0, 2)))

  const dbgEnd = jsonOf(await rpc(SAME_ORIGIN, { action: 'debug' }))
  const dbgEndData = (dbgEnd && dbgEnd.data) || {}
  check('失败请求后调度槽未泄漏（running=0 / inflight 空）', dbgEndData.running === 0 && Array.isArray(dbgEndData.inflight) && dbgEndData.inflight.length === 0, JSON.stringify(dbgEndData))

  /* ---------------------------------------------------------------- *
   * 10. 依赖面 + 隔离收尾
   * ---------------------------------------------------------------- */
  section('[8] 依赖面与隔离')
  const got = []
  for (const n of stat.rec.getNames.concat(dyn.rec.getNames)) if (got.indexOf(n) < 0) got.push(n)
  check('ctx.get 依赖面 ⊆ {shell, fs, sandboxPolicy}', got.length > 0 && got.every((n) => ['shell', 'fs', 'sandboxPolicy'].indexOf(n) >= 0), JSON.stringify(got))
  check('假工作目录仍在（chdir 未漂移）', path.resolve(process.cwd()) === path.resolve(WORK_DIR), process.cwd())
  check('DSH_HOME 未被测试改写', path.resolve(process.env.DSH_HOME) === path.resolve(SMOKE_HOME), String(process.env.DSH_HOME))

  check('仓库根未新增 .xueqiu-*.json', sameJson(listStateFiles(REPO_ROOT), baseline.repo), JSON.stringify(listStateFiles(REPO_ROOT)))
  check('插件目录未新增 .xueqiu-*.json', sameJson(listStateFiles(PLUGIN_DIR), baseline.plugin), JSON.stringify(listStateFiles(PLUGIN_DIR)))
  check('真实 ~/.dsh/dsh-xueqiu 未被触碰', sameJson(snapshotDir(REAL_XQ_HOME), baseline.realHome), JSON.stringify(snapshotDir(REAL_XQ_HOME)))

  /* ---------------------------------------------------------------- *
   * 11. 持仓 + 今日盈亏：**本地持仓 × 雪球行情**现算，账本只在同步时出现
   *
   * 用**带脚本 shell** 的新实例：假 shell 只回放预置 stdout（形如
   * `body\n__HTTP__200`），于是"到底发了几次上游请求、打的是谁"变成可断言的确定量。
   * 该实例用 manualTimers（定时器只登记、不自动触发）。
   * ---------------------------------------------------------------- */
  section('[9] 持仓 RPC（positions.get / save / remove / sync + pnl.verify / config）')
  const PNL_DIR = path.join(SMOKE_HOME, 'dsh-ths-pnl') // 与旧插件 dsh-ths-pnl 同一路径
  const PNL_CONFIG = path.join(PNL_DIR, 'config.json')
  const PNL_POSITIONS = path.join(PNL_DIR, 'positions.json')
  const readJsonFile = (p) => {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch (e) { return null }
  }
  const PNL_SESSIONS = ['pre', 'morning', 'lunch', 'afternoon', 'after', 'weekend']

  // 回收旧实例的 effect（保持与其它段一致的收尾习惯）
  for (const d of stat.rec.disposers) {
    try { d() } catch (e) { /* 回收失败不影响其它断言 */ }
  }

  const PNL_ACCT = '{"error_code":"0","ex_data":{"common":[{"fund_key":"FK9","manualname":"组合九","brokername":"券商"}]}}'
  const PNL_SHARE = '{"error_code":"0","ex_data":{"data":[{"yk":1,"zf":0.1},{"yk":888.88,"zf":0.66}]}}'
  const PNL_POS = '{"error_code":"0","ex_data":{"upload_time":"1792045716000","money_remain":"4074.39","total_value":"130466.00","total_asset":"134540.39","position_rate":"0.9697","position":[{"code":"600519","name":"贵州茅台","count":"100","cost":"1201.30","price":"1304.66","value":"130466.00"}]}}'
  const XQ_QUOTE = '{"data":{"items":[{"quote":{"symbol":"SH600519","name":"贵州茅台","current":1304.66,"percent":4.37,"chg":54.66,"last_close":1250.00}},{"quote":{"symbol":"SZ000001","name":"平安银行","current":12.18,"percent":1.50,"chg":0.18,"last_close":12.00}}]}}'
  const XQ_SEED = 'HTTP/2 200\nset-cookie: xq_a_token=SEED;\nset-cookie: u=42;\n'
  const p = makeCtx({
    manualTimers: true,
    // 闸门的 100ms 最小间隔要能真的走完，否则请求会卡在延时上（见 ctx.timeout 注释）
    manualTimersMinMs: 1000,
    shellResponses: [
      { text: XQ_SEED },                          // 1 行情 Cookie 播种（xueqiu.com/hq）
      { text: XQ_QUOTE },                         // 2 positions.save → 补名称/现价
      { text: XQ_QUOTE },                         // 3 positions.save(第二只) → 标的集合变了，重新取
      { text: PNL_ACCT + '\n__HTTP__200' },       // 4 pnl.config 存 Cookie → 校验
      { text: PNL_ACCT + '\n__HTTP__200' },       // 5 校验顺带取组合列表
      { text: PNL_ACCT + '\n__HTTP__200' },       // 6 positions.sync → 探 fund_key
      { text: PNL_POS + '\n__HTTP__200' },        // 7 positions.sync → stock_position
      { text: PNL_SHARE + '\n__HTTP__200' },      // 8 positions.sync → 账户级今日盈亏
      { text: '<h1>Nginx forbidden.</h1> <br/>request info: 1.2.3.4\n__HTTP__403' }, // 9 同步失败
      { text: XQ_QUOTE },                         // 10 clear 后 get(force) → 绕缓存取行情
      { text: PNL_ACCT + '\n__HTTP__200' },       // 11 clear 后再存 Cookie → 校验
      { text: PNL_ACCT + '\n__HTTP__200' },       // 12 校验顺带取组合列表
    ],
  })
  plugin.apply(p.ctx)
  const rpcP = (payload) => callRoute(p.rec.routes[0].handler, makeReq({ headers: SAME_ORIGIN, body: JSON.stringify(payload) }))
  // 越界时返回空串：断言照样失败，但不会把后面所有断言一起崩掉（smoke 里更好定位）
  const cmdAt = (i) => String(p.rec.shellRun[i] || '')

  check('宿主侧**不再挂盈亏定时器**（60s 账本心跳与 3s 启动补拉全删了）',
    !p.rec.effectLabels.some((l) => l.indexOf('盈亏') >= 0) && p.rec.timers.every((t) => t.ms < 1000),
    'effects=' + JSON.stringify(p.rec.effectLabels) + ' timers=' + JSON.stringify(p.rec.timers.map((t) => t.ms)))

  // ---- 没有任何凭据：本地持仓照样能取（这就是这次改造的核心）----
  const posIdle = jsonOf(await rpcP({ action: 'positions.get' }))
  check('未录持仓：positions.get → ok:true / configured:true / rows:[]', Boolean(posIdle && posIdle.ok === true && posIdle.data) && posIdle.data.configured === true && sameJson(posIdle.data.rows, []), JSON.stringify(posIdle))
  check('未录持仓：合计全 null、poll_ms=30000、session 合法', Boolean(posIdle && posIdle.data) && posIdle.data.totals.value === null && posIdle.data.totals.day_profit === null && posIdle.data.poll_ms === 30000 && PNL_SESSIONS.indexOf(posIdle.data.session) >= 0, JSON.stringify(posIdle && posIdle.data))
  check('未录持仓：零上游请求', p.rec.shellRun.length === 0, JSON.stringify(p.rec.shellRun))

  // ---- 手工录入：一次行情请求，回传派生值 ----
  const posAdd = jsonOf(await rpcP({ action: 'positions.save', args: { row: { code: '600519', qty: 100, cost: 1201.3 } } }))
  check('positions.save → ok:true + 1 行', Boolean(posAdd && posAdd.ok === true && posAdd.data) && posAdd.data.rows.length === 1, JSON.stringify(posAdd))
  check('名称由行情自动补全、现价/市值/盈亏现算', Boolean(posAdd && posAdd.data) && posAdd.data.rows[0].name === '贵州茅台' && posAdd.data.rows[0].price === 1304.66 && posAdd.data.rows[0].value === 130466 && posAdd.data.rows[0].day_profit === 5466, JSON.stringify(posAdd && posAdd.data && posAdd.data.rows[0]))
  check('行情走雪球 batch/quote（先播种 Cookie 再取数）', p.rec.shellRun.length === 2 && cmdAt(0).indexOf('xueqiu.com/hq') >= 0 && cmdAt(1).indexOf('batch/quote.json') >= 0, JSON.stringify(p.rec.shellRun))
  check('positions.json 落盘 schema=4，只存输入字段', (readJsonFile(PNL_POSITIONS) || {}).schema === 4 && sameJson(Object.keys((readJsonFile(PNL_POSITIONS) || {}).rows[0]).sort(), ['code', 'cost', 'name', 'qty']), JSON.stringify(readJsonFile(PNL_POSITIONS)))

  const posAdd2 = jsonOf(await rpcP({ action: 'positions.save', args: { row: { code: '000001', name: '平安银行', qty: 500, cost: 11 } } }))
  check('加第二只：合计按逐行取整后相加', Boolean(posAdd2 && posAdd2.data) && posAdd2.data.totals.value === 130466 + 6090 && posAdd2.data.totals.day_profit === 5466 + 90, JSON.stringify(posAdd2 && posAdd2.data && posAdd2.data.totals))

  // ---- 行情 10 秒缓存：同一批标的的连续 get 不再打上游 ----
  const before = p.rec.shellRun.length
  const posCached = jsonOf(await rpcP({ action: 'positions.get' }))
  check('同批标的的第二次 get 命中行情缓存（0 新请求）', p.rec.shellRun.length === before, `${p.rec.shellRun.length} vs ${before}`)
  check('缓存命中也返回完整视图', Boolean(posCached && posCached.data) && posCached.data.rows.length === 2, JSON.stringify(posCached && posCached.data && posCached.data.rows.length))

  // ---- pollSec 钳制 + 落盘 ----
  const cfgBig = jsonOf(await rpcP({ action: 'pnl.config', args: { pollSec: 99999 } }))
  check('pnl.config：pollSec 超上限 → 夹到 3600 秒（不报错）', Boolean(cfgBig && cfgBig.data) && cfgBig.ok === true && cfgBig.data.poll_ms === 3600000 && cfgBig.data.poll_sec === 3600, JSON.stringify(cfgBig))
  const cfgSmall = jsonOf(await rpcP({ action: 'pnl.config', args: { pollSec: 1 } }))
  check('pnl.config：pollSec 低于下限 → 夹到 5 秒', Boolean(cfgSmall && cfgSmall.data) && cfgSmall.data.poll_ms === 5000 && cfgSmall.data.poll_sec === 5, JSON.stringify(cfgSmall))
  const cfgBad = jsonOf(await rpcP({ action: 'pnl.config', args: { pollSec: 'abc' } }))
  check('pnl.config：pollSec 非数字 → ok:false + 精确中文提示', Boolean(cfgBad) && cfgBad.ok === false && cfgBad.error === '刷新间隔请填 5–3600 之间的秒数', JSON.stringify(cfgBad))
  const cfgEmpty = jsonOf(await rpcP({ action: 'pnl.config', args: {} }))
  check('pnl.config：空 patch → ok:false（没有可保存的字段）', Boolean(cfgEmpty) && cfgEmpty.ok === false && cfgEmpty.error === '没有可保存的字段', JSON.stringify(cfgEmpty))
  check('pollSec 落盘为 config.json 的秒数', (readJsonFile(PNL_CONFIG) || {}).pollSec === 5, JSON.stringify(readJsonFile(PNL_CONFIG)))
  check('状态文件落在 $DSH_HOME/dsh-ths-pnl（与旧插件同目录）', fs.existsSync(PNL_CONFIG) && fs.realpathSync(PNL_DIR) === fs.realpathSync(path.join(SMOKE_HOME, 'dsh-ths-pnl')))

  // ---- 存 Cookie：只服务「从账本同步」 ----
  const runBeforeCfg = p.rec.shellRun.length
  const cfgSave = jsonOf(await rpcP({ action: 'pnl.config', args: { cookie: '  userid=abc ;\n  token=T1  ' } }))
  check('pnl.config：存 Cookie → ok:true + configured:true', Boolean(cfgSave && cfgSave.data) && cfgSave.ok === true && cfgSave.data.configured === true, JSON.stringify(cfgSave))
  check('pnl.config：当场校验 → valid:true + 组合下拉', Boolean(cfgSave && cfgSave.data) && cfgSave.data.valid === true && sameJson(cfgSave.data.portfolios, [{ fund_key: 'FK9', name: '组合九' }]), JSON.stringify(cfgSave && cfgSave.data))
  check('pnl.config：Cookie 被 normalizeCookie 规整后落盘', (readJsonFile(PNL_CONFIG) || {}).cookie === 'userid=abc; token=T1', JSON.stringify((readJsonFile(PNL_CONFIG) || {}).cookie))
  check('pnl.config：校验打 account_list 2 次、最小请求头', p.rec.shellRun.length === runBeforeCfg + 2 && cmdAt(runBeforeCfg).indexOf('account/v1/account_list') >= 0 && cmdAt(runBeforeCfg).indexOf('Referer') < 0, '实际 ' + (p.rec.shellRun.length - runBeforeCfg))
  check('pnl.config：Cookie 头里是规整后的 userid（不是 pex_userid）', cmdAt(runBeforeCfg).indexOf('userid=abc') >= 0 && cmdAt(runBeforeCfg).indexOf('pex_userid') < 0, cmdAt(runBeforeCfg))
  check('存 Cookie **不触碰**本地持仓', (readJsonFile(PNL_POSITIONS) || {}).rows.length === 2)

  // ---- 从账本同步：只在点了这个动作时才打账本 ----
  const runBeforeSync = p.rec.shellRun.length
  const syncOk = jsonOf(await rpcP({ action: 'positions.sync', args: {} }))
  check('positions.sync → ok:true', Boolean(syncOk && syncOk.ok === true && syncOk.data) && syncOk.data.ok === true, JSON.stringify(syncOk))
  check('同步打 3 次账本（探组合 + 持仓 + 账户盈亏）', p.rec.shellRun.length === runBeforeSync + 3, '实际 ' + (p.rec.shellRun.length - runBeforeSync))
  check('同步请求顺序：account_list → stock_position → time_share',
    cmdAt(runBeforeSync).indexOf('account_list') >= 0 && cmdAt(runBeforeSync + 1).indexOf('stock_position') >= 0 && cmdAt(runBeforeSync + 2).indexOf('time_share') >= 0,
    JSON.stringify(p.rec.shellRun.slice(runBeforeSync)))
  check('同步报告：账本的 count/cost 进了本地', (readJsonFile(PNL_POSITIONS) || {}).rows.some((r) => r.code === '600519' && r.qty === 100 && r.cost === 1201.3), JSON.stringify(readJsonFile(PNL_POSITIONS)))
  check('同步写入 cloud.synced_at / summary / account', Boolean(syncOk && syncOk.data && syncOk.data.view && syncOk.data.view.cloud) && typeof syncOk.data.view.cloud.synced_at === 'string' && syncOk.data.view.cloud.summary.total_value === 130466 && syncOk.data.view.cloud.account.pnl_yk === 888.88, JSON.stringify(syncOk && syncOk.data && syncOk.data.view && syncOk.data.view.cloud))
  check('同步后派生值仍由行情现算（不搬账本的 price/value）', Boolean(syncOk && syncOk.data && syncOk.data.view) && syncOk.data.view.rows.every((r) => r.price === 1304.66 || r.price === 12.18), JSON.stringify((syncOk && syncOk.data && syncOk.data.view.rows) || []))

  // ---- 同步失败：一个字段都不碰本地持仓 ----
  const rowsBeforeFail = JSON.stringify((readJsonFile(PNL_POSITIONS) || {}).rows)
  const syncFail = jsonOf(await rpcP({ action: 'positions.sync', args: {} }))
  check('同步失败：RPC 仍成功、data.ok=false（失败只属于同步）', Boolean(syncFail && syncFail.ok === true && syncFail.data) && syncFail.data.ok === false, JSON.stringify(syncFail && syncFail.data && syncFail.data.error))
  check('同步失败：本地持仓行完全没变', JSON.stringify((readJsonFile(PNL_POSITIONS) || {}).rows) === rowsBeforeFail)
  check('同步失败：当日盈亏照常算出来', Boolean(syncFail && syncFail.data && syncFail.data.view) && syncFail.data.view.totals.day_profit !== null, JSON.stringify(syncFail && syncFail.data && syncFail.data.view && syncFail.data.view.totals))
  check('同步失败：403 被标成 blocked（原因不唯一）', (readJsonFile(PNL_POSITIONS) || {}).cloud.blocked === true, JSON.stringify((readJsonFile(PNL_POSITIONS) || {}).cloud))

  // ---- clear：清凭据但**保留本地持仓**（它是主数据，跟凭据是两回事）----
  const runBeforeClear = p.rec.shellRun.length
  const cfgClear = jsonOf(await rpcP({ action: 'pnl.config', args: { clear: true } }))
  check('pnl.config clear：configured:false / valid:false / portfolios:[]', Boolean(cfgClear && cfgClear.data) && cfgClear.ok === true && cfgClear.data.configured === false && cfgClear.data.valid === false && sameJson(cfgClear.data.portfolios, []), JSON.stringify(cfgClear && cfgClear.data))
  check('pnl.config clear：不请求上游', p.rec.shellRun.length === runBeforeClear, '实际 ' + (p.rec.shellRun.length - runBeforeClear))
  check('pnl.config clear：Cookie 已清空', (readJsonFile(PNL_CONFIG) || {}).cookie === '', JSON.stringify((readJsonFile(PNL_CONFIG) || {}).cookie))
  check('pnl.config clear：本地持仓保留（2 行）', (readJsonFile(PNL_POSITIONS) || {}).rows.length === 2, JSON.stringify((readJsonFile(PNL_POSITIONS) || {}).rows.length))
  const posAfterClear = jsonOf(await rpcP({ action: 'positions.get', args: { force: true } }))
  check('清凭据后当日盈亏照常（本地持仓 × 行情）', Boolean(posAfterClear && posAfterClear.data) && posAfterClear.data.totals.day_profit === 5466 + 90, JSON.stringify(posAfterClear && posAfterClear.data && posAfterClear.data.totals))

  // ---- 再存一次：确认 clear 之后能重新配置 ----
  const cfgSave2 = jsonOf(await rpcP({ action: 'pnl.config', args: { cookie: 'userid=abc;  token=T2\n', pollSec: 30 } }))
  check('pnl.config：clear 后可重新存 Cookie（valid:true）', Boolean(cfgSave2 && cfgSave2.data) && cfgSave2.data.valid === true && cfgSave2.data.configured === true, JSON.stringify(cfgSave2 && cfgSave2.data))
  check('pnl.config：Cookie + pollSec 一次写入都生效', (readJsonFile(PNL_CONFIG) || {}).cookie === 'userid=abc; token=T2' && (readJsonFile(PNL_CONFIG) || {}).pollSec === 30, JSON.stringify(readJsonFile(PNL_CONFIG)))
  check('pnl.config：回传生效的 poll_sec（30）', Boolean(cfgSave2 && cfgSave2.data) && cfgSave2.data.poll_sec === 30 && cfgSave2.data.poll_ms === 30000, JSON.stringify(cfgSave2 && cfgSave2.data))

  // ---- 删除 + 参数校验 ----
  const posDel = jsonOf(await rpcP({ action: 'positions.remove', args: { code: '000001' } }))
  check('positions.remove → 剩 1 行', Boolean(posDel && posDel.data) && posDel.data.rows.length === 1, JSON.stringify(posDel && posDel.data && posDel.data.rows.map((r) => r.code)))
  const posDelBad = jsonOf(await rpcP({ action: 'positions.remove', args: { code: '不存在' } }))
  check('删不存在的代码 → ok:false + 可读原因', Boolean(posDelBad) && posDelBad.ok === false && String(posDelBad.error).indexOf('没有') >= 0, JSON.stringify(posDelBad))

  // ---- 收尾：依赖面 ----
  const pnlGot = []
  for (const n of p.rec.getNames) if (pnlGot.indexOf(n) < 0) pnlGot.push(n)
  check('持仓/盈亏侧 ctx.get 依赖面 ⊆ {shell, fs, sandboxPolicy}', pnlGot.length > 0 && pnlGot.every((n) => ['shell', 'fs', 'sandboxPolicy'].indexOf(n) >= 0), JSON.stringify(pnlGot))
  check('全程没有真实 shell / 网络：所有命令都是 curl 命令行', p.rec.shellRun.length > 0 && p.rec.shellRun.every((c) => /^curl(\.exe)?\s/.test(c)), '共 ' + p.rec.shellRun.length + ' 条')
} catch (e) {
  failures.push('未捕获异常: ' + String((e && e.stack) || e))
  console.log('\n  ✗ 未捕获异常 :: ' + String((e && e.stack) || e))
}

/* ------------------------------------------------------------------ *
 * 11. 汇总
 * ------------------------------------------------------------------ */
clearTimers()
console.log('\n' + '-'.repeat(60))
if (failures.length === 0) {
  console.log('结果：全部通过（' + total + ' 项断言）')
} else {
  console.log('结果：' + failures.length + ' 项失败 / 共 ' + total + ' 项断言')
  for (const f of failures) console.log('  ✗ ' + f)
}
console.log('临时产物：' + TMP_ROOT + '（可整目录删除）')
process.exit(failures.length === 0 ? 0 : 1)

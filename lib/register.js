// 双路径注册：动态运行时走 harness 门面（RPC 通道 + 工具），静态安装走 webServer 前缀路由 + tools 服务。
// 判据是 `typeof harness !== 'undefined'`，两条路径互斥——与上游逐字一致，不要合并。

import { makeAgentTools } from './tools/index.js'

// 动态插件运行时提供 harness 门面；静态安装（bundle layer）没有，
// 改走 webServer 前缀路由，client 用同源 fetch 调 /xq-rpc。
export function installRpc(core) {
  const ctx = core.ctx
  if (typeof harness !== 'undefined') {
    ctx.effect(function () {
      return harness.handle('xq.call', core.handleCall)
    })
  } else {
    ctx.inject(['webServer'], function (webCtx) {
      webCtx.effect(function () {
        return webCtx.webServer.register({
        kind: 'prefix',
        path: '/xq-rpc',
        handler: async function (req, res) {
          // 同源栅栏：Host 头必须是回环，Origin 必须存在且同源（防 DNS rebinding/CSRF/无 Origin 的跨进程直调）
          const hostHeader = String(req.headers.host || '')
          const origin = req.headers.origin ? String(req.headers.origin) : ''
          // 端口剥离：要求冒号前存在非冒号字符——裸 IPv6 '::1' 不会被误剥末尾 ':1'（曾致白名单死代码）
          const hostAuth = hostHeader.replace(/^(.*[^:]):\d+$/, '$1')
          const loopback = hostAuth === '127.0.0.1' || hostAuth === 'localhost' || hostAuth === '[::1]' || hostAuth === '::1'
          if (!loopback) { res.writeHead(403); res.end('forbidden'); return }
          // 浏览器对（哪怕同源的）POST fetch 必带 Origin；无 Origin 一律拒绝（curl/本机进程裸调）
          if (!origin || (origin !== 'http://' + hostHeader && origin !== 'https://' + hostHeader)) {
            res.writeHead(403); res.end('forbidden'); return
          }
          const chunks = []
          let received = 0
          for await (const c of req) {
            received += c.length
            if (received > 1048576) { res.writeHead(413); res.end('payload too large'); return }   // 1MB 上限：防失控本地进程 OOM
            chunks.push(c)
          }
          let body = {}
          try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') } catch (e) { body = {} }
          const result = await core.handleCall(body)
          const text = JSON.stringify(result)
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
          res.end(text)
        }
        })
      })
    })
  }
}

// 注册：动态环境走 harness 门面（defineTool 会做标记+校验）；
// 静态 bundle 层没有 harness，参数已是 JSON Schema 根，直接注册 plain 对象
// （tools 服务在静态路径无 defineTool 守卫），用 inject 等服务就绪。
// 统一包装 execute：args 为 null/undefined 时兜底 {}（工具层直解引用会抛 TypeError）
function wrapToolSpec(spec) {
  const raw = spec.execute
  if (!raw) return spec
  return Object.assign({}, spec, { execute: function (args) { return raw.call(this, args || {}) } })
}

export function installTools(core) {
  const ctx = core.ctx
  const XQ_AGENT_TOOLS = makeAgentTools(core)
  if (typeof harness !== 'undefined') {
    for (let i = 0; i < XQ_AGENT_TOOLS.length; i++) {
      const spec = XQ_AGENT_TOOLS[i]
      ctx.effect(function () {
        return harness.registerTool(ctx, harness.defineTool(wrapToolSpec(spec)))
      })
    }
  } else {
    ctx.inject(['tools'], function (toolsCtx) {
      for (let i = 0; i < XQ_AGENT_TOOLS.length; i++) {
        const spec = XQ_AGENT_TOOLS[i]
        toolsCtx.effect(function () {
          return toolsCtx.tools.register(wrapToolSpec(spec))
        })
      }
    })
  }
}

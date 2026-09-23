// 请求调度闸门：并发上限 + 最小间隔 + 看门狗。调度状态挂在 core 上（debug RPC 会读）。

import { MIN_GAP_MS, MAX_CONCURRENCY, GATE_TIMEOUT_MS } from './constants.js'

export function installGate(core) {
  const ctx = core.ctx
  core.running = 0
  core.lastStart = 0
  core.waiters = []

  function delay(ms) { return new Promise(function (r) { ctx.timeout(r, ms) }) }

  function release() {
    core.running--
    pump()
  }

  function pump() {
    while (core.running < MAX_CONCURRENCY && core.waiters.length) {
      const next = core.waiters.shift()
      core.running++
      next()
    }
  }

  function gate(fn) {
    return new Promise(function (resolve, reject) {
      core.waiters.push(async function () {
        let released = false
        function rel() {
          if (released) return
          released = true
          core.running--
          pump()
        }
        let settled = false
        let watchdog = null
        function settle(fnName, arg) {
          if (settled) return
          settled = true
          if (watchdog) { try { watchdog() } catch (e) { /* ignore */ } }
          if (fnName === 'resolve') resolve(arg)
          else reject(arg)
        }
        try { watchdog = ctx.timeout(function () { rel(); settle('reject', new Error('[timeout] 请求超时(' + GATE_TIMEOUT_MS + 'ms)，已释放调度槽')) }, GATE_TIMEOUT_MS) } catch (e) { /* ignore */ }
        try {
          const wait = core.lastStart + MIN_GAP_MS - Date.now()
          if (wait > 0) await delay(wait)
          core.lastStart = Date.now()
          settle('resolve', await fn())
        } catch (e) {
          settle('reject', e)
        } finally {
          rel()
        }
      })
      pump()
    })
  }

  core.delay = delay
  core.gate = gate
}

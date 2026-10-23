// 请求调度闸门：并发上限 + 最小间隔 + 看门狗。调度状态挂在 core 上（debug RPC 会读）。
//
// 启动时间槽（2026-10 修复）：原实现让每个任务各自 `await delay(lastStart + MIN_GAP - now)` 再写
// lastStart —— 两个任务会读到同一个 lastStart、等同一时刻、同时启动，实测相邻启动间隔 [0,109,0]ms。
// 现在改由**单一链条**依次发放时间槽：计算 wait 与写 lastStart 在同一段串行代码里，不存在并发读旧值
// 的窗口。等待只序列化「启动时刻」，启动后仍按 MAX_CONCURRENCY 并行执行。
//
// 超时语义：看门狗只负责让调用方结束、把槽位还回去 —— 它**不**等于底层 curl 被取消（shell 层没有
// 取消能力）。因此超时后再拿到槽位的任务直接放弃执行（不再发起真实外呼），已发出的请求迟到返回时
// 也不会回填缓存（getJSON 的缓存写入挂在 gate 的 rejected promise 上，不会执行）。

import { MIN_GAP_MS, MAX_CONCURRENCY, GATE_TIMEOUT_MS } from './constants.js'

export function installGate(core) {
  const ctx = core.ctx
  core.running = 0
  core.lastStart = 0
  core.waiters = []

  // 启动时间槽的唯一发放者（所有任务排在这一条链上）
  let startChain = Promise.resolve()

  function delay(ms) { return new Promise(function (r) { ctx.timeout(r, ms) }) }

  function pump() {
    while (core.running < MAX_CONCURRENCY && core.waiters.length) {
      const next = core.waiters.shift()
      core.running++
      next()
    }
  }

  // 原子预订一个启动时间槽：链上串行计算「距上一次启动还差多少」，等完立刻写 lastStart。
  function takeStartSlot() {
    const p = startChain.then(function () {
      const wait = core.lastStart + MIN_GAP_MS - Date.now()
      if (wait > 0) return delay(wait)
      return null
    }).then(function () {
      core.lastStart = Date.now()
    })
    startChain = p.then(function () {}, function () { /* 上一槽失败不阻塞后续发放 */ })
    return p
  }

  function gate(fn) {
    return new Promise(function (resolve, reject) {
      core.waiters.push(async function () {
        let released = false
        let settled = false
        let timedOut = false
        let watchdog = null
        function rel() {
          if (released) return
          released = true
          core.running--
          pump()
        }
        function settle(kind, arg) {
          if (settled) return
          settled = true
          if (watchdog) { try { watchdog() } catch (e) { /* ignore */ } watchdog = null }
          if (kind === 'resolve') resolve(arg)
          else reject(arg)
        }
        try {
          watchdog = ctx.timeout(function () {
            timedOut = true
            rel()
            settle('reject', new Error('[timeout] 请求超时(' + GATE_TIMEOUT_MS + 'ms)，已释放调度槽'))
          }, GATE_TIMEOUT_MS)
        } catch (e) { /* 无 timer 服务时退化为无看门狗 */ }
        try {
          await takeStartSlot()
          // 已经判定超时的任务不再发起真实外呼（重置计时也不会让它重新变有效）
          if (timedOut) return
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

// 今日盈亏：installPnl(core) —— 三个 RPC 动作（pnl.get / pnl.verify / pnl.config）
// 与「交易时段边界 + 盘中心跳」调度器。
//
// 宿主定节奏：客户端只按 next_poll_ms 打 pnl.get，拉不拉上游由宿主判定
// （非交易时段直接回快照，不浪费请求、也不会被账本风控盯上）。
//
// 调度器是本文件唯一持有定时器的地方：一律走 ctx.timeout（动态形态里没有全局
// setTimeout），并且**归一化返回值**——它可能是函数，也可能是带 .dispose() 的对象。

import { DEFAULT_POLL_MS, MAX_POLL_MS, MIN_POLL_MS, STARTUP_DELAY_MS, CLOSE_SETTLE_MS, MAX_COOKIE_LEN } from './constants.js'
import { sessionInfo, shouldFetch, nextPollMs, OPEN_MIN, CLOSE_MIN } from './session.js'
import { loadPnlConfig, savePnlConfig, loadPnlSnapshot, savePnlSnapshot } from './store.js'
import { normalizeCookie } from './http.js'
import { listPortfolios, collectPnl, verifyCookie } from './collect.js'

// 说明：clampPollMs 在上游 dsh-ths-pnl 里定义于入口模块（不在 session.js），
// 这里保持同样的归属，避免把「逐字搬 session.js」搅浑。
/**
 * 把用户填的秒数规整成合法的毫秒间隔。
 * 非数字 / NaN / 非正数返回 null（调用方回退默认值）；越界夹到 [MIN, MAX]。
 */
export function clampPollMs(value) {
  const sec = typeof value === 'string' ? Number(value.trim()) : Number(value)
  if (!Number.isFinite(sec) || sec <= 0) return null
  return Math.min(MAX_POLL_MS, Math.max(MIN_POLL_MS, Math.round(sec * 1000)))
}

/** 生效的盘中心跳：存盘秒数（钳制过）> 默认 60 秒。 */
function pnlPollMs(state) {
  const ms = clampPollMs(state && state.pollSec)
  return ms === null ? DEFAULT_POLL_MS : ms
}

/** ctx.timeout 的返回值可能是函数，也可能是带 .dispose() 的对象 —— 统一成「停止函数」。 */
function stopOf(disposable) {
  if (typeof disposable === 'function') return disposable
  if (disposable && typeof disposable.dispose === 'function') return function () { disposable.dispose() }
  return function () {}
}

/** 定时器回调里的异常只记日志：调度链不能因为一次网络失败断掉。 */
function pnlWarn(ctx, error) {
  try {
    if (ctx.logger && typeof ctx.logger.warn === 'function') {
      ctx.logger.warn(error instanceof Error ? error : new Error(String(error)))
    }
  } catch (e) { /* 日志失败不影响调度 */ }
}

export function installPnl(core) {
  const ctx = core.ctx
  // 内存快照缓存（调度器判定用）+ 最近一次生效的心跳
  core.pnl = { snapshot: null, pollMs: DEFAULT_POLL_MS }
  let boundaryStop = null
  let settleStop = null
  // 收盘补拉**每天只做一次**：15:00 之后盘中心跳还会唤醒好几次，
  // 若不记住「本交易日已补过」，5 分钟窗口内会重复打 5~6 次上游。
  let settleDate = null

  function stopTimer(stop) {
    if (!stop) return
    try { stop() } catch (e) { /* 已停止 */ }
  }

  /**
   * 拉一次账本并写入快照。动作与边界定时器共用。
   * @param {string} reason - 诊断用：route / force / boundary / startup / close-settle
   */
  async function refresh(reason) {
    const state = await loadPnlConfig(core)
    const cookie = typeof state.cookie === 'string' ? state.cookie : ''
    if (!cookie) return null
    core.pnl.pollMs = pnlPollMs(state)
    // fundKey：存盘的 → 现探第一个组合（旧插件同语义，探到就落盘）
    let fundKey = typeof state.fundKey === 'string' ? state.fundKey : ''
    if (!fundKey) {
      const list = await listPortfolios(core, cookie)
      const first = list.length > 0 ? list[0].fund_key : ''
      if (first) {
        fundKey = first
        try { await savePnlConfig(core, { fundKey: first }) } catch (e) { /* 存不下不影响本次取值 */ }
      }
    }
    const pnl = await collectPnl(core, cookie, fundKey)
    const now = new Date()
    const info = sessionInfo(now)
    const prev = (await loadPnlSnapshot(core)) || {}
    // 标记位：今天是否已拉过「开盘后的值」/「收盘后的值」。
    // 盘前那次拉到的其实是昨天收盘，所以不能打今天的标。
    const snapshot = {
      pnl_yk: pnl.pnl_yk,
      pnl_pct: pnl.pnl_pct,
      error: pnl.error,
      token_expired: pnl.token_expired,
      yk_field: pnl.yk_field,
      fetched_at: now.toISOString(),
      fetched_reason: reason,
      sessionDate: info.minutes >= OPEN_MIN ? info.date : (prev.sessionDate ?? null),
      closeDate: info.minutes >= CLOSE_MIN ? info.date : (prev.closeDate ?? null),
    }
    await savePnlSnapshot(core, snapshot)
    core.pnl.snapshot = snapshot
    return snapshot
  }

  /** 现在该不该打上游（无快照 → 该；盘中 → 该；否则看今天的标记位）。 */
  async function shouldFetchNow() {
    const info = sessionInfo(new Date())
    const snap = await loadPnlSnapshot(core)
    return shouldFetch(info, snap)
  }

  /**
   * 排一次唤醒（先收掉上一个定时器，保证同一时刻只有一个）。
   * @param {number} ms - 毫秒
   * @param {string} reason - 唤醒后 refresh 用的诊断原因
   */
  function arm(ms, reason) {
    stopTimer(boundaryStop)
    boundaryStop = stopOf(ctx.timeout(function () {
      wake(reason).catch(function () {})
    }, ms))
  }

  /** 按既定节奏排下一次唤醒：盘中按心跳、盘外睡到下一个边界。 */
  function schedule() {
    const now = new Date()
    const info = sessionInfo(now)
    arm(nextPollMs(info, now, core.pnl.pollMs), 'boundary')
  }

  async function wake(reason) {
    boundaryStop = null
    try {
      // 不该拉就什么都不做（例如节假日/午间的边界），避免无谓请求
      if (await shouldFetchNow()) await refresh(reason)
    } catch (e) { pnlWarn(ctx, e) }
    // 15:00 那次拉到的收盘价可能还没落定：45 秒后再补一次，**每个交易日只补一次**。
    // **绕过 shouldFetch**：15:00 那次已经打过 closeDate 标记，按规则就再也不会拉了。
    const after = sessionInfo(new Date())
    if (after.minutes >= CLOSE_MIN && after.minutes <= CLOSE_MIN + 5 && settleDate !== after.date) {
      settleDate = after.date
      stopTimer(settleStop)
      settleStop = stopOf(ctx.timeout(function () {
        settleStop = null
        refresh('close-settle').catch(function () {})
      }, CLOSE_SETTLE_MS))
    }
    schedule()
  }

  ctx.effect(function () {
    // 启动补拉：进程刚起若"该有值"（盘中 / 今天还没拉过 / 从未拉过）就立刻补一次，
    // 覆盖"09:30 时进程还没在跑"这种情况；错开插件加载高峰，3 秒后再打。
    arm(STARTUP_DELAY_MS, 'startup')
    return function () {
      stopTimer(boundaryStop)
      boundaryStop = null
      stopTimer(settleStop)
      settleStop = null
    }
  }, 'xueqiu-debug: 今日盈亏边界定时器')

  /**
   * pnl.get（args 可选 `{ force?: boolean }`）
   * force=true 跳过 shouldFetch 判定强制打一次上游；未知字段一律忽略。
   */
  async function actPnlGet(args) {
    const a = (args && typeof args === 'object') ? args : {}
    const force = a.force === true
    const now = new Date()
    const info = sessionInfo(now)
    const state = await loadPnlConfig(core)
    const effective = pnlPollMs(state)
    const pollMs = nextPollMs(info, now, effective)
    const cookie = typeof state.cookie === 'string' ? state.cookie : ''
    // 未配置：不请求上游，字段齐全（金额/时间给 null，error 空串）
    if (!cookie) {
      return {
        configured: false, pnl_yk: null, pnl_pct: null, error: '', token_expired: false,
        yk_field: '', updated_at: null, session: info.state, frozen: true,
        poll_ms: effective, next_poll_ms: pollMs,
      }
    }

    let snap = await loadPnlSnapshot(core)
    let frozen = true
    // 注意：**没有快照时 shouldFetch 必为 true** —— 这是「首次配置后立刻出数」的关键路径，
    // 不能被会话判定提前挡掉（非交易时段也要真的拉一次）。
    if (force || shouldFetch(info, snap)) {
      const fresh = await refresh(force ? 'force' : 'route')
      if (fresh) { snap = fresh; frozen = false }
    }
    if (!snap) {
      return {
        configured: true, pnl_yk: null, pnl_pct: null, error: '暂无数据', token_expired: false,
        yk_field: '', updated_at: null, session: info.state, frozen: true,
        poll_ms: effective, next_poll_ms: pollMs,
      }
    }
    return {
      configured: true,
      pnl_yk: snap.pnl_yk,
      pnl_pct: snap.pnl_pct,
      error: snap.error ?? '',
      token_expired: Boolean(snap.token_expired),
      yk_field: snap.yk_field ?? '',
      updated_at: snap.fetched_at ?? null,
      session: info.state,
      // 盘外时 frozen=true：界面显示的就是收盘/上一次的值，不会再变
      frozen: frozen,
      poll_ms: effective,
      next_poll_ms: pollMs,
    }
  }

  /** pnl.verify：用当前存的 Cookie 打一次 account_list（args 忽略）。 */
  async function actPnlVerify() {
    const state = await loadPnlConfig(core)
    const cookie = typeof state.cookie === 'string' ? state.cookie : ''
    const result = await verifyCookie(core, cookie)
    const effective = pnlPollMs(state)
    return {
      configured: Boolean(cookie),
      valid: result.valid,
      error: result.error,
      // name 回退链：manualname → brokername → fund_key（客户端直接显示）
      portfolios: (result.portfolios ?? []).map(function (p) {
        return { fund_key: p.fund_key, name: p.manualname || p.brokername || p.fund_key }
      }),
      fundKey: typeof state.fundKey === 'string' ? state.fundKey : '',
      poll_ms: effective,
      min_sec: MIN_POLL_MS / 1000,
      max_sec: MAX_POLL_MS / 1000,
    }
  }

  /** pnl.config：存 Cookie / fundKey / 刷新间隔，或 clear 清凭据（保留快照）。 */
  async function actPnlSave(args) {
    const a = (args && typeof args === 'object') ? args : {}

    // clear：清 Cookie（**保留 snapshot**，最后已知盈亏不该被抹掉），不请求上游
    if (a.clear === true) {
      await savePnlConfig(core, { cookie: '', fundKey: '' })
      const cleared = await loadPnlConfig(core)
      const clearedMs = pnlPollMs(cleared)
      return {
        ok: true, configured: false, valid: false, error: '', portfolios: [],
        fundKey: '', poll_ms: clearedMs, poll_sec: clearedMs / 1000,
        min_sec: MIN_POLL_MS / 1000, max_sec: MAX_POLL_MS / 1000,
      }
    }

    const patch = {}
    if (typeof a.cookie === 'string' && a.cookie.trim().length > 0) {
      const cookie = normalizeCookie(a.cookie.trim())
      if (cookie.length > MAX_COOKIE_LEN) {
        throw new Error('Cookie 过长（超过 ' + MAX_COOKIE_LEN + ' 字符），请只粘贴投资账本需要的字段')
      }
      patch.cookie = cookie
    }
    if (typeof a.fundKey === 'string') patch.fundKey = a.fundKey.trim()

    // 刷新间隔：入参是**秒**，越界夹到边界值（省得用户猜范围），非数字才报错
    if (a.pollSec !== undefined && a.pollSec !== null && a.pollSec !== '') {
      const ms = clampPollMs(a.pollSec)
      if (ms === null) throw new Error('刷新间隔请填 5–3600 之间的秒数')
      patch.pollSec = ms / 1000
    }

    if (Object.keys(patch).length === 0) throw new Error('没有可保存的字段')
    await savePnlConfig(core, patch)

    // 存了 Cookie 就当场校验：客户端一次调用即可显示「已保存 / Cookie 无效」
    const verify = patch.cookie ? await verifyCookie(core, patch.cookie) : null
    const saved = await loadPnlConfig(core)
    const effective = pnlPollMs(saved)
    core.pnl.pollMs = effective
    return {
      ok: true,
      configured: typeof saved.cookie === 'string' && saved.cookie.length > 0,
      valid: verify ? verify.valid : false,
      error: verify ? verify.error : '',
      portfolios: verify ? (verify.portfolios ?? []).map(function (p) {
        return { fund_key: p.fund_key, name: p.manualname || p.brokername || p.fund_key }
      }) : [],
      fundKey: typeof saved.fundKey === 'string' ? saved.fundKey : '',
      // 回传生效值（可能被夹过），界面据此回填，避免「填了 1 秒却还是 5 秒」的困惑
      poll_ms: effective,
      poll_sec: effective / 1000,
      min_sec: MIN_POLL_MS / 1000,
      max_sec: MAX_POLL_MS / 1000,
    }
  }

  core.actPnlGet = actPnlGet
  core.actPnlVerify = actPnlVerify
  core.actPnlSave = actPnlSave
}

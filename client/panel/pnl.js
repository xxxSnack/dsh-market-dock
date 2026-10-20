// 今日盈亏：面板头部常驻 chip + 「盈亏」tab。
//
// 口径（改造后）：
//   今日盈亏 = Σ(现价 − 昨收) × 股数       —— 由**本地持仓 × 雪球行情**现算，不碰账本
//   当日涨跌幅 = 今日盈亏 / Σ(昨收 × 股数)
// 与账本账户口径的差别：不含当日已实现与费用（账本那个数只在「从账本同步」时取一次，存在持仓 tab）。
//
// 展示口径沿用 dsh-ths-pnl 的客户端实现：金额带符号 + 千分位 + 两位小数，百分比两位小数；
// 涨跌按 **A 股习惯（涨=红、跌=绿）** —— 与雪球页面一致，但与欧美习惯相反。
import { el } from '../dom.js'
import { fmtPct } from '../format.js'
import { call, A_PNL_VERIFY, A_PNL_CONFIG } from '../platform.js'
import { getUiRuntime } from '../store/ui.js'
import { usePositionsState } from '../store/positions.js'

// 带符号千分位两位小数（金额）。不用 toFixed 是为了千分位分组。
function fmtYk(value) {
  const n = Number(value) || 0
  const sign = n > 0 ? '+' : (n < 0 ? '-' : '')
  return sign + Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 无符号千分位两位小数（市值 / 成本这类「量」）。
function fmtMoney(value) {
  const n = Number(value)
  if (!isFinite(n)) return '--'
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 涨跌配色类（A 股：涨红跌绿）。
function trendClass(value) {
  const n = Number(value)
  if (!isFinite(n) || n === 0) return ''
  return n > 0 ? 'xq-pnl-up' : 'xq-pnl-down'
}

// 时段文案。盘外时段（盘前/午间/收盘/休市）要显式标出来，否则用户会以为数字停住是坏了。
const SESSION_TEXT = { pre: '盘前', morning: '盘中', lunch: '午间', afternoon: '盘中', after: '收盘', weekend: '休市' }
const OFF_HOURS = { pre: 1, lunch: 1, after: 1, weekend: 1 }

/**
 * 订阅持仓/盈亏视图。返回 state 快照；订阅/退订由 store 的引用计数管轮询器的启停，
 * 所以 chip、两个 tab、底部指数条同时挂着也只有一个轮询器、一份数据。
 * 导出给底部指数条（client/ticker.js）复用：那里也要判断「有没有东西可显示」。
 */
export function usePnlState() {
  return usePositionsState()
}

// 头部常驻 chip：一行小字展示今日盈亏，点击切到「盈亏」tab。
export function PnlChip() {
  const state = usePnlState()
  const data = state.data
  // totals 可能缺（宿主异常 / 老版本视图）：用空对象兜底，宁可显示 -- 也不能把整块 chip 崩掉。
  const totals = (data && data.totals) || {}

  let label
  let cls = 'xq-pnl-dim'
  let tag = ''
  if (state.status === 'error') {
    label = '今日盈亏 数据异常'
  } else if (!data) {
    label = '今日盈亏 …'
  } else if (!data.rows || data.rows.length === 0) {
    label = '今日盈亏 未录持仓'
  } else if (totals.day_profit === null || totals.day_profit === undefined) {
    // 有持仓但一行行情都没取到：不摆 0，也不摆占位符之外的假数字
    label = '今日盈亏 行情未到'
    tag = '待刷新'
  } else {
    label = '今日 ' + fmtYk(totals.day_profit) + ' (' + fmtPct(totals.day_rate) + ')'
    cls = trendClass(totals.day_profit) || 'xq-pnl-dim'
    tag = OFF_HOURS[data.session] ? (SESSION_TEXT[data.session] || '') : ''
  }

  let title = '今日盈亏 = Σ(现价 − 昨收) × 股数（本地持仓 × 雪球行情，点击查看盈亏页）'
  if (data && data.as_of) title += '\n行情时间：' + new Date(data.as_of).toLocaleString('zh-CN')
  if (data && OFF_HOURS[data.session]) title += '\n非交易时段 · 显示的是最近一次行情'
  if (data && data.rows && data.rows.length === 0) title += '\n还没有持仓：去「持仓」tab 录入，或从账本同步一次'
  if (totals && totals.missing > 0) {
    title += '\n有 ' + totals.missing + ' 只取不到现价，合计不完整'
  }
  if (data && totals && totals.day_base) {
    title += '\n当日涨跌幅 = 今日盈亏 ÷ Σ(昨收 × 股数)，与「市值」不是同一个分母'
  }
  title += '\n不含当日已实现与费用（账本账户口径在「持仓」tab 的同步区）'
  if (state.status === 'error' && state.error) title += '\n' + state.error

  const kids = [el('span', { key: 'v' }, label)]
  if (tag) kids.push(el('span', { key: 'tag', className: 'xq-pnl-tag' }, tag))

  return el('span', {
    className: 'xq-pnl-chip ' + cls,
    title: title,
    onClick: function () {
      const ui = getUiRuntime()
      if (ui) ui.ui.set({ tab: 'pnl', open: true })
    }
  }, kids)
}

/**
 * 「盈亏」tab：大字盈亏 + 口径说明 + 数据源状态 + 行情刷新间隔。
 *
 * 账本的 Cookie / 组合不在这里 —— 它们只服务「从账本同步」，放在「持仓」tab 的同步区，
 * 免得用户以为「今日盈亏还得配 Cookie」。
 */
export function PnlTab(p) {
  const state = usePnlState()
  const data = state.data
  const totals = (data && data.totals) || {}
  const [busy, setBusy] = React.useState(false)
  const [intervalDraft, setIntervalDraft] = React.useState('')
  const [msg, setMsg] = React.useState(null)

  // 打开本 tab 时取一次宿主设置（刷新间隔 + 边界值），顺便读一下账本同步状态。
  React.useEffect(function () {
    let alive = true
    call(A_PNL_VERIFY, {}).then(function (d) {
      if (!alive || !d) return
      if (isFinite(Number(d.poll_ms)) && Number(d.poll_ms) > 0) setIntervalDraft(String(Number(d.poll_ms) / 1000))
    }).catch(function () { /* 未配置凭据时宿主会报错，这里静默：本 tab 不依赖凭据 */ })
    return function () { alive = false }
  }, [])

  function saveInterval() {
    if (busy) return
    setBusy(true)
    setMsg(null)
    call(A_PNL_CONFIG, { pollSec: intervalDraft }).then(function (json) {
      setMsg({ ok: true, text: '行情刷新间隔已设为 ' + json.poll_sec + ' 秒' })
      if (isFinite(Number(json.poll_sec))) setIntervalDraft(String(json.poll_sec))
    }).catch(function (e) {
      setMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setBusy(false) })
  }

  // ---- 大字区：金额 + 涨跌幅 + 时段 ----
  let amountText
  let amountCls = 'xq-pnl-dim'
  let subText = ''
  let subBad = false
  let hasValue = false
  const hasRows = data && data.rows && data.rows.length > 0
  if (state.status === 'error') {
    amountText = '--'
    subText = '数据异常：' + state.error
    subBad = true
  } else if (!data) {
    amountText = '…'
    subText = '加载中…'
  } else if (!hasRows) {
    amountText = '未录持仓'
    subText = '去「持仓」tab 手工录入，或在那边点一次「从账本同步」'
  } else if (totals.day_profit === null || totals.day_profit === undefined) {
    amountText = '--'
    subText = '雪球行情没取到，稍后自动重试（持仓数据不受影响）'
    subBad = true
  } else {
    amountText = fmtYk(totals.day_profit)
    amountCls = trendClass(totals.day_profit) || 'xq-pnl-dim'
    hasValue = true
  }
  const sessionText = data && SESSION_TEXT[data.session] ? SESSION_TEXT[data.session] : ''
  const hero = el('div', { className: 'xq-pnl-hero' }, [
    el('span', { key: 'a', className: 'xq-pnl-amt ' + amountCls }, amountText),
    hasValue ? el('span', { key: 'p', className: 'xq-pnl-pct ' + amountCls }, fmtPct(totals.day_rate)) : null,
    sessionText ? el('span', { key: 's', className: 'xq-pnl-tag' }, sessionText) : null
  ])

  // ---- 次级统计 ----
  const stats = [
    ['持仓盈亏', hasRows && totals.hold_profit !== null ? fmtYk(totals.hold_profit) : '--',
      hasRows && totals.hold_rate !== null ? fmtPct(totals.hold_rate) : '', hasRows ? totals.hold_profit : null],
    ['持仓市值', hasRows ? fmtMoney(totals.value) : '--', '', null],
    ['持仓成本', hasRows ? fmtMoney(totals.cost_value) : '--', '', null],
  ].map(function (it, i) {
    return el('div', { key: 's' + i, className: 'xq-stat' }, [
      el('div', { key: 'k', className: 'xq-stat-k' }, it[0]),
      el('div', { key: 'v', className: 'xq-pos-num ' + (it[3] === null ? '' : (trendClass(it[3]) || '')) },
        it[2] ? (it[1] + ' ' + it[2]) : it[1])
    ])
  })

  const metaParts = []
  if (hasRows) metaParts.push('共 ' + totals.held + ' 只计入合计')
  if (totals && totals.missing > 0) metaParts.push(totals.missing + ' 只缺现价')
  if (data && data.as_of) metaParts.push('行情 ' + new Date(data.as_of).toLocaleString('zh-CN'))
  if (data && isFinite(Number(data.poll_ms))) metaParts.push('刷新间隔 ' + Math.round(Number(data.poll_ms) / 1000) + ' 秒')
  const meta = metaParts.length ? el('div', { className: 'xq-pnl-meta' }, metaParts.join(' · ')) : null

  const intervalRow = el('div', { className: 'xq-pnl-field' }, [
    el('label', { key: 'l' }, '行情刷新间隔'),
    el('input', {
      key: 'i', className: 'xq-pnl-num', type: 'number', min: '5', max: '3600', step: '1',
      value: intervalDraft,
      onChange: function (e) { setIntervalDraft(e.target.value) },
      onKeyDown: function (e) { if (e.key === 'Enter') saveInterval() }
    }),
    el('span', { key: 'u', className: 'xq-pnl-note' }, '秒（5–3600）：盘中按这个节奏刷新行情，盘外自动睡到下一个 09:30/13:00/15:00'),
    el('button', { key: 'b', className: 'xq-btn', disabled: busy, onClick: saveInterval }, busy ? '保存中…' : '保存')
  ])
  const msgEl = msg ? el('div', { key: 'm', className: 'xq-pnl-msg' }, [
    el('span', { key: 'v', className: msg.ok ? 'xq-pnl-ok' : 'xq-pnl-bad' }, (msg.ok ? '✓ ' : '✗ ') + msg.text)
  ]) : null

  const cloud = (data && data.cloud) || null
  const cloudNote = cloud
    ? (cloud.synced_at
      ? '上次从账本同步：' + new Date(cloud.synced_at).toLocaleString('zh-CN')
        + (cloud.account && cloud.account.pnl_yk !== undefined ? '（账户口径今日盈亏 ' + fmtYk(cloud.account.pnl_yk) + '）' : '')
      : '还没成功同步过账本')
    : '还没从账本同步过'

  const notes = [
    el('div', { key: 'n1', className: 'xq-pnl-note' },
      '今日盈亏 = Σ(现价 − 昨收) × 股数，全部由「本地持仓 × 雪球行情」现算，不再向账本要数 —— ' +
      '账本凭据过期也不会让这里的数字停摆。'),
    el('div', { key: 'n2', className: 'xq-pnl-note' },
      '口径差别：本页是「持仓浮动」，不含当日已实现盈亏与费用；账本账户口径含这两项，' +
      '所以两者会差一点（清仓那部分尤其明显）。' + cloudNote + '。'),
    el('div', { key: 'n3', className: 'xq-pnl-note' },
      '持仓的增删改与「从账本同步」都在「持仓」tab；同步只在你自己点的时候发生。')
  ]

  return el('div', { className: 'xq-pnl' }, [hero, el('div', { key: 'st', className: 'xq-pos-stats' }, stats), meta, intervalRow, msgEl].concat(notes))
}

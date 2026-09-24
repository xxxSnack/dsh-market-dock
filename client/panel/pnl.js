// 今日盈亏（同花顺投资账本）：面板头部常驻 chip + 「盈亏」tab。
//
// 两个组件都**自取运行时**（getPnlRuntime / getUiRuntime），不读父级上下文的任何字段，
// 因此 panel/index.js 里 TAB_CTX 的 pnl 工厂返回空对象即可（本文件不使用任何父级上下文字段）。
//
// 展示口径沿用 dsh-ths-pnl 的客户端实现：金额带符号 + 千分位 + 两位小数，百分比两位小数；
// 涨跌按 **A 股习惯（涨=红、跌=绿）** —— 与雪球页面一致，但与欧美习惯相反。
import { el } from '../dom.js'
import { fmtPct } from '../format.js'
import { call, A_PNL_GET, A_PNL_VERIFY, A_PNL_CONFIG } from '../platform.js'
import { getPnlRuntime } from '../store/pnl.js'
import { getUiRuntime } from '../store/ui.js'

// 带符号千分位两位小数（金额）。不用 toFixed 是为了千分位分组。
function fmtYk(value) {
  const n = Number(value) || 0
  const sign = n > 0 ? '+' : (n < 0 ? '-' : '')
  return sign + Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 涨跌配色类（A 股：涨红跌绿）。
function trendClass(value) {
  const n = Number(value) || 0
  if (n > 0) return 'xq-pnl-up'
  if (n < 0) return 'xq-pnl-down'
  return ''
}

// 时段文案。盘外时段（盘前/午间/收盘/休市）要显式标出来，否则用户会以为数字停住是坏了。
const SESSION_TEXT = { pre: '盘前', morning: '盘中', lunch: '午间', afternoon: '盘中', after: '收盘', weekend: '休市' }
const OFF_HOURS = { pre: 1, lunch: 1, after: 1, weekend: 1 }

// 订阅盈亏运行时。返回 state 快照；订阅/退订由 store 的引用计数管轮询器的启停，
// 所以 chip 与 tab 同时挂着也只有一个轮询器、一份数据。
// 导出给底部指数条（client/ticker.js）复用：那里也要判断「有没有东西可显示」。
export function usePnlState() {
  const [state, setState] = React.useState(function () {
    const rt = getPnlRuntime()
    return rt ? rt.getState() : { data: null, status: 'idle', error: '' }
  })
  React.useEffect(function () {
    const rt = getPnlRuntime()
    if (!rt) return function () { }
    setState(rt.getState())   // 订阅前可能已经有数据（另一个订阅者先拉到了）
    return rt.subscribe(function () { setState(rt.getState()) })
  }, [])
  return state
}

// 头部常驻 chip：一行小字展示今日盈亏，点击切到「盈亏」tab。
export function PnlChip() {
  const state = usePnlState()
  const data = state.data

  let label
  let cls = 'xq-pnl-dim'
  let tag = ''
  if (state.status === 'error') {
    label = '今日盈亏 数据异常'
  } else if (!data) {
    label = '今日盈亏 …'
  } else if (data.configured === false) {
    label = '今日盈亏 未配置'
  } else if (data.token_expired) {
    label = '今日盈亏 已过期'
    cls = 'xq-pnl-bad'
  } else if (data.error) {
    label = '今日盈亏 数据异常'
  } else {
    label = '今日 ' + fmtYk(data.pnl_yk) + ' (' + fmtPct(data.pnl_pct) + ')'
    cls = trendClass(data.pnl_yk) || 'xq-pnl-dim'
    tag = OFF_HOURS[data.session] ? (SESSION_TEXT[data.session] || '') : ''
  }

  let title = '同花顺投资账本 · 今日总盈亏（点击查看盈亏页）'
  if (data && data.updated_at) title += '\n数据时间：' + new Date(data.updated_at).toLocaleString('zh-CN')
  if (data && data.frozen) title += '\n非交易时段 · 显示最后一次获取的值'
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

// 完整「盈亏」tab：大字盈亏 + 数据时间 + 时段；组合选择、Cookie、刷新间隔三块配置。
// 形参 p 是 tab 上下文（由 panel/index.js 的 TAB_CTX 提供），本组件不读它的任何字段。
export function PnlTab(p) {
  const state = usePnlState()
  const data = state.data
  const [draft, setDraft] = React.useState('')          // Cookie 草稿
  const [status, setStatus] = React.useState(null)      // pnl.verify / pnl.config 的结果
  const [busy, setBusy] = React.useState(false)
  const [intervalDraft, setIntervalDraft] = React.useState('')

  // 打开本 tab 时校验一次：拿到组合列表、当前生效间隔、宿主给的可调范围。
  React.useEffect(function () {
    let alive = true
    // 先用快照里的生效值即时预填，避免输入框空一瞬
    const rt = getPnlRuntime()
    const snap = rt ? rt.data : null
    if (snap && isFinite(Number(snap.poll_ms)) && Number(snap.poll_ms) > 0) setIntervalDraft(String(Number(snap.poll_ms) / 1000))
    call(A_PNL_VERIFY, {}).then(function (d) {
      if (!alive) return
      setStatus(d || null)
      if (d && isFinite(Number(d.poll_ms)) && Number(d.poll_ms) > 0) setIntervalDraft(String(Number(d.poll_ms) / 1000))
    }).catch(function (e) {
      if (alive) setStatus({ configured: true, valid: false, error: String((e && e.message) || e) })
    })
    return function () { alive = false }
  }, [])

  // 合并而不是整体替换：只改间隔时宿主不回组合列表，整体替换会让「组合」下拉框凭空消失。
  // checked=true 表示本次真的提交了 Cookie（或清了 Cookie），此时宿主的 valid 才算数；
  // 只改间隔 / 换组合时宿主不校验、会把 valid 回传成 false，界面不该因此从「有效」退回「待校验」。
  function applyResult(json, checked) {
    setStatus(function (prev) {
      const old = prev || {}
      const configured = json.configured !== undefined ? json.configured : (old.configured !== undefined ? old.configured : true)
      return {
        configured: configured,
        valid: checked ? (json.valid !== undefined ? json.valid : old.valid) : (old.valid !== undefined ? old.valid : json.valid),
        // 已清除时不再保留上一轮报错，否则「已清除」旁边还挂着「Cookie 已过期」
        error: configured === false ? '' : (json.error !== undefined ? json.error : old.error),
        // 非空数组才覆盖：只改间隔时宿主可能回空列表，直接替换会让下拉框消失
        portfolios: (json.portfolios && json.portfolios.length) ? json.portfolios : (configured === false ? [] : (old.portfolios || [])),
        fundKey: json.fundKey !== undefined ? json.fundKey : old.fundKey,
        poll_ms: json.poll_ms !== undefined ? json.poll_ms : old.poll_ms,
        min_sec: json.min_sec !== undefined ? json.min_sec : old.min_sec,
        max_sec: json.max_sec !== undefined ? json.max_sec : old.max_sec,
        savedSec: json.poll_sec
      }
    })
  }

  // 所有配置写操作走同一条路：提交 → 合并结果 → 让 store 立刻重取一次快照（chip 同步更新）
  function post(args, checked) {
    if (busy) return
    setBusy(true)
    call(A_PNL_CONFIG, args).then(function (json) {
      applyResult(json, checked === true)
      if (json && isFinite(Number(json.poll_sec))) setIntervalDraft(String(json.poll_sec))
      if (json && json.valid) setDraft('')
      const rt = getPnlRuntime()
      // 配置 Cookie/组合后即使处于收盘时段也要立即取一次，避免继续展示旧账户快照。
      if (rt) rt.refresh(true)
    }).catch(function (e) {
      setStatus(function (prev) {
        return Object.assign({}, prev || {}, { valid: false, error: String((e && e.message) || e) })
      })
    }).then(function () { setBusy(false) })
  }

  function save() {
    const cookie = draft.trim()
    const args = { pollSec: intervalDraft }
    if (cookie) args.cookie = cookie
    post(args, args.cookie !== undefined)
  }
  function clearCookie() { setDraft(''); post({ clear: true }, true) }
  function chooseFund(key) { post({ fundKey: key }, false) }
  function forceRefresh() {
    const rt = getPnlRuntime()
    if (rt) rt.refresh(true)   // force：跳过宿主时段缓存，立刻打一次上游
  }

  const cfg = status || {}
  const portfolios = cfg.portfolios || []
  const fundKey = cfg.fundKey || ''
  const minSec = Number(cfg.min_sec) > 0 ? Number(cfg.min_sec) : 5
  const maxSec = Number(cfg.max_sec) > 0 ? Number(cfg.max_sec) : 3600
  const currentSec = Number(cfg.poll_ms || (data && data.poll_ms) || 0) / 1000
  const intervalDirty = intervalDraft !== '' && Number(intervalDraft) !== currentSec
  const canSave = !busy && (draft.trim().length > 0 || intervalDirty)

  // ---- 大字区：金额 + 百分比 + 时段 ----
  let amountText
  let amountCls
  let subText = ''
  let subBad = false       // 副标题是「真问题」（红/黄）还是「中性提示」（灰）
  let hasValue = false
  if (state.status === 'error') {
    amountText = '--'
    amountCls = 'xq-pnl-dim'
    subText = '数据异常：' + state.error
    subBad = true
  } else if (!data) {
    amountText = '…'
    amountCls = 'xq-pnl-dim'
    subText = '加载中…'
  } else if (data.configured === false) {
    amountText = '未配置'
    amountCls = 'xq-pnl-dim'
    subText = '粘贴同花顺投资账本 Cookie 后即可显示今日盈亏'
  } else if (data.token_expired) {
    amountText = '已过期'
    amountCls = 'xq-pnl-bad'
    subText = data.error || 'Cookie 已过期，请重新粘贴'
    subBad = true
  } else if (data.error) {
    amountText = '--'
    amountCls = 'xq-pnl-dim'
    subText = data.error
    subBad = true
  } else {
    amountText = fmtYk(data.pnl_yk)
    amountCls = trendClass(data.pnl_yk) || 'xq-pnl-dim'
    hasValue = true
  }
  const sessionText = data && SESSION_TEXT[data.session] ? SESSION_TEXT[data.session] : ''
  const hero = el('div', { className: 'xq-pnl-hero' }, [
    el('span', { key: 'a', className: 'xq-pnl-amt ' + amountCls }, amountText),
    hasValue ? el('span', { key: 'p', className: 'xq-pnl-pct ' + amountCls }, fmtPct(data.pnl_pct)) : null,
    sessionText ? el('span', { key: 's', className: 'xq-pnl-tag' }, sessionText) : null
  ])

  const metaParts = []
  if (data && data.updated_at) metaParts.push('数据时间 ' + new Date(data.updated_at).toLocaleString('zh-CN'))
  if (data && data.frozen) metaParts.push('非交易时段 · 已冻结在收盘值')
  if (data && isFinite(Number(data.poll_ms))) metaParts.push('刷新间隔 ' + Math.round(Number(data.poll_ms) / 1000) + ' 秒')
  const meta = metaParts.length ? el('div', { className: 'xq-pnl-meta' }, metaParts.join(' · ')) : null
  const sub = subText ? el('div', { className: subBad ? 'xq-pnl-sub xq-pnl-bad' : 'xq-pnl-sub' }, subText) : null

  // ---- 组合账户 ----
  const fundRow = el('div', { className: 'xq-pnl-field' }, [
    el('label', { key: 'l' }, '组合账户'),
    portfolios.length
      ? el('select', {
        key: 's', className: 'xq-pnl-sel', value: fundKey, disabled: busy || portfolios.length < 2,
        onChange: function (e) { chooseFund(e.target.value) }
      }, portfolios.map(function (it, i) {
        return el('option', { key: String(i), value: it.fund_key }, it.name || it.manualname || it.brokername || it.fund_key)
      }))
      : el('span', { key: 's', className: 'xq-pnl-note' }, '未读到组合（Cookie 有效后自动列出）')
  ])

  // ---- Cookie ----
  const cookieBlock = el('div', { className: 'xq-pnl-block' }, [
    el('div', { key: 't', className: 'xq-pnl-sec' }, 'Cookie（同花顺投资账本）'),
    el('div', { key: 'tip', className: 'xq-pnl-note' }, '登录 tzzb.10jqka.com.cn 后按 F12 → 控制台执行 copy(document.cookie)，把结果粘贴到这里。与 dsh-ths-pnl 插件共用同一份凭据与快照，粘一次两边都生效。'),
    el('textarea', {
      key: 'ta', className: 'xq-pnl-ta',
      placeholder: '直接粘贴整段 Cookie（形如 v=...; userid=...; pex_userid=...）',
      value: draft,
      onChange: function (e) { setDraft(e.target.value) }
    })
  ])

  // ---- 刷新间隔 ----
  const intervalRow = el('div', { className: 'xq-pnl-field' }, [
    el('label', { key: 'l' }, '刷新间隔'),
    el('input', {
      key: 'i', className: 'xq-pnl-num', type: 'number', min: String(minSec), max: String(maxSec), step: '1',
      value: intervalDraft,
      onChange: function (e) { setIntervalDraft(e.target.value) },
      onKeyDown: function (e) { if (e.key === 'Enter') save() }
    }),
    el('span', { key: 'u', className: 'xq-pnl-note' }, '秒（' + minSec + '–' + maxSec + '，超出会被夹到边界）')
  ])

  const btnRow = el('div', { className: 'xq-pnl-row' }, [
    el('button', { key: 'save', className: 'xq-btn', disabled: !canSave, onClick: save },
      busy ? '处理中…' : (draft.trim().length > 0 ? '保存并校验' : '保存间隔')),
    el('button', { key: 'clr', className: 'xq-btn', disabled: busy, title: '只清 Cookie，保留最后一次快照', onClick: clearCookie }, '清除 Cookie'),
    el('button', { key: 'now', className: 'xq-btn', disabled: busy, title: '跳过宿主时段缓存，立刻打一次上游', onClick: forceRefresh }, '立即刷新')
  ])

  // ---- 校验结果 ----
  const msgParts = []
  if (status) {
    if (cfg.valid) msgParts.push(el('span', { key: 'v', className: 'xq-pnl-ok' }, '✓ Cookie 有效，' + portfolios.length + ' 个组合'))
    else if (cfg.configured === false) msgParts.push(el('span', { key: 'v', className: 'xq-pnl-note' }, '未配置 Cookie'))
    else if (cfg.error) msgParts.push(el('span', { key: 'v', className: 'xq-pnl-bad' }, '✗ ' + cfg.error))
    else msgParts.push(el('span', { key: 'v', className: 'xq-pnl-note' }, '待校验'))
    if (cfg.savedSec !== undefined && cfg.savedSec !== null && isFinite(Number(cfg.savedSec))) {
      msgParts.push(el('span', { key: 's', className: 'xq-pnl-note' }, '刷新间隔已设为 ' + cfg.savedSec + ' 秒'))
    }
  }
  const msg = msgParts.length ? el('div', { className: 'xq-pnl-msg' }, msgParts) : null

  return el('div', { className: 'xq-pnl' }, [hero, meta, sub, fundRow, cookieBlock, intervalRow, btnRow, msg])
}

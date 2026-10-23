// 「持仓」tab：**本地持仓**（主数据）的查看、手工增删改，以及「从账本同步」。
//
// 定位（改造后）：持仓是本地文件里的一份可编辑数据；价格与盈亏由雪球行情现算（宿主算，
// 见 lib/pnl/index.js）。这里的股数与成本价就是「输入」—— 改完立即反映到今日盈亏。
//
// 账本只有两个入口，都在本 tab 的「从账本同步」区里，且**只在用户点击时**才发请求：
//   · 导入 / 校对（merge）：账本有则更新 qty/cost，账本没有的本地行保留；
//   · 用账本覆盖（replace）：整表以账本为准。
// 同步失败（Cookie 过期 / 403 / 断网）只影响这个按钮的结果，**持仓与今日盈亏照常**。
//
// 本组件自取运行时（usePositionsState），不读父级任何上下文字段：
// panel/index.js 的 TAB_CTX.positions 返回空对象即可。
import { el } from '../dom.js'
import { colorOf } from '../format.js'
import { call, A_PNL_VERIFY, A_PNL_CONFIG } from '../platform.js'
import { usePositionsState, getPositionsRuntime } from '../store/positions.js'
import { menuUpward } from '../menu.js'

/** 金额：无符号 + 千分位 + 两位小数。 */
function money(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 金额：带符号 + 千分位（盈亏用）。 */
function signedMoney(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  const sign = n > 0 ? '+' : (n < 0 ? '-' : '')
  return sign + Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 股数：整数 + 千分位（A 股 1 手 = 100 股，这里显示的是**股数**）。 */
function qtyText(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

/** 价格：低价品种（ETF/基金/港股）保留三位小数，其余两位。 */
function priceText(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  return Math.abs(n) < 10 ? n.toFixed(3) : n.toFixed(2)
}

function rateText(v) {
  if (v === null || v === undefined) return ''
  const n = Number(v)
  if (!isFinite(n)) return ''
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}

/**
 * 涨跌单元：金额在上、涨跌幅在下，颜色由**涨跌方向**决定（A 股习惯：涨红跌绿，见 styles.css
 * 的 .xq-up/.xq-down/.xq-flat）。金额与涨跌幅都取不到时显示 `--`，不假装是 0。
 */
function changeCell(profit, rate, showRate, title) {
  const hasAmount = profit !== null && profit !== undefined && isFinite(Number(profit))
  const rateTxt = showRate ? rateText(rate) : ''
  if (!hasAmount && !rateTxt) {
    return el('span', { className: 'xq-pos-r xq-pos-num xq-pos-chg xq-flat', title: title }, '--')
  }
  return el('span', { className: 'xq-pos-r xq-pos-num xq-pos-chg ' + colorOf(hasAmount ? profit : rate), title: title }, [
    el('span', { key: 'a', className: 'xq-pos-amt' }, hasAmount ? signedMoney(profit) : '--'),
    rateTxt ? el('span', { key: 'b', className: 'xq-pos-rate' }, rateTxt) : null
  ])
}

/** 时间戳 → 「MM-DD HH:mm」；取不到给空串。 */
function stampText(iso) {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (!isFinite(t)) return ''
  const d = new Date(t)
  function p(n) { return n < 10 ? '0' + n : String(n) }
  return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

const BLANK_FORM = { code: '', name: '', qty: '', cost: '' }

// 「持仓」tab：合计 + 可编辑的逐只持仓表 + 从账本同步区。
export function PositionsTab(p) {
  const state = usePositionsState()
  const data = state.data
  const totals = (data && data.totals) || {}

  const [form, setForm] = React.useState(null)       // null = 表单关闭；否则 {code,name,qty,cost}
  const [originalCode, setOriginalCode] = React.useState('')  // 编辑时原代码（改代码用）
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState(null)         // { ok, text }
  const [syncOpen, setSyncOpen] = React.useState(false)
  const [cookieDraft, setCookieDraft] = React.useState('')
  const [book, setBook] = React.useState(null)       // pnl.verify 的结果（凭据 / 组合 / 上次同步）
  const [menuFor, setMenuFor] = React.useState('')   // 行内「更多」菜单：当前展开的代码（一次只开一个）
  const [menuUp, setMenuUp] = React.useState(false)  // 向上展开（最后一行的下方没空间）

  // 菜单的键盘/点击外部收起：只在有菜单展开时挂监听，避免常驻 document 监听。
  React.useEffect(function () {
    if (!menuFor) return function () { }
    function onKey(e) { if (e.key === 'Escape') setMenuFor('') }
    function onDown(e) {
      const t = e && e.target
      if (t && typeof t.closest === 'function' && t.closest('.xq-menu-wrap')) return
      setMenuFor('')
    }
    // 持仓表在窄容器里是横向滚动容器（另一个轴也会被算成裁剪轴）：滚动后落点失效，直接收起
    function onScroll() { setMenuFor('') }
    try {
      window.addEventListener('keydown', onKey)
      document.addEventListener('pointerdown', onDown, true)
      document.addEventListener('scroll', onScroll, true)
    } catch (e) { /* 无 DOM 时忽略 */ }
    return function () {
      try {
        window.removeEventListener('keydown', onKey)
        document.removeEventListener('pointerdown', onDown, true)
        document.removeEventListener('scroll', onScroll, true)
      } catch (e) { /* ignore */ }
    }
  }, [menuFor])

  function toggleMenu(code, e) {
    if (menuFor === code) { setMenuFor(''); return }
    // 表格会裁剪绝对定位的子元素：最后一行的菜单向下展开会被切掉 → 按剩余空间翻向
    setMenuUp(menuUpward(e && e.currentTarget ? e.currentTarget : null, 0))
    setMenuFor(code)
  }

  // 打开同步区时才去校验凭据（不打开就一次账本请求都不发 —— 连校验都不做）
  React.useEffect(function () {
    if (!syncOpen) return function () { }
    let alive = true
    call(A_PNL_VERIFY, {}).then(function (d) {
      if (alive && d) setBook(d)
    }).catch(function (e) {
      if (alive) setBook({ configured: false, valid: false, error: String((e && e.message) || e), portfolios: [], fundKey: '' })
    })
    return function () { alive = false }
  }, [syncOpen])

  function openAdd() {
    setMsg(null)
    setOriginalCode('')
    setForm(Object.assign({}, BLANK_FORM))
  }
  function openEdit(row) {
    setMsg(null)
    setOriginalCode(row.code)
    setForm({ code: row.code, name: row.name || '', qty: row.qty === null ? '' : String(row.qty), cost: row.cost === null ? '' : String(row.cost) })
  }
  function closeForm() { setForm(null); setOriginalCode('') }

  function submit() {
    if (busy || !form) return
    const rt = getPositionsRuntime()
    if (!rt) return
    setBusy(true)
    rt.save({ code: form.code, name: form.name, qty: form.qty, cost: form.cost === '' ? null : form.cost }, originalCode || undefined).then(function () {
      setMsg({ ok: true, text: originalCode ? '已保存 ' + String(form.code).toUpperCase() : '已添加 ' + String(form.code).toUpperCase() })
      closeForm()
    }).catch(function (e) {
      setMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setBusy(false) })
  }

  function removeRow(row) {
    const rt = getPositionsRuntime()
    if (!rt || busy) return
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('从持仓里删除 ' + (row.name || row.code) + '？')) return
    setBusy(true)
    rt.remove(row.code).then(function () {
      setMsg({ ok: true, text: '已删除 ' + (row.name || row.code) })
    }).catch(function (e) {
      setMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setBusy(false) })
  }

  function refreshNow() {
    const rt = getPositionsRuntime()
    if (!rt || busy) return
    setBusy(true)
    rt.refresh(true).then(function () { setBusy(false) })
  }

  // ---- 账本同步 ----
  function saveCookie() {
    if (busy) return
    setBusy(true)
    setMsg(null)
    call(A_PNL_CONFIG, { cookie: cookieDraft.trim() }).then(function (json) {
      setBook(json)
      setCookieDraft('')
      setMsg({ ok: Boolean(json.valid), text: json.valid ? ('账本 Cookie 有效，' + (json.portfolios || []).length + ' 个组合') : ('校验失败：' + (json.error || '未知原因')) })
    }).catch(function (e) {
      setMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setBusy(false) })
  }

  function chooseFund(key) {
    if (busy) return
    setBusy(true)
    call(A_PNL_CONFIG, { fundKey: key }).then(function (json) {
      setBook(function (prev) { return Object.assign({}, prev || {}, { fundKey: json.fundKey, valid: prev ? prev.valid : false, portfolios: (prev && prev.portfolios) || [] }) })
    }).catch(function (e) {
      setMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setBusy(false) })
  }

  function doSync(mode) {
    const rt = getPositionsRuntime()
    if (!rt || busy) return
    if (mode === 'replace' && typeof window !== 'undefined' && window.confirm
      && !window.confirm('用账本覆盖本地全部持仓？手工录入的行会被清掉。')) return
    setBusy(true)
    setMsg(null)
    rt.sync(mode).then(function (res) {
      if (res && res.ok) {
        const rep = res.report || {}
        const parts = ['新增 ' + (rep.added || []).length, '更新 ' + (rep.updated || []).length]
        if ((rep.kept || []).length) parts.push('本地保留 ' + rep.kept.length)
        if ((rep.cleared || []).length) parts.push('已清仓 ' + rep.cleared.length)
        setMsg({ ok: true, text: '同步完成：' + parts.join(' · ') })
      } else {
        setMsg({ ok: false, text: '同步失败（持仓与盈亏不受影响）：' + ((res && res.error) || '未知原因') })
      }
    }).catch(function (e) {
      setMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setBusy(false) })
  }

  if (!data) {
    return el('div', { className: 'xq-loading' },
      state.status === 'error' ? ('持仓加载失败：' + state.error) : '持仓加载中…')
  }

  const rows = (Array.isArray(data.rows) ? data.rows.slice() : []).sort(function (a, b) {
    return (Number(b.value) || 0) - (Number(a.value) || 0)
  })

  // ---- 合计（视觉重点：今日盈亏 / 持仓盈亏两项突出，市值与成本放右侧辅助区）----
  const heroItem = function (key, label, amount, rate, value) {
    const cls = (value === null || value === undefined) ? '' : (colorOf(value) || '')
    return el('div', { key: key, className: 'xq-pos-hero-main' }, [
      el('div', { key: 'k', className: 'xq-pos-hero-k' }, label),
      el('div', { key: 'v', className: 'xq-pos-hero-amt ' + cls }, [
        el('span', { key: 'a' }, amount),
        rate ? el('span', { key: 'p', className: 'xq-pos-hero-pct' }, rate) : null
      ])
    ])
  }
  const hasRows = data.rows.length > 0
  const hero = el('div', { key: 'hero', className: 'xq-pos-hero' }, [
    heroItem('day', '今日盈亏', hasRows ? signedMoney(totals.day_profit) : '--', hasRows ? rateText(totals.day_rate) : '', hasRows ? totals.day_profit : null),
    heroItem('hold', '持仓盈亏', rows.length ? signedMoney(totals.hold_profit) : '--', rows.length ? rateText(totals.hold_rate) : '', rows.length ? totals.hold_profit : null),
    el('div', { key: 'aux', className: 'xq-pos-hero-aux' }, [
      el('div', { key: 'm' }, [
        el('span', { key: 'k', className: 'xq-pos-aux-k' }, '持仓市值 '),
        el('span', { key: 'v', className: 'xq-pos-aux-v' }, rows.length ? money(totals.value) : '--')
      ]),
      el('div', { key: 'c' }, [
        el('span', { key: 'k', className: 'xq-pos-aux-k' }, '持仓成本 '),
        el('span', { key: 'v', className: 'xq-pos-aux-v' }, rows.length ? money(totals.cost_value) : '--')
      ])
    ])
  ])

  // ---- 表单（新增 / 编辑共用）----
  function field(key, label, placeholder, type) {
    return el('label', { key: key, className: 'xq-pos-field' }, [
      el('span', { key: 'l', className: 'xq-pos-field-k' }, label),
      el('input', {
        key: 'i', className: 'xq-pos-input', type: type || 'text', placeholder: placeholder,
        value: form[key],
        onChange: function (e) {
          const v = e.target.value
          setForm(function (prev) { const next = Object.assign({}, prev); next[key] = v; return next })
        },
        onKeyDown: function (e) { if (e.key === 'Enter') submit() }
      })
    ])
  }
  const formEl = form ? el('div', { key: 'form', className: 'xq-pos-form' }, [
    el('div', { key: 'hd', className: 'xq-pos-form-hd' }, originalCode ? ('编辑 ' + originalCode) : '添加持仓'),
    el('div', { key: 'f', className: 'xq-pos-form-row' }, [
      field('code', '代码', '600519 / 00700 / AAPL'),
      field('name', '名称（可空）', '留空自动按代码取'),
      field('qty', '股数', '100', 'number'),
      field('cost', '成本价（可空）', '摊薄成本', 'number'),
    ]),
    el('div', { key: 'bt', className: 'xq-pos-form-btns' }, [
      el('button', { key: 'ok', className: 'xq-btn', disabled: busy, onClick: submit }, busy ? '保存中…' : '保存'),
      el('button', { key: 'no', className: 'xq-btn', disabled: busy, onClick: closeForm }, '取消'),
      el('span', { key: 'hint', className: 'xq-pnl-note' }, '代码唯一；港股填 00700 或 HK00700 都行。只输代码+股数也能用，成本价留空则「持仓盈亏」显示 --。')
    ])
  ]) : null

  // ---- 表头 / 表体 ----
  const head = el('div', { key: 'hd', className: 'xq-pos-grid xq-pos-hd' }, [
    el('span', { key: 'n' }, '名称 / 代码'),
    el('span', { key: 'q', className: 'xq-pos-r', title: '股数' }, '股数'),
    el('span', { key: 'c', className: 'xq-pos-r', title: '持仓成本价（摊薄成本）' }, '成本价'),
    el('span', { key: 'p', className: 'xq-pos-r' }, '现价'),
    el('span', { key: 'd', className: 'xq-pos-r', title: '当日盈亏 / 当日涨跌幅 =（现价 − 昨收）× 股数' }, '当日盈亏'),
    el('span', { key: 'v', className: 'xq-pos-r' }, '市值'),
    el('span', { key: 'y', className: 'xq-pos-r', title: '持仓盈亏 / 持仓收益率（相对成本价）' }, '持仓盈亏'),
    el('span', { key: 'o', className: 'xq-pos-r' }, '操作')
  ])

  const body = rows.map(function (row, i) {
    const hasQty = row.qty !== null && row.qty !== undefined && isFinite(Number(row.qty))
    const cleared = hasQty && Number(row.qty) <= 0
    let dayTitle = '当日盈亏 / 当日涨跌幅 =（现价 − 昨收）× 股数'
    if (row.prev_close !== null && row.prev_close !== undefined) dayTitle += '；昨收 ' + priceText(row.prev_close)
    if (row.xq_symbol) dayTitle += '\n行情代码 ' + row.xq_symbol
    const menuOpen = menuFor === row.code
    return el('div', { key: 'r' + row.code, className: 'xq-pos-grid xq-pos-row' + (cleared ? ' xq-pos-cleared' : '') }, [
      el('span', { key: 'n', className: 'xq-pos-name' }, [
        el('span', { key: 'nm', className: 'xq-pos-nm', title: row.name || row.code }, row.name || row.code || '—'),
        el('span', { key: 'cd', className: 'xq-pos-code' }, row.code || ''),
        cleared ? el('span', { key: 'd', className: 'xq-pos-days' }, '已清仓') : null
      ]),
      el('span', { key: 'q', className: 'xq-pos-r xq-pos-num', title: '股数' }, qtyText(row.qty)),
      el('span', { key: 'c', className: 'xq-pos-r xq-pos-num xq-pos-cost', title: '持仓成本价（摊薄成本）' }, priceText(row.cost)),
      el('span', { key: 'p', className: 'xq-pos-r xq-pos-num' }, priceText(row.price)),
      el('span', { key: 'd', className: 'xq-pos-cell' },
        cleared
          ? changeCell(null, null, false, '已清仓（股数 0）：不计入合计，可删掉这一行')
          : changeCell(row.day_profit, row.day_rate, true, dayTitle)),
      el('span', { key: 'v', className: 'xq-pos-r xq-pos-num' }, money(row.value)),
      el('span', { key: 'y', className: 'xq-pos-cell' }, changeCell(row.hold_profit, row.hold_rate, !cleared, '持仓盈亏 / 持仓收益率（相对成本价）')),
      el('span', { key: 'o', className: 'xq-pos-r xq-pos-ops' }, [
        el('button', { key: 'e', className: 'xq-btn-mini', disabled: busy, onClick: function () { openEdit(row) } }, '编辑'),
        // 破坏性操作收进「更多」菜单；菜单可用键盘打开（Enter/空格），Esc 或点外部关闭。
        el('span', { key: 'm', className: 'xq-menu-wrap' }, [
          el('button', {
            key: 'mb', className: 'xq-btn-mini xq-icon-btn', disabled: busy,
            title: '更多操作', 'aria-label': '更多操作', 'aria-haspopup': 'menu', 'aria-expanded': menuOpen ? 'true' : 'false',
            onClick: function (e) { e.stopPropagation(); toggleMenu(row.code, e) }
          }, '⋯'),
          menuOpen ? el('div', { key: 'mu', className: 'xq-menu' + (menuUp ? ' xq-menu-up' : ''), role: 'menu' }, [
            el('button', {
              key: 'del', className: 'xq-menu-item xq-danger', role: 'menuitem',
              onClick: function (e) { e.stopPropagation(); setMenuFor(''); removeRow(row) }
            }, '删除持仓')
          ]) : null
        ])
      ])
    ])
  })

  // ---- 同步区 ----
  const b = book || {}
  const portfolios = b.portfolios || []
  const cloud = data.cloud || null
  const syncSection = syncOpen ? el('div', { key: 'sync', className: 'xq-pos-sync' }, [
    el('div', { key: 't', className: 'xq-pnl-sec' }, '从账本同步（同花顺投资账本 · 只在点按钮时请求）'),
    el('div', { key: 'st', className: 'xq-pnl-note' },
      b.configured === false
        ? '还没有账本 Cookie。粘一次就能用「同步」；不粘也行 —— 手工录入的持仓一样能算今日盈亏。'
        : (b.valid
          ? '✓ Cookie 有效，' + portfolios.length + ' 个组合'
          : ('✗ ' + (b.error || '待校验')))),
    cloud ? el('div', { key: 'cd', className: 'xq-pnl-note' },
      (cloud.synced_at ? '上次成功同步 ' + new Date(cloud.synced_at).toLocaleString('zh-CN') : '还没成功同步过')
      + (cloud.attempted_at && cloud.error ? '；上次尝试 ' + stampText(cloud.attempted_at) + ' 失败' : '')) : null,
    cloud && cloud.error ? el('div', { key: 'ce', className: 'xq-pos-hint' }, cloud.error) : null,
    el('textarea', {
      key: 'ta', className: 'xq-pnl-ta',
      placeholder: '账本 Cookie（登录 tzzb.10jqka.com.cn 后 F12 → copy(document.cookie)）',
      value: cookieDraft,
      onChange: function (e) { setCookieDraft(e.target.value) }
    }),
    el('div', { key: 'r1', className: 'xq-pnl-row' }, [
      el('button', { key: 's', className: 'xq-btn', disabled: busy || cookieDraft.trim().length === 0, onClick: saveCookie }, '保存并校验'),
      portfolios.length ? el('select', {
        key: 'sel', className: 'xq-pnl-sel', value: b.fundKey || '', disabled: busy || portfolios.length < 2,
        onChange: function (e) { chooseFund(e.target.value) }
      }, portfolios.map(function (it, i) {
        return el('option', { key: String(i), value: it.fund_key }, it.name || it.fund_key)
      })) : null
    ]),
    el('div', { key: 'r2', className: 'xq-pnl-row' }, [
      el('button', { key: 'm', className: 'xq-btn', disabled: busy || b.valid !== true, onClick: function () { doSync('merge') }, title: '账本有则更新股数/成本，账本没有的本地行保留' }, busy ? '同步中…' : '从账本导入 / 校对'),
      el('button', { key: 'r', className: 'xq-btn', disabled: busy || b.valid !== true, onClick: function () { doSync('replace') }, title: '整表以账本为准，手工录入的行会被清掉' }, '用账本覆盖全部')
    ]),
    el('div', { key: 'note', className: 'xq-pnl-note' },
      '同步会更新「股数」与「成本价」这两列（账本是这两个数的来源），价格与盈亏仍然由行情现算。' +
      '同步失败不影响持仓与今日盈亏 —— 这正是把账本降级成「一次性导入工具」的目的。')
  ]) : null

  const headLine = el('div', { key: 'hl', className: 'xq-pos-head' }, [
    el('span', { key: 't', className: 'xq-pos-title' },
      '持仓 ' + rows.length + ' 只' + (data.updated_at ? ' · 本地更新 ' + stampText(data.updated_at) : '')),
    el('span', { key: 'sp', className: 'xq-spacer' }),
    // 「添加持仓」是页面主操作，同步/刷新为次级
    el('button', { key: 'add', className: 'xq-btn xq-btn-primary', disabled: busy, onClick: openAdd }, '＋ 添加持仓'),
    el('button', { key: 'syn', className: 'xq-btn xq-btn-quiet', onClick: function () { setSyncOpen(!syncOpen) }, 'aria-expanded': syncOpen ? 'true' : 'false' }, syncOpen ? '收起同步' : '账本同步'),
    el('button', { key: 'rf', className: 'xq-btn xq-btn-quiet', disabled: busy, onClick: refreshNow }, busy ? '刷新中…' : '刷新行情')
  ])

  const dayMissing = rows.length > 0 && rows.every(function (r) { return r.day_profit === null || r.day_profit === undefined })

  // 口径说明：默认一行摘要，展开可读完整说明（触屏/键盘都能读，不藏在 tooltip 里）
  const notes = [
    el('div', { key: 'n1', className: 'xq-pnl-note' }, '价格与盈亏由雪球行情现算，不落盘；合计按逐行取整后相加。')
  ]
  if (dayMissing) {
    notes.push(el('div', { key: 'nq', className: 'xq-pos-hint' }, '当日盈亏暂不可用（雪球行情取数失败），其余字段不受影响'))
  }
  if (msg) notes.unshift(el('div', { key: 'm', className: msg.ok ? 'xq-pnl-ok' : 'xq-err' }, (msg.ok ? '✓ ' : '✗ ') + msg.text))
  if (rows.length === 0 && !formEl) {
    notes.unshift(el('div', { key: 'n0', className: 'xq-loading' },
      '还没有持仓：点「＋ 添加持仓」手工录入，或展开「账本同步」拉一次账本。'))
  }
  notes.push(el('details', { key: 'n2', className: 'xq-pos-notes-details' }, [
    el('summary', { key: 's', className: 'xq-pnl-note' }, '口径说明'),
    el('div', { key: 'b', className: 'xq-pnl-note' },
      '持仓是本地数据（可增删改）；股数 × 成本价就是「输入」，现价 / 当日盈亏 / 持仓盈亏全部由雪球行情现算，不落盘。'),
    el('div', { key: 'c', className: 'xq-pnl-note' },
      '当日盈亏 =（现价 − 昨收）× 股数；持仓盈亏 =（现价 − 成本价）× 股数。合计按逐行取整后相加，所以和表格里每一行的数字对得上。')
  ]))

  return el('div', null, [
    hero,
    headLine,
    formEl,
    el('div', { key: 'tbl', className: 'xq-pos-table' }, [head].concat(body)),
    syncSection,
    el('div', { key: 'notes', className: 'xq-pos-notes' }, notes)
  ])
}

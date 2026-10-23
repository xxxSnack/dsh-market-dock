// 行情 tab：指数卡 + 自选表格（排序 / 闪烁 / 加删自选 / 行内价格提醒）。
// 显式上下文 p：
//   p.quotes / p.indices / p.flashDir / p.sortK / p.sortAsc / p.setSortK / p.setSortAsc
//   p.openDetail / p.removeWatch / p.manualCode / p.setManualCode / p.addManual
//   p.alertRules / p.alertDrafts / p.setAlertDrafts / p.setAlert / p.removeAlert / p.alertBusy
//
// UI 约定（本轮重构）：
//   · 行点击仍然进详情；名称本身也是可聚焦按钮（键盘可达）。
//   · 不再常驻「详情」按钮：操作区显示铃铛 + 更多菜单。
//   · 铃铛点开在**该行下方**展开提醒编辑区，一次只展开一行；关闭编辑不等于删除已有规则。
import { el } from '../dom.js'
import { fmt, fmtPct, fmtVol, colorOf } from '../format.js'
import { menuUpward } from '../menu.js'

/** 铃铛图标：静态内联 SVG（一致线宽，不引图标库、不用 emoji）。 */
function bellIcon(active) {
  return el('svg', {
    key: 'bell', viewBox: '0 0 16 16', width: '13', height: '13', 'aria-hidden': 'true', focusable: 'false',
    fill: active ? 'currentColor' : 'none', stroke: 'currentColor', strokeWidth: '1.3',
    strokeLinecap: 'round', strokeLinejoin: 'round'
  }, [
    el('path', { key: 'p', d: 'M4 6.6a4 4 0 0 1 8 0c0 2.1.5 3.1 1.2 3.9H2.8C3.5 9.7 4 8.7 4 6.6z' }),
    el('path', { key: 'c', d: 'M6.6 12.6a1.6 1.6 0 0 0 2.8 0' })
  ])
}

export function MarketTab(p) {
  // 当前展开提醒编辑区的标的（一次只展开一行）
  const [openAlert, setOpenAlert] = React.useState('')
  const [menuFor, setMenuFor] = React.useState('')
  const [menuUp, setMenuUp] = React.useState(false)   // 菜单向上展开（最后一行下方没空间）

  React.useEffect(function () {
    if (!menuFor) return function () { }
    function onKey(e) { if (e.key === 'Escape') setMenuFor('') }
    function onDown(e) {
      const t = e && e.target
      if (t && typeof t.closest === 'function' && t.closest('.xq-menu-wrap')) return
      setMenuFor('')
    }
    // 滚动会让「按钮位置」失效（菜单是相对按钮定位的）：直接收起，避免菜单停在旧位置被裁剪
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

  function toggleMenu(symbol, e) {
    const open = menuFor === symbol
    if (open) { setMenuFor(''); return }
    // 表格有 overflow: hidden，最后一行的菜单向下展开会被裁掉 → 按剩余空间决定展开方向
    setMenuUp(menuUpward(e && e.currentTarget ? e.currentTarget : null, 0))
    setMenuFor(symbol)
  }

  const sorted = p.quotes.slice()
  if (p.sortK !== 'default') {
    sorted.sort(function (a, b) {
      const av = Number(a[p.sortK]), bv = Number(b[p.sortK])
      const an = isFinite(av) ? av : -Infinity
      const bn = isFinite(bv) ? bv : -Infinity
      return p.sortAsc ? an - bn : bn - an
    })
  }
  function sortBy(k) {
    if (p.sortK === k) p.setSortAsc(!p.sortAsc)
    else { p.setSortK(k); p.setSortAsc(false) }
  }
  function arrow(k) { return p.sortK === k ? (p.sortAsc ? ' ▲' : ' ▼') : '' }
  function ruleFor(symbol) {
    return (p.alertRules || []).find(function (r) { return r && r.symbol === symbol }) || null
  }
  function draftFor(q) {
    const r = ruleFor(q.symbol)
    const own = p.alertDrafts && p.alertDrafts[q.symbol]
    return own || { direction: r && r.direction === 'below' ? 'below' : 'above', target: r && r.target != null ? String(r.target) : '' }
  }
  function changeDraft(q, patch) {
    const d = draftFor(q)
    p.setAlertDrafts(Object.assign({}, p.alertDrafts || {}, { [q.symbol]: Object.assign({}, d, patch) }))
  }
  function closeAlert() { setOpenAlert('') }
  function alertEditor(q) {
    const r = ruleFor(q.symbol)
    const d = draftFor(q)
    const busy = p.alertBusy && p.alertBusy[q.symbol]
    return el('div', {
      key: 'alert', className: 'xq-alert-editor', role: 'group',
      'aria-label': '价格提醒设置',
      onClick: function (e) { e.stopPropagation() },
      onKeyDown: function (e) { if (e.key === 'Escape') { e.stopPropagation(); closeAlert() } }
    }, [
      el('span', { key: 'lb', className: 'xq-alert-editor-label' }, (q.name || q.symbol) + ' 提醒'),
      el('select', { key: 'dir', className: 'xq-alert-dir', value: d.direction, disabled: busy, 'aria-label': '方向', onChange: function (e) { changeDraft(q, { direction: e.target.value }) } }, [
        el('option', { key: 'a', value: 'above' }, '≥'),
        el('option', { key: 'b', value: 'below' }, '≤')
      ]),
      el('input', {
        key: 'target', className: 'xq-alert-target', type: 'number', step: 'any', placeholder: '价位',
        value: d.target, disabled: busy, 'aria-label': '提醒价位',
        onChange: function (e) { changeDraft(q, { target: e.target.value }) },
        onKeyDown: function (e) { if (e.key === 'Enter') p.setAlert(q.symbol, d.target, d.direction, true) }
      }),
      el('button', { key: 'set', className: 'xq-btn-mini', disabled: busy, title: r ? '更新提醒' : '设置提醒', onClick: function () { p.setAlert(q.symbol, d.target, d.direction, true) } }, r ? '更新' : '设置'),
      r ? el('button', { key: 'rm', className: 'xq-btn-mini', disabled: busy, title: '取消已有提醒', onClick: function () { p.removeAlert(q.symbol) } }, '取消提醒') : null,
      el('span', { key: 'sp', className: 'xq-spacer' }),
      el('button', { key: 'close', className: 'xq-btn-mini xq-icon-btn', title: '关闭编辑（Esc）', 'aria-label': '关闭提醒编辑', onClick: closeAlert }, '✕')
    ])
  }
  const idxKids = p.indices.map(function (q) {
    return el('div', {
      key: q.symbol, className: 'xq-idx-card', role: 'button', tabIndex: 0,
      title: '查看 ' + (q.name || q.symbol) + ' 详情',
      'aria-label': '查看 ' + (q.name || q.symbol) + ' 详情',
      onClick: function () { p.openDetail(q.symbol) },
      onKeyDown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.openDetail(q.symbol) } }
    }, [
      el('div', { key: 'n', className: 'xq-idx-name' }, q.name),
      el('div', { key: 'r', className: 'xq-idx-row' }, [
        el('span', { key: 'c', className: 'xq-idx-cur ' + colorOf(q.percent) }, fmt(q.current)),
        el('span', { key: 'p', className: 'xq-idx-pct xq-pct-chip ' + colorOf(q.percent) }, fmtPct(q.percent))
      ])
    ])
  })
  const rows = []
  sorted.forEach(function (q) {
    const rule = ruleFor(q.symbol)
    const open = openAlert === q.symbol
    const menuOpen = menuFor === q.symbol
    rows.push(el('div', {
      key: q.symbol, className: 'xq-grid-row',
      onClick: function () { p.openDetail(q.symbol) }
    }, [
      el('div', { key: 'n' }, [
        el('button', {
          key: 'a', className: 'xq-name xq-row-name-btn', type: 'button',
          title: (q.name || q.symbol) + ' · 查看详情',
          onClick: function (e) { e.stopPropagation(); p.openDetail(q.symbol) }
        }, q.name || q.symbol),
        el('div', { key: 'b', className: 'xq-sub' }, q.symbol)
      ]),
      el('div', { key: 'c', className: colorOf(q.percent) + (p.flashDir[q.symbol] === 1 ? ' xq-flash-up' : p.flashDir[q.symbol] === -1 ? ' xq-flash-down' : '') }, fmt(q.current)),
      el('div', { key: 'p' }, el('span', { key: 'pp', className: 'xq-pct-chip ' + colorOf(q.percent) }, fmtPct(q.percent))),
      el('div', { key: 'v', className: 'xq-sub' }, fmtVol(q.volume, q.symbol)),
      el('div', { key: 'a2', className: 'xq-actions' }, [
        el('button', {
          key: 'bell', type: 'button',
          className: 'xq-btn-mini xq-icon-btn' + (rule ? ' xq-bell-on' : ''),
          title: rule ? ('已设提醒：' + (rule.direction === 'below' ? '≤' : '≥') + ' ' + rule.target + '（点击编辑）') : '设置价格提醒',
          'aria-label': rule ? '编辑价格提醒' : '设置价格提醒',
          'aria-expanded': open ? 'true' : 'false',
          onClick: function (e) { e.stopPropagation(); setOpenAlert(open ? '' : q.symbol) }
        }, rule ? [bellIcon(true), el('span', { key: 'd', className: 'xq-alert-dot', 'aria-hidden': 'true' })] : bellIcon(false)),
        el('span', { key: 'more', className: 'xq-menu-wrap' }, [
          el('button', {
            key: 'mb', className: 'xq-btn-mini xq-icon-btn', type: 'button', title: '更多操作', 'aria-label': '更多操作',
            'aria-haspopup': 'menu', 'aria-expanded': menuOpen ? 'true' : 'false',
            onClick: function (e) { e.stopPropagation(); toggleMenu(q.symbol, e) }
          }, '⋯'),
          menuOpen ? el('div', { key: 'mu', className: 'xq-menu' + (menuUp ? ' xq-menu-up' : ''), role: 'menu' }, [
            el('button', {
              key: 'rm', className: 'xq-menu-item xq-danger', role: 'menuitem',
              onClick: function (e) { e.stopPropagation(); setMenuFor(''); p.removeWatch(q.symbol) }
            }, '移除自选')
          ]) : null
        ])
      ]),
      open ? alertEditor(q) : null
    ]))
  })
  return el('div', null, [
    el('div', { key: 'idx', className: 'xq-idx' }, idxKids),
    el('div', { key: 'wl', className: 'xq-grid' }, [
      el('div', { key: 'h', className: 'xq-grid-hd' }, [
        el('span', { key: 'c0' }, '名称 / 代码'),
        el('span', { key: 'c1', className: 'xq-sort-h' + (p.sortK === 'current' ? ' xq-sort-on' : ''), role: 'button', tabIndex: 0, onClick: function () { sortBy('current') }, onKeyDown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sortBy('current') } } }, '现价' + arrow('current')),
        el('span', { key: 'c2', className: 'xq-sort-h' + (p.sortK === 'percent' ? ' xq-sort-on' : ''), role: 'button', tabIndex: 0, onClick: function () { sortBy('percent') }, onKeyDown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sortBy('percent') } } }, '涨跌幅' + arrow('percent')),
        el('span', { key: 'c3', className: 'xq-sort-h' }, '成交量'),
        el('span', { key: 'c4', className: 'xq-sort-h' }, '操作')
      ]),
      rows.length ? rows : el('div', { key: 'empty', className: 'xq-grid-row' }, el('span', { key: 'e', className: 'xq-muted' }, '自选股为空，去「搜索」或下方添加'))
    ]),
    el('div', { key: 'add', className: 'xq-search-row' }, [
      el('input', {
        key: 'i', className: 'xq-input', placeholder: '添加代码，如 SH600519 / 00700 / AAPL',
        value: p.manualCode,
        onChange: function (e) { p.setManualCode(e.target.value) },
        onKeyDown: function (e) { if (e.key === 'Enter') p.addManual() }
      }),
      el('button', { key: 'b', className: 'xq-btn', onClick: p.addManual }, '添加')
    ])
  ])
}

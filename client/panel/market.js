// 行情 tab：指数卡 + 自选表格（排序 / 闪烁 / 加删自选）。
// 显式上下文 p：
//   p.quotes / p.indices / p.flashDir / p.sortK / p.sortAsc / p.setSortK / p.setSortAsc
//   p.openDetail / p.removeWatch / p.manualCode / p.setManualCode / p.addManual
//   p.alertRules / p.alertDrafts / p.setAlertDrafts / p.setAlert / p.removeAlert / p.alertBusy
import { el } from '../dom.js'
import { fmt, fmtPct, fmtVol, colorOf } from '../format.js'

export function MarketTab(p) {
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
  function alertEditor(q) {
    const r = ruleFor(q.symbol)
    const d = draftFor(q)
    const busy = p.alertBusy && p.alertBusy[q.symbol]
    return el('div', { key: 'alert', className: 'xq-alert-editor', onClick: function (e) { e.stopPropagation() } }, [
      el('select', { key: 'dir', className: 'xq-alert-dir', value: d.direction, disabled: busy, onChange: function (e) { changeDraft(q, { direction: e.target.value }) } }, [
        el('option', { key: 'a', value: 'above' }, '≥'),
        el('option', { key: 'b', value: 'below' }, '≤')
      ]),
      el('input', { key: 'target', className: 'xq-alert-target', type: 'number', step: 'any', placeholder: '价位', value: d.target, disabled: busy, onChange: function (e) { changeDraft(q, { target: e.target.value }) } }),
      el('button', { key: 'set', className: 'xq-btn-mini', disabled: busy, title: r ? '更新提醒' : '设置提醒', onClick: function () { p.setAlert(q.symbol, d.target, d.direction, true) } }, r ? '更新' : '提醒'),
      r ? el('button', { key: 'rm', className: 'xq-btn-mini', disabled: busy, title: '取消提醒', onClick: function () { p.removeAlert(q.symbol) } }, '取消') : null
    ])
  }
  const idxKids = p.indices.map(function (q) {
    return el('div', {
      key: q.symbol, className: 'xq-idx-card', title: '查看 ' + (q.name || q.symbol) + ' 详情',
      onClick: function () { p.openDetail(q.symbol) }
    }, [
      el('div', { key: 'n', className: 'xq-idx-name' }, q.name),
      el('div', { key: 'r', className: 'xq-idx-row' }, [
        el('span', { key: 'c', className: 'xq-idx-cur ' + colorOf(q.percent) }, fmt(q.current)),
        el('span', { key: 'p', className: 'xq-idx-pct xq-pct-chip ' + colorOf(q.percent) }, fmtPct(q.percent))
      ])
    ])
  })
  const rows = sorted.map(function (q) {
    return el('div', { key: q.symbol, className: 'xq-grid-row', onClick: function () { p.openDetail(q.symbol) } }, [
      el('div', { key: 'n' }, [
        el('div', { key: 'a', className: 'xq-name' }, q.name || q.symbol),
        el('div', { key: 'b', className: 'xq-sub' }, q.symbol)
      ]),
      el('div', { key: 'c', className: colorOf(q.percent) + (p.flashDir[q.symbol] === 1 ? ' xq-flash-up' : p.flashDir[q.symbol] === -1 ? ' xq-flash-down' : '') }, fmt(q.current)),
      el('div', { key: 'p' }, el('span', { key: 'pp', className: 'xq-pct-chip ' + colorOf(q.percent) }, fmtPct(q.percent))),
      el('div', { key: 'v', className: 'xq-sub' }, fmtVol(q.volume, q.symbol)),
      el('div', { key: 'a2', className: 'xq-actions' }, [
        el('button', { key: 'd', className: 'xq-btn-mini', onClick: function (e) { e.stopPropagation(); p.openDetail(q.symbol) } }, '详情'),
        el('button', { key: 'r', className: 'xq-btn-mini', title: '移除自选', onClick: function (e) { e.stopPropagation(); p.removeWatch(q.symbol) } }, '×'),
        alertEditor(q)
      ])
    ])
  })
  return el('div', null, [
    el('div', { key: 'idx', className: 'xq-idx' }, idxKids),
    el('div', { key: 'wl', className: 'xq-grid' }, [
      el('div', { key: 'h', className: 'xq-grid-hd' }, [
        el('span', { key: 'c0' }, '名称'),
        el('span', { key: 'c1', className: 'xq-sort-h' + (p.sortK === 'current' ? ' xq-sort-on' : ''), onClick: function () { sortBy('current') } }, '现价' + arrow('current')),
        el('span', { key: 'c2', className: 'xq-sort-h' + (p.sortK === 'percent' ? ' xq-sort-on' : ''), onClick: function () { sortBy('percent') } }, '涨跌幅' + arrow('percent')),
        el('span', { key: 'c3' }, '成交量'),
        el('span', { key: 'c4' }, '操作')
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

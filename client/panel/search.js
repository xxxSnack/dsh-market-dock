// 搜索 tab：股票 / 帖子两种模式（doSearch 的数据逻辑仍在父组件，经 p 传入）。
// 显式上下文 p：
//   p.searchQ / p.setSearchQ / p.searchMode / p.setSearchMode / p.searchRes / p.setSearchRes
//   p.searching / p.doSearch / p.openDetail / p.addWatch
import { el } from '../dom.js'
import { fmtBig, fmtDay } from '../format.js'

export function SearchTab(p) {
  const isPost = p.searchMode === 'post'
  const resKids = p.searchRes.map(function (r) {
    const title = isPost ? (r.title || '') : r.name
    const sub = isPost ? ((r.user ? r.user.screen_name + ' · ' : '') + fmtBig(r.view_count) + '阅读') : (r.code || '')
    const desc = isPost ? String(r.text || '').slice(0, 60) : sub
    return el('div', { key: String(r.id || r.code), className: 'xq-grid-row' }, [
      el('div', { key: 'n' }, [
        el('div', { key: 'a', className: 'xq-name' }, title || '（无标题）'),
        el('div', { key: 'b', className: 'xq-sub' }, desc)
      ]),
      el('div', { key: 'c', className: 'xq-sub' }, sub),
      el('div', { key: 'p', className: 'xq-sub' }, isPost ? fmtDay(r.created_at) : ''),
      el('div', { key: 'a2', className: 'xq-actions' }, isPost
        ? null
        : [
          el('button', { key: 'd', className: 'xq-btn-mini', onClick: function () { p.openDetail(r.code) } }, '详情'),
          el('button', { key: 'w', className: 'xq-btn-mini', onClick: function () { p.addWatch(r.code) } }, '加自选')
        ])
    ])
  })
  return el('div', null, [
    el('div', { key: 'row', className: 'xq-search-row' }, [
      el('input', {
        key: 'i', className: 'xq-input', placeholder: p.searchMode === 'stock' ? '搜索股票，如「茅台」' : '搜索帖子，如「段永平」',
        value: p.searchQ,
        onChange: function (e) { p.setSearchQ(e.target.value) },
        onKeyDown: function (e) { if (e.key === 'Enter') p.doSearch() }
      }),
      el('button', { key: 'b', className: 'xq-btn', disabled: p.searching, onClick: p.doSearch }, p.searching ? '搜索中…' : '搜索')
    ]),
    el('div', { key: 'seg', className: 'xq-seg', style: { marginBottom: 8 } }, [
      el('button', { key: 's', className: p.searchMode === 'stock' ? 'xq-seg-on' : '', onClick: function () { p.setSearchMode('stock'); p.setSearchRes([]) } }, '股票'),
      el('button', { key: 'p', className: p.searchMode === 'post' ? 'xq-seg-on' : '', onClick: function () { p.setSearchMode('post'); p.setSearchRes([]) } }, '帖子')
    ]),
    p.searchRes.length ? el('div', { key: 'res', className: 'xq-grid' }, [
      el('div', { key: 'h', className: 'xq-grid-hd' }, ['结果', '', '', ''].map(function (t, i) { return el('span', { key: i }, t) })),
      resKids
    ]) : el('div', { key: 'tip', className: 'xq-muted' }, '输入关键词搜索，回车或点搜索')
  ])
}

// Agent 工具调用卡片（tool.call.toolview）：xueqiu_quote / xueqiu_kline / xueqiu_hot / xueqiu_news。
import { el } from '../dom.js'
import { fmt, fmtPct } from '../format.js'
import { xqParseResult } from './parse.js'
import { KlineChart } from '../charts/kline.js'
import { PERIOD_LABELS, HOT_MARKET_LABELS } from '../constants.js'

export function QuoteCard(props) {
  const block = props.block
  const r = xqParseResult(block)
  if (!r) return el('div', { className: 'xq-tv-shell' }, block && block.kind ? '结果不可读' : '查询中…')
  const list = Array.isArray(r.list) ? r.list : []
  if (!list.length) return el('div', { className: 'xq-tv-shell' }, '无行情数据（检查代码，或先用 xueqiu_search 查代码）')
  return el('div', { className: 'xq-tv-shell' }, [
    el('div', { key: 'h', className: 'xq-tv-head' }, [
      el('span', { key: 't', className: 'xq-tv-title' }, '雪球行情'),
      el('span', { key: 'n', className: 'xq-tv-pill' }, list.length + ' 只'),
      r.status ? el('span', { key: 's', className: 'xq-tv-pill' }, r.status) : null
    ]),
    el('div', { key: 'b', className: 'xq-tv-table' }, list.map(function (q) {
      const up = Number(q.percent) > 0, dn = Number(q.percent) < 0
      return el('div', { key: q.symbol, className: 'xq-tv-row' }, [
        el('span', { key: 'n', className: 'xq-tv-name' }, [
          String(q.name || ''),
          el('span', { key: 'c', className: 'xq-tv-code' }, ' ' + String(q.symbol || ''))
        ]),
        el('span', { key: 'p', className: 'xq-tv-price ' + (up ? 'xq-up' : dn ? 'xq-down' : '') }, fmt(q.current)),
        el('span', { key: 'g', className: 'xq-tv-pct ' + (up ? 'xq-up' : dn ? 'xq-down' : '') },
          fmtPct(q.percent))
      ])
    }))
  ])
}

export function KlineCard(props) {
  const block = props.block
  const r = xqParseResult(block)
  if (!r) return el('div', { className: 'xq-tv-shell' }, block && block.kind ? '结果不可读' : '查询中…')
  if (r.error) return el('div', { className: 'xq-tv-shell' }, String(r.error))
  const rows = Array.isArray(r.rows) ? r.rows : []
  if (!rows.length) return el('div', { className: 'xq-tv-shell' }, '无K线数据')
  const first = rows[0], last = rows[rows.length - 1]
  const chgPct = Number(first.close) ? (Number(last.close) - Number(first.close)) / Number(first.close) * 100 : 0
  const lb = PERIOD_LABELS
  // 复用面板蜡烛图（rows 字段兼容：卡片 rows 已含 open/high/low/close/volume）
  return el('div', { className: 'xq-tv-shell' }, [
    el('div', { key: 'h', className: 'xq-tv-head' }, [
      el('span', { key: 't', className: 'xq-tv-title' }, String(r.symbol || '')),
      el('span', { key: 'p', className: 'xq-tv-pill' }, lb[r.period] || r.period || '日K'),
      el('span', { key: 'n', className: 'xq-tv-pill' }, rows.length + ' 根'),
      rows.length > 1 ? el('span', { key: 'd', className: 'xq-tv-pill' },
        String(first.time || '').slice(0, 10) + ' → ' + String(last.time || '').slice(0, 10)) : null,
      el('span', { key: 'g', className: 'xq-tv-pct ' + (chgPct > 0 ? 'xq-up' : chgPct < 0 ? 'xq-down' : ''), style: { marginLeft: 'auto' } },
        fmt(last.close) + '  ' + (chgPct >= 0 ? '+' : '') + chgPct.toFixed(2) + '%')
    ]),
    el(KlineChart, { key: 'c' + rows.length, symbol: String(r.symbol || ''), rows: rows })
  ])
}

export function HotCard(props) {
  const block = props.block
  const r = xqParseResult(block)
  if (!r) return el('div', { className: 'xq-tv-shell' }, block && block.kind ? '结果不可读' : '查询中…')
  const list = Array.isArray(r.list) ? r.list : []
  if (!list.length) return el('div', { className: 'xq-tv-shell' }, '无热榜数据')
  const mk = HOT_MARKET_LABELS
  return el('div', { className: 'xq-tv-shell' }, [
    el('div', { key: 'h', className: 'xq-tv-head' }, [
      el('span', { key: 't', className: 'xq-tv-title' }, '雪球热榜'),
      el('span', { key: 'm', className: 'xq-tv-pill' }, mk[r.market] || r.market || 'A股'),
      el('span', { key: 'n', className: 'xq-tv-pill' }, list.length + ' 只')
    ]),
    el('div', { key: 'b', className: 'xq-tv-table' }, list.map(function (h, i) {
      const up = Number(h.percent) > 0, dn = Number(h.percent) < 0
      const rc = Number(h.rank_change)
      return el('div', { key: h.symbol || i, className: 'xq-tv-row' }, [
        el('span', { key: 'r', className: 'xq-tv-rank' }, String(i + 1)),
        el('span', { key: 'n', className: 'xq-tv-name' }, [
          String(h.name || ''),
          el('span', { key: 'c', className: 'xq-tv-code' }, ' ' + String(h.symbol || ''))
        ]),
        rc > 0 ? el('span', { key: 'rc', className: 'xq-tv-rankup', title: '热度排名上升' }, '↑' + rc) :
          rc < 0 ? el('span', { key: 'rc', className: 'xq-tv-rankdn', title: '热度排名下降' }, '↓' + (-rc)) : null,
        el('span', { key: 'p', className: 'xq-tv-price ' + (up ? 'xq-up' : dn ? 'xq-down' : '') }, fmt(h.current)),
        el('span', { key: 'g', className: 'xq-tv-pct ' + (up ? 'xq-up' : dn ? 'xq-down' : '') },
          fmtPct(h.percent))
      ])
    }))
  ])
}

export function NewsCard(props) {
  const block = props.block
  const r = xqParseResult(block)
  if (!r) return el('div', { className: 'xq-tv-shell' }, block && block.kind ? '结果不可读' : '查询中…')
  const items = Array.isArray(r.items) ? r.items : []
  if (!items.length) return el('div', { className: 'xq-tv-shell' }, '无快讯')
  return el('div', { className: 'xq-tv-shell' }, [
    el('div', { key: 'h', className: 'xq-tv-head' }, [
      el('span', { key: 't', className: 'xq-tv-title' }, '雪球快讯'),
      el('span', { key: 'n', className: 'xq-tv-pill' }, items.length + ' 条')
    ]),
    el('div', { key: 'b', className: 'xq-tv-news' }, items.map(function (n, i) {
      const t = String(n.time || '')
      return el('div', { key: n.id || i, className: 'xq-tv-item' + (n.mark === 1 ? ' xq-tv-mark' : '') }, [
        el('span', { key: 'tm', className: 'xq-tv-time' }, t.slice(11, 16) || t.slice(5, 16)),
        el('span', { key: 'tx', className: 'xq-tv-text' }, [
          n.mark === 1 ? el('b', { key: 'm', className: 'xq-tv-flag' }, '重要 ') : null,
          String(n.text || '')
        ])
      ])
    }))
  ])
}

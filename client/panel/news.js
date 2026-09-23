// 快讯 tab：时间轴分组（今天/昨天/M月D日）+ 滚动到底加载更早。
// 显式上下文 p：
//   p.news / p.newsMore / p.newsNoMore / p.loadMoreNews
import { el } from '../dom.js'
import { fmtTime } from '../format.js'

export function NewsTab(p) {
  // 时间轴：按「今天/昨天/M月D日」分组，每组一个锚点头
  const kids = []
  let lastDay = null
  p.news.forEach(function (it) {
    const d = new Date(it.created_at)
    const now = new Date()
    if (isNaN(d.getTime())) {   // 脏/缺失时间：跳过分组头（否则渲染 "NaN月NaN日"）
      kids.push(el('div', { key: String(it.id), className: 'xq-news-item' + (it.mark === 1 ? ' xq-important' : '') }, [
        el('div', { key: 't' }, it.text),
        el('div', { key: 'm', className: 'xq-news-time' }, fmtTime(it.created_at) + (it.mark === 1 ? ' · 重要' : ''))
      ]))
      return
    }
    const sameDay = function (a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate() }
    const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    let label = null
    const dayKey = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate()
    if (dayKey !== lastDay) {
      lastDay = dayKey
      label = sameDay(d, now) ? '今天' : (sameDay(d, yest) ? '昨天' : (d.getMonth() + 1) + '月' + d.getDate() + '日')
    }
    if (label) kids.push(el('div', { key: 'g' + dayKey, className: 'xq-news-group' }, label))
    kids.push(el('div', { key: String(it.id), className: 'xq-news-item' + (it.mark === 1 ? ' xq-important' : '') }, [
      el('div', { key: 't' }, it.text),
      el('div', { key: 'm', className: 'xq-news-time' }, fmtTime(it.created_at) + (it.mark === 1 ? ' · 重要' : ''))
    ]))
  })
  // 滚动到底自动加载；手动入口兜底（滚轮惯性/触控板场景）
  kids.push(el('div', {
    key: 'more',
    className: 'xq-news-more',
    onClick: function () { p.loadMoreNews() }
  }, p.newsMore ? '加载中…' : (p.newsNoMore ? '没有更早的快讯了' : '加载更早 ↑')))
  return p.news.length
    ? el('div', {
        className: 'xq-news xq-news-tl',
        onScroll: function (e) {
          const n = e.target
          if (n.scrollTop + n.clientHeight >= n.scrollHeight - 40) p.loadMoreNews()
        }
      }, kids)
    : el('div', { className: 'xq-muted' }, '暂无快讯')
}

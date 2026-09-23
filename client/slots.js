// 槽位注册：7 次 slots.inject/register 集中成一张表（顺序即契约，与重构前一一对应）。
import { el } from './dom.js'
import { QuoteCard, KlineCard, HotCard, NewsCard } from './tools/cards.js'
import { DockGate } from './dock.js'
import { MiniBadge } from './badge.js'
import { Ticker } from './ticker.js'
import { SLOT_TOOLVIEW, SLOT_INPUT_DOCK, SLOT_OVERLAY, SLOT_COMPOSER_DOCK, TOOLVIEW_KEYS, PANEL_ID, PANEL_ORDER, BADGE_ID, TICKER_ID, TICKER_ORDER } from './constants.js'

// ---------- 注册 ----------
const XQ_SLOT_REGISTRATIONS = [
  { slot: SLOT_TOOLVIEW, options: { name: SLOT_TOOLVIEW, key: TOOLVIEW_KEYS.quote }, render: function (props) { return el(QuoteCard, props) } },
  { slot: SLOT_TOOLVIEW, options: { name: SLOT_TOOLVIEW, key: TOOLVIEW_KEYS.kline }, render: function (props) { return el(KlineCard, props) } },
  { slot: SLOT_TOOLVIEW, options: { name: SLOT_TOOLVIEW, key: TOOLVIEW_KEYS.hot }, render: function (props) { return el(HotCard, props) } },
  { slot: SLOT_TOOLVIEW, options: { name: SLOT_TOOLVIEW, key: TOOLVIEW_KEYS.news }, render: function (props) { return el(NewsCard, props) } },
  { slot: SLOT_INPUT_DOCK, options: { name: SLOT_INPUT_DOCK, id: PANEL_ID, order: PANEL_ORDER }, render: function () { return el(DockGate, null) } },
  { slot: SLOT_OVERLAY, options: { name: SLOT_OVERLAY, id: BADGE_ID }, render: function () { return el(MiniBadge, null) } },
  { slot: SLOT_COMPOSER_DOCK, options: { name: SLOT_COMPOSER_DOCK, id: TICKER_ID, order: TICKER_ORDER }, render: function () { return el(Ticker, null) } }
]

export function installSlots(ctx) {
  const slots = ctx.get('slots')
  if (slots === undefined) return
  for (let i = 0; i < XQ_SLOT_REGISTRATIONS.length; i++) {
    const reg = XQ_SLOT_REGISTRATIONS[i]
    slots.inject(reg.slot, function () {
      return slots.register(reg.options, reg.render)
    })
  }
}

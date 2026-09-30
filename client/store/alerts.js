// 价格提醒 RPC 薄封装。规则/事件状态由 XueqiuPanel 持有，避免跨面板实例串状态。
import { call, A_ALERTS_GET, A_ALERTS_SET, A_ALERTS_REMOVE, A_ALERTS_ACK } from '../platform.js'

export function fetchAlerts() { return call(A_ALERTS_GET, {}) }
export function saveAlert(symbol, target, direction, enabled) {
  return call(A_ALERTS_SET, { symbol: symbol, target: target, direction: direction, enabled: enabled })
}
export function removeAlert(symbol) { return call(A_ALERTS_REMOVE, { symbol: symbol }) }
export function ackAlerts(ids) { return call(A_ALERTS_ACK, { ids: ids }) }

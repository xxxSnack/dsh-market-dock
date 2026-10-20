// core 装配：原巨型 apply 闭包里的可变共享状态全部收进 core（每次 apply 一份，保持单实例语义），
// 各模块通过 install 函数把自己的函数挂上来，跨模块调用一律走 core.xxx。

import { installCache } from './cache.js'
import { installGate } from './gate.js'
import { installHttp } from './http.js'
import { installState } from './state.js'
import { installLogin } from './login.js'
import { installWatchlist } from './watchlist.js'
import { installUiState } from './ui-state.js'
import { installPnl } from './pnl/index.js'
import { installApi } from './api.js'
import { installAlerts } from './alerts.js'
import { installActions } from './actions.js'

export function createXqCore(ctx, config) {
  const core = {
    ctx: ctx,
    // 已规整的插件配置（stateDir / watchlist；见 lib/config.js）
    config: config,

    // ---- 共享可变状态（原 apply 闭包变量，名字保持不变以便逐字对照）----
    state: { cookie: '' },
    watchlist: null,
    uiState: null,
    // 可选登录态：粘贴浏览器 Cookie 后启用（云端自选股）。null = 匿名模式
    login: null,
    cloudPid: null,   // 默认自选组合 pid（首次云端操作时探测并缓存）
    cookieSeeding: null,
    stateBasePromise: null,
    // 今日盈亏状态目录的沙箱可写性探测（与 stateBasePromise 独立：目录不同、时机不同）
    pnlBasePromise: null,
    // 持仓 + 今日盈亏：installPnl 挂的 { view, inflight }（本地持仓 × 行情现算的缓存）；null = 尚未安装
    pnl: null,
    // 价格提醒：installAlerts 挂载持久化 store 与加载单飞 Promise
    alertStore: null,
    alertStoreLoad: null,
    syncInflight: false,
    // 请求调度槽位（gate.js 维护，debug RPC 会读）
    running: 0,
    lastStart: 0,
    waiters: [],
    // TTL 缓存与在途去重（cache.js 维护）
    cache: null,
    inflight: null
  }

  // 安装顺序 = 依赖顺序（只为可读性；调用都发生在运行期，函数引用在 install 时建立）
  installCache(core)
  installGate(core)
  installHttp(core)
  installState(core)
  installLogin(core)
  installWatchlist(core)
  installUiState(core)
  // 持仓/盈亏：必须在 installActions 之前（dispatch 表构造时按值捕获 core.actPositionsGet 等）
  installPnl(core)
  installApi(core)
  installAlerts(core)
  installActions(core)
  return core
}

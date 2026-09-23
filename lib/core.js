// core 装配：原巨型 apply 闭包里的可变共享状态全部收进 core（每次 apply 一份，保持单实例语义），
// 各模块通过 install 函数把自己的函数挂上来，跨模块调用一律走 core.xxx。

import { installCache } from './cache.js'
import { installGate } from './gate.js'
import { installHttp } from './http.js'
import { installState } from './state.js'
import { installLogin } from './login.js'
import { installWatchlist } from './watchlist.js'
import { installUiState } from './ui-state.js'
import { installApi } from './api.js'
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
  installApi(core)
  installActions(core)
  return core
}

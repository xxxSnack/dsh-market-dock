// 入口：cordis 插件对象（与上游同形：inject ['timer'] + apply(ctx)）。
// apply 只做两件事——装配 core、按双路径注册 RPC 与工具。
// 第二个参数是插件配置（cordis 会把 bundle layer 里配的 config 传进来）；未配置时全部走默认值。

import { createXqCore } from './core.js'
import { installRpc, installTools } from './register.js'
import { resolveConfig } from './config.js'

const xqHostPlugin = {
  inject: ['timer'],
  apply(ctx, config) {
    const core = createXqCore(ctx, resolveConfig(config))
    installRpc(core)
    installTools(core)
  }
}
export default xqHostPlugin

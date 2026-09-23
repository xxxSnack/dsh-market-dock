// 插件配置：全部字段都有默认值，**不配置时行为与重构前完全一致**。
//
// 为什么手写校验而不是 schemastery：本插件的两个形态里，动态形态是把源码拼成单文件用
// `new Function` 求值（见 tools/build.mjs），**无法使用 npm 依赖的 import**。因此配置只做
// 轻量自校验，不引第三方 schema 库。
//
// 配置从哪里来：DSH 的 bundle layer 可以在 cordis.patch.yml 里给插件节点写 config，例如
//     - insert:
//         - id: xueqiu-debug
//           name: 'dsh-xueqiu-debug'
//           config:
//             stateDir: dsh-xueqiu-debug      # 与上游/旧数据彻底隔离
//             watchlist: [SH600519, 00700]
// 未写 config 时用下面的默认值（= 重构前的硬编码值）。

import { DEFAULT_WATCHLIST } from './constants.js'

// 状态目录名：$DSH_HOME/<stateDir>/。默认沿用上游的 dsh-xueqiu（存量自选/Cookie/界面位置无缝继承）。
// 想与上游彻底隔离就配成 dsh-xueqiu-debug —— 注意切换后不会自动迁移旧数据。
export const DEFAULT_STATE_DIR = 'dsh-xueqiu'

// 今日盈亏（同花顺投资账本）的状态目录名：$DSH_HOME/<pnlStateDir>/。
// **默认必须与旧插件 dsh-ths-pnl 完全相同** —— 两边共用 config.json（Cookie）/snapshot.json，
// 并存期用户不用重粘 Cookie，数值也一致。想隔离才改这里（改完不会自动迁移旧数据）。
export const DEFAULT_PNL_STATE_DIR = 'dsh-ths-pnl'

// 默认自选表上限（与重构前 stateWrite 的截断上限一致）
const WATCHLIST_MAX = 200

/** 把外部传入的 raw config 规整成可信的配置对象（任何非法值都退回默认） */
export function resolveConfig (raw) {
  const cfg = (raw && typeof raw === 'object') ? raw : {}

  const stateDir = (typeof cfg.stateDir === 'string' && /^[A-Za-z0-9._-]+$/.test(cfg.stateDir))
    ? cfg.stateDir
    : DEFAULT_STATE_DIR

  let watchlist = DEFAULT_WATCHLIST
  if (Array.isArray(cfg.watchlist) && cfg.watchlist.length) {
    const list = cfg.watchlist
      .map(function (s) { return String(s == null ? '' : s).trim() })
      .filter(Boolean)
      .slice(0, WATCHLIST_MAX)
    if (list.length) watchlist = list
  }

  // 今日盈亏状态目录：与 stateDir 同款白名单校验（非法值退回默认，防路径穿越）
  const pnlStateDir = (typeof cfg.pnlStateDir === 'string' && /^[A-Za-z0-9._-]+$/.test(cfg.pnlStateDir))
    ? cfg.pnlStateDir
    : DEFAULT_PNL_STATE_DIR

  return { stateDir: stateDir, watchlist: watchlist, pnlStateDir: pnlStateDir }
}

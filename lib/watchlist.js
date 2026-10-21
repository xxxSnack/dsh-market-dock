// 本地自选表：状态文件读写 + 登录态下「云端为准」的后台自动同步 + 增删动作。

import { SYNC_INTERVAL_MS } from './constants.js'

export function installWatchlist(core) {
  const ctx = core.ctx

  // 状态文件和云端响应都属于外部输入。统一收敛到与 watchlist.add 相同的
  // 代码格式、去重和数量上限，避免坏数据让后续每一轮行情刷新都携带无效标的。
  function normalizeSymbols(list) {
    const out = []
    const seen = Object.create(null)
    const arr = Array.isArray(list) ? list : []
    for (let i = 0; i < arr.length && out.length < 200; i++) {
      const symbol = String(arr[i] == null ? '' : arr[i]).trim()
      if (!/^[A-Za-z0-9_.]+$/.test(symbol) || seen[symbol]) continue
      seen[symbol] = true
      out.push(symbol)
    }
    return out
  }

  // ---- watchlist ----
  async function loadWatchlist() {
    if (core.watchlist) return core.watchlist
    // 默认自选表来自插件配置（未配置时即重构前的硬编码 6 只；见 lib/config.js）
    core.watchlist = { symbols: core.config.watchlist.slice() }
    const fs = ctx.get('fs')
    const sp = ctx.get('sandboxPolicy')
    const root = sp && sp.workspaceRoot ? sp.workspaceRoot : null
    if (fs) {
      try {
        const text = await core.stateRead('.xueqiu-watchlist.json', fs, root)
        const parsed = text == null ? null : JSON.parse(text)
        if (parsed && Array.isArray(parsed.symbols) && parsed.symbols.length) {
          const symbols = normalizeSymbols(parsed.symbols)
          if (symbols.length) core.watchlist = { symbols: symbols, lastSyncAt: Number(parsed.lastSyncAt) || 0 }
        }
      } catch (e) { /* 首次运行或无写权限时使用默认列表 */ }
    }
    return core.watchlist
  }

  async function saveWatchlist() {
    const fs = ctx.get('fs')
    const sp = ctx.get('sandboxPolicy')
    const root = sp && sp.workspaceRoot ? sp.workspaceRoot : null
    if (!fs) return
    try {
      await core.stateWrite('.xueqiu-watchlist.json', JSON.stringify(core.watchlist), fs, root)
    } catch (e) { /* 保持内存态 */ }
  }

  async function actWatchlistGet() {
    const wl = await loadWatchlist()
    await maybeAutoSync()   // 登录态：节流后台同步云端自选（云端为准）
    return { symbols: (core.watchlist || wl).symbols }
  }

  // 后台自动同步（登录态 · 云端为准的双端统一）：
  // - 节流 10 分钟（lastSyncAt 持久化在 .xueqiu-watchlist.json）
  // - 云端列表直接镜像到本地：网页端加/删都会被跟随
  // - 本地 add/remove 本就双写云端；若云端写失败，下次同步会被镜像纠正（统一语义）
  // - 静默失败：cookie 过期等异常不影响 watchlist.get 返回
  async function maybeAutoSync(force) {
    const lg = await core.loadLogin()
    if (!lg || core.syncInflight) return false
    const wl = await loadWatchlist()
    const last = Number(wl.lastSyncAt) || 0
    if (!force && Date.now() - last < SYNC_INTERVAL_MS) return false
    core.syncInflight = true
    try {
      const cloud = await core.fetchCloudWatchlist()
      if (!cloud.symbols.length) {
        // 空结果不镜像（接口异常/账号无自选都不该清空本地），但必须推进 lastSyncAt——
        // 否则 cookie 半失效时节流永不生效，每次 watchlist.get 都重复打上游 2 个请求
        wl.lastSyncAt = Date.now()
        core.watchlist = wl
        await saveWatchlist()
        return false
      }
      const cur = wl.symbols
      const changed = cur.length !== cloud.symbols.length || cloud.symbols.some(function (s, i) { return cur[i] !== s })
      if (changed) {
        core.watchlist = { symbols: normalizeSymbols(cloud.symbols), lastSyncAt: Date.now() }
      } else {
        wl.lastSyncAt = Date.now()
        core.watchlist = wl
      }
      await saveWatchlist()
      return changed
    } catch (e) {
      return false   // 静默：debug RPC 可观察 login/cookie 状态
    } finally {
      core.syncInflight = false
    }
  }

  async function actWatchlistAdd(args) {
    const symbol = String(args.symbol || '')
    if (!/^[A-Za-z0-9_.]+$/.test(symbol)) throw new Error('无效代码: ' + symbol)
    const wl = await loadWatchlist()
    if (wl.symbols.indexOf(symbol) === -1) {
      wl.symbols.push(symbol)
      await saveWatchlist()
      core.cloudWatchAdd(symbol).catch(function () { /* 尽力而为：失败由下次同步纠正 */ })   // 云端添加失败不影响本地
    }
    return { symbols: wl.symbols }
  }

  async function actWatchlistRemove(args) {
    const symbol = String(args.symbol || '')
    const wl = await loadWatchlist()
    const i = wl.symbols.indexOf(symbol)
    if (i !== -1) {
      wl.symbols.splice(i, 1)
      await saveWatchlist()
      core.cloudWatchDelete(symbol).catch(function () { /* 尽力而为：失败由下次同步纠正 */ })   // 云端删除失败不影响本地
    }
    return { symbols: wl.symbols }
  }

  core.loadWatchlist = loadWatchlist
  core.maybeAutoSync = maybeAutoSync
  core.actWatchlistGet = actWatchlistGet
  core.actWatchlistAdd = actWatchlistAdd
  core.actWatchlistRemove = actWatchlistRemove
}

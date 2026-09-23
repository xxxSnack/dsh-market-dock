// 今日盈亏：与 dsh-ths-pnl **共用**同一份状态文件（$DSH_HOME/dsh-ths-pnl/）。
//
// 为什么要共用：旧插件（dsh-ths-pnl）与新版面板可能同时在跑，用户不应该重新粘一次
// Cookie；快照分文件存放也是有意的 —— 清 Cookie（config.json）不该顺手抹掉
// 「最后已知盈亏」（snapshot.json），反之亦然。
//
// 落点解析与宿主 state.js 同套路（稳定目录优先 + 沙箱可写性探测 + 工作区回退），
// 但**独立 memo** core.pnlBasePromise：两套东西的默认目录不同、探测失败时机也不同。

import { dshHomeBase } from '../state.js'
import { PNL_STATE_DIR, CONFIG_FILE, SNAPSHOT_FILE } from './constants.js'

/** 目标目录（$DSH_HOME/<pnlStateDir>）；拿不到基址返回 ''（调用方走工作区回退）。 */
export function pnlStateDirOf(core) {
  try {
    const base = dshHomeBase()
    const name = (core.config && core.config.pnlStateDir) ? core.config.pnlStateDir : PNL_STATE_DIR
    return base ? base + '/' + name : ''
  } catch (e) { return '' }
}

/** 稳定目录是否可写（写一个 .write-probe 探针），结果 memo 在 core.pnlBasePromise。 */
export function pnlStateBase(core) {
  if (!core.pnlBasePromise) {
    core.pnlBasePromise = (async function () {
      const fs = core.ctx.get('fs')
      const sp = core.ctx.get('sandboxPolicy')
      const root = sp && sp.workspaceRoot ? sp.workspaceRoot : null
      const dir = pnlStateDirOf(core)
      if (!fs || !dir) return ''
      try {
        const probe = await fs.resolve(dir + '/.write-probe', { cwd: root })
        await fs.writeText(probe, String(Date.now()))
        return dir
      } catch (e) { return '' }
    })()
  }
  return core.pnlBasePromise
}

/** 读：稳定文件优先；稳定模式且稳定文件缺失时回读旧工作区路径（迁移源）。 */
export const pnlStateRead = async function (core, name) {
  const fs = core.ctx.get('fs')
  const sp = core.ctx.get('sandboxPolicy')
  const root = sp && sp.workspaceRoot ? sp.workspaceRoot : null
  if (!fs) return null
  const dir = await pnlStateBase(core)
  if (dir) {
    try { return await fs.readText(await fs.resolve(dir + '/' + name, { cwd: root })) } catch (e) { /* 试旧工作区 */ }
  }
  if (!root) return null
  try { return await fs.readText(await fs.resolve(name, { cwd: root })) } catch (e) { return null }
}

/** 写：稳定模式写稳定目录，否则旧工作区。返回真实落点。 */
export const pnlStateWrite = async function (core, name, text) {
  const fs = core.ctx.get('fs')
  const sp = core.ctx.get('sandboxPolicy')
  const root = sp && sp.workspaceRoot ? sp.workspaceRoot : null
  if (!fs) throw new Error('fs 服务不可用，无法保存今日盈亏配置')
  const dir = await pnlStateBase(core)
  const target = await fs.resolve(dir ? dir + '/' + name : name, { cwd: root })
  await fs.writeText(target, String(text))
  return target
}

/** 读凭据（config.json）。任何异常都退化成 {}：没配置 ≠ 报错。 */
export const loadPnlConfig = async function (core) {
  try {
    const text = await pnlStateRead(core, CONFIG_FILE)
    const parsed = text == null ? null : JSON.parse(text)
    return (parsed && typeof parsed === 'object') ? parsed : {}
  } catch (e) { return {} }
}

/**
 * 写凭据：**读-改-写合并**（与旧插件 saveState 同语义），pretty JSON。
 * 写失败会抛错 —— 用户必须知道「Cookie 没存上」，不能静默成功。
 */
export const savePnlConfig = async function (core, patch) {
  const cur = await loadPnlConfig(core)
  const next = Object.assign({}, cur, patch || {})
  await pnlStateWrite(core, CONFIG_FILE, JSON.stringify(next, null, 2))
  return next
}

/** 读快照（snapshot.json）。缺失 / 损坏都返回 null。 */
export const loadPnlSnapshot = async function (core) {
  try {
    const text = await pnlStateRead(core, SNAPSHOT_FILE)
    const parsed = text == null ? null : JSON.parse(text)
    return (parsed && typeof parsed === 'object') ? parsed : null
  } catch (e) { return null }
}

/** 写快照：**写不了不该让请求失败**，所以这里静默（与旧插件 saveSnapshot 一致）。 */
export const savePnlSnapshot = async function (core, snapshot) {
  try {
    await pnlStateWrite(core, SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2))
    return true
  } catch (e) { return false }
}

// 状态文件读写：账本**凭据**（config.json）+ **本地持仓**（positions.json）。
//
// 为什么持仓要独立一份、而且是主数据：持仓大多数时间不变，用户还可能想手改（补一只、改股数、
// 删掉已清仓的）。它是「输入」，价格与盈亏是「输出」——输出绝不落盘（见 constants.js 的说明）。
//
// 旧快照文件 snapshot.json 属于「账本分时口径」时代（每分钟一次的账户级盈亏），已不再读写：
// 留着不动，也不会被本插件删除（旧插件 dsh-ths-pnl 若还在用，它的数据不受影响）。
//
// 落点解析与宿主 state.js 同套路（稳定目录优先 + 沙箱可写性探测 + 工作区回退），
// 但**独立 memo** core.pnlBasePromise：两套东西的默认目录不同、探测失败时机也不同。

import { dshHomeBase } from '../state.js'
import { PNL_STATE_DIR, CONFIG_FILE, POSITIONS_FILE, POSITIONS_SCHEMA } from './constants.js'
import { normalizeRows } from './collect.js'

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
  if (!fs) throw new Error('fs 服务不可用，无法保存状态文件')
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

// ---- 本地持仓（positions.json）----

/** 空持仓表：首次使用 / 文件损坏 / schema 认不出来时的兜底（**不会**让界面报错）。 */
function emptyPositions(extra) {
  return Object.assign({
    schema: POSITIONS_SCHEMA,
    updated_at: null,      // 本地最后一次修改（增删改都会刷新）
    rows: [],              // 输入字段：code / name / qty / cost
    cloud: null,           // 最后一次云端同步的元信息（见 index.js 的 syncMeta）
  }, extra || {})
}

/**
 * 读本地持仓。**永不返回 null**（调用方不必到处判空）：读不到就是空表。
 *
 * 兼容两代结构：
 *   v4 → 直接用；
 *   v3（账本快照）→ 只取 code/name/qty/cost 四个输入字段迁移成 v4，
 *                   派生字段（price/value/hold_profit/day_profit…）一律丢弃 —— 它们是
 *                   账本某个时刻的快照，留着会让「编辑股数后现价不动」自相矛盾。
 * 其它（损坏 / 未来版本 / 空文件）→ 空表。
 */
export const loadPositions = async function (core) {
  let parsed = null
  try {
    const text = await pnlStateRead(core, POSITIONS_FILE)
    parsed = text == null ? null : JSON.parse(text)
  } catch (e) { parsed = null }
  if (!parsed || typeof parsed !== 'object') return emptyPositions()

  const rows = normalizeRows(parsed.rows)
  const cloud = (parsed.cloud && typeof parsed.cloud === 'object') ? parsed.cloud : null
  const version = Number(parsed.schema)
  if (version === POSITIONS_SCHEMA) {
    return {
      schema: POSITIONS_SCHEMA,
      updated_at: parsed.updated_at || null,
      rows: rows,
      cloud: cloud,
    }
  }
  // 旧结构（≤ v3）：能迁多少迁多少，`migrated_from` 让界面/日志能说清数据是哪来的。
  return emptyPositions({
    rows: rows,
    cloud: cloud,
    updated_at: parsed.updated_at || null,
    migrated_from: Number.isFinite(version) ? version : 'unknown',
  })
}

/**
 * 写本地持仓。**抛错**（与凭据一致）：写不进去就不能假装保存成功 ——
 * 用户刚改的股数丢了却弹出「已保存」，比直接报错糟糕得多。
 */
export const savePositions = async function (core, store) {
  const s = store || {}
  const next = {
    schema: POSITIONS_SCHEMA,
    updated_at: s.updated_at || null,
    rows: normalizeRows(s.rows),
    cloud: (s.cloud && typeof s.cloud === 'object') ? s.cloud : null,
  }
  await pnlStateWrite(core, POSITIONS_FILE, JSON.stringify(next, null, 2))
  return next
}

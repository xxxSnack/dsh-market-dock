// 状态文件落点：稳定目录（$DSH_HOME/dsh-xueqiu）优先，工作区回退。读/写/旧路径回读都在这里。

export function installState(core) {
  const ctx = core.ctx

  // ---- 状态文件落点：稳定目录优先，工作区回退 ----
  // 旧实现 cwd=工作区根 → 状态文件跟着 dsh web 启动目录漂移（换目录启动=换一套
  // 自选/登录/界面状态）。现在优先写 $DSH_HOME/dsh-xueqiu/（writeText 自动建目录），
  // 沙箱策略拒绝工作区外绝对路径时探测失败，透明回退旧工作区行为（零回归）。
  // 读取顺序：稳定文件 → 缺失则回读旧工作区文件（存量数据无缝迁移，首次保存落到稳定目录）。
  function stableStateDir() {
    try {
      const env = (typeof process !== 'undefined' && process && process.env) || {}
      const base = env.DSH_HOME || ((env.HOME || env.USERPROFILE) ? (env.HOME || env.USERPROFILE) + '/.dsh' : '')
      // 目录名可由插件配置覆盖（默认 dsh-xueqiu，与上游存量数据无缝继承；见 lib/config.js）
      return base ? String(base).replace(/[/\\]+$/, '') + '/' + core.config.stateDir : ''
    } catch (e) { return '' }
  }
  function stateBase(fs, root) {
    if (!core.stateBasePromise) {
      core.stateBasePromise = (async function () {
        const dir = stableStateDir()
        if (!fs || !dir) return ''
        try {
          const probe = await fs.resolve(dir + '/.write-probe', { cwd: root })
          await fs.writeText(probe, String(Date.now()))
          return dir
        } catch (e) { return '' }
      })()
    }
    return core.stateBasePromise
  }
  // 读：稳定文件优先；稳定模式且稳定文件缺失时，回读旧工作区路径（迁移源）
  async function stateRead(name, fs, root) {
    const dir = await stateBase(fs, root)
    if (dir) {
      try { return await fs.readText(await fs.resolve(dir + '/' + name, { cwd: root })) } catch (e) { /* 试旧工作区 */ }
    }
    if (!root) return null
    try { return await fs.readText(await fs.resolve(name, { cwd: root })) } catch (e) { return null }
  }
  // 写：稳定模式写稳定目录；否则旧工作区。返回真实落点（排障暴露用）
  async function stateWrite(name, text, fs, root) {
    const dir = await stateBase(fs, root)
    const target = await fs.resolve(dir ? dir + '/' + name : name, { cwd: root })
    await fs.writeText(target, text)
    return target
  }

  core.stateBase = stateBase
  core.stateRead = stateRead
  core.stateWrite = stateWrite
}

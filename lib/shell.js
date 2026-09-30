// shell 服务的「前台执行」兼容层。
//
// DSH 0.2 起，shell 服务的 `run(spec)` 改名为 `execute(spec)`，并且**返回值语义也变了**：
//   · 0.1.x：`await shell.run(spec)` → 直接得到结果 { exitCode, stdout: { text }, stderr, timedOut, … }
//   · 0.2.x：`await shell.execute(spec)` → 得到「执行句柄」；前台执行 = `await handle.result()`
//            （句柄另有 readOutput/kill/status，后台执行才用得上，本插件只用前台。）
// 旧 API 下这里会拿到一个没有 result() 的普通对象；新 API 下直接读 exitCode 会得到 undefined，
// 表现为「请求成功但拿到空输出」——比抛错更难查，所以两条路径在这里一次分清。
//
// 兼容策略：有 execute 就走新 API（当前 DSH 的实际情况），否则回落到 run，
// 让插件在 0.1.x 运行时也能工作（动态形态 / 未升级的宿主）。

// 注：用具名 async 函数表达式（构建器只认 `export function|const|let|var|class` 开头的导出行）。
export const runShell = async function (shell, spec) {
  if (typeof shell.execute === 'function') {
    const handle = await shell.execute(spec)
    // 防御：万一某个执行器的 execute 直接 resolve 成结果对象（无 result 方法），原样返回
    if (!handle || typeof handle.result !== 'function') return handle
    return handle.result()
  }
  return shell.run(spec)
}

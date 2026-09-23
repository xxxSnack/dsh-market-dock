// 由 tools/build.mjs 从 lib/ 生成 —— 勿手改；改源后运行 node tools/build.mjs（host 静态入口）
// DSH bundle layer 通过 package.json 的 main 以真实 ESM 加载本文件，
// 实现全部在 lib/ 里（同工作区 dsh-ths-pnl 已是多文件 ESM 的既成先例）。
export { default } from '../lib/index.js'

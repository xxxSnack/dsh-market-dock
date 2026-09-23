# dsh-xueqiu-debug — 本地 fork 说明

本目录是 `dsh-xueqiu` 的本地 fork，用于摆脱上游发布节奏（`npm i dsh-xueqiu@latest` 之类
不会覆盖这里），并承载本地改动。

- 上游：`dsh-xueqiu@1.22.15`（https://github.com/wanderer-yk/dsh-xueqiu ，MIT）
- 本 fork 包名：`dsh-xueqiu-debug`，版本 `1.22.15-fork.1`
- cordis 插件 id：`xueqiu` → `xueqiu-debug`
- 槽位实例 id：`xueqiu-panel` / `xueqiu-badge` / `xueqiu-ticker`
  → `xueqiu-debug-panel` / `xueqiu-debug-badge` / `xueqiu-debug-ticker`
- Agent 侧工具名**保持** `xueqiu_quote` / `xueqiu_kline` / `xueqiu_hot` / `xueqiu_news` /
  `xueqiu_search` / `xueqiu_kol`（提示词与工具调用都按这些名字走，改名会破坏既有习惯）。
  代价：不能与上游 `dsh-xueqiu` 同时启用（会重复注册同名工具），本 fork 是**替代**上游。
- 状态目录默认仍是 `$DSH_HOME/dsh-xueqiu/`（存量自选/Cookie/界面位置无缝继承；
  可用插件配置 `stateDir` 改成别的目录与上游彻底隔离，见 §4）。

---

## 1. 架构（2026-09 重构后）

### 1.1 唯一手写源 + 构建产物

上游用 `scripts/gen-static.py` 从 `dynamic/` 生成 `src/`，但**该生成器没有随 npm 包发布**，
于是历史上每次改动都要在 `dynamic/` 与 `src/` 两侧手工同步（下面 §6 的两个 bug 都源于这种不同步）。
本 fork 把关系彻底反转：

```
手写源（唯一事实来源）                    构建产物（勿手改）
├── lib/            host 侧实现     ─┐
├── client/         client 侧实现   ─┼─ node tools/build.mjs ─→ src/index.js            宿主静态入口（薄壳）
├── assets/         KLineChart UMD  ─┤                           src/client/index.js   客户端静态 bundle
└── tools/build.mjs 构建器          ─┘                           dynamic/host.js       宿主动态模块
                                                                 dynamic/client.js     客户端动态模块
```

四个产物由 `tools/build.mjs` 生成（上游 gen-static.py 的替代品，零依赖、纯 Node）。
**关键设计：client 源码在动态/静态两种形态下逐字节相同** —— 静态形态由 wrapper 补两个门面 shim
（`const styles = { insert: insertStyle }`、`const host = { call: … fetch('/xq-rpc') }`），
而不是去改写源码，所以「动态版与静态版行为漂移」在构造上不可能发生。

### 1.2 运行时形态（两套并存，DSH 侧决定用哪套）

| 形态 | 宿主入口 | 客户端 bundle | 触发条件 |
|---|---|---|---|
| 静态（本机安装方式） | `src/index.js`（真实 ESM，re-export `../lib/index.js`） | `src/client/index.js`（classic script，注册到 `__ModuleLoader__`） | DSH bundle layer（profile 的 `dsh.profile.bundles`） |
| 动态 | `dynamic/host.js`（函数体形式，`new Function` 可 eval） | `dynamic/client.js`（函数体形式） | 动态插件运行时（`globalThis.harness` 存在） |

宿主侧两条 RPC 路径互斥：动态走 `harness.handle('xq.call', …)`；静态走 `webServer` 的
`/xq-rpc` 前缀路由（回环 Host 白名单 + Origin 同源栅栏 + 1MB 上限）。工具注册同样双路
（`harness.registerTool`+`defineTool` / `ctx.inject(['tools'])`+`tools.register`）。

### 1.3 目录地图

**host（`lib/`，23 个模块，顺序见 `lib/manifest.txt`）**

| 模块 | 职责 |
|---|---|
| `constants.js` | UA/BASE/SITE/curl 名/默认自选表/调度与钳制常量 |
| `config.js` | 插件配置解析（`stateDir` / `watchlist`），未配置时全部走默认值 |
| `cache.js` `gate.js` `http.js` | 请求管道：TTL 缓存+去重 → 并发/限速/看门狗 → curl/ensureCookie/getJSON（含重试链） |
| `normalize.js` | 纯函数：nz/sanitize/pickQuote/mapKline/mapPosts/mapKOL/mapFinance |
| `state.js` `watchlist.js` `login.js` `ui-state.js` | 状态落点、自选（含云端镜像）、可选登录、UI 状态持久化 |
| `api.js` | 16 个雪球 endpoint 对应的 `act*` 业务动作 |
| `actions.js` | RPC `dispatch` 表（21 个 action）+ `handleCall` 包络 |
| `tools/*.js` | 每个 Agent 工具一个 spec 工厂 + `makeAgentTools(core)` 汇总 |
| `register.js` | 双路径注册（RPC 暴露 + 工具注册） |
| `core.js` | `createXqCore(ctx, config)`：共享状态 + 按序安装各模块 |
| `index.js` | 入口：`apply(ctx, config)` 薄壳 + `export default` |

**client（`client/`，23 个模块 + `styles.css`，顺序见 `client/manifest.txt`）**

| 模块 | 职责 |
|---|---|
| `constants.js` | 指数代码/周期表/钳制/轮询间隔/请求规模/槽位 id 与 order（**全插件唯一一份**） |
| `format.js` `dom.js` | 纯格式化、`el()`/视口/会话文案等渲染工具 |
| `platform.js` | `call()` 封装 + 19 个 action 名常量 |
| `store/ui.js` | UI 共享状态 + touched 守卫 + 幂等水合（**[fork-fix] 语义集中地**）+ 运行时持有者 |
| `store/market.js` | 共用取数薄封装（`fetchQuote`/`fetchIndices`/`fetchWatchlist`） |
| `charts/{setup,kline,minute}.js` | KLineChart 初始化/主题/销毁 + K 线 + 分时 |
| `tools/{parse,cards}.js` | 工具结果解析 + 4 个 toolview 卡片 |
| `panel/*.js` | 面板外壳（tab 查表分发）+ 6 个内层视图（登录/行情/详情/热榜/搜索/快讯） |
| `badge.js` `dock.js` `ticker.js` | 悬浮徽标、停靠面板门控、底部指数条 |
| `slots.js` | 7 个槽位注册（集中一处） |
| `index.js` | 入口：`apply` 薄壳（插样式 → 建运行时 → 装槽位）+ `export default` |

### 1.4 源码模块约定（构建器强制校验，违反即构建失败）

1. 只用**具名导出**：`export function` / `export const` / `export class`；
   **只有入口模块**可以 `export default 标识符`（单行）。
2. import 必须单行、相对路径、带 `.js`：`import { a, b } from './x.js'`；
   不许 `export {}` 列表 / `export *` / 动态 `import()` / `require()`。
3. 拼接顺序由 `manifest.txt` 决定：**被 import 的模块必须排在前面**（防 TDZ，构建期校验）。
4. 同一拼接组内导出名不得重复（拼完是同一个作用域）。
5. 样式这样引入：`// #include-styles ./styles.css`（构建期内联为模板字面量；文件里不能有反引号或 `${`）。

> 为什么不用 esbuild/rollup：插件运行环境无外网（装不了依赖），且客户端 bundle 有「依赖纯度」
> 硬约束（factory 里只能 `require` react 系 seed）。所以这里实现的是**受控子集拼接器**。

---

## 2. 构建与校验

```bash
node tools/build.mjs            # 构建全部四个产物（默认；幂等）
node tools/build.mjs --only=host    # 只构建宿主两件（并行开发时避免互相覆盖）
node tools/build.mjs --only=client
node tools/build.mjs --check        # 只校验产物是否为最新（提交前/CI 用，过期退出码 1）
node tools/build.mjs --extract-asset  # 一次性：从历史 bundle 反提 assets/klinecharts.min.js
```

```bash
npm run check        # 产物最新 + 四条语法/eval/JSON 检查
npm test             # 三套冒烟：宿主契约 77 项 + 客户端契约 46 项 + 配置 11 项
npm run verify       # verify-bundle（bundle 契约）+ verify-install（安装接管状态）
```

三套冒烟的定位：

| 脚本 | 锁住什么 |
|---|---|
| `test/smoke-host.mjs` | 插件形状、双路径注册、`/xq-rpc` 栅栏、RPC 动作、ui 往返、状态落点隔离、空参兜底 |
| `test/smoke-client.mjs` | bundle 注册 id、require 纯度、样式 `data-plugin`、7 个槽位 exact、渲染冒烟、水合后面板、降级路径 |
| `test/config.mjs` | 配置默认值向后兼容、配置生效、非法值（含路径穿越）安全回退 |

改产物前请**只改 `lib/`、`client/`、`assets/`**，然后重新构建；`src/`、`dynamic/` 一律不要手改。

---

## 3. 扩展指南（三张配方卡）

### 3.1 新增一个 Agent 工具（例：`xueqiu_fund`）

1. `lib/tools/fund.js`：照抄一个现有 spec 工厂的形状，导出
   `export function makeFundTool(core) { return { name, description, parameters, output, timeoutMs, execute } }`
   （`execute` 里调 `core.actFund(...)`）。
2. `lib/tools/index.js`：在 `makeAgentTools` 返回的数组里加一项（**顺序=注册顺序**，追加到末尾不影响既有习惯）。
3. `lib/manifest.txt`：注册 `tools/fund.js`（放在 `tools/index.js` 之前）。
4. 若需要新数据源：`lib/api.js` 里加 `actFund`（走 `core.getJSON('/v5/...', …, { ttl })` 即自动获得缓存/限速/重试），
   在 `lib/actions.js` 的 `dispatch` 表加一行（客户端要用的话）。
5. 跑 `node tools/build.mjs --only=host && npm test`。

### 3.2 新增一个客户端 RPC action

1. `lib/api.js` 写 `core.actXxx`；2. `lib/actions.js` 的 `dispatch` 加一行；
3. `client/platform.js` 加 `A_XXX = 'xxx'` 常量；4. 在组件里 `call(A_XXX, {...})`。
   传输层（harness / webServer）与两条注册路径**零改动**。

### 3.3 新增一个面板 tab（例：`watch`）

1. `client/panel/watch.js`：仿 `panel/market.js` 写 `export function WatchTab(p) { … }`，
   文件头注释里列出它用到的 `p.*` 字段（这是既有约定）。
2. `client/panel/index.js`：
   - `XQ_TABS` 加一项 `watch: WatchTab`（**未知 tab 仍兜底到 news**，与旧 if/else 行为一致）；
   - `TAB_CTX` 加一项 `watch: function () { return { … } }`（字段 = 该 tab 用到的父级 state/句柄）；
   - `client/constants.js` 的 `PANEL_TABS` 加一行 `['watch', '自选']`（按钮顺序即数组顺序）。
3. `client/manifest.txt` 注册新模块（放在 `panel/index.js` 之前）。
4. 需要新数据源时按 3.2 加 action；样式加到 `client/styles.css`（用 `xq-` 前缀）。
5. 跑 `node tools/build.mjs && npm test`。

---

## 4. 插件配置（可选）

配置从 DSH 的 bundle layer 传入（cordis 会把 `config` 作为 `apply(ctx, config)` 的第二个参数）。
在 profile 的 patch / bundle 层里给本插件节点写 `config` 即可，例如：

```yaml
- insert:
    - id: xueqiu-debug
      name: 'dsh-xueqiu-debug'
      config:
        stateDir: dsh-xueqiu-debug          # 与上游/旧数据彻底隔离（切换后不会自动迁移旧数据）
        watchlist: [SH600519, 00700, AAPL]  # 无状态文件时的默认自选表
```

| 键 | 默认值 | 说明 |
|---|---|---|
| `stateDir` | `dsh-xueqiu` | `$DSH_HOME/<stateDir>/`。只接受 `[A-Za-z0-9._-]+`，非法值（含 `../`、含分隔符、非字符串）一律退回默认 |
| `watchlist` | 6 只内置票 | 首个自选表；自动去空白、上限 200；空数组退回默认 |

**未配置时行为与重构前逐字一致**（`test/config.mjs` 锁住这条）。
轮询间隔（面板 20s/60s、休市 60s/180s、徽标 30s、指数条 30s）**暂不可配**：定时器在组件
effect 挂载时就注册了，而配置是异步到达的，要正确支持需给 4 个 effect 加「配置就绪」门控；
目前这些值集中在 `client/constants.js` 一处，需要调整改这一个文件即可。

---

## 5. 修复的 BUG（历史记录，[fork-fix] 注释仍在源码里）

### 5.1 切换会话后徽章位置弹回右下角

**症状**：拖动右下角「雪球 mini」徽标到任意位置后，切换对话，徽标自动回到右下角区域。
（注意：输入框上方那块面板是 `conversation.input.dock` 的**停靠**面板，只能拖高度，
不可移动；可移动的是 `shell.overlay` 里的悬浮徽标 `MiniBadge`。）

**根因（上游 1.22.15 的两处缺陷叠加，非有意设计）**
1. **拖动位置基本没落盘。** `ui.set()` 只在 patch 里含 `open` 时才排一次保存；
   徽标拖拽结束是 `ui.set({ badgePos: pos })`，不含 `open`，不保存。
   唯一能间接保存它的是 `DockPanel` 的 `ui.subscribe`，而面板收起时
   `DockGate` 直接 `return null`，`DockPanel` 根本没挂载 → 位置永不写入。
2. **切会话时水合无条件覆盖内存态。** `ui.get` 水合写在 `DockGate` 里，而
   `conversation.input.dock` 的 scope 是 `"session"`（见
   `@deepseek-ai/dsh-client-ui-conversation/lib/client.js`），切会话重挂会重放水合，
   把刚拖到的位置覆盖成旧的持久化值。
   `open`/`tab` 有 `openTouched`/`tabTouched` 守卫防这种打回，`badgePos`/`badgeW`/`dockH` 没有
   —— 这个不对称就是漏改的证据。

**改动**（现位于 `client/store/ui.js`，`dynamic/client.js` 与 `src/client/index.js` 由构建器生成）
| 位置 | 改动 |
|---|---|
| `ui` 初始化 | 新增 `badgePosTouched`/`badgeWTouched`/`dockHTouched` 标志 |
| `ui.set` | 位置/尺寸也置 touched；落盘条件从 `'open' in patch` 扩展为 open/badgePos/badgeW/dockH 任一 |
| `hydrateUi()` | 新增：应用级、幂等、只跑一次的水合（含 touched 判断） |
| `DockGate` / `MiniBadge` | 只调 `hydrateUi()`（幂等）；`shell.overlay` 全局只挂一次，故水合入口在 MiniBadge |

### 5.2 客户端 bundle 注册 id 没跟着改名，插件整块加载失败

**症状**：改名后 HARNESS 面板报
`bundle … loaded without registering "dsh-xueqiu-debug" via __ModuleLoader__.load`，
插件面板/徽标/行情界面全部不出现（宿主侧 Agent 工具不受影响）。

**根因**：`gen-static.py` 把**包名**写进两处字面量 —— `__ModuleLoader__.load({ id })` 与
`<style data-plugin>`；改名时只改了 `dynamic/client.js`，漏了生成物。loader 按行 id（=包名）
查 factories 表，注册 id 不符即断言失败并把整个插件标记为加载失败。

**改动**：注册 id 与 `data-plugin` 均改为包名。现在这两处由 `tools/build.mjs` 统一生成
（`emitStaticClient` 模板里取 `PKG`），**不可能再漏改**；`tools/verify-install.mjs` 与
`verify-bundle.mjs` 都盯着这条契约。

## 6. 已知问题（原样保留，未修）

- `uiState.pos` / `uiState.minimized` 是旧「浮动面板」设计的死字段（`ui.get`/`ui.set` 从不读写）；
  保留以维持状态文件兼容。
- `gate.js` 外层的 `release()`、`login.js` 的 `ensureCloudPid()` 是死代码（无调用点）。
- `ensureCookie` 里 `shell.resolve(...)` 在 try/catch **之外**：`shell.run` 抛错会被吞掉走
  「无 cookie 继续」，而 `shell.resolve` 抛错会让播种 promise reject 并被归类为 network（白等一次退避）。
- `actQuoteDetail` / `actFinance` 对上游返回 JSON `null` 无防御（会被 `handleCall` 兜成 error 文案）。
- 工作区根目录的 `.xueqiu-ui-state.json` / `.xueqiu-watchlist.json` 是 1.22.x 迁移前的遗留回退路径
  （`stateRead` 只在稳定目录缺失时才读），可安全删除。

## 7. 安装

`C:\Users\海尔\.dsh\profiles\web\package.json`：
- `dependencies`：`"dsh-xueqiu": "^1.22.15"` → `"dsh-xueqiu-debug": "link:D:/project/financial_analysis/plugins/dsh-xueqiu-debug"`
- `dsh.profile.bundles`：`"dsh-xueqiu"` → `"dsh-xueqiu-debug"`

并把 `node_modules/dsh-xueqiu-debug` 指到本目录（与 `dsh-ths-pnl` 同款 symlink）。
**改了宿主侧（`lib/`）要重启 `dsh web`；只改客户端（`client/`）刷新页面即可**
（未跑 `pnpm run dev:web` 时客户端 bundle 不会自动热更）。

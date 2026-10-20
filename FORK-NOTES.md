# dsh-xueqiu-debug — 本地 fork 说明

本目录是 `dsh-xueqiu` 的本地 fork，用于摆脱上游发布节奏（`npm i dsh-xueqiu@latest` 之类
不会覆盖这里），并承载本地改动。

- 上游：`dsh-xueqiu@1.22.15`（https://github.com/wanderer-yk/dsh-xueqiu ，MIT）
- 本 fork 包名：`dsh-xueqiu-debug`，版本 `1.22.15-fork.2`
- cordis 插件 id：`xueqiu` → `xueqiu-debug`
- 槽位实例 id：`xueqiu-panel` / `xueqiu-badge` / `xueqiu-ticker`
  → `xueqiu-debug-panel` / `xueqiu-debug-badge` / `xueqiu-debug-ticker`
- Agent 侧工具名**保持** `xueqiu_quote` / `xueqiu_kline` / `xueqiu_hot` / `xueqiu_news` /
  `xueqiu_search` / `xueqiu_kol`（提示词与工具调用都按这些名字走，改名会破坏既有习惯）。
  代价：不能与上游 `dsh-xueqiu` 同时启用（会重复注册同名工具），本 fork 是**替代**上游。
- 状态目录默认仍是 `$DSH_HOME/dsh-xueqiu/`（存量自选/Cookie/界面位置无缝继承；
  可用插件配置 `stateDir` 改成别的目录与上游彻底隔离，见 §4）。
- 已并入 `dsh-ths-pnl` 的「今日盈亏」：面板头部常驻 chip + 第 5 个「盈亏」tab，
  **与 `dsh-ths-pnl` 共用同一份凭据与快照**（`$DSH_HOME/dsh-ths-pnl/`），见 §8。

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

**host（`lib/`，31 个模块，顺序见 `lib/manifest.txt`）**

| 模块 | 职责 |
|---|---|
| `constants.js` | UA/BASE/SITE/curl 名/默认自选表/调度与钳制常量 |
| `config.js` | 插件配置解析（`stateDir` / `watchlist` / `pnlStateDir`），未配置时全部走默认值 |
| `cache.js` `gate.js` `shell.js` `http.js` | 请求管道：TTL 缓存+去重 → 并发/限速/看门狗 → **shell 前台执行兼容层** → curl/ensureCookie/getJSON（含重试链） |
| `normalize.js` | 纯函数：nz/sanitize/pickQuote/mapKline/mapPosts/mapKOL/mapFinance |
| `state.js` `watchlist.js` `login.js` `ui-state.js` | 状态落点、自选（含云端镜像）、可选登录、UI 状态持久化 |
| `pnl/*.js` | 今日盈亏：`constants`/`session`（交易时段纯函数）/`http`（Cookie+带状态码 curl）/`store`（**共用** `dsh-ths-pnl` 的 config.json+snapshot.json）/`collect`（组合·采集·校验）/`index`（3 个 act* + 边界调度） |
| `api.js` | 16 个雪球 endpoint 对应的 `act*` 业务动作 |
| `actions.js` | RPC `dispatch` 表（24 个 action）+ `handleCall` 包络 |
| `tools/*.js` | 每个 Agent 工具一个 spec 工厂 + `makeAgentTools(core)` 汇总 |
| `register.js` | 双路径注册（RPC 暴露 + 工具注册） |
| `core.js` | `createXqCore(ctx, config)`：共享状态 + 按序安装各模块 |
| `index.js` | 入口：`apply(ctx, config)` 薄壳 + `export default` |

**client（`client/`，25 个模块 + `styles.css`，顺序见 `client/manifest.txt`）**

| 模块 | 职责 |
|---|---|
| `constants.js` | 指数代码/周期表/钳制/轮询间隔/请求规模/槽位 id 与 order（**全插件唯一一份**） |
| `format.js` `dom.js` | 纯格式化、`el()`/视口/会话文案等渲染工具 |
| `platform.js` | `call()` 封装 + 22 个 action 名常量 |
| `store/ui.js` | UI 共享状态 + touched 守卫 + 幂等水合（**[fork-fix] 语义集中地**）+ 运行时持有者 |
| `store/market.js` | 共用取数薄封装（`fetchQuote`/`fetchIndices`/`fetchWatchlist`） |
| `store/pnl.js` | 今日盈亏共享状态 + **单一轮询器**（节奏由宿主 `next_poll_ms` 决定，chip 与 tab 共用一份数据） |
| `charts/{setup,kline,minute}.js` | KLineChart 初始化/主题/销毁 + K 线 + 分时 |
| `tools/{parse,cards}.js` | 工具结果解析 + 4 个 toolview 卡片 |
| `panel/*.js` | 面板外壳（tab 查表分发）+ 6 个内层视图（登录/行情/详情/热榜/搜索/快讯）+ `pnl.js`（头部 chip 与「盈亏」tab） |
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
npm test             # 六套测试共 363 项断言：72 + 50 + 130 + 47 + 53 + 11
npm run verify       # verify-bundle（bundle 契约）+ verify-install（安装接管状态）
```

六套测试的定位：

| 脚本 | 锁住什么 |
|---|---|
| `test/smoke-host.mjs` | 插件形状、双路径注册、`/xq-rpc` 栅栏、RPC 动作、ui 往返、状态落点隔离、空参兜底、今日盈亏 RPC（§9） |
| `test/pnl-session.mjs` | 交易时段纯函数：边界划分、下一个边界、该不该拉、下次间隔、刷新间隔钳制 |
| `test/pnl-cookie.mjs` | Cookie 规整与**字段锚定**（`pex_userid` 回归）、带状态码的 curl、上游错误语义 |
| `test/pnl-rpc.mjs` | **端到端**：真 `/xq-rpc` → dispatch → 假 curl → **与旧插件共用的状态文件** → 响应 JSON |
| `test/smoke-client.mjs` | bundle 注册 id、require 纯度、样式 `data-plugin`、7 个槽位 exact、渲染冒烟、水合后面板、盈亏接线、降级路径 |
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

> ⚠️ **tab 组件里一旦用了 hook**（`React.useState` / `React.useEffect` …），它就会作为独立 fiber
> 被 `el(renderTab, tabProps)` 挂载 —— 这是 `panel/index.js` 已经做好的，**你不需要改分发逻辑**，
> 但也**绝不能**在自己代码里把别的组件写成裸调用 `SomeComp(props)`。见 §5.3。
> 新增/改完 tab 后 `npm run verify` 的第 4 节会核对这条。

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
| `pnlStateDir` | `dsh-ths-pnl` | 今日盈亏的凭据/快照目录 `$DSH_HOME/<pnlStateDir>/`。**默认与 `dsh-ths-pnl` 插件共用**，所以两边数值一致、Cookie 只需粘一次；校验规则同 `stateDir`。想彻底隔离就改这里 |

**未配置时行为与重构前逐字一致**（`test/config.mjs` 锁住这条）。
雪球自己的轮询间隔（面板 20s/60s、休市 60s/180s、徽标 30s、指数条 30s）**暂不可配**：定时器在组件
effect 挂载时就注册了，而配置是异步到达的，要正确支持需给 4 个 effect 加「配置就绪」门控；
目前这些值集中在 `client/constants.js` 一处，需要调整改这一个文件即可。

> 今日盈亏的刷新间隔**是可配的**（界面上改，5–3600 秒），因为它走的是另一条路子：
> 节奏由**宿主**决定（`pnl.get` 回传 `next_poll_ms`），客户端只照着排下一次，不存在
> 「配置异步到达时定时器已经注册好」的问题。要加可配的轮询，照这条范式做。

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

### 5.3 切 tab 让整个面板消失，且再也点不开（hook 链表错位）

**症状**：在「盈亏」tab 与其它 tab（行情/热榜/搜索/快讯）之间切换，面板**整块消失**，
之后点徽标也再打不开；不切 tab 则一切正常。

**根因**：`client/panel/index.js` 用**裸函数调用**分发 tab：

```js
content = renderTab(TAB_CTX[tabKey]())   // 旧写法：renderTab = XQ_TABS[tabKey]
```

`XQ_TABS` 里 `market/hot/search/news` 四个 tab **一个 hook 都不用**，而第 5 个 `pnl`
（`panel/pnl.js`）用了 **7 个**（`usePnlState()` 贡献 1 `useState` + 1 `useEffect`，
`PnlTab` 自己再有 4 `useState` + 1 `useEffect`）。裸调用等于把子组件的 hook 记进了
**调用者 `XueqiuPanel` 自己的 hook 链表**：切到盈亏时链表 +7，切走时 -7，React 立刻抛
`Rendered fewer hooks than expected. This may be caused by an accidental early return statement.`
→ 正在渲染的那棵子树被卸载，用户看到的就是「面板整块消失」。之后点徽标重开仍失败，是因为
点开＝在同一个已损坏的渲染位置重试（tab 状态还停在盈亏上，重新挂载后一旦再切走就再次抛错）。
> 诚实标注：抛错信息与「切到盈亏才炸、不切就正常」的现象完全吻合，这一点是确证的；
> 「重开后仍打不开」的确切链路（DSH 的槽位是否有错误边界、是否记住失败状态）我无法在本地复现验证，
> 因此上文只描述到「子树被卸载 + 同一位置重试」为止。**修复点本身（hooks 挂载方式）是独立成立的硬约束**。

这是 React 的经典坑，但**在本次整合里是新引入的**：加 `pnl` tab 之前，五个 tab 全是无 hook
的纯展示组件，裸调用一直"碰巧"成立。教训是「无 hook 组件」这个前提没有被任何校验盯着。

**改动**（`client/panel/index.js`）
| 位置 | 改动 |
|---|---|
| `LoginBox` / `DetailView` | `LoginBox({...})` → `el(LoginBox, {...})` |
| tab 分发 | `renderTab(TAB_CTX[t]())` → `tabProps.key = t; el(renderTab, tabProps)`，`key` 让每个 tab 是一棵**独立 fiber**（切换即卸载重挂，hook 链表天然隔离） |

**防回归**（两层，都做完才算完）
1. **静态闸门** `tools/verify-wiring.mjs` 第 4 节「hooks 组件挂载方式」：递归扫 `client/**/*.js`，
   找出所有 hooks 组件 —— 判据是「导出函数体内含 `React.use*`」**或**「调用了本项目自定义的
   `export function useXxx`」（后者不可省：`PnlChip` 里一个 `React.use*` 字面量都没有，只用
   `usePnlState()`，只扫前者会漏掉它）；`useXxx` 开头的真 hook 跳过。
   再全量扫描这些名字的裸调用（`Name(` 且前面不是 `el(` / `function ` / `.`）即失败；
   另钉死 `panel/index.js` 里必须存在字面量 `el(renderTab, `。已接入 `npm run verify`。
   变异验证：① 改回 `renderTab(tabProps)` → `✗ tab 分发表未以 el(renderTab, ...) 挂载 —— 切 tab 会共享 hook 链表`；
   ② 把 `el(PnlChip, …)` 改成 `PnlChip({…})` → `✗ client/ticker.js 裸调用了 PnlChip()（定义在 client/panel/pnl.js）`。两者 exit 1，恢复后 exit 0。
   当前输出：`✓ 9 个 hooks 组件均以 el(...) 挂载：MiniBadge, KlineChart, MinuteChart, DockGate, DockPanel, XueqiuPanel, PnlChip, PnlTab, Ticker`。
2. **运行时闸门** `test/smoke-client.mjs` §5c：React 替身按**组件**归集 hook 数，驱动
   `market→pnl→market` 与 `news→pnl→news` 复渲染，断言每个组件的 hook 数恒定。

**推广规则**：**任何含 hook 的组件都必须以 `el(Comp, props)` 挂载**，绝不要写成 `Comp(props)`。
本文件 §3.3 的「新增一个 tab」配方已按此更新。

### 5.4 悬浮徽章折叠按钮不能误开大面板

**症状**：徽章根节点把 `pointerdown/up` 统一当成拖动/开合手势，内部新加按钮会冒泡到根节点；而根节点在 `pointerdown` 时还会取得 pointer capture。单加 `onClick` 的 `stopPropagation()` 不足以阻止 `pointerup` 翻转 `ui.open`。

**改动**（`client/badge.js`）：
- 标题栏最右侧、小三角左边增加 `−` 按钮，收起指数/自选列表为胶囊；胶囊上的 `+` 或徽章背景点击恢复完整徽章。
- 控件独立拦截指针事件；根节点另以控件命中检测和「必须先有本徽章 pointerdown」双重防护，不会把控件的 `pointerup` 当成开面板；`pointercancel` 也不再误开合。
- 新增持久化字段 `badgeCompact`，刷新后保留折叠选择。

**防回归**：`test/smoke-client.mjs` §5d 强制模拟控件事件继续冒泡，断言只切换徽章形态、不改大面板开合；并验证背景区域仍可开合。`test/smoke-host.mjs` 覆盖 `badgeCompact` 的 `ui.get/ui.set` 与落盘往返。

### 5.5 轮询在收盘/开盘边界卡住、慢响应覆盖新数据

**症状**：页面曾经隐藏或浏览器暂停定时器时，收盘后的长睡眠可能跨过次日 09:30；恢复前台后仍沿用旧计时，盈亏状态和行情状态要手动刷新才恢复。另一个独立问题是慢请求晚返回时可能覆盖较新的轮询结果，造成“偶尔更新不及时”。

**根因**：P&L 客户端盘外只重排 timer，没有监听 `visibilitychange`；面板、徽标、底部指数条原先也没有请求序列号。宿主收盘/开盘失败时还会把 attempt 错记成当天已成功，后续 `shouldFetch` 会冻结重试。

**改动**：
- `client/store/pnl.js`：首个订阅者绑定前台恢复监听；恢复时取消旧 timer，立即调用 `pnl.get`，由宿主按北京时间重新判定；最后一个订阅者退出时解绑。
- `client/panel/index.js` / `client/badge.js` / `client/ticker.js`：给行情响应加序列守卫；旧响应、旧错误不能覆盖新结果。详情页驻留期间按行情节奏刷新报价/分时，回前台立即补拉。
- `lib/pnl/index.js`：账本刷新加单飞锁；失败只记录错误并保留上一份有效数值，不推进 `sessionDate/closeDate`，从而允许边界失败后重试；调度器卸载后不再重新 arm。
- `lib/api.js`：手动刷新/详情补拉传 `force:true` 时绕过雪球短 TTL；11:30、15:00 的客户端时段显示与宿主边界统一。

**防回归**：`test/smoke-client.mjs` 检查前台恢复、序列守卫、详情驻留刷新和手动 force 接线；`test/pnl-session.mjs` 锁住北京时间边界；完整测试套件共 382 项断言通过。

### 5.6 DSH 0.2 改名 `shell.run` → `shell.execute`，插件整条数据链路失效

**症状**（升级到 `0.2.0-rc.2` 后）：面板/徽标/底部指数条「显示和之前差别很大，也不能正常使用」。
实际是**没有任何数据**：徽标在没有报价时整块自选网格不渲染，只剩标题栏一条；底部条只剩余额 chip；
工具卡片退化成通用行；盈亏 chip 显示「数据异常」。6 个 Agent 工具也全部报
`Error: [network] shell.run is not a function`。

**根因**：DSH 0.2 把 `ctx.shell` 的前台执行方法从 `run(spec)` 改名为 `execute(spec)`，
**并且改了返回语义**——`execute` 返回「执行句柄」，前台执行要 `await handle.result()`
（句柄另有 `status`/`done`/`readOutput`/`kill` 供后台使用）。旧写法在 0.2 下直接抛
`shell.run is not a function`；若只把名字换成 `execute` 而忘了 `.result()`，会拿到句柄对象，
`exitCode` 为 undefined，表现为「请求成功但输出为空」——比抛错更难查。

**改动**
| 位置 | 改动 |
|---|---|
| `lib/shell.js`（新增） | `runShell(shell, spec)`：有 `execute` 走新 API（`await handle.result()`），否则回落 `run` |
| `lib/manifest.txt` | 注册 `shell.js`（排在 `http.js` 之前） |
| `lib/http.js` | `ensureCookie` 与 `curl` 两处改调 `runShell` |
| `lib/pnl/http.js` | `pnlRequest` 改调 `runShell` |

**防回归**（两层）
1. 5 个测试文件的假 shell 全部改成 **0.2 形状**：`execute(spec)` 返回 `{ result() }`，
   同时保留一个**会抛错的 `run()`**——插件若退回旧 API，测试立刻红。
   `test/pnl-rpc.mjs` 的「迟到响应」闸门也搬到了 `result()` 上，语义不变。
2. `lib/shell.js` 里对「`execute` 直接 resolve 成结果对象」的形态做了防御，
   避免未来执行器再改返回形态时静默拿到空输出。

**完整诊断记录**：`docs/dsh-0.2-shell-api-port.md`（含证据链、隔离实例验证方法、复核步骤）。

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

---

## 8. 今日盈亏（并入原 `dsh-ths-pnl`）

数据源是**同花顺投资账本**（`tzzb.10jqka.com.cn`，与雪球毫无关系），原先由独立插件
`plugins/dsh-ths-pnl` 以右下角角标展示；现已并入本插件，**旧的 `dsh-ths-pnl` 可以并存、也可以摘掉**。

### 8.1 为什么是「搬进来重写」而不是「直接复用旧代码」

`dsh-ths-pnl` 的宿主代码在 DSH 的**动态插件沙箱**里会直接抛错：
`dsh-cordis-host-runner` 的 `NODE_API_REDIRECTS` 会把 `fetch` / `setTimeout` / `require` 一律替换成
`xxx is not available in the dynamic package sandbox`，沙箱里也没有 `process`。
旧插件用了裸 `await fetch(...)`、裸 `setTimeout(...)`、`import ... from 'node:fs/promises'`，
所以它只能静态安装（这也是它没有 `dynamic/` 半区的原因）。
搬进来时全部改成本插件既有的服务范式：

| 能力 | 旧插件 | 现在 |
|---|---|---|
| HTTP | 全局 `fetch` | `ctx.get('shell')` 跑 `curl`（`CURL`/`NULL_DEV` 由 `lib/constants.js` 提供平台分支）+ `-w '\n__HTTP__%{http_code}'` 取状态码，**不跟随重定向** |
| 定时 | 全局 `setTimeout` | `ctx.effect` + `ctx.timeout`（返回值归一化成 stop 函数） |
| 落盘 | `node:fs/promises` | `ctx.get('fs')` + `ctx.get('sandboxPolicy')`，经 `lib/pnl/store.js` 定位 |

### 8.2 与旧插件共用状态文件（迁移期的关键设计）

`pnlStateDir` 默认 `dsh-ths-pnl`，即读写 `$DSH_HOME/dsh-ths-pnl/`：

- `config.json` → `{ cookie, fundKey, pollSec }`（字段名与旧插件逐字一致）
- `snapshot.json` → `{ pnl_yk, pnl_pct, error, token_expired, yk_field, fetched_at, fetched_reason, sessionDate, closeDate }`

于是**两个插件并存时数值必然一致**，Cookie 只需粘一次；摘掉旧插件后状态文件继续有效（无需迁移）。
`test/pnl-rpc.mjs` 端到端锁住这条契约（含 `clear` 只清 Cookie、**保留** `snapshot.json`）。
想彻底隔离就把 `pnlStateDir` 改成别的目录（代价：要重新粘一次 Cookie）。

### 8.3 宿主侧：3 个 action（`lib/pnl/`）

| action | 入参 | 出参要点 |
|---|---|---|
| `pnl.get` | `{ force?: boolean }` | `configured / pnl_yk / pnl_pct / error / token_expired / yk_field / updated_at / session / frozen / poll_ms / next_poll_ms`。宿主判定「该不该打上游」：**无快照必拉**、盘中心跳、盘外睡到下一个 09:30/13:00/15:00 边界；`force` 跳过判定强拉一次 |
| `pnl.verify` | — | 用存盘 Cookie 打一次 `account_list`：`{ configured, valid, error, portfolios, fundKey, poll_ms, min_sec, max_sec }` |
| `pnl.config` | `{ cookie?, fundKey?, pollSec?, clear? }` | 保存并**当场校验**；`pollSec` 越界夹到 5–3600、非数字报错；`clear:true` 只清 Cookie 保留快照 |

调度细节：`installPnl(core)` 在 `info.minutes >= 900`（15:00）后 45 秒补拉一次收盘终值
（**每个交易日只补一次**，且绕过 `shouldFetch`，否则 `closeDate` 已写就再也拉不到终值）。
节假日无法离线判断，按交易日处理（与旧插件一致的已知限制）。

> 注意：盈亏请求**不走** `core.getJSON`——那条管道认的是雪球错误码（400016/400017），
> 并发 2 / 最小间隔 100ms 也是雪球的风控预算，账本的 Cookie 与错误语义完全不同。

### 8.4 客户端侧

- 头部常驻 chip（`panel/pnl.js` 的 `PnlChip`，插在 `dock.js` 的 `xq-status` 之后）：切任何 tab 都可见，
  点击跳到「盈亏」tab；A 股习惯**涨红跌绿**，盘外显示 `盘前/午间/收盘/休市` 小标签。
- 底部指数条（`client/ticker.js` 的 `Ticker`，`conversation.composer.dock`）**也**渲染同一个 `PnlChip`，
  作为 `.xq-ticker` 行的最后一个子元素 —— 这是**面板收起时唯一能看到盈亏的落点**（`DockGate` 收起时
  直接 `return null`，头部 chip 跟着消失）。样式在 `styles.css` 里被 `.xq-ticker .xq-pnl-chip{background:none;padding:0;…}`
  压平成与指数同一行同一字号。
  该槽位是宿主输入框下方的 `display:flex` **不换行**行，所以指数条默认会和宿主的统计文字
  （`N 轮 M 步 · tok/s`、`… 缓存命中 96%`、成本插件的 `本会话 ¥0…`）挤在同一行。
  让它**独占一行**的做法在 `client/ticker.js` 的 `ownLine()` 里（挂载时执行、卸载时还原）：
  ① 沿父链找到真正的 flex 行 —— 宿主给槽位条目套了一层**无 class、`display:contents`** 的透明层，
  那一层不生成盒子（`getBoundingClientRect` 全 0，给它设 `flex-wrap` 无效），必须跳过它再往上一层；
  ② 给该行加 `flex-wrap:wrap`，给自己加 `flex:1 0 100%` + `order:9`（宿主原有统计行不动，指数条落到下面一行）；
  ③ **当场自检**：自己必须落到另一行（垂直范围与所有兄弟不重叠）且没有任何兄弟被挤成 0 宽，
  否则（含「行容器是居中收缩、百分比解析不出确定值」的情形）再试一次带 `align-self:stretch` 的变体，
  仍不行就原样撤回 —— 最坏情况退回行内布局，绝不会像纯 CSS 那样把宿主统计挤没。
  两条注意：① `Ticker` 的 `usePnlState()` 必须写在**任何 early return 之前**（hook 顺序）；② 早退条件已放宽为
  `if (!indices.length && !showPnl) return null`，指数接口挂掉时不再把整行（含盈亏）一起抹掉。
- 第 5 个 tab「盈亏」（`PnlTab`）：大字金额+百分比、数据时间、组合账户下拉、Cookie 粘贴框、
  刷新间隔（5–3600 秒）、`立即刷新`（`force:true`）、`清除 Cookie`。
- 取数只有一处：`store/pnl.js` 的**单一轮询器**（chip 与 tab 共享；引用计数启停；
  `force` 透传；并发去重；页面隐藏时跳过请求，恢复前台立即补拉；出错退避 60 秒）。
- tab 追加在 `PANEL_TABS` **末尾**，前 4 个 tab 的字面量与顺序未动。
- 宿主 `ui.get` 的 `validTabs` 已加 `'pnl'`（否则水合会把 `tab:'pnl'` 打回 `'market'`，chip 点击会失效）。

**已知取舍**：面板展开时头部 chip 与底部指数条 chip 会**同时**显示同一个数字（冗余但无害，
两处都点的都是同一份 `store/pnl.js` 状态，不会重复请求）；面板收起时只剩底部那一条。
两个 chip 都不可拖拽/不可独立隐藏。

### 8.5 摘掉旧的 `dsh-ths-pnl`

`dsh-ths-pnl` 是**普通本地目录，不是 submodule**，摘除完全可逆：

1. 编辑 `C:\Users\海尔\.dsh\profiles\web\package.json`，从 `dsh.profile.bundles` 里删掉 `"dsh-ths-pnl"` 一行
   （可选：同时删掉 `dependencies` 里的 `"dsh-ths-pnl": "link:..."`）。
2. 重启 `dsh web`、刷新页面。新的「盈亏」tab 应显示与旧角标相同的数值。
3. 回滚就是把这行加回去（`$DSH_HOME/dsh-ths-pnl/` 里的 Cookie 与快照全程未被改动）。

并存期两处会**各自**轮询（旧插件按自己的定时器、本插件按 `next_poll_ms`），大约每 60 秒各一次；
账本接口能承受，但确认无误后建议摘掉旧的，只留一份轮询。

---

## 9. 持仓明细（同花顺账本 `stock_position`）

盈亏只给到**账户级**的一个数（`pnl_yk`），拆不到「哪只、多少股、成本多少」。本节补的「持仓」tab 是
**逐只持仓明细**：股数 `count` + 持仓成本价 `cost` + 现价 / 市值 / 持仓盈亏 / 持仓天数。

### 9.1 接口是怎么找到的（可复现）

账本持仓接口**从无公开文档**：上游 `dsh-ths-holdings` 的 README 写着「自动同步真实持仓数据」，
但它的 `src/fetch.ts` 只调 `time_share` / `getQuotes` / `account_list` —— **从来没有取过逐只持仓**
（这是宣传话术，也是上次整合时「账本没有持仓接口」这个误判的来源）。

真实做法是从**网页端 bundle 里静态挖**（不需要抓包、不需要登录）：

1. 取 `https://tzzb.10jqka.com.cn/pc/index.html`（入口，带 5 个 `<script>`）；
2. 顺着 script 引用广度抓取 JS（应用主包是 `s.thsi.cn/cd/xcs-tzzb-front-app-pc/static/js/index.<hash>.js`，约 730KB）；
3. 正则捞 `/caishen_fund/...` 端点表 → 命中 `pc/asset/v1/stock_position`（另有 `cleared_position` /
   `asset_trend` / `remark/v1/position_remark`）；
4. 在压缩代码里按 `key:"requestStockPosition",value:function` 定位 service 层方法，读出**参数与响应字段映射**。

脚本落在 `tmp/ths-holdings-probe/`（`scan.mjs` 抓取、`ctx.mjs` 看上下文、`extract-service.mjs` 抽方法体、
`probe-*.mjs` 只读探测、`live-positions.mjs` 单次线上校验），`tmp/` 不入库。
其中 `cache/`（抓下来的 JS）与 `live/`（校验落盘的真实持仓）是**用完即弃**的中间产物，已删除；
需要时重跑 `scan.mjs` / `live-positions.mjs` 即可重建。

### 9.2 冻结的接口契约

```
POST https://tzzb.10jqka.com.cn/caishen_httpserver/tzzb/caishen_fund/pc/asset/v1/stock_position
请求体（与 time_share 同族，原样可用）：
  terminal=1&version=0.0.0&userid=<u>&user_id=<u>
  &manual_id=&fundid=&fund_key=<fundKey>&rzrq_fund_key=&custid=
请求头：UA + Accept + Accept-Language + Referer(/pc/index.html) + Cookie，**不跟随重定向**
```

响应 `ex_data`：

| 字段 | 含义 | 我们的字段名 |
|---|---|---|
| `position[]` | 逐只持仓数组 | `rows` |
| `position[].code` / `.name` / `.market` | 代码 / 名称 / 市场 | `code` / `name` / `market` |
| `position[].count` | **持仓数量（股）** | `qty` |
| `position[].cost` | **持仓成本价（摊薄成本）** | `cost` |
| `position[].price` / `.value` | 现价 / 市值 | `price` / `value` |
| `position[].hold_days` | 持仓天数 | `hold_days` |
| `position[].hold_profit` / `.hold_rate` | 持仓盈亏（元） / 持仓收益率（**小数比率**） | 同名（`hold_rate` 经 `ratioPct` 换算成百分数） |
| `position[].pre_profit` / `.pre_rate` | **昨日**盈亏（元） / 昨日收益率（**小数比率**） | 同名（悬停展示，不占列） |
| `position[].before_pre_profit` / `.before_pre_rate` | **前日**盈亏 / 前日收益率（同族口径） | 同名 |
| `position[].y_profit` / `.w_profit` / `.m_profit` | 总 / 周 / 月盈亏（未映射） | — |
| `position[].back` | 回本所需涨幅（(cost−price)/price，实测 0.0223 = 2.23%） | 未映射 |
| **当日盈亏** | **上游没有**（见下） | `day_profit` / `day_rate`，宿主用行情另算 |
| `position[].fee` / `.remark` | 费率 / 备注 | 同名 |
| `money_remain` | 可用资金 | `summary.money_remain` |
| `total_value` | **持仓总市值** | `summary.total_value` |
| `total_asset` | **总资产（市值 + 可用资金）** | `summary.total_asset` |
| `position_rate` | **仓位，小数比率**（0.9568 = 95.68%） | `summary.position_rate` + `summary.position_pct` |
| `total_liability` | 总负债 | `summary.total_liability` |
| `upload_time` | 账本数据时间（epoch 毫秒字符串） | `summary.upload_time` |

字段含义取自前端映射而非猜测：`requestStockPosition` 里 `count→count`、`cost→cbjg`、`price→sj`、
`value→sz`、`hold_profit→ccyk`、`hold_rate→ccykb`、`money_remain→zjye`。
数值一律经 `toNum()`：容忍 `HK$1.234` / 千分位 / 空串，**取不到给 null**（界面 `--`，不假装 0）。

**四个口径陷阱（都由真实响应实测钉死，测试里有回归）**：

1. **不要把 `total_value` 当总资产**。前端的内部命名（`zzc: e.total_value`）会误导 —— 用真实数据一算就清楚：
   `Σ(count×price)` = 90217.4 = `total_value`，而 `total_asset`(94291.79) = `total_value` + `money_remain`(4074.39)。
   所以 **`total_value` = 持仓总市值、`total_asset` = 总资产**（含现金）。账本 bundle 自己的调试日志也印证：
   `账户总资产 = 基金总资产 + 股票总资产`、`账户市值 = 基金总市值 + 股票总市值`（两个口径本就是分开的）。
2. **`position_rate` 是小数比率，不是百分数**。`total_value / total_asset` = 0.9567899…，与它逐位相等；
   直接 `toFixed(2)+'%'` 会显示成「0.96%」（差 100 倍）。宿主用 `ratioPct()` 统一乘 100（>1.5 视为已是百分数）。
3. **逐只的 `hold_rate` / `pre_rate` 也是小数比率**（同族字段，别以为是百分数）。线上实测（`tmp` 里的单请求校验）：
   上游给的是**4 位小数的小数比率** —— `-0.0217` / `-0.0631` / `-0.0163` / `-0.0623` / `-0.0002`。
   换算后与「盈亏/成本」推算**逐位吻合**：-0.0623 → -6.23%，而 -620/(9330+620) = -6.23%；4/4 行命中。
   若按百分数用（不乘 100），这些值会渲染成「-0.02%」—— **比实际小 100 倍**，看着像没波动。现已由
   `ratioPct()` 在宿主侧统一换算（换算后精度 = 上游的 0.01% 粒度）。
   > 踩过的坑：一开始我是从落盘的 `positions.json` 里读到 `-0.02` 才判断为小数比率的 —— 那其实是
   > PowerShell `Format-Table` 的**显示舍入**，原始值有 4 位小数。结论对，但证据链当时是虚的；
   > 现在是拿原始字符串对齐推算值。
   灰色地带：判据是 `|n| <= 1.5`，若上游某天改发百分数，0~1.5% 会被放大 100 倍 —— 改判据时
   `test/pnl-positions.mjs` §8 那条「启发式灰色地带」断言要同步改（有意钉住，不是漏测）。
4. **港股字段带 `HK$` 前缀**（前端按 market/code 判定后加），`toNum()` 负责剥掉。

**口径陷阱 5：`pre_*` 是「昨日」，而且这个接口根本没有逐只「当日」。**

我一开始把 `pre_profit` 当成当日盈亏显示成「当日涨跌」列，用户一眼看出不对（列里合计 -153.80，
而他当天实际亏 -2,182.20）。用雪球日线逐日核对后**分毫不差**地确证：

| 持仓 | 10-13 收 | 10-14 收（昨收） | (昨收−前收)×股数 | 上游 `pre_profit` |
|---|---|---|---|---|
| 君正集团 | 4.76 | 4.75 | -0.01×5000 = **-50** | **-50** |
| 养殖ETF | 0.524 | 0.522 | -0.002×18400 = **-36.80** | **-36.80** |
| 牧原股份 | 40.90 | 40.89 | -0.01×700 = **-7** | **-7** |
| 山西焦煤 | 6.49 | 6.45 | -0.04×1500 = **-60** | **-60** |

`before_pre_profit` 同理是**前日**（养殖ETF -92.00、山西焦煤 +15.00 也对得上；君正/牧原对不上是因为
那两天有过交易，账本按**当日股数**记账）。

**逐只当日盈亏在上游根本不存在**：原始字段全集是
`back, before_pre_profit, before_pre_rate, close_profit, close_rate, come_profit, cost, count, fee, hkmarket,
hold_days, hold_profit, hold_rate, m12_rate, m1_rate, m3_rate, m6_rate, m_profit, market, name, position_rate,
pre_profit, pre_rate, price, remark, stock_account, value, w_profit, y_profit`
—— 只有 hold_（总）/ pre_（昨日）/ before_pre_（前日）/ w_、m_、y_（周月年）。
账本自己的前端行模型也印证：它有 `dryk`（当日盈亏）/ `drykb`（当日盈亏率）两个列槽位，
但 `requestStockPosition` 里**这两个字段显式写成 null**，靠 `hq` 槽位（行情 `xj` 最新价 + `zf` 涨幅）去补。

**我们的做法**（`attachDayPnl`）：按账本自己的思路用行情补，但**用昨收而不是涨跌幅**：

```
当日盈亏 =（账本现价 − 雪球昨收）× 账本股数     当日涨跌幅 = 现价 / 昨收 − 1
```

- 为什么不用「市值 × 涨跌幅」：行情涨跌幅只有两位小数，取整误差被市值放大（实测 -2.95% × 23050
  = **-700.64**，真实 **-700.00**）；用昨收能逐分对齐。
- 行情取数失败**不影响持仓本身**：这几格留 null（界面 `--` 并在脚注提示），force 绕过行情 10s 缓存。
- 代码映射 `positionSymbol()` 按**代码形态**走（6/9/5→SH、0/1/2/3→SZ、5 位→港股裸代码），
  不依赖账本 `market` 枚举（实测沪=2、深=1，含义未公开）。
- 线上单请求校验（`tmp` 里的 live 脚本）：逐只合计 **-2,082.20**，账户级 chip **-2,182.20** ——
  差的 **100.00 整**是当天清仓那只（桃李面包 qty=0）的当日已实现部分：账本账户级含已实现与费用，
  逐只接口只给在场持仓的浮动。这条差额写进了界面脚注，免得用户以为对不上。

> 这三条都是「只测 tab 存在、不测字段口径」会漏掉的那类 bug —— 所以 `test/pnl-positions.mjs` 与
> `test/smoke-client.mjs` 里都有断言：`总资产 = 总市值 + 可用资金`、`仓位显示 95.68% 而不是 0.96%`。

### 9.3 节奏：TTL 门控，**没有后台定时器**（与盈亏的本质区别）

- 盈亏是分时值 → 60s 心跳 + 09:30/13:00/15:00 边界；持仓**大多数时间不变** → 只在客户端显式调用时
  按 `POSITION_TTL_MS`（15 分钟）判定要不要真打上游：**面板打开 / 切到持仓 tab / 页面回前台 / TTL 到期 /
  点「立即同步」**。常态是 **0 请求**，也天然不可能形成突发。
- TTL 看的是 `attempted_at`（最后一次尝试）而不是 `as_of`（最后一次成功）——**失败后不要在用户每次
  开面板时重打上游**。`as_of` 只在成功时推进，界面的「数据时间」用它。
- 失败（401/403、`error_code≠0`、302）**保留上一份持仓**并标 `stale`，只显示错误文案；`positions.json`
  与 `config.json` / `snapshot.json` **分文件**，清 Cookie 不会抹掉末次已知持仓。

> **WAF 实测（重要）**：账本前置 Nginx 对**突发**很敏感。本次排查时 20 连发的探测把 IP 打毛了——
> 连平时稳定可用的 `time_share` 都连回 403 `<h1>Nginx forbidden.</h1>`（第一次约 1 分钟后自行恢复）。
> 同时**宿主插件的 60s 常规轮询全程正常**（快照照常写入）。结论：请求形状没问题，**节奏才是风控变量**；
> 这也是持仓走「低频 + 手动」而不是跟着盈亏心跳的原因。排查时不要连发。

### 9.6 通用 403 的两种成因：Cookie 令牌轮换 / 风控限流（一次被推翻的排查结论）

**症状**：持仓/盈亏报 HTTP 403。用户的第一反应是「Cookie 过期了，去重新登录」——而当时的界面文案
偏偏写着「**不是** Cookie 过期，稍后会自动重试」，把人钉在白等 10 分钟上。两边都不对。

**第一次结论（错，留档）**：判为「**IP 级**封禁」。当时的证据是同一时刻四个探测全是 403：

| 探测 | 结果 |
|---|---|
| ① curl 完整头 stock_position | 403 `<h1>Nginx forbidden.</h1> <br/>request info: <IP>` |
| ② curl 最小头 stock_position | 403 同上 |
| ③ Node fetch stock_position | 403 同上 |
| ④ curl 最小头 account_list（**只用来校验 Cookie 的端点**） | 403 同上 |

**为什么错**：这四个探测带的是**同一份 Cookie**。所以「换传输、换请求头都一样」只能证明**与传输无关**，
不能证明与凭据无关 —— 「Cookie 里的反爬令牌已过期」对它是一个完美解释（换什么传输都一样是应该的）。
用户的现场事实直接推翻了这个结论：**浏览器一直能正常打开账本**，而且**重新粘贴 Cookie 后立刻恢复**
（`config.json` 在 15:43:17 被重写，18 秒后 time_share 200、35 秒后 stock_position 200）。
浏览器没事是因为它自己会滚动刷新 `v` 这类令牌；插件存的是**快照式**凭据，令牌轮换后手里那份就一直是旧的。

**真相（两种成因并存，上游不区分）**：

| 成因 | 现场特征 | 处置 |
|---|---|---|
| **Cookie 令牌过期/轮换** | 浏览器正常；同一份 Cookie 下所有端点都 403；重贴 Cookie 即恢复 | 重新从账本页面复制 Cookie 粘贴 |
| **风控限流** | 连发探测后出现；正常 60s 节奏全程无事；等一会儿自己好 | 停手等待，别连点 |

两者的响应体**一模一样**，从响应无法区分 —— 所以文案不能替上游下结论。

**改动**（都带回归测试）：

1. **判据**：`isWafPage(text)` —— 403 + HTML/`Nginx forbidden` → `blocked`（网关拒绝）；
   403 + JSON → `token_expired`；401 一律算过期。
2. **文案**（这一版才改对）：`GATEWAY_403_TEXT` 同时给出两条线索与各自动作；chip 标签「今日盈亏 403 拒绝」、
   持仓行标「403 拒绝」（原来是「风控中」，等于替上游下了结论），title 里写决策树 ——
   先重贴 Cookie；重贴后仍 403 就是限流，等窗口过去。
3. **退避**：`BLOCKED_BACKOFF_MS = 10 分钟`，`blocked_until` 落盘（重启也不会立刻又去撞），窗口内不打上游
   （`force:true` 例外）。**与成因无关地值得保留**：两种情况下连发都没有好处。
4. **没做**：自动刷新 `v` 令牌。那等于把账本前端的反爬逻辑搬进插件，代价与风险都不划算 ——
   重贴 Cookie 是 10 秒的事，且令牌轮换并不频繁。

**排查纪律（修订版）**：

- 先问「**浏览器**能不能打开账本」。能 → 就是我们存的那份凭据的问题，第一动作是**重贴 Cookie**（10 秒），
  而不是等 10 分钟；
- 真要探测，只发**一个** `account_list`，**且必须换成新 Cookie** —— 带着旧凭据探测，测的是旧凭据，
  什么结论都得不出来（这次的教训）；
- 不要连发：既有被限流之虞，又证明不了任何事。

**回归**：`test/pnl-cookie.mjs`（403+HTML → blocked + 文案含两条处置；403+JSON → token_expired；
`verifyCookie` 同判据）；`test/pnl-positions.mjs` §5/§5b（含退避窗口内 0 请求、force 例外、成功即清窗口）；
`test/smoke-host.mjs` 的 `pnl.get` 字段契约含 `blocked` / `blocked_until`。

### 9.4 宿主与客户端接线

| 层 | 位置 | 内容 |
|---|---|---|
| 端点/常量 | `lib/pnl/constants.js` | `STOCK_POSITION_URL`、`POSITIONS_FILE`、`POSITION_TTL_MS=900000` |
| 采集 | `lib/pnl/collect.js` | `collectPositions(core, cookie, fundKey)` + `toNum` + `ratioPct` + `mapPosition`（只读） |
| 落盘 | `lib/pnl/store.js` | `loadPositions` / `savePositions`（写失败静默，保留上一份；`schema` 不匹配当没有） |
| 动作 | `lib/pnl/index.js` | `refreshPositions`（单飞 + 失败保留）+ `actPositionsGet`（TTL/force/stale） |
| RPC | `lib/actions.js` | `'positions.get': core.actPositionsGet` |
| 状态 | `client/store/positions.js` | 运行时持有者 + TTL 调度（`ensure`/`schedule`/可见性恢复补拉） |
| UI | `client/panel/positions.js` | 账户合计四格 + 逐只持仓表（默认市值降序，7 列：名称/股数/成本价/现价/当日涨跌/市值/持仓盈亏） |
| 接线 | `client/constants.js` / `lib/ui-state.js` / `client/panel/index.js` / `client/manifest.txt` | 第 6 个 tab `['positions','持仓']`；`validTabs` 加 `'positions'`；`XQ_TABS`/`TAB_CTX` 各一行；两个新模块进清单 |

`positions.get` 返回：`{ configured, as_of, rows[], summary, error, token_expired, blocked, blocked_until, stale, refreshed, ttl_ms, fund_key }`。

测试：`test/pnl-positions.mjs`（76 项：请求形状 / 字段映射 / 三个比率的口径换算 / `HK$` 与千分位 /
缺失字段 null / TTL 门控 0 请求 / force / 风控 403 与真过期 403 的区分 / 退避窗口 / `error_code≠0` /
空持仓 / 302 / `toNum` 与 `ratioPct` 边界 / 口径自证），`test/smoke-client.mjs` 增补 `[5b2]` 静态契约 +
真渲染出的内容契约（「成本价 1201.30 / 股数 100 / 总资产 94,291.79 / 仓位 95.68%」+ 涨跌两列的
金额、涨跌幅与红绿色类），`test/smoke-host.mjs` 钉住 `positions.get` 的返回键集合。

### 9.5 与盈亏的关系

同一份 Cookie、同一个 `fundKey`（`pnl.config` 存的那份），所以**持仓无需单独配置**：没配置时「持仓」
tab 直接把用户引导到「盈亏」tab 粘贴 Cookie。两边的上游请求互不共享闸门（账本与雪球的风控预算是两回事），
但持仓侧因为 TTL 门控实际上比盈亏更省。

### 9.7 持仓表的涨跌呈现（「当日盈亏」列 + 红涨绿跌）

需求来自两轮使用反馈：① 涨跌要**同时给出金额与涨跌幅**并红绿分色；② 第一版的「当日」其实是**昨日**
（见 §9.2 陷阱 5），必须换成真正的当日盈亏。

- **列布局**（7 列）：名称/代码 · 股数 · 成本价 · 现价 · **当日盈亏** · 市值 · 持仓盈亏。
  栅格 `minmax(0,1.6fr) .8fr .9fr .8fr .95fr 1fr 1.1fr`，`min-width:500px`，容器
  `overflow-x:auto` —— 面板可能只有 ~400px 宽，硬挤会把数字折行；表头与数据行同处一个滚动容器，
  横向滚动时列不会错位。
- **两个涨跌单元**：当日盈亏（`day_profit`/`day_rate`，宿主用行情算）、持仓盈亏
  （`hold_profit`/`hold_rate`，账本值）。金额在上（`.xq-pos-amt`，600 字重）、涨跌幅在下
  （`.xq-pos-rate`，10.5px、0.85 透明），整格颜色由 `colorOf(金额)` 决定 —— A 股习惯**涨红跌绿**：
  `.xq-up` = `state-error-primary`（红）、`.xq-down` = `state-success-primary`（绿）、
  `.xq-flat` = 次要灰。涨跌幅一律带符号、两位小数。
- **账本「昨日盈亏」不占列，进悬停**：当日单元的 title 里写清「昨收 x / 账本昨日盈亏 y (z%)」——
  信息不丢，口径也能自证（昨日的值应与用户对账本页面的印象一致）。
- **已清仓行**（账本保留 `qty=0` 的行记已实现盈亏）：整行 `.xq-pos-cleared` 压暗（hover 恢复），
  行内标「已清仓」；当日盈亏显示 `--`（无当日浮动可言），收益率不显示。
- **取不到就 `--`**：金额与涨跌幅都缺时显示 `--`；整列都缺（行情挂了）时脚注写明
  「当日盈亏暂不可用（雪球行情取数失败），其余字段不受影响」。
- **换算放在宿主侧**（`ratioPct` 修比率口径、`attachDayPnl` 补当日值），前端只做格式化：
  同一族的三个比率共用一条口径，避免「盈亏 tab 修了、持仓 tab 又忘」。
  前端**不自算**：上游口径含费用等因素，自算会和账本页面不一致。

回归断言在 `test/smoke-client.mjs`：6 个涨跌单元（3 行 × 2 列）、金额与涨跌幅同时出现、
盈利格带 `.xq-up`、亏损格带 `.xq-down`、已清仓行只有已实现盈亏金额且当日涨跌是 `--`；样式侧另断言
CSS 里确有 `.xq-pos-cell` / `.xq-pos-chg` / `.xq-pos-cleared`。
（这些断言做过**变异验证**：把 `colorOf(...)` 换成写死的 `xq-flat`，该 check 立刻失败 ——
 说明它们真的在盯着颜色，而不是「渲染出数字就算过」。）

**踩坑：类加对了，颜色却没生效（CSS 层叠）**。`.xq-up` / `.xq-down` / `.xq-flat` 是**单类**选择器；
`.xq-pos-num`（数值单元格，声明了 `color`）同样是单类，而且在 styles.css 里**更靠后** ——
优先级相同时「后写的赢」，涨跌色被默认前景色盖掉。

- **症状极具欺骗性**：className 里 `xq-up`/`xq-down` 都在，静态断言与 DOM 检查全绿，界面上却全是深色，
  用户的第一反应是「你的改动没生效」（实际上列、口径换算、已清仓标记都生效了，只有颜色没有）。
  截图里采样像素可证：表格数字是 `126,127,129` / `15,17,21` 这类 R≈G≈B 的灰。
- **修法**：配色写成**复合选择器** `.xq-pos-chg.xq-up`（2 个类 > 1 个类，与书写顺序解耦），
  而不是给 `.xq-pos-num` 去掉颜色、或调整规则顺序（那样下次再加个数值单元格又会踩）。
- **同类审计**：徽标 / 指数条 / 热榜 / 工具卡也在用 `xq-up`/`xq-down`，但它们的基类
  （`.xq-badge-val`、`.xq-idx-cur`、`.xq-tv-price`…）都**不声明** `color`，所以只有持仓表中招 ——
  同一张截图可对照：徽标里的百分比是绿的，持仓表里是深色。
- **回归**：`test/smoke-client.mjs` 的**层叠契约** —— 不再只断言「className 含 `xq-up`」，
  而是从内联 CSS 算出「最终生效的是哪条 `color` 声明」（极简层叠判定：只认纯类复合选择器，按类数比优先级，
  同优先级取后写者）。两个细节值得留：① 判定自带**反向对照**（`.xq-up{red}` + 后写的
  `.xq-pos-num{black}` 必须判 black），证明判定实现本身是对的；② 判定**先剥 CSS 注释** ——
  注释里写的反例选择器（本文件就写了「必须像 `.xq-pos-chg.xq-up` 那样」）会被正则连同后面的选择器
  一起吞掉、因含空格被跳过，让被注释提到的规则整条消失。这个坑我在写这条测试时真踩了一次：
  测试是绿的，但报出的赢家是 `.xq-up` 而不是复合选择器 —— **绿得不明不白比红更危险**，所以加了自检。
- **变异验证**：删掉三条复合规则（回到 bug 现场）→ 该 check 失败，诊断直接点名
  `{"spec":1,"color":"var(--dsw-alias-label-primary)","sel":".xq-pos-num"}`。

**缓存口径版本 `schema`**：行内数值的口径由宿主换算，所以 `positions.json` 里写了 `schema: 2`
（`POSITIONS_SCHEMA`）。读缓存时 schema 不匹配就当**没有** —— 换口径后旧文件里的同名字段是错的
（`hold_rate` 还是小数比率），照读会先给用户一串小 100 倍的收益率，看着像修复没生效。
代价是升级后第一次打开「持仓」tab 会真打一次上游（正常「无快照」路径，1 次请求）。
回归：`test/pnl-positions.mjs` §4b（造一份无 schema 的旧缓存 → 断言丢弃、重新取数、重新落盘带 schema）。

---

## 10. 本地持仓 + 派生盈亏（fork.6 架构变更：账本降级为「一次性导入」）

> **本节取代 §8.3 / §9.3 / §9.5 / §9.7 里「账本 60s 心跳」「TTL 同步」「当日盈亏列口径」的写法。**
> 那几节记的是 fork.5 及以前的设计，保留是为了后面的排查能看懂来龙去脉。

### 10.1 为什么非改不可（真实事故）

账本接口要求一个由**页面 JS 生成**的反爬令牌（`chameleon.min.<构建号>.js` 写入的 `v` Cookie），
它寿命很短，而且**浏览器会不断重新生成**。我们保存的是某一刻的快照：

- 同一份 Cookie，`10-19 10:33` 粘贴后能用到 `11:26`，之后 23 小时全是 `403 <h1>Nginx forbidden.</h1>`；
- 同一时刻浏览器访问账本完全正常（它自己在续令牌）；
- 重新粘贴能立刻恢复，然后又只能撑很短一段时间。

排查过程中确认过的三件事（别再重复走）：

1. **不是整站/IP 封禁**：`GET /pc/index.html`（不带 Cookie）返回 200，说明主机与出口 IP 都通；
2. **不是会话过期**：`sess_tk` 是 JWT，`exp` 还有 30 天（`user` 里的 `2678400` = 31 天，与它吻合）；
3. **不是我们的请求量**：盈亏心跳 60 次/小时，持仓同步上限 4 次/小时，抬升不到 7%
   （第二部分之前也是 60 次/小时，一直没事）。

**历史版本没有任何续期手段**（不读 `Set-Cookie`、没有刷新接口，三个副本都一样：
当前 `lib/pnl/http.js`、HEAD 的 curl 版、`profiles/web/node_modules/dsh-ths-pnl` 里的 fetch 版）。
它当年能「持续更新」，是因为上游当时接受长期冻结的快照 —— 也就是说这不是我们做少了什么，
而是**上游收紧了**，静态快照天生只能用很短时间。

对比之下，雪球那套是有续期的：`lib/http.js` 会解析响应头里的 `set-cookie` 并落盘换新的
`xq_a_token`。账本侧没有这样的机会（服务端不下发、`v` 是客户端算出来的）。

### 10.2 新分工

| | 谁是主数据 | 什么时候请求上游 |
| --- | --- | --- |
| 持仓（股数 / 成本价） | **本地** `positions.json`，用户可增删改 | 只在用户点「从账本同步」时 |
| 现价 / 当日盈亏 / 持仓盈亏 / 市值 | 雪球行情，**每次现算** | 按行情刷新间隔（默认 30s，盘外睡到边界） |
| 账本账户口径（含已实现与费用） | 同步时取一次，存进 `cloud.account` | 只在同步时 |

于是：**账本凭据废了，只影响「同步」这一个按钮**，当日盈亏照常实时。

### 10.3 数据形状（`positions.json`，schema 4）

```json
{
  "schema": 4,
  "updated_at": "2026-10-20T02:30:00.000Z",
  "rows": [{ "code": "601216", "name": "君正集团", "qty": 5000, "cost": 4.713 }],
  "cloud": { "synced_at": "...", "fund_key": "...", "summary": { "total_asset": 94929.03 },
             "account": { "pnl_yk": -2182.2, "pnl_pct": -2.25, "at": "..." },
             "error": "", "blocked": false, "blocked_until": null }
}
```

- **只有输入字段落盘**（`code`/`name`/`qty`/`cost`）。价格与盈亏绝不写盘 —— 否则用户改完股数，
  现价里还带着上一次的旧值，界面自相矛盾。
- `code` 是唯一键；港股统一成雪球形态（`HK00700` → `00700`），否则同一只标的会以两个键存在，
  合并/去重全部失效。
- v3（账本快照）会自动迁移：只取 `code/name/qty/cost`，派生字段全丢（`migrated_from` 标记来源）。

### 10.4 口径

```
当日盈亏 = Σ (现价 − 昨收) × 股数
当日涨跌幅 = 当日盈亏 / Σ (昨收 × 股数)        ← 基数是昨收市值，不是当前市值
持仓盈亏 = Σ (现价 − 成本价) × 股数
持仓收益率 = 持仓盈亏 / Σ(成本价 × 股数)
```

- **不用「市值 × 行情涨跌幅」**：涨跌幅只有两位小数，误差会被市值放大（实测 君正
  `-2.95% × 23050 = -700.64`，真实 -700.00）。
- 合计 = **逐行取整后相加**，保证界面上的合计等于各行显示值之和（用户真的会去加）。
- 与账本账户口径的差：不含当日已实现与费用。实测那天逐只合计 `-2,082.20`，账本账户 `-2,182.20`，
  差的正好是清仓那只的当日已实现 `100.00` —— 这两个数都保留，界面并列说明，不再让人以为算错。

### 10.5 宿主侧（`lib/pnl/`）

`installPnl(core)` 现在**一个定时器都不挂**（节奏由客户端按 `next_poll_ms` 驱动，
浏览器关掉就彻底不发请求 —— 这对账本最友好，也是「账本废了也能用」的前提）。

| action | 作用 | 打上游吗 |
| --- | --- | --- |
| `positions.get` | 本地持仓 × 行情 → 逐行派生值 + 合计（`force` 绕行情 10 秒缓存） | 只打雪球 |
| `positions.save` | 增/改一行（`originalCode` 支持改代码；名称留空用行情补） | 只打雪球 |
| `positions.remove` | 删一行 | 不打 |
| `positions.sync` | 从账本导入/校对（`merge` 默认 / `replace`），**唯一**打账本的入口 | 账本 |
| `pnl.verify` | 校验账本 Cookie + 组合列表 + 上次同步状态 | 账本 |
| `pnl.config` | 存 Cookie / 组合 / 行情刷新间隔（`clear` 只清凭据，不动持仓） | 账本（仅校验时） |

同步的合并口径：账本有则覆盖 `qty`/`cost`；账本有而本地无则新增（`qty=0` 的已清仓不新增）；
本地有而账本无则**保留**并在报告里列出来。同步失败只写 `cloud.error`，**一个字段都不碰 `rows`**。

`pnl.get` 已删除 —— 它是「60 秒账本心跳」的入口，留着就说明还有代码在打账本。

### 10.6 回归

- `test/pnl-positions.mjs`（123 项）：v3 迁移、无凭据可用、派生值不落盘、改股数/改代码/重名拒绝、
  边界（qty=0 / 负数 / 缺失 / 成本缺失）、行情失败只影响当日列、合计逐行相加、节奏、
  同步 merge/replace、**403/401/接口错/断网四种失败下持仓与盈亏完全不变**、坏文件兜底。
- `test/smoke-host.mjs` §[9]（133 项）：宿主**不再挂盈亏定时器**、动作接线、文件落点、清除凭据语义。
- `test/smoke-client.mjs`（89 项）：`pnl.get` 已从产物消失、持仓表内容契约（成本价/股数/合计/两列盈亏/
  编辑删除按钮/已清仓）、指数条 chip 读的是同一份现算数据。
- `test/pnl-rpc.mjs`（21 项）：dispatch 契约与入参容错。

**派生值不落盘的代价**：跨进程重启后的第一屏需要一次行情请求才有价格（约 1 次批量）。
这与「账本快照能离线看旧价格」是不同取舍 —— 宁可首次空一下，也不要展示与用户刚改的股数不一致的价格。


## 11. 行情隐身（fork.7：一键关掉全部行情显示，提醒照常）

### 11.1 需求与两条互相打架的约束

用户要的是「一键完全不关注股市」：不显示、不取数、不被打扰。它同时要求两件事：

1. **零残留**：面板、悬浮徽章、底部指数条全消失。不能只是 `display:none` —— 请求还在跑就等于没关。
2. **提醒不能死**：到价提醒照旧响。否则「不看盘」等于「错过卖点」，功能反而害人。

冲突点在 11.4：改造前的提醒通知逻辑长在面板里，面板一收起就静默 —— 隐身状态下这是不能接受的。

### 11.2 隐身时的分工

| 哪一层 | 负责什么 | 隐身时 |
| --- | --- | --- |
| 宿主 `lib/alerts.js` watcher | 阈值判定 + 事件持久化（与页面显示无关） | **照常跑** |
| 客户端 `store/alerts-watch.js` | 把宿主新事件变成系统通知（应用级运行时） | **照常跑** |
| 三个常驻入口组件 | 渲染 + 行情轮询 | 不挂载 → 零请求 |
| 快捷键 `xq.toggleHidden` | 恢复入口（可改键） | 保留 |
| 工具 `xueqiu_display` | 让 AI 拨开关 / 读状态 | 保留 |

### 11.3 门控：为什么是 `return null` 而不是 CSS

三个入口都改成「门控 + 实体」两段式：

| 门控（判断隐藏/水合） | 实体（真渲染 + 取数） |
| --- | --- |
| `DockGate` | `DockPanel` |
| `MiniBadge` | `MiniBadgeBody` |
| `Ticker` | `TickerBody` |

`return null` ⇒ 实体的 effect 不执行 ⇒ 徽章的 `POLL_BADGE_MS`、指数条的 `POLL_TICKER_MS`、
持仓运行时的引用计数（refs 归零即 `stop()`）、面板里的行情/内容/提醒轮询**一起消失**。
这就是「零请求」的全部来源，没有任何额外的"停止开关"需要维护。

**门控必须先等 `ui.hydrated`**：徽章一挂载就 `fetchWatchlist()`、指数条一挂载就 `fetchIndices()`，
不水合就渲染会在刷新瞬间闪一帧行情 —— 而隐身状态正是从水合里读出来的，先渲染再隐藏是最糟的顺序。

### 11.4 提醒为什么必须提到应用级（拆掉的老耦合）

改造前：`XueqiuPanel.refreshAlerts()` 里**既轮询又弹 `Notification`**，`ALERT_POLL_MS` 的 interval
也挂在面板的 effect 上。于是「面板收起」＝「通知静默」，与 11.1 的第 2 条直接冲突。

现在 `client/store/alerts-watch.js` 是应用级运行时，在 `apply` 里 `.start()`：

- 它是**唯一**持有 `new Notification` 的地方；窗口标签、面板挂载、`ui.hidden` 都不影响它。
- **首轮静默**：宿主 `events` 是持久化历史，页面加载时只建立基线，不为旧事件刷屏。
- 之后每个**新事件 id** 弹一次，`tag: 'xq-alert-<id>'` 交给系统合并重复。
- **空转退避**：没有规则时 5 分钟读一次（`alerts.get` 只读本地 `.xueqiu-alerts.json`，不出网），
  有规则回到 30 秒 —— 既不空转，也不错过「在别处新增了规则」。
- 面板只**订阅**快照：规则增删改/确认后调 `rt.kick()` 立刻对齐；页面内通知区（`alertNotice`）
  仍是 ack 的唯一入口（事件进了快照但不上屏，就等于永远确认不掉）。
- 通知权限在**用户手势里**请求（点「隐身」按钮时）—— 定时器里 `requestPermission()` 常被浏览器直接拒绝。

### 11.5 恢复入口（方案的核心权衡）

全隐藏之后屏幕上没有任何东西可点，所以恢复入口必须独立于行情 UI。最终留两条：

1. **快捷键** `xq.toggleHidden`，默认 `Ctrl/⌘ + Alt + Shift + X`，
   六套 profile（`web`/`desktop` × `windows`/`macos`/`linux`）全覆盖。
   它注册在宿主快捷键服务上 ⇒ 出现在 **设置 → 通用 → 快捷键**，能看键帽、能改键、能在冲突时发现。
   默认键位与既有命令撞车时 `register` 会抛 ⇒ 自动**降级成「未绑定」再注册一次**，
   命令仍留在快捷键表里等用户指派（比彻底没有入口好）。
2. **对话**：`xueqiu_display({ hidden })` 工具。用户说「把行情打开」就能恢复；不带参数只读状态。

宿主没有 shortcuts 服务时 `ctx.inject(['shortcuts'])` 不回调，静默降级 —— 只剩第 2 条。

**被否掉的方案（别再提）**：CSS 隐藏（请求照跑）；只放设置页开关（藏得深、不"一键"）；
从 profile 摘掉插件 + 重启（物理最干净，但不是按钮，每次开合都打断会话）；留一枚小图标（有残留）。

### 11.6 状态

- `hidden` 落在 `.xueqiu-ui-state.json`（`$DSH_HOME/dsh-xueqiu/`），**宿主级**：刷新、重启、
  换工作区、换浏览器都一致。
- `ui.get` 缺省 `hidden:false`：老状态文件没有这个键 ⇒ 升级后不会突然消失。
- `ui.set` 是**逐字段白名单**，新增字段必须显式登记，否则客户端「点了没反应也不报错」（这次差点又栽）。
- `hiddenTouched` 守卫：迟到的水合不会把用户刚点的隐身打回去。
- 隐身**不动 `ui.open`**：恢复后按原来的开合状态显示，不会被"顺带展开"。

### 11.7 回归

| 测试 | 项数 | 覆盖 |
| --- | --- | --- |
| `test/smoke-host.mjs` §[6] | 5 | `hidden` 缺省 false、`ui.set` 往返、落盘、`false` 不被当成「未传」 |
| `test/smoke-host.mjs` §[7] | 4 | `xueqiu_display` 只读/双向拨动/零上游请求 |
| `test/smoke-client.mjs` §[4] | 5 | 三处入口未水合时为 null、未水合期间只有一次 `alerts.get` |
| `test/smoke-client.mjs` §[5f] | 7 | 命令形状（6 套键位/aliases/regions）、面板与徽章的「隐身」按钮、三处一起关、隐身后零请求、双向恢复、通知首轮静默且只弹新事件 |
| `test/smoke-client.mjs` §[5f-2] | 1 | 默认键位冲突 → 降级为未绑定 |

**已知边界**：隐身是「宿主级全局」，不区分工作区；想让某个项目单独隐身需要另存一份状态（未实现）。



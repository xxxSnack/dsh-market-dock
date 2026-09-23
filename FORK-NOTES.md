# dsh-xueqiu-debug — 本地 fork 说明

本目录是 `dsh-xueqiu` 的本地 fork，用于摆脱上游发布节奏（`npm i dsh-xueqiu@latest` 之类
不会覆盖这里），并承载本地改动。

- 上游：`dsh-xueqiu@1.22.15`（https://github.com/wanderer-yk/dsh-xueqiu ，MIT）
- 本 fork 包名：`dsh-xueqiu-debug`，版本 `1.22.15-fork.1`
- cordis 插件 id：`xueqiu` → `xueqiu-debug`
- 槽位实例 id：`xueqiu-panel` / `xueqiu-badge` / `xueqiu-ticker`
  → `xueqiu-debug-panel` / `xueqiu-debug-badge` / `xueqiu-debug-ticker`
- Agent 侧工具名**保持** `xueqiu_quote` / `xueqiu_kline` / `xueqiu_hot` / `xueqiu_news`
  （提示词与工具调用都按这些名字走，改名会破坏既有习惯）。
  代价：不能与上游 `dsh-xueqiu` 同时启用（会重复注册同名工具），本 fork 是**替代**上游。
- 客户端 bundle 注册 id（`src/client/index.js` 的 `__ModuleLoader__.load({ id })`）与
  `<style data-plugin>` 标记：`dsh-xueqiu` → `dsh-xueqiu-debug`，必须跟包名一致
  （loader 按行 id = 包名查 factories 表）。上游的 `scripts/gen-static.py` 不会本地跑，
  以后再同步上游时这两个字面量要一起改。
- 状态目录**沿用** `$DSH_HOME/dsh-xueqiu/`（`src/index.js` 的 `stableStateDir()`），
  这样自选、Cookie 登录、界面位置等存量数据无缝继承。
  若想与上游彻底隔离，把 `src/index.js` 里 `+ '/dsh-xueqiu'` 改成 `+ '/dsh-xueqiu-debug'` 即可。

## 修复的 BUG：切换会话后徽章位置弹回右下角

### 症状
拖动右下角「雪球 mini」徽标到任意位置后，切换对话，徽标自动回到右下角区域。
（注意：输入框上方那块面板是 `conversation.input.dock` 的**停靠**面板，只能拖高度，
不可移动；可移动的是 `shell.overlay` 里的悬浮徽标 `MiniBadge`。）

### 根因（上游 1.22.15 的两处缺陷叠加，非有意设计）
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

结果：内存里的新位置被丢弃，旧持久化值（恰好是右下角）被写回。

### 改动（`dynamic/client.js` 是上游手写源，`src/client/index.js` 由它生成；无 `gen-static.py` 时两边手工同步）
| 位置（src/client/index.js） | 改动 |
|---|---|
| `ui` 初始化 ~L326 | 新增 `badgePosTouched`/`badgeWTouched`/`dockHTouched` 标志 |
| `ui.set` ~L341 | 位置/尺寸也置 touched；落盘条件从 `'open' in patch` 扩展为 `open/badgePos/badgeW/dockH` 任一 |
| ~L1411 `hydrateUi()` | 新增：应用级、幂等、只跑一次的水合（含 touched 判断） |
| `DockGate` ~L1441 | 只调 `hydrateUi()`（幂等）+ 订阅渲染，不再自带水合 |
| `MiniBadge` ~L1559 | 挂载时调 `hydrateUi()` —— `shell.overlay` 全局只挂一次 |

所有改动都带 `[fork-fix]` 注释，便于日后 diff 上游。

### 为什么这样修是对的
- 落盘不再依赖「某个组件恰好挂着」这个隐式前提。
- 水合只发生一次：切会话不再重放，从根上消除覆盖。
- touched 守卫与上游 `open`/`tab` 的既有语义一致。

## 修复的 BUG：客户端 bundle 注册 id 没跟着改名，插件整块加载失败

### 症状
dsh web 启动/刷新后 HARNESS 面板报：

```
Failed to load plugins
failed to import loader entry 9e850cc0 (dsh-xueqiu-debug): client-modules:
bundle /plugins/??…,dsh-xueqiu-debug/client.js&rev=… loaded without registering
"dsh-xueqiu-debug" via __ModuleLoader__.load
```

插件面板、徽标、行情界面全部不出现；宿主侧（Agent 工具 `xueqiu_*`）不受影响，
所以症状看起来像「只有界面没了」。

### 根因
改名时漏了静态 bundle 里的模块注册 id。`src/client/index.js` 由上游 `gen-static.py`
从 `dynamic/client.js` 生成，生成器把**包名**写进了两处字面量：

- `window.__ModuleLoader__.load({ id: 'dsh-xueqiu', … })` ← loader 的查表键
- `<style data-plugin="dsh-xueqiu">` ← loader 认领/回收样式的键

包名改成 `dsh-xueqiu-debug` 后这两处仍是旧值。而
`@deepseek-ai/dsh-client-modules` 的 `arrive(row)` 加载完 bundle 后会断言
`factories.has(row.id)`，`row.id` 就是包名 `dsh-xueqiu-debug`；实际注册进表的是
`dsh-xueqiu`，于是抛 "loaded without registering" 并把整个插件标记为加载失败。
（副作用二：`claimStyles(id)` 按 `style[data-plugin=<id>]` 认领样式，旧值的
`<style>` 既不被认领也不被回收，HMR 重载会留下重复样式。）

### 改动
| 位置 | 改动 |
|---|---|
| `src/client/index.js` L4 | `id: 'dsh-xueqiu'` → `id: 'dsh-xueqiu-debug'` |
| `src/client/index.js` L15 | `data-plugin` 值 → `'dsh-xueqiu-debug'` |

`dynamic/client.js` 不含 id（它是 cordis 动态模块），无需改；宿主 `src/index.js`
的状态目录 `$DSH_HOME/dsh-xueqiu/` 是**有意**保留的，不动。

### 为什么这样修是对的
loader 的行 id 由启动图（bundle 声明）给出，等于包名，`stripClientSuffix` 只剥
`/client` 后缀；注册 id 与包名一致是这套模块系统的硬契约，其它插件
（`dsh-provider-health`、`dsh-ths-pnl`、`dsh-cost-meter`…）都遵守。
`tools/verify-install.mjs` 与 `tools/verify-bundle.mjs` 已把这条契约纳入校验。

## 未改但已知的上游问题
- `src/index.js` 的 `uiState = { pos: null, tab, minimized }` 里 `pos`/`minimized`
  是旧「浮动面板」设计的死字段，从不读写；宿主 `ui.get`/`ui.set` 也不处理 `pos`。
  保留原样以免动到状态文件兼容性，但不要误以为面板位置存在 `pos` 里。
- 工作区根目录的 `.xueqiu-ui-state.json` / `.xueqiu-watchlist.json` 是 1.22.x 迁移前的
  遗留回退路径（`stateRead` 只在稳定目录缺失时才读），可安全删除。

## 校验
```
npm run check                        # 语法/JSON 解析
node tools/verify-bundle.mjs         # 客户端 bundle 的 loader 契约（注册 id、依赖纯度）
node tools/verify-install.mjs [profile]  # 安装接管状态（包名、patch、链接、注册 id）
```
（`npm run check` 展开就是下面四条，上游的 `scripts/gen-static.py` 与 `qa/*.mjs`
未随 npm 包发布，所以 `dynamic/` 无法本地重新生成，本次是手工同步修改，两边需一起改：
```
node --check src/index.js
node --check src/client/index.js
node -e "new Function(require('fs').readFileSync('dynamic/host.js','utf8'))"
node -e "new Function(require('fs').readFileSync('dynamic/client.js','utf8'))"
```
）

## 安装
`C:\Users\海尔\.dsh\profiles\web\package.json`：
- `dependencies`：`"dsh-xueqiu": "^1.22.15"` → `"dsh-xueqiu-debug": "link:D:/project/financial_analysis/plugins/dsh-xueqiu-debug"`
- `dsh.profile.bundles`：`"dsh-xueqiu"` → `"dsh-xueqiu-debug"`

并把 `node_modules/dsh-xueqiu-debug` 指到本目录（与 `dsh-ths-pnl` 同款 symlink）。
改完需要刷新 GUI 页面（未跑 `pnpm run dev:web` 时客户端插件不会自动热更）。
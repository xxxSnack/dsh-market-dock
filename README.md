# dsh-market-dock · DeepSeek Harness 行情面板

> 在 DeepSeek Harness 的对话框上方嵌一块行情面板：**免登录**看 A股 / 港股 / 美股实时行情、K线、分时、热榜、搜索、7×24 快讯；旁边一枚可拖拽的迷你行情徽标，输入框上方一行常驻指数条。附带本地持仓与盈亏现算、价格提醒，以及一个「行情隐身」开关——一键让所有行情界面和请求消失，需要时一秒叫回来。

[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)
[![dsh-plugin](https://img.shields.io/badge/dsh--plugin-market--dock-1DA1F2?style=flat-square)](#安装)
[![unofficial](https://img.shields.io/badge/official-no-critical?style=flat-square)](#免责声明)

中文 | [English](./README.en.md)

> 本仓库是 [dsh-xueqiu](https://github.com/wanderer-yk/dsh-xueqiu)（MIT）的衍生版本：数据接口、面板与图表来自上游，另加了本地持仓、盈亏现算、宿主级价格提醒与行情隐身开关。完整改动清单与设计取舍见 [FORK-NOTES.md](./FORK-NOTES.md)。

---

## 功能

| 模块 | 说明 |
|---|---|
| 📈 行情面板 | 输入框上方一块面板（`conversation.input.dock`），Esc 收起。6 个 tab：**行情**（四大指数 + 自选股）、**热榜**、**搜索**、**快讯**、**盈亏**、**持仓**。 |
| 🏷 详情页 | 点任意标的看个股详情：大号现价 + 涨跌额/涨跌幅、16 格指标卡、K线（蜡烛 + 成交量 + MA）与分时图、7 档周期（5/15/30/60 分、日/周/月）。 |
| 🔖 迷你行情徽标 | 独立悬浮在页面上（`shell.overlay`），可拖拽、可折叠成一行、位置与尺寸落盘；轮播自选股与指数涨跌。 |
| 📊 指数条 | 输入框上方常驻一行四大指数（上证 / 深证 / 创业板 / 沪深300），单独占行，不挤占输入区。 |
| 💼 本地持仓 | 「持仓」tab 里维护持仓（代码 / 股数 / 成本价），可增删改。当日盈亏、持仓盈亏、市值全部按**实时行情现算**，不依赖任何账本接口。 |
| 🧮 今日盈亏 | 面板头部常驻一枚盈亏 chip。**可选**接同花顺投资账本做一次性导入/校对（粘贴 Cookie），账本只在你点「从账本同步」时才请求；账本失效不影响实时盈亏。 |
| 🔔 价格提醒 | 给任意标的设上限/下限，到价弹系统通知。提醒判定跑在**宿主侧**，与页面是否打开无关。 |
| 🙈 行情隐身 | 一键让面板、徽标、指数条一起卸载，**行情轮询全部停止（零请求）**；价格提醒仍然生效。恢复有三条路，见下文。 |
| 🤖 Agent 工具 | 7 个工具 + 4 张工具卡片，让模型能自己查行情、K线、热榜、快讯、搜代码、看大V，以及开关隐身。 |

### 界面结构（三处）

```
┌──────────────────────────────────────────────┐
│ 对话区                                        │
└──────────────────────────────────────────────┘
  ┌ 行情面板（可收起）───────────────────────┐   ← conversation.input.dock
  │ 行情 热榜 搜索 快讯 盈亏 持仓   [刷新]     │
  └─────────────────────────────────────────┘
  上证 3960.19 +0.84%  深证 14534.46 +1.26% …    ← conversation.composer.dock
┌──────────────────────────────────────────────┐
│ 输入框                                        │
└──────────────────────────────────────────────┘
                          ┌ 迷你徽标 ┐            ← shell.overlay（可拖拽）
```

---

## 界面预览

**迷你行情徽标** —— 可拖拽、可折叠成一行；右上 `⊘` 就是「行情隐身」，`−` 折叠，位置与尺寸都会记住。

![迷你行情徽标](assets/1.png)

**持仓与盈亏** —— 持仓是本地主数据（可增删改），当日盈亏 / 持仓盈亏 / 市值按实时行情现算，不落盘、不依赖账本。

![持仓与盈亏](assets/2.png)

> 以上截图里的标的与金额均已打码。

---

## 安装

### 方式一：作为 bundle 插件（推荐）

```bash
# GitHub 源
dsh plugin --profile web add github:xxxSnack/dsh-market-dock

# 或本地目录（开发 / 自用最省事）
dsh plugin --profile web add /abs/path/to/dsh-market-dock
```

装完**重启一次 `dsh web`**（插件行发现按启动缓存），再刷新页面即可看到面板。

手动接入等价于在 profile 的 `package.json` 里写两处（`~/.dsh/profiles/web/package.json`）：

```jsonc
{
  "dependencies": { "dsh-market-dock": "link:/abs/path/to/dsh-market-dock" },
  "dsh": { "profile": { "bundles": ["…", "dsh-market-dock"] } }
}
```

并让 `node_modules/dsh-market-dock` 指向插件目录（`link:` 依赖或 symlink，二选一即可）。

### 方式二：动态插件

仓库里的 `dynamic/host.js` 与 `dynamic/client.js` 是同一份源码构建出的动态形态，可在任意 DSH 会话里用 `cordis_define`（kind: new）+ `cordis_run` 加载，不必进 profile。两个形态能力一致，区别只在安装方式。

> **改 `lib/` 要重启 `dsh web`；改 `client/` 或样式刷新页面即可**（未跑 `pnpm run dev:web` 时客户端 bundle 不会自动热更）。

---

## 使用

### 行情与自选

面板「行情」tab 顶部是四大指数，下面是自选股；点任意一行开详情页。右上「刷新」手动触发一次，其余时候按交易时段自适应刷新（收盘后长节流），并带 TTL 缓存与请求节流，不会把接口打爆。

搜索支持中文名、拼音、ticker 与纯代码（「茅台」/「maotai」/「600519」/「00700」）。

### 本地持仓与盈亏

「持仓」tab 的持仓是**本地文件里的主数据**：

- 手工添加：代码 + 股数 + 成本价；随时改、随时删。
- 「从账本同步」是**可选**的一次性导入/校对，只在点击时请求同花顺投资账本；不点就一个请求都不发。
- 当日盈亏 = 本地持仓 × 雪球行情现算，账本 Cookie 过期、账本接口抽风都不影响它。

### 价格提醒

给标的设上限/下限后，到价弹系统通知。提醒判定在宿主侧 watcher 里跑，所以：

- 面板关着、页面刷新、徽章折叠，都不影响提醒；
- 浏览器没给通知权限时，第一次触发会让你先授权（隐身按钮、恢复胶囊上也会顺手申请一次权限）。

### 行情隐身（不看盘模式）

三种入口任选：

1. 面板头部「**隐身**」按钮；
2. 徽标上的 **⊘** 按钮；
3. 对 AI 说「把行情隐身」。

触发后面板、徽标、指数条**一起卸载**（不是 CSS 隐藏），行情轮询随之停止——真的一个行情请求都不发；价格提醒仍然生效。

恢复有三条路，**成本刻意做得比隐藏更低**：

| 入口 | 操作 |
|---|---|
| 左下角恢复胶囊 | 屏幕左下角一枚 `● 行情` 小胶囊，**单击即恢复**（也支持 Enter / Space） |
| 快捷键 | `Ctrl + Alt + Shift + X`（macOS 为 `⌘ + Alt + Shift + X`），可在 **设置 → 通用 → 快捷键** 改键 |
| Agent 工具 | 让 AI 调 `xueqiu_display`（`hidden: false`），或直接说「把行情打开」 |

隐身状态是**宿主级**的：存在 `$DSH_HOME/dsh-xueqiu/.xueqiu-ui-state.json`，刷新、重启、换工作区、换浏览器都保持一致。

### Agent 工具

| 工具 | 作用 |
|---|---|
| `xueqiu_quote` | 实时行情快照（A股/港股/美股/指数/ETF） |
| `xueqiu_kline` | 历史 K 线（OHLCV + 涨跌幅），用于走势分析与技术计算 |
| `xueqiu_search` | 按名称/拼音/代码搜标的，把「茅台」解析成 `SH600519` |
| `xueqiu_hot` | 热榜 |
| `xueqiu_news` | 7×24 快讯 |
| `xueqiu_kol` | 某只股票的热议大V |
| `xueqiu_display` | 读 / 写「行情隐身」状态（`{hidden: true｜false}`；不传参即只读） |

工具调用会在对话里渲染成卡片（行情 / K线 / 热榜 / 快讯）。

---

## 数据与隐私

- **没有任何云端账号体系**，也不需要 API key。默认免登录抓雪球公开 Web 接口。
- **可选登录**：把浏览器里的一段 Cookie 粘进来，可拉取云端自选股、加删自选尽力同步。Cookie 只落在宿主本地文件里，客户端与 Agent 都接触不到原始 Cookie。
- 所有状态都是本地文件：

| 文件 | 内容 |
|---|---|
| `$DSH_HOME/dsh-xueqiu/.xueqiu-watchlist.json` | 自选股 + 上次云端同步时间 |
| `$DSH_HOME/dsh-xueqiu/.xueqiu-ui-state.json` | 界面状态（面板开合、徽标位置/折叠、**隐身开关**） |
| `$DSH_HOME/dsh-xueqiu/.xueqiu-login.json` | 可选登录的 Cookie |
| `$DSH_HOME/dsh-xueqiu/.xueqiu-alerts.json` | 价格提醒规则与已触发事件 |
| `$DSH_HOME/dsh-ths-pnl/config.json` | 可选的账本 Cookie（与已停更的 `dsh-ths-pnl` 共用同一目录） |
| `$DSH_HOME/dsh-ths-pnl/positions.json` | 本地持仓（股数 / 成本价） |

- 不上传任何数据到第三方服务器；除雪球（行情）与可选的同花顺账本外不发起其它外联。

---

## 与上游 dsh-xueqiu 的关系

- 本仓库与上游是**替代**关系，不是并存关系：Agent 工具名保持 `xueqiu_*` 不变，与上游同时启用会重复注册同名工具。装它之前请先卸掉 `dsh-xueqiu`。
- 状态目录默认沿用 `$DSH_HOME/dsh-xueqiu/`，所以从上游切过来时自选股、Cookie、界面位置都能无缝继承；想彻底隔离就把插件配置里的 `stateDir` 改成别的（切换后不会自动迁移旧数据）。
- 上游改动欢迎回流：[wanderer-yk/dsh-xueqiu](https://github.com/wanderer-yk/dsh-xueqiu)。本仓库自己的改动与设计取舍记在 [FORK-NOTES.md](./FORK-NOTES.md)。

### 环境要求

面向 DSH 0.2+（宿主 `shell` 服务改名后的版本），已在该版本验证；更早版本未做兼容。

---

## 常见问题

**Q: 面板挡住输入框怎么办？**
面板在输入框**上方**、对话区内，按 Esc 或点右上「收起」折叠；徽标可以拖到任意角落，位置会记住。

**Q: 为什么有时不刷新了？**
非交易时段会拉长刷新间隔；隐身状态下则完全停掉行情请求。想看最新的点「刷新」，或确认没在隐身模式（看左下角有没有 `● 行情` 胶囊）。

**Q: 数据准吗？**
行情来自雪球公开接口，和雪球网页同源；盈亏是「本地持仓 × 行情」的现算结果，股数/成本价以你填的为准。交易时段按周一至周五固定钟点本地推算，**不含法定节假日调休**，仅供参考。

**Q: Cookie 会不会泄露？**
不会出本机。它只存在 `$DSH_HOME` 下的本地文件里，由宿主进程使用；客户端与 Agent 工具都拿不到原文。

**Q: 会不会影响 DSH 本体？**
不会。所有 UI 都挂在官方槽位（`conversation.input.dock` / `shell.overlay` / `conversation.composer.dock`），卸载即完全消失，不改 DSH 源码。

---

## 参考与致谢

本项目的接口、界面与图表建立在这几个开源项目之上：

| 项目 | 许可证 | 与本项目的关系 |
|---|---|---|
| [wanderer-yk/dsh-xueqiu](https://github.com/wanderer-yk/dsh-xueqiu) | MIT | **上游**。本仓库的衍生基线（1.22.15）：雪球接口链路、面板/徽标 UI、图表与工具定义、构建与测试脚手架都源自这里 |
| [PM25000/dsh-ths-holdings](https://github.com/PM25000/dsh-ths-holdings) | MIT | **参考实现**。同花顺投资账本的数据链路（接口、字段口径、Cookie 解析）参照它重写，非逐字复制 |
| [klinecharts/KLineChart](https://github.com/klinecharts/KLineChart) | Apache-2.0 | **第三方组件**。`assets/klinecharts.min.js`（v10.0.2，UMD）原样引入，负责 K 线与分时渲染 |
| [fanxinqi/xueqiu-cli](https://github.com/fanxinqi/xueqiu-cli) | MIT | **灵感来源**。可选的「粘贴 Cookie 手动登录」交互借鉴自它，无代码复制 |

完整版权行与许可证全文见 [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md)。

## 第三方组件与许可

本仓库整体以 [MIT](./LICENSE) 发布。内嵌的 KLineChart 以 **Apache-2.0** 分发，其 `NOTICE` 还要求保留 **TradingView Lightweight Charts**（© 2019 TradingView, Inc.）的署名——这些都在 [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md) 里逐字保留。再分发构建产物时请一并带上 `LICENSE` 与该文件。

---

## 免责声明

- 本项目**非雪球官方**产品，与雪球网/雪球公司无关；「雪球」为雪球公司商标，此处仅作数据来源描述。同花顺投资账本同理。
- 数据来自雪球公开 Web 接口，仅供**学习与研究**，**不构成任何投资建议**；请勿高频请求，遵守目标网站条款。
- 接口可能随时变更导致功能失效，欢迎提 Issue / PR。因使用本插件产生的任何后果由使用者自行承担。

## 更新日志

本仓库相对上游 1.22.15 的改动：

- **1.0.0** —— 更名 `dsh-market-dock` 并首次公开：本地持仓与盈亏现算（账本降级为一次性导入）、价格提醒提升为宿主级运行时、行情隐身开关（左下角恢复胶囊 + 可改键快捷键 + Agent 工具三条恢复路径）、适配 DSH 0.2 的 `shell` 服务改名、自选与账本表单的外部输入收敛。
- 上游 1.22.x 的历史更新日志见上游仓库；本仓库的技术细节与逐条取舍见 [FORK-NOTES.md](./FORK-NOTES.md)。

---

⭐ **如果这个插件对你有用，欢迎点个 Star** —— 对维护者是实打实的鼓励；发现问题或想加功能，也欢迎直接提 Issue。

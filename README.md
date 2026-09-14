# dsh-deckseek

[English](./README.en.md) | [中文](./README.md)

[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

> 🙏 鸣谢原仓库 [aa2246740/dsh-better-display](https://github.com/aa2246740/dsh-better-display)（MIT）及其作者与贡献者。

dsh-deckseek 是 [aa2246740/dsh-better-display](https://github.com/aa2246740/dsh-better-display) 的 fork，由 [JNNarrator](https://github.com/JNNarrator) 独立维护的 DeepSeek Harness 展示与交互增强插件（MIT）。

它给 DSH 增加一个独立的 **DeckSeek 阅读页签**：执行过程自动折叠、最终回答完整保留，并支持三套阅读皮肤。它**只改展示与交互视图**——原生「对话 / 轨迹」页签、输入框、模型选择、工具与审批全部原样保留。

## 界面预览

![DeckSeek 阅读视图](docs/screenshots/reading-view.png)

**阅读视图（软卡皮肤，默认）**：执行过程自动折叠、最终回答完整呈现——标题、表格、代码块、公式、引用都排在同一列里；工具栏吸顶常驻（读数 + 查找 / 动效 / 导出），右缘消息导航气泡贴附，输入框之上留白紧凑，不再被长任务列表撑出大片空白。

![终端皮肤](docs/screenshots/terminal-skin.png)

**终端皮肤**：窗口标题栏常驻读数（`3 轮 · 最新一轮 1 步`）、`> ` 提示符的用户行整行底纹带、`⏺ ⎿ ✻` 一套字形词汇、按轮动词与呼吸点。三套皮肤（**纸面**排版流 / **软卡**卡片 / **终端**行）共用同一份 DOM，只换结构、密度与字号；颜色一律取自宿主主题 token，亮暗自动适配。

| 消息导航导轨 | 页内查找 |
|---|---|
| ![消息导航导轨](docs/screenshots/message-rail.png) | ![页内查找](docs/screenshots/search.png) |
| 悬停气泡显示「第 N 轮 · 标题」，点击平滑跳转并闪烁标记落点，当前阅读位置自动加宽高亮 | 实时匹配计数、上/下跳转，命中精确滚动定位并闪烁高亮 |
| **执行过程与工具行** | **统一失败卡片** |
| ![执行过程与工具行](docs/screenshots/process-and-tools.png) | ![统一失败卡片](docs/screenshots/failure-cards.png) |
| 折叠的回合直接给出计数（`3 次工具调用 · 1 次失败`），展开后每行按分类标注状态（已运行 / 已失败…），思考卡片可展开 | 失败原因、退出码与 stderr 摘要，外加可展开的原始记录，重试提示共用同一文案 |

## 三套阅读皮肤

在 DSH 设置的独立 **DeckSeek** 页里切换，即时生效，默认**软卡**。

| 皮肤 | 取向 | 适合 |
|---|---|---|
| **软卡**（默认） | 卡片容器：回答卡用宿主自己的 elevation（0.5px 发丝描边 + 柔光），用户卡从品牌色派生身份色 | 一般阅读；上下文分明、层次清楚 |
| **纸面** | 排版流：没有容器，只有标题层级与文章尺度的正文节奏，颜色只留给失败 | 长文精读、导出打印 |
| **终端** | 行列：等宽字体、窗口边框与标题栏、发丝线行规，状态色与工具类别色是唯一的颜色 | 喜欢 TUI / Claude Code 观感 |

三套皮肤只表达结构、密度、字体与圆角；**颜色全部取自宿主主题 token**，亮暗主题自动适配，插件不携带自己的调色板。皮肤切换不改变组件树——同一份 DOM，只有样式表换一册；详见 [docs/design/reading-skins.md](docs/design/reading-skins.md)。

终端皮肤额外有：窗口标题栏（工作区路径 + `N 轮 · 最新一轮 N 步` 常驻读数）、流式回答末尾的 `▌` 光标、状态行的呼吸点 + 每轮动词 + 右对齐耗时、工具调用按类别取色的 `⏺`、右对齐的数字列、折叠回合的计数摘要（`39 次工具调用 · 4 个文件 · 2 次失败`）、收尾读数行的挂右发丝线、用户回合的整行底纹带，以及空闲屏的 braille 点阵标识。设计取舍与实测参数见 [docs/design/terminal-skin-v3.md](docs/design/terminal-skin-v3.md)、[terminal-skin-v4.md](docs/design/terminal-skin-v4.md)。

## 功能特性

**阅读视图**

- 执行中实时呈现原生步骤、思考与进度；任务成功后自动收起过程，保留最终回答与交互卡片。
- 全部已知记录类型（系统提示词、执行过程、轮次统计等）均已适配；**未知类型自动回退为可复制的原始记录卡片**——DSH 尚未稳定，兜底始终保留。
- 工具 / 命令失败以统一错误卡片呈现：失败原因、退出码与可展开的原始记录。
- 长思考折叠为淡出卡片并两行跟随，展开即暂停滚动，可手动恢复。
- **无损保真**：原生 Markdown、代码高亮、数学公式、表格、图片与工具事实 100% 忠实呈现。

**导航与查找**

- **消息导航导轨**：右缘最小化气泡导轨（编辑器 minimap 风格）——你发送的每条消息对应一颗小刻度，不占布局、会话栏保持居中；当前阅读位置自动加宽高亮，悬停显示「第 N 轮 · 标题」，点击平滑跳转并闪烁标记落点。回合多时刻度自动压缩排布，始终全部可见（窄屏自动隐藏）。
- **轮次键盘导航**：`Alt+↑` / `Alt+↓` 在你的消息之间跳转，与导轨同一套定位逻辑。
- **阅读页查找**：覆盖你的问题与模型回答；匹配计数、上 / 下跳转、命中精确滚动定位并闪烁高亮；所有匹配块淡底标记，字符级出现位置经 CSS Custom Highlight API 精确染色、当前命中反白加强。
- **会话阅读位置记忆**：再次打开会话自动回到上次阅读位置，附短暂提示；「回到最新」随时可跳回底部。

**导出与复制**

- **会话导出**：阅读页工具栏一键把本轮会话导出为 Markdown（用户提问 + 模型回答，按显示顺序，过程保持折叠），文件名自动带时间戳。
- 代码块一键复制；回答中的表格悬停即见「复制为 CSV」（RFC 4180，自动处理引号与换行）。

**交互与状态**

- **状态与跟随**：思考卡片紧跟最新并在结束后停在底部；思考时显示「正在思考中… 用时」，工具按类别显示阅读中/已阅读、搜索中/已找到等状态；滚动离开底部时底部中央出现 ⬇ 到底部按钮；发送或插话消息后自动跳回底部。
- **动效可关**：工具栏动效开关或跟随系统 `prefers-reduced-motion`，两处开关一次停下全部动画。
- **双语 UI**：全部阅读页文案随 DSH 应用语言切换（中文 / English），无需重启。
- **自适应主题与字号**：深浅色实时同步、零闪烁；字号跟随浏览器缩放与宿主的正文字号设置（皮肤的行高、前导格、块间距一同随动）。

**兼容**

- **生成式 MCP Apps（SEP-1865）**：模型在回答中输出 ````mcp-app```` 代码块即自动挂载为活体交互卡片，在 `sandbox="allow-scripts allow-forms"` 沙箱 iframe 中运行，通过 JSON-RPC `postMessage` 双向通信（`ui/initialize`、`ui/resize`、`ui/submit` 等），卡片高度随内容在 60–2400px 之间自适应。
- **157 项单元与组件测试**：覆盖消息投影、Markdown 管道、SEP-1865 解析、自适应高度预算、两行流式跟随，以及搜索定位、复制回执、皮肤分片、光标钩子、样式表契约（颜色只取宿主 token、token 引用可解析、字形一格宽）等界面交互（happy-dom）。

## 快捷键

| 键 | 作用 |
|---|---|
| `Alt+↑` / `Alt+↓` | 在你的消息之间跳转（输入框内打字时不触发） |
| `Cmd/Ctrl+F` | 打开 / 关闭阅读页查找 |
| `Enter` / `Shift+Enter` | 查找中跳到下一个 / 上一个命中 |
| `Esc` | 关闭查找 |
| `←` `→` `Home` `End` | 工具卡内切换标签页 |

## 安装

发布渠道有两处，**版本不同步**：npm 上当前是 **0.6.0**，更新的版本以 GitHub Releases 的 tarball 为准（本仓库最新 **0.10.1**）。

```sh
# 从 npm 安装（0.6.0）
dsh plugin --profile web add dsh-deckseek

# 或从 Releases 下载 tarball 后安装最新版
dsh plugin --profile web add ./dsh-deckseek-0.10.1.tgz
```

`--profile` 取 `web` / `desktop` / `headless`，按你实际使用的宿主形态选择。装好后重启宿主。

已收录于：

- [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)（PR [#4528](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/4528) 已合并）
- [awesome-deepseek-harness-plugins](https://github.com/imsai-sh/awesome-deepseek-harness-plugins)（[deepseek1024.com](https://deepseek1024.com/)，PR [#367](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/pull/367) 已合并；npm 包已发布，市场检测到后自动升级为一键安装）

## 开发

```sh
npm test                                  # 157 项（node --test + happy-dom）
npx tsc -p tsconfig.json --noEmit         # 类型检查
DSHX_HARNESS=<DSH 检出路径> npm run build  # 构建 lib/（client + host 两半）
```

- **依赖来自 DSH 检出，而非 npm**：开发依赖通过 `node scripts/link-harness-dependencies.mjs <DSH 检出路径>` 以符号链接接入一个已构建的 Harness 检出，不要在本目录执行 `pnpm install` / `pnpm add`。
- **`package-lock.json` 是 `--legacy-peer-deps` 语义下的尽力而为产物**：已发布的 `@deepseek-ai/dsh-client-ui-settings` 对 `@deepseek-ai/dsh-client-ui-primitives` 声明了 `^0.0.1-rc.1` peer，与本插件 0.1.x 区间无法相交，严格解析必然 ERESOLVE。
- 因此**不要在本目录运行 `npm ci`**——它无法复现可用的依赖树。
- 本地验证最新版时注意：profile 用 `file:` 指向 tarball 时，重建同名 tarball 后单独 `dsh plugin --profile web install` **不会**更新（报 `Already up to date`）。需要 `rm -rf <profile>/node_modules/dsh-deckseek` 后 `dsh plugin --profile web install --force`，再逐字节比对 `lib/client.js`。

## 其他

- 功能与使用说明亦可参考原仓库：[aa2246740/dsh-better-display](https://github.com/aa2246740/dsh-better-display)
- 第三方声明：[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) · 变更记录：[CHANGELOG.md](CHANGELOG.md) · 设计契约：[DESIGN.md](DESIGN.md) · 设计文档：[docs/design/](docs/design/)

**v0.10.1 · 非官方 DSH 展示与交互增强插件。只改展示与交互视图，不改 Agent 核心执行逻辑、SDK 或模型凭据。**

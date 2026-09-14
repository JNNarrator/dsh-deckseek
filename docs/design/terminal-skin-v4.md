# 终端皮肤 v4：参考四个独立 TUI，补上「常驻信息层」

> 工作文档：跨机器续作用。**2026-09-14 已实施：T1–T6 全部完成，随 0.10.0 发布**。
> 参考实现：[earendil-works/pi](https://github.com/earendil-works/pi)、[Hmbown/Codewhale](https://github.com/Hmbown/Codewhale)、[xai-org/grok-build](https://github.com/xai-org/grok-build)、[herdrdev/herdr](https://github.com/herdrdev/herdr)。
> 前置阅读：[reading-skins.md](reading-skins.md)（三皮肤现行规格与不变式）、[terminal-skin-v3.md](terminal-skin-v3.md)（上一轮，v3 的动效与标题栏）。

## 这一轮的判断

用户的反馈是「很喜欢，但朴素了点」。四家对照下来，**缺的不是装饰，是常驻信息层**：四家**全部**都有一条永远在的状态栏（Codewhale 顶栏 + 底部工作条、grok 的 `status_line` 段、pi 的两行页脚、herdr 的 tab bar 与 `>` 分段栏），也都有一块有身份的启动屏（Codewhale 的鲸鱼点阵 + 版本/帮助、grok 的 braille 大 logo、pi 的键位总表、herdr 的居中框）。我们这两处分别是「流式时才出现的状态句」（`Reader.tsx` 的 dock 变体只在 `boundary.status === 'open'` 时渲染）和「三行居中文字」。所以顺序是：**先补常驻层 → 再补标识 → 最后才是行内装饰**。

副产物：herdr 的截图右半是 Claude Code 自己的界面，里面那行 `✻ Zigzagging…` 正是「星标 + 随机动词」，说明 v3 做的 `pickStatusVerb` + `★` 呼吸方向被第三方实拍印证。

---

## 四家的机制与实测参数（抄机制，不抄配色）

四家的调色板一律不搬（Codewhale Underwater `#0A1E33`、Catppuccin `#89b4fa`、GrokNight `#141414`、pi `#8abeb7`）：本插件的颜色契约是全部取宿主 token、亮暗自动适配。以下参数为读源码所得，标注处已逐条核对。

### Codewhale（Rust，`crates/tui`）

| 机制 | 源码实测 | 我们的映射 |
|---|---|---|
| 空闲屏 = 点阵标识 + 版本 + 帮助 | `underwater.rs` 启动 stage 规范：`<mark> Codewhale v0.9.12` / `<mark> openrouter · deepseek-v4` / `<mark> owner/repo · branch`，无 ASCII art、无选项条 | T1：标识 + 身份行 + 提示行（保留了插件原有的两句文案） |
| 顶栏 = 常驻状态栏 | 单行，左 `状态图例`，右段按丢弃顺序裁 | T2：窗口栏右侧读数 |
| 字形宪章 | `glyphs.rs`：`●` 当前 / `○` 可用 / `▸` 选择 / `✓` 完成 / `✕` 失败 / `◆` 需注意；**每个装饰字形都有 ASCII 回退** | 沿用我们已有的 `▸ ✓ ✗ ⏺ ⎿ ✻`，不新增 |
| 状态永不只靠颜色 | `docs/ACCESSIBILITY.md`：正文 4.5:1、hint 3:1、状态色 3:1，且状态**必带字形 + 文字**；红只留给真失败 | T6：做成静态断言测试 |
| 折叠块给计数 | 工具卡摘要 `summary: N file(s), +a -d, N hunk(s)` | T4：折叠行的计数摘要 |
| 逐帧 spinner | `spinner.rs`：`BRAILLE_SPINNER_FRAMES` 8 帧自下而上填充 `⠀⢀⣀⣄⣤⣦⣶⣿`，`BRAILLE_SPINNER_FRAME_MS = 200`，`LIVE_MARKER_DELAY_MS = 400`（快任务不上动画，直接落成结果行）；header 圆点 `◍◉◌◌◉◍`，`STATUS_INDICATOR_FRAME_MS = 420` | 🟡 **不做**：阅读器里是装饰，且逐帧轮转需要固定 1ch 裁剪窗口，与 v3 已记录的宽字形撕裂风险冲突。保留 v3 的单个 `●` 呼吸 |

### grok-build（Rust，`crates/codegen/xai-grok-pager`）

| 机制 | 源码实测 | 我们的映射 |
|---|---|---|
| braille 大 logo | `views/welcome/logo.rs`：`LOGO = include_str!("assets/logo/logo07.txt")`、小号 `logo05.txt`；`SMALL_LOGO_MIN_HEIGHT = 22`、`FULL_LOGO_MIN_HEIGHT = 26`，**高度不够就整块不画** | T1：标识用 braille；**降级纪律照抄**（图案限定 6 行 × 15 格） |
| braille 的密度 | 实测 `logo07.txt`：7 行 × 42 列，用到 **27 个 braille 字形**（一个字符 = 2×4 点的抗锯齿单元） | T1：同样用密度差画形状，不画实心块 |
| 常驻状态行分段 | `views/status_line/segments.rs`：`cwd │ model │ context │ cost │ turn-timer │ session-name`，分隔符 `" │ "`，各段有截断列数 | T2：我们的段用 ` · `，且只放我们有的数字 |
| 窄了先丢什么 | 同上：截断列数写死在段定义里；context 到阈值转 amber | T2 + 已有：读数在 520px 容器下整段隐藏（与 `statusClock` 在 480px 下隐藏同一思路） |
| 1/8 格量表 | `views/progress_bar.rs`：`▏▎▍▌▋▊▉█`，回退 `░▒▓` | 🟡 不做：需要已知分母，我们没有（见「明确不做」） |
| 字形必须 1 列宽 | `glyphs.rs` 有单测守卫，legacy ConHost 全套 ASCII/CP437 回退 | T6：静态测试守住我们的字形表 |
| 思考体前缀 | thinking 体 `┃ `，头 `Thinking…` / `Thought for Xs` | 🟡 已有推理卡，不动 |
| 逐帧 spinner | `views/turn_status.rs`：`SPINNER_DIVISOR = 4`（30fps → 约 133ms/帧）、`MONITOR_PULSE_DIVISOR = 8`、`⇣Nk` token | 同 Codewhale，不做 |

### pi（TypeScript，`packages/tui`）

| 机制 | 源码实测 | 我们的映射 |
|---|---|---|
| 空闲屏 = 键位/清单 | 启动即一屏键位表（`escape to interrupt` / `ctrl+c to clear` …），随后 `[Context]` / `[Skills]` / `[Prompts]` / `[Extensions]` **方括号段标 + 缩进的暗色条目** | T1：`[提示]` 段标（键位不搬——键位属宿主） |
| 用户消息是整行底纹带 | 实拍：用户那行铺满整宽、淡底，不是气泡 | T5：终端皮肤的用户回合改整行底纹带 |
| 工具输出整宽淡底 | 实拍：`read <path>` 工具名加粗、路径强调色，输出在暗绿整宽底上 | 🟡 部分做：底纹带只给用户回合；工具行的整宽底会让日志过重 |
| 截断提示 | `... (37 more lines, ctrl+o to expand)` | 🟡 已有工具卡折叠，不重复 |
| 页脚两端对齐 | 左 `~/path (branch)`，右 `(provider) model · level`；中段 `↑4.7k ↓44 R3.8k $0.009 1.7%/272k (auto)` | T2：左 cwd（已有）+ 右侧读数 |
| 逐帧 spinner | `loader.ts`：braille 10 帧 `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`，`intervalMs = 80` | 不做（同上） |

### herdr（Rust，terminal runtime）

| 机制 | 源码实测 | 我们的映射 |
|---|---|---|
| 侧栏强调条 + 状态词 | 实拍：`▌ pi  idle` / `▌ claude  working`，状态词按语义上色 | 🟡 我们的导轨是消息导航，不是进程列表，不套用 |
| 状态栏 `>` 分段 | 实拍：`~/Projects/herdr > master ✱ > kimi-k2p5-turbo > high > ctx …`，`✱` 是脏 worktree | T2：分隔符取 ` · `，`✱` 一类脏标记我们没有数据 |
| **配额行 = 发丝线量表 + 右挂数字** | 实拍：`Codex > 5h ──────── 1% 4h17m > Week ────── 16% 3d20h`——一条 `─` 把左标签与右数字拉开 | **T3**：收尾读数行照这个形状做（纯 CSS） |
| 颜色交宿主 | `terminal` 主题全部 `Color::Reset` 交宿主 ANSI | 与我们的颜色契约同构，互为印证 |
| 不做 spinner | CHANGELOG 明写把连续 spinner 改成**静止状态标记** | 与我们的决定一致 |

---

## 落地的六件事

| | 项 | 落点 | 来源 |
|---|---|---|---|
| T1 | 空闲态 braille 点阵标识 + `[提示]` 段标 + `> ` 提示行 | `src/client/empty-mark.ts`（新增）、`Reader.tsx` 空闲态、`Reader.module.css` 终端段 | Codewhale + grok |
| T2 | 窗口栏右侧常驻读数（轮数 + 最新一轮步数） | `src/client/frame-meter.ts`（新增）、`Reader.tsx` 的 `.frameMeter` | 四家 |
| T3 | 收尾读数行改「发丝线牵到右缘」 | `Reader.module.css` 的 `.turnTail::before` | herdr |
| T4 | 折叠回合的计数摘要 | `motion.tsx` 的 `Disclosure` 新增 `summary`、`Reader.tsx` 传 `turnCounts` | grok + Codewhale |
| T5 | 用户回合整行底纹带 | `Reader.module.css` 的 `.user` | pi |
| T6 | 契约测试三条：点阵列宽 / 字形 1 列宽 / 状态不靠颜色 | `tests/empty-mark.test.ts`、`tests/skin-css.test.ts` | grok + Codewhale |

> 实机验收结论见下方「实机验收记录」：三个只有真机能暴露的问题（轮数数错、底纹带没铺满、英文单复数）已在那一节记录并修复。

**T2 的数据边界**：读数只用插件已经持有的东西——分好的轮数、最新一轮的步数、`hasMore`（历史未载完时把轮数标成下限 `N+ 轮`）。四家在这一格都印 token / 花费 / 上下文占用，我们没有那个投影，也按用户既定决策不引入（v3 文档「明确不做」第一条）。

**T1 的宽度风险与解法**：braille 码位（U+2800–U+28FF）的东亚宽度是 **Ambiguous**，中文优先的字体回退下可能排成 2 格宽。解法不是换字形，而是**让每行格数完全相等**（实测 6 行 × 15 格）：整体等比变宽仍是同一形状，只有参差不齐才会撕裂——正是 v3 里 `⏺` 半圆、`●` 呼吸被否掉的那类风险。测试同时钉住「只含 braille 码点」，避免某行静默回退到别的字体而破坏点阵。

---

## 实施记录（2026-09-14）——计划与实做的出入

1. **空闲态没有搬 pi 的键位表。** 计划里 T1 想「标识 + 段标」两件都做，落笔时确认插件的键位极少且属宿主（`Alt+↑/↓` 导航、查找面板内的 Enter/Esc、工具卡 tab 键），一张键位表撑不起身份。改为：标识 + 身份行 + 提示行加 `[提示]` 段标，段标机制来自 pi，内容是我们自己的两句文案。
2. **T5 只给用户回合上底纹。** pi 的用户行与工具输出都有整宽底。日志里两者都上底会糊成一片条纹，只保留用户回合——它同时承担「一轮从这里开始」的分段职责。
3. **`--dx-frame-pad-x` 是为了底纹带新加的 token。** 底纹带要横向出血到窗口内沿，`margin: 0 -12px` 会与 `.column` 的 `padding: 10px 12px` 各写一份 12px；改成两者共用同一个 token，改一处即同步。
4. **读数在 520px 容器下整段隐藏。** 与既有的 `statusClock`（480px）同一思路：栏位里最先该走的是「有多少在屏上」，路径留到最后。
5. **折叠摘要是唯一不做 `aria-hidden` 的新装饰。** 其余新件（标识、读数）都是装饰 → `aria-hidden`；计数是信息，所以在非终端皮肤下用 sr-only 隐藏像素、保留给辅助技术。

---

## 实机验收记录（2026-09-14，装进 web profile 后在真实界面复核）

三个只有真机才能暴露的问题，均已修：

1. **读数把轮数数错了两次。** 第一版用「所有分组」→ 显示 4 轮，而宿主页脚与导轨都说 3 轮；第二版改用「以用户消息开头的分组」→ 变成 2 轮。实测 DOM（`[data-reader-turn]` 的四个 section）才看清结构：**首条消息之前的记录自成一个 `turn: unresolved` 的组**，而**第一个回合自己的组里，系统提示排在该回合的用户消息之前**——两种朴素规则一个多算一个少算。终稿按「分组解析出了轮号」（`group.turn !== null`）计数，与导轨条目、宿主页脚三者一致。**教训：状态栏上的数字必须与屏幕上其它同一含义的数字对得上，否则它比没有更糟。**
2. **底纹带没铺满。** 基线 `.user` 是气泡几何（`align-self: flex-end` + `max-width: min(560px, 84%)`），只改背景与圆角的结果是「右侧一小块」，正是这次要换掉的样子。终端皮肤补 `align-self: stretch; max-width: none`。实测：带宽 766px（等于窗口内沿），底色 `color(srgb 0.976 0.980 0.984 / 0.05)`。
3. **英文下 `1 files`。** 折叠摘要按计数取单复数（`frame.toolsOne` / `frame.filesOne`）；中文两个键与复数同串，只为保持两份字典键集一致。

同一次验收里量到的事实（写进结论，免得下次再猜）：

- **braille 的实际字宽**：应用字体栈（`SF Mono` → `JetBrains Mono` → … → `PingFang SC`）下 14px 时每格 **9.57px**，而拉丁等宽格约 8.4px——即 braille 由回退字体渲染、比拉丁格宽。但**所有行同宽**，所以形状整体等比变宽、不撕裂（等宽不变式成立）。标识盒子实测 144×88px（6 行）。
- **空闲屏在当前宿主里到不了**：新建空会话时宿主渲染自己的欢迎页（「Into the Unknown」+ 它自己的输入框），插件的 `DeckSeek` / `Chat` / `Trajectory` 三个 tab 要等会话有内容才出现。也就是说 T1 的标识**只在阅读页渲染出零轮时**可见（例如会话只剩不可成组的记录），当前宿主版本下属于边角情形。机制与测试都成立、成本为零，故保留；但若希望空闲屏一定有身份，那是宿主欢迎页的地盘，插件改不到——需要另议落点。
- **发布流程的一条坑**：profile 用 `file:` 指向 tarball 时，重建同名 tarball 后单独 `pnpm install` **不会**更新（报 `Already up to date`、`added 0`，实装仍是旧代码）。必须 `rm -rf node_modules/dsh-deckseek && pnpm install --force`，再逐字节比对 `lib/client.js`。

---

## 不破的不变式

- **React 里没有皮肤分支**：新件全部「始终渲染 + 按皮肤在 CSS 里显隐」。
- **颜色只取宿主 token**：底纹带用 `color-mix(in srgb, var(--dsw-alias-label-primary) 5%, transparent)`——宿主自己的表面阶梯在亮色主题里是平的（v3 已记录），所以取**文字色**的 5% 当中性底，亮暗都成立；没有新增颜色字面量（`tests/skin-css.test.ts` 继续守着）。
- **颜色只表达状态**（v3 起扩展为「状态 + 会改变什么」）：本次没有新增上色用途；底纹带是中性底，不是语义色。
- **动效可停**：本次没有新增动画。
- **2 列字形纪律**：新增字形只有 `> ` 提示符（ASCII），其余沿用 v3 词汇。

---

## 明确不做

- 🟡 **token / 花费 / TPS / 上下文占用**（pi `↑4.7k ↓44 $0.009 1.7%/272k`、Codewhale `ctx 61% · $0.42 · 38 tok/s`、grok `{pct}% ctx`）：用户既定决策，不引入宿主投影。
- 🟡 **1/8 格量表 / 配额条**（grok `▏▎▍▌▋▊▉█`、herdr 的 `1% 4h17m`）：需要已知分母，我们没有；轮内进度也无法从 `latestStep` 推出总量。**T3 取的是它的「发丝线挂右」形状，不是它的量表**。
- 🟡 **逐帧 spinner**（Codewhale 200ms/8 帧、grok 133ms、pi 80ms/10 帧）：见 v3 的裁剪窗口结论。
- 🟡 **logo 微光扫掠 / 启动动画**：动作量与收益不匹配。
- 🟡 **tab bar / 侧栏 / pane / worktree 树**：我们没有这些概念。
- 🟡 **四套调色板**：颜色契约是宿主 token。

---

## 验证口径

```bash
npm test        # 157 项（本轮 140 → 157：empty-mark 4 + frame-meter 7 + skin-css 2 + fold-summary 客户端 4）
npx tsc -p tsconfig.json --noEmit   # 0 错误
DSHX_HARNESS=… npm run build        # 构建产物
```

人工视觉验收：终端皮肤空闲屏（标识、段标、提示行）、一轮对话（标题栏读数、用户底纹带、折叠摘要、收尾量表）各过一眼，并确认软卡 / 纸面**零回归**（新件在非终端皮肤下分别走 `display:none` 与 sr-only 两条路）。

---

## 风险与退路

| 风险 | 退路 |
|---|---|
| 字体把 braille 排成 2 格宽，图案横向变宽 | 每行格数相等 → 等比变宽不撕裂；再不行就把标识缩到 10 格以内，或退回纯文字空闲屏 |
| 底纹带的 5% 中性底在某个主题下几乎不可见 | 调成 8%，或改用 `--dsw-alias-interactive-bg-hover` |
| 读数与控件在同一行，窄列时换行 | 520px 容器下整段隐藏（已做） |
| 折叠摘要的枚举要解析每个调用的参数 | 按 block/draft 对象身份做 WeakMap 缓存（与工具行自己的 `useMemo` 同一前提），只在**折叠态**计算 |

---

## 版本

**0.10.0**（终端皮肤一次性新增六处视觉与信息件，等价于 v3 那一轮的量级）。

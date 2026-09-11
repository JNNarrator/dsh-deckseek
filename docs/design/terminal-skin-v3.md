# 终端皮肤 v3：参考 dsh-TUI，把「深色排版」做成「会呼吸的仪器面板」

> 工作文档：跨机器续作用。**计划定稿于 2026-09-11，代码尚未动**。`git pull` 后从第一个 ⬜ 项继续。
> 参考实现：[ccch1mneyyy/dsh-TUI](https://github.com/ccch1mneyyy/dsh-TUI)（`@deepseek-harness-tui/dsh-tui`）——一个独立 TUI 插件，Claude Code 风。
> 前置阅读：[reading-skins.md](reading-skins.md)（终端皮肤的现行规格与不变式，本计划是它的增量）。

**进度总览：T1–T7 全部 ⬜ 未开始**

图例：⬜ 待做 · 🔧 进行中 · ✅ 已完成 · 🟡 有意不做 / 部分做

---

## 已定决策（用户 2026-09-11 确认）

1. **只用插件已持有的数据。** 不引入 `@deepseek-ai/dsh-token-meter` / `dsh-session-stats` 两个宿主 peer 包，不做上下文占用百分比与实时 token。状态行的数字只用轮次耗时、工具 ±行数、turn-tail 的 tokens / tok·s⁻¹ / ttft。用户原话：「只用现有数据。空白就不要了。」
2. **两个风味件都做**：按轮随机动词池、工具分类色点。后者要修订 [reading-skins.md](reading-skins.md) 里「颜色只给状态、工具名不上色」这条不变式。

---

## 设计取向：抄机制，不抄配色

dsh-TUI 的观感由这几个机制构成。**它的 Gentle Mist Blue 雾蓝色板不搬**——本插件的颜色契约是全部取宿主主题 token、亮暗自动适配（见 reading-skins.md「依赖的宿主事实」）。

| dsh-TUI 机制 | 它的实现参数（源码实测） | 我们的映射 |
|---|---|---|
| 呼吸点 spinner | 帧 `['·','•','●','•']`，140ms/帧（`time/140`），固定 2 列宽保证文字不跳；reduced-motion 退化为静态 `●`，2s 一亮一暗 | 状态行前导字形，CSS `steps()` 逐帧 |
| 按轮随机动词 | 18 个英文动词，每轮挂载抽一次（`useState(() => sample(...))`） | 按 turn key **确定性**取词（见 T3：同一轮的 header/dock 是两个实例，随机 state 会让两处显示不同的词） |
| 滑动高光 glimmer | 4 格三角高光扫过文字，周期 1600ms（请求中）/ 2200ms（其他），方向随阶段反向 | 复用已有的 `thinkShimmer`（2s 线性扫过，`--think-shimmer`） |
| 思考状态 | 流式推理中显示 `thinking`，结束后 `thought for Ns`，且**至少显示 2s** 避免抖动（`THINKING_DELAY_MS 2800` / `THINKING_PULSE_MS 1800`） | 已有语义标签「深度求索中 / 思考中」，不动 |
| 渐进式宽度门控 | 终端宽度不够时依次砍掉：token 计数 → 计时 → thinking 文字（`SHOW_TOKENS_AFTER_MS 30000`） | 容器查询：窄列先隐藏耗时（`.root` 已是 container） |
| token 计数缓动 | `1 - exp(-elapsed/220ms)` 指数逼近，字符数 ÷ 4 估算 token | 🟡 不适用：我们没有实时输出量 |
| 右对齐数字列 | 耗时 / ±行 / token 共享一条右缘 | 工具行第三列制表列 + 状态行耗时独立 span |
| 卡住漂移成错误红 | `useStalledAnimation` 在无新内容时向 error 色插值 | 🟡 **不做**：判定「卡住」需要追踪内容活动时间，而长推理本来就不吐字，误报会把正常思考染红 |

---

## 已核实的落点（省掉重新考古）

行号为 2026-09-11 工作区快照，可能 ±3 行漂移；**选择器比行号可靠**。

**装饰件的挂载点**
- 皮肤根属性：`src/client/Reader.tsx` 根部 `<div className={css.root} data-deckseek-skin={skin} data-motion=…>`（约 :333）
- 工具栏 DOM：`.column > .toolbar`（`role="toolbar"`）＝ 一个标题 span（`title={ui('reader.toolbarHint')}`，文本 `reader.toolbarTitle`）+ 搜索按钮 + 动效按钮（约 :335-337）
- `cwd` 取法已有先例：`Reader.tsx` 的 `TurnGroup` 内 `props.useSessions(snapshot => snapshot.byId[props.sessionId]?.cwd)`（约 :229）；`ReaderProps` 本身就有 `useSessions`，根部可再取一处
- 状态行渲染：`GroupStatus`（`Reader.tsx:111-157`）→ `StatusText`（`src/client/motion.tsx:40-90`）
- 流式钩子：`.blocks` 已带 `data-streaming` + `aria-busy`（`src/client/Blocks.tsx:130`）；正文/推理文本节点带 `data-reader-text` / `data-received-length` / `data-shown-length`（`Blocks.tsx:90,99`）
- 推理跟随中：`.reasonCard[data-following='true']`（`src/client/ReasoningCard.tsx:299`）
- 工具分类：`.toolActivity[data-tool-category]`（`src/client/ToolActivity.tsx:181`），取值 `'write' | 'read' | 'terminal' | 'search' | 'web' | 'other'`（`src/client/tool-activity.ts:9`）
- 终端字形现状：`.toolLead::before { content:'⏺' }`、`.toolDetails::before { content:'⎿' }`、`.reasonHeading::before { content:'✻ ' }`、`.toolGlyphState[data-phase=…]` → `▸ / ✓ / ✗`
- 动效开关：`useMotionAllowed`（`motion.tsx:10-19`）→ 根上 `data-motion`；CSS 侧 `[data-motion=off]` + `@media (prefers-reduced-motion: reduce)` + `forced-colors`
- 高光时间常数：`--think-shimmer: 2000ms`（`Reader.module.css` 约 :123，keyframes `thinkShimmer` 约 :148）

**宿主 token（决定分类色只能用两个色相）**
宿主 `design-platform.css` 里能当「墨」用的状态色只有 business / success / warn / error 四族（各带 primary/secondary/tertiary）。**没有 progress / meter 专用 alias**（原生 ContextMeter 也是拿这几个拼的）。红色必须留给失败。

**状态文案的现状（T3 的关键）**
`status.delving` = `'深度求索中… {time}'`（zh `locale.ts:64` / en `:341`），`{time}` 由 `elapsedClock()` 每秒钟产出新字符串（`Reader.tsx:105-109` + 1s `setInterval` 于 :114-119）。也就是说**耗时嵌在标签串里**，而 `StatusText` 的换字动画判据是 `frame.text !== text`——于是**每秒都会触发一次整串的模糊 + 位移切换**（`--think-distance: 8px`、`--think-blur: 2px`、150ms）。这大概率是无意的抖动而非设计，T3 顺带修掉。

---

## 任务清单

### T1 ⬜ 窗口标题栏（把「窗口边框」做成真的终端窗口）

| 项 | 内容 |
|---|---|
| 位置 | `src/client/Reader.tsx`（根部）、`src/client/Reader.module.css`（终端段）、新增 `src/client/frame-path.ts`（纯函数） |
| 做法 | ① 根部从 `props.useSessions(...)` 取 `cwd`；② 在 `.toolbar` 内新增**始终渲染**、`aria-hidden="true"` 的 `.framePath` 装饰节点，内容 = `deckseek` + 路径末两段，`title` 挂完整 cwd；③ 纯函数 `shortCwd(cwd)`：取末两段、超长按段回退到只剩末段、`undefined` → 空串；④ 终端 CSS：`.toolbar` 转等宽小字标题栏 + 下缘 `1px var(--dsw-alias-border-l1)` 发丝线，标题右侧用 `flex: 1 1 auto; border-top` 牵到右缘（复用 paper 皮肤 `.userRole::after` 的既有手法）；⑤ 其他皮肤 `.framePath { display: none }`；⑥ 终端下把现有长标题（「阅读 · 原始记录完整保留」）转 sr-only（`clip-path: inset(50%)` 那套），保留 `title` 提示与两个按钮 |
| 验收 | `shortCwd` 单测；非终端皮肤下 `.framePath` 不可见；亮暗两组看标题栏对比度 |

### T2 ⬜ 流式光标

| 项 | 内容 |
|---|---|
| 位置 | 只在 `Reader.module.css` 终端段 |
| 做法 | 回答正文最后一行尾端 `▌`，`steps(1)` 方波闪烁（约 1s）。钩子用已存在的 `.blocks[data-streaming]`；`::after` 需落在**直接包含最后一行文本的元素**上，markdown（`.readingText` 下是块级 `<p>`）与纯文本两条路径的 DOM 形状不同，选择器要同时命中 |
| 验收 | 人工视觉：流式回答时末行有光标、定格后消失；`data-motion=off` 与 reduced-motion 下静态不闪 |
| ⚠️ | 计算样式测不了，**不要假装能测**。退路：若一条 CSS 命中不了，让最后一块在 React 里挂一个装饰 span（仍是「始终渲染 + 按皮肤显隐」） |

### T3 ⬜ 状态行：呼吸字形 + 动词池 + 拆出的耗时

| 项 | 内容 |
|---|---|
| 位置 | `src/client/motion.tsx`（`StatusText`）、`src/client/Reader.tsx`（`GroupStatus`）、`src/client/locale.ts`、新增 `src/client/status-verb.ts`、`Reader.module.css` |
| 做法 | ① `StatusText` 增加**可选** props `verb` / `clock`（可选，不破坏现有两处调用）；DOM 变为 `.statusGlyph`（装饰，`aria-hidden`）+ `.think`（现有语义标签）+ `.statusVerb` + `.statusClock`，全部始终渲染，CSS 按皮肤显隐；② **耗时拆成独立 `.statusClock`**——这是必须做的一步，见上文「状态文案的现状」；③ 终端忙碌时：`.think` 转 sr-only、`.statusVerb` 可见、`.statusClock` 可见（`tabular-nums` + `min-width`，秒数进位时不抖动）；④ 动词池：新增语义化文案键 `status.verb.*`（zh/en **各 8 条**，参考 dsh-TUI 的 Working / Analyzing / Considering / Reviewing / Planning / Checking / Searching / Building），配纯函数 `pickStatusVerb(key, lang)` 按 turn key 哈希取词；⑤ 动词只用于**工作相位**，思考相位保留语义标签（「思考中」这个信号不能丢）；⑥ 窄列容器查询隐藏 `.statusClock` |
| 验收 | `pickStatusVerb` 单测（同 key 同词、不同 key 能覆盖到多个词）；`StatusText` 分片渲染（恰好一个 `role="status"` 活区、装饰件 `aria-hidden`、clock 文本独立于动画串）；中英键对齐由现有 `locale.test.ts` 自动强制（键集必须完全一致且 >80） |
| ⚠️ | ③ 的「耗时拆出去」会改变**所有皮肤**的行为（软卡/纸面不再逐秒模糊），不只是终端视觉。要单独过目软卡/纸面，确认这是想要的改善 |

### T4 ⬜ 工具分类色点

| 项 | 内容 |
|---|---|
| 位置 | `Reader.module.css` 终端段（纯 CSS） |
| 做法 | `⏺` 标记按 `.toolActivity[data-tool-category]` 取色；**`▸/✓/✗` 状态字形不动**，仍按状态取色（dsh-TUI 同样是「error 永远赢」）。宿主只有 4 族状态色可用且红色要留给失败，所以不硬凑 6 个色相：`terminal`（执行）→ `--dsw-alias-state-warn-primary`；`write`（改动）→ `--dsw-alias-state-business-primary`；`read` / `search` / `web` / `other`（只读）→ `--dsw-alias-label-tertiary`（保持安静） |
| 验收 | 6 皮肤×亮暗里重点看亮色：amber 500 在白底偏淡，不够时退 `state-warn-label`（amber 600） |
| ⚠️ | 修订不变式：reading-skins.md「颜色只给状态，工具名不上色」→「颜色给**状态**与**会改变什么**（写 / 执行）」。文档要同步改 |

### T5 ⬜ 右对齐数字列（补设计稿承诺但没实现的一列）

| 项 | 内容 |
|---|---|
| 位置 | `Reader.module.css` 终端段 |
| 做法 | ① `.toolHeading` 第三列（`.toolHeadingState`）→ 固定 `min-width` 制表列 + `justify-content: flex-end`，让每行 `±N` 与状态字共享右缘（列定义现为 `20px minmax(0,1fr) auto`）；② `.turnTail` / `.processMetaLine` 终端下改右对齐等宽读数行（`font-variant-numeric: tabular-nums`） |
| 验收 | 人工视觉：同一轮多行工具行的数字列右缘对齐；窗口宽度变化时不错位 |
| 说明 | reading-skins.md 的终端规格写了「右边右对齐的数字列（耗时、±行数、token）」，实现里只有 `.toolDelta { flex: none }`，并没有真正的列。这条是补齐规格 |

### T6 ⬜ 推理行 `✻` 呼吸

| 项 | 内容 |
|---|---|
| 位置 | `Reader.module.css` 终端段 |
| 做法 | `.reasonCard[data-following='true']` 时 `✻` 做 2s 呼吸（复用 `--think-shimmer` 这个既有时间常数），推理结束（`data-following` 去掉）即静止；reduced-motion / `data-motion=off` 下不动 |
| 验收 | 人工视觉：推理流式时 `✻` 在呼吸，结束后停住且不残留动画 |

### T7 ⬜ 文档、版本、构建产物

| 项 | 内容 |
|---|---|
| 做法 | ① `docs/design/reading-skins.md`：终端段补 v3 语汇（标题栏 / 光标 / 动词 / 分类色 / 数字列）；修订颜色不变式；「明确不做」补一条「实时 token 与上下文占用需要宿主 projection（token-meter / session-stats），明确不做」；② `CHANGELOG.md` 新增 0.8.0 条；③ `package.json` 版本 → **0.8.0**（若 0.7.4 先落地，本计划顺延，不并进 0.7.4）；④ `npm run build`，`lib/` 是**提交在仓库里**的构建产物，必须一起更新；⑤ 发布 tarball（仓库根有 0.4.6 起的 `dsh-deckseek-x.y.z.tgz` 惯例） |
| 验收 | `npm run build` 成功；`git status` 里 `lib/` 与源码一致 |

---

## 不破的不变式

- **React 不做皮肤分支**：新装饰件一律「始终渲染 + `aria-hidden` + CSS 按皮肤显隐」（reading-skins.md 的既有约定；唯一例外是装饰件视觉取代状态文字时，状态文字转 sr-only 保留可访问名）。
- **颜色只用宿主 token**，插件里不出现字面色值；`state-*` / `label-*` 当墨用，**表面 token 不当墨用**（0.6.3 的教训：`specific-bubble` 在暗色与卡片同色，图标直接隐身）。
- **动效仍受三重开关**：`data-motion`（插件设置项）、`prefers-reduced-motion`、`forced-colors` + `document.hidden`。新增动画都要各自写降级。
- **忙碌状态行仍在会话流内、不悬浮**（0.7.1 的决定：悬浮会盖住读者正在等的内容）。
- 三套皮肤共用一份 DOM；终端的所有新增都不得改变软卡/纸面的观感（T3 的耗时拆分是唯一例外，需单独过目）。

---

## 验证口径

```sh
npm run typecheck   # 基线 0 错误（2026-09-11 实测）
npm test            # 基线 110/110 通过（2026-09-11 实测）
npm run build       # tsc -p tsconfig.json && tsdown
```

> 注意：`reading-skins.md` 里写的「101 项测试」已过期，当前基线是 **110**。

新增用例（对齐现有 `*.client.test.tsx` + node:test + RTL 的写法）：

1. `pickStatusVerb` 确定性（同 key 同词；不同 key 能覆盖到多个词）——纯函数，零依赖。
2. `shortCwd` 纯函数（末两段、超长回退、`undefined`）。
3. `StatusText` 分片：恰好一个 `role="status"` 活区、装饰件 `aria-hidden`、`.statusClock` 文本独立于动画串。
4. 流式回答存在 `data-streaming` 钩子（真正的 CSS 光标位置验不了，只钉钩子）。
5. 动词文案的中英键对齐——现有 `tests/locale.test.ts` 强制键集完全一致且 >80，加键即触发。

**人工视觉验收（写进 PR 说明）**：3 皮肤 × 亮暗共 6 组各过一眼，重点
- 软卡 / 纸面**零回归**（T3 的耗时拆分是已知的行为变化，要单独确认）；
- 亮色终端下：`⏺` 分类色对比度、流式光标可见度、窗口边框与标题栏。

---

## 风险与退路

| 风险 | 退路 |
|---|---|
| 末块光标选择器在 markdown / 纯文本两条路径上形状不同，一条 CSS 命中不了 | 让最后一块在 React 里挂装饰 span（仍是始终渲染 + 按皮肤显隐） |
| 状态行在 header 里位于 `inline-flex` 的 `.disclosureButton` 内，没有整行宽度，「右对齐」只能退化成固定宽度制表 | 接受：目标是数字进位时不抖动；dock 变体（`align-self: flex-start`）下才真正靠右。**不为此改宿主布局** |
| 亮色主题下 amber 500 在白底偏淡 | 退 `--dsw-alias-state-warn-label`（amber 600） |
| 动词池被读成「随机噪音」而非「有节奏的状态」 | 动词只换工作相位的词、每轮固定一个，且思考相位保留语义标签；不合意时删掉 `statusVerb` 一处即可回退 |

---

## 明确不做

- 🟡 **实时 token / TPS / 上下文占用百分比**：需要新增 `@deepseek-ai/dsh-token-meter`、`dsh-session-stats` 宿主 peer 依赖与类型增强（原生 ContextMeter / StatsPills 走的是 `useProjection('contextPressure' | 'tokenUsage')`）。用户已定：不引入。
- 🟡 **卡住检测（stalled → 红）**：见上表理由，误报风险高。
- 🟡 **逐词打字机**：已有 `stream-buffer` + `word-timeline` 的按词揭示契约（DESIGN.md 的行为契约），不改。
- 🟡 **假 ANSI 色块 / 语法着色**：颜色仍只表达状态与「会改变什么」。
- 🟡 **底部输入框、`[y]/[n]` 确认、应用级状态栏**：宿主所有权（`ui-chat` composer、`interaction/user-approval`），插件拿不到 model / git / agent 数据。

---

## 版本

目标 **0.8.0**（视觉层新增一个次要版本，与 0.7.0 三皮肤同级的量级）。

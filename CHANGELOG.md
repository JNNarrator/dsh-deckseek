# Changelog

## 0.10.1 - 2026-09-14

0.10.0 交付后在真实宿主里对三套皮肤做了一次动态复核（新会话、真发消息、边流边看），问题清单在 [docs/design/ui-review-0.10.0.md](docs/design/ui-review-0.10.0.md)。这一版修掉清单上的 P1 全部四项与 P2 的前四项，并在修的过程中又实测出一处新的层级问题。

- **不再假报「处理中」**：无轮号的组（会话起始记录——系统提示、上下文注入、命令记录）没有相位可报，以前落进相位句的兜底分支，在一个早已跑完的会话里第一行写着 `In progress`/「处理中」，sr-only 活区还把它念一遍。现在这一组走中性标签「会话起始记录 / Session preamble」，规则抽成 `preambleLabel(turn)` 放在 `status-verb.ts`，测试钉住它永不与任何相位句同形。
- **工具栏吸顶**：`.toolbar` 与查找面板包进新的 `.topBar`，`position: sticky; top: 0` 加页面底色。以前往下滚一点，窗口栏读数与查找 / 动效 / 导出三个按钮全部滚出视野（实测 -270px）。三套皮肤实测均贴在滚动区顶（终端皮肤另加负外边距把这条带铺到窗口内沿，否则框内的 10px 边距会有内容从缝里滑过）。
- **小字对比度（亮色）**：11–12px 的次要文字原先取 `--dsw-alias-label-tertiary`，白底实测 3.70:1（AA 需 4.5:1；暗色同一 token 是 8.5:1）。新增插件层 token `--dx-ink-dim = --dsw-alias-label-secondary`，约 20 处文字声明改用它——实测亮色 **5.8:1**、暗色 12.11:1，两套主题都过。只需要 3:1 非文字标准的形状（导轨刻度、图标描边、终端字形）仍直接取宿主更暗的那两档。
- **「回到最新」不再压住正文**：按钮从列中央改到右缘，并在容器 ≥900px 时整体移出文字列（实测 1226 是文字右缘、窗口框内沿只有 1239，容不下一个按钮，故让它落在框外的栏位里）。修前修后同一位置实测：修前压住一段正文的框，修后与任何正文元素零相交。
- **修的过程中实测出的新问题**：吸顶栏被代码块的「Copy code」标题盖掉一半。宿主的代码块标题是 `position: sticky; top: 0; z-index: 6`，我们原来的 `z-index: 3` 与它抢同一个滚动区顶部，必然输。新增 `--dx-layer-chrome: 7` 作为插件浮动件的统一层级（工具栏、查找面板、导轨气泡、「回到最新」按钮），压在宿主内容层（≤6）之上、宿主自身 chrome（composer 7、宽度手柄 8、面板 10+）之下。
- **终端皮肤两处对齐**：用户底纹带的内边距改 12px 后，带内的 `>You` 段标落在 484，与回答文字左缘重合（修前 480，差 4px）；导轨刻度从框外 8px 收到 4px。
- **朗读不再在词中截断**：`role="log"` 的 180 字兜底原先硬切，实测切出 `byte-level pass-\nthrough for sam\ne-family proto`。现在先找句界限，找不到就退到最近的空白（离起点太近的空白不用，否则碎成片段），无空白的文字按限长切——视觉文本一直是对的，只有朗读受影响。
- **窗口栏轮数与导轨同口径**：宿主分页把首轮的用户消息移出加载窗口后，读数还按「解析出轮号的分组」算（4 轮），导轨只有 3 个刻度。读数改成数导轨自己锚定的轮次（`railTurns`），分页时读 `3+ 轮`，`+` 负责表示历史未载完。
- 测试 157 → **164 项**：新增 `railTurns` 口径 2、活区词边界 3、起始记录标签 2。

**未修**（需要另议落点，见复核文档 P2-5）：终端皮肤的空闲屏标识——宿主在空会话里渲染它自己的欢迎页，插件的三个页签要有内容才出现，那副点阵标识只在「阅读页渲染出零轮」时可见。

## 0.10.0 - 2026-09-14

这一轮来自与四个独立 TUI 的对照：[pi](https://github.com/earendil-works/pi)、[Codewhale](https://github.com/Hmbown/Codewhale)、[grok-build](https://github.com/xai-org/grok-build)、[herdr](https://github.com/herdrdev/herdr)。反馈是终端皮肤「很喜欢，但朴素了点」，对照的结论是：**缺的不是装饰，是常驻信息层**——四家全部有一条永远在的状态栏和一块有身份的启动屏，我们这两处分别是「流式时才出现的状态句」和「三行居中文字」。取的是机制，不是它们的配色（四套调色板一律不搬）。工作文档 [docs/design/terminal-skin-v4.md](docs/design/terminal-skin-v4.md)。

- **空闲屏有了身份**：一副三张叠起来的记录牌，用 **braille 点阵**画（一个字符 = 2×4 个点，6 行 × 15 格）。braille 是终端本来就有的点阵字母表，行数只有块状字符画的四分之一，且随读者的等宽字体自动适配；Codewhale 的空闲屏与 grok-build 的欢迎 logo 都是这个机制。同时照抄 grok 的降级纪律（高度不够就整块不画，我们把它限定成一个小图）。文案行加 `[提示]` 段标与 `> ` 提示符，段标机制来自 pi 的空闲屏。
- **窗口栏从「标题」变成「读数」**：路径右侧现在常驻 `12 轮 · 最新一轮 34 步`，历史未载完时读成 `12+ 轮`。数字只用插件已经持有的东西（分好的轮次、最新一轮的步数、`hasMore`）——四家在这一格都印 token / 花费 / 上下文占用，我们没有那个投影，也按既定决策不引入。窄列（520px）下整段隐藏，路径留到最后。
- **收尾读数行改「挂右」**：一条发丝线把左侧标签与右缘的数字拉开，形状取自 herdr 的配额行（`Codex > 5h ──────── 1% 4h17m`）。纯 CSS，行内多了一个 `::before`。
- **折叠的回合说清它藏了什么**：表头在折叠态追加 `8 次工具调用 · 3 个文件 · 1 次失败`（计数逐项为空则省略），展开即离场——grok 的 `+6 more tool uses`、Codewhale 的 `summary: N file(s), +a -d` 是同一件事。计数全部来自该轮自己的 flow；参数解析结果按 block/draft 对象身份做 WeakMap 缓存，与工具行自己的 `useMemo` 同一前提，且只在折叠态计算。这是本轮唯一**不做** `aria-hidden` 的新件：计数是信息，非终端皮肤下用 sr-only 隐藏像素、留给辅助技术。
- **用户回合变成整行底纹带**（pi 的用户行做法）：横向出血到窗口内沿，读起来是日志的一行而不是一个气泡。底是 `label-primary` 的 5% 中性色——宿主自己的表面阶梯在亮色主题里是平的（0.9.0 已记录），取文字色当底则亮暗都成立。为此新增 `--dx-frame-pad-x`，让出血量与列的 `padding` 共用同一个值。
- **两条契约测试入册**（来自 grok 与 Codewhale 的工程纪律）：
  - **每个字形都必须是一格宽**：`content:` 的值只允许一个字符 + 空格，且不得落在宽字/emoji 区段、不得带变体选择符。这条纪律对应的正是我们踩过的两次坑（`⏺` 被固定格裁成半圆、逐帧 spinner 因裁剪窗口被否）。
  - **状态永不只靠颜色**：解析终端皮肤的工具相位规则，断言六个相位各有字形、同字形的相位共用同一颜色、红色只出现在失败/中断上。
  - 另有点阵列宽契约：`tests/empty-mark.test.ts` 钉住「每行格数相等 + 只含 braille 码点」——braille 码位的东亚宽度是 Ambiguous，中文优先的字体回退下可能变 2 格宽，**每行等宽**保证它是等比变宽而不是撕裂。
- 测试 140 → **157 项**：新增点阵契约 4、帧读数与折叠计数 7、字形与状态色契约 2、折叠摘要组件 4。
- **实机验收修掉三处**（只有真机能暴露）：读数先是把所有分组当轮次（4 轮，宿主说 3）、改成「以用户消息开头」后又漏数（2 轮）——实测 DOM 才发现「首条消息之前的记录自成一个无轮号的组，而首轮自己的组里系统提示排在用户消息之前」，终稿按解析出的轮号计数；用户底纹带因基线 `align-self: flex-end` + `max-width: 84%` 只铺出右侧一小块，补 `stretch` / `max-width: none` 后实测 766px 齐窗口内沿；英文单复数补 `frame.toolsOne` / `frame.filesOne`（`1 file` 而非 `1 files`）。

## 0.9.0 - 2026-09-14

这一轮来自与 [DeepSeek-Reasonix](https://github.com/esengine/DeepSeek-Reasonix) 的对照：它的桌面端把**宿主自己的** `ui-chat` / `ui-primitives` 整套移植了过去（`desktop/frontend/src/components/harness-chat/README.md` 列了来源），所以改的是同一批原语、面对的是同样的约束，解法可以直接比。取的是机制，不是它的配色。

- **修纸面：回答的排版阶梯一直没生效**。`.markdown` 用 `font: var(--dsw-font-markdown-base)` 这个**简写**引入宿主阶梯，而简写会重置 `font-size`——皮肤在 `.answer` 上写的 17px 只作用到 chrome，每一段正文其实都是宿主的 14px。现在在 `.answer` 上重绑整条阶梯（`base` / `h1`–`h4` / `table` / `table-head`，整体 +3px，保持宿主原来的 +7/+5/+4 层级形状），并让宿主的字号增量随动。用户消息同样重绑一档（15/26）。
- **纸面：正文节奏按文章尺度重算**。宿主把 16px 段间距配 24px 行高；纸面的行高是 30，段间距随之到 20（维持同一比例），列表符号的行盒跟随 30px 正文行高而不是宿主写死的 28px。表格本就是 deepsuite 的书目体（表头 `border-l3`、行间 `border-l2`、无竖线无斑马），随阶梯放大。
- **纸面：推理改走单一左缘**。原来缩进 16px + 挂一条 `border-l2` 竖线——那是文档的引注语言，等于给页面加了第二个左缘。现在推理与正文同一条左缘，用本皮肤已有的"名签 + 牵到右缘的发丝线"开块；发丝线挂在名签「思考」上，所以读到的是 `思考 ────── 第 N 步`，步数落在右缘当页码，长推理也仍有"另一种文本从这里开始"的标记。
- **软卡：回答卡改用宿主自己的 elevation**。宿主其实有完整的一套（`--dsw-elevation-stroke` 的 0.5px 发丝描边 + `panel`/`prominent`/`soft` 三档几乎不可见的柔光；composer 用 `soft`、浮动钮用 `panel`、弹窗用 `prominent`），**分离由描边承担**——正是亮色主题缺的那件事。回答卡取 `panel` 并 `border: 0`（宿主约定：高层级表面不占布局），替掉此前手写的 `0 8px 24px rgba(0,0,0,.28)`。顺带说明：设计文档里"宿主没有 elevation token"这句是早期结论，0.9.0 已更正。
- **软卡：用户卡从品牌强调色派生身份色**（`color-mix(状态主色 10%, specific-bubble)` + 同色系 0.5px 内描边）。宿主那个 `specific-bubble` 填充是**中性色**（暗色 #2C2C2E），所以亮色主题下"所有表面都是白"时，用户卡与页面没有任何可分的东西——这是设计文档自己点过名的最容易糊处。
- **三套皮肤：家具跟着宿主的字号轴缩放**。宿主把正文字号做成 `body` 上的 `--dsh-content-font-size`（12–17，用户设置）+ `--dsh-content-font-delta`，而皮肤的字号写在 rem（跟浏览器缩放、不跟这个设置）——用户把正文字号调到 17px 时，文字变大而所有行高、前导格、块间距不动。现在这些"必须与文本行盒对齐"的尺寸统一读 `calc(基准 + var(--dx-font-delta))`。终端皮肤有意不参与：它的节奏是等宽行，行高本来就是 rem。
- **三套皮肤：逐皮肤焦点环**。软卡 4px 柔光环、纸面 4px 稍紧、终端 1px 硬环（终端不画光晕）。只用在内容层的四个控件上，其余仍是宿主的 2px 描边——焦点环是阴影，会被 `overflow: hidden` 的祖先裁掉、也会被系统强制色丢弃，所以还有一条 `forced-colors` 回退把描边放回来。
- **软卡：展开箭头改为悬停 / 键盘聚焦才出现**（展开时与触屏常显），卡片边缘少一件常驻家具。
- **新增 sheet 契约测试**（`tests/skin-css.test.ts`，静态检查 CSS 源码）：除 `var()` 兜底外**不得出现颜色字面量**（`McpAppFrame` 的沙箱帧是唯一白名单）；每个被 `var(--dx-…)` 读取的 token 必须声明过；每套皮肤都必须声明焦点环；`@keyframes` 名必须写在 `animation` 简写里。检查前先剥掉注释——注释里恰恰常引用"不许用的那个颜色"，第一版就误报了自己。测试 137 → **140 项**。

## 0.8.0 - 2026-09-14

- **终端皮肤 v3：从「等宽深色排版」做成「会呼吸的仪器面板」**。参考独立 TUI 插件 [dsh-TUI](https://github.com/ccch1mneyyy/dsh-TUI) 的机制，不抄它的配色（颜色仍是宿主 token）。六件事：
  - **窗口标题栏**：工具栏成为窗口自己的标题行——工作区路径在左（末两段，完整路径留在 hover），一条发丝线牵到右缘的控件。原先那行长文案转为 sr-only，可访问名不丢。
  - **流式光标**：正在写的回答末行带 `▌` 方波光标，落在最后一行文本的末尾（段落、标题、引用、列表末项、表格末格），回答定格后消失。
  - **状态行**：呼吸点 + 本轮的动词 + 右对齐的耗时。动词按轮次 key 确定性取词（同一轮的 header 与 dock 是两个实例，随机 state 会让它们显示不同的词）；只替换**工作**相位的句子，「正在思考中」保留原样——那个信号本身就是相位，不该被换成果味。窄列下先丢耗时，再丢动词。
  - **工具标记按类别取色**：`⏺` 执行命令 = amber、改动 = brand blue、只读 = 中性灰，红色留给失败；`▸/✓/✗` 仍按状态取色（失败永远赢）。颜色因此表达两件事——状态，以及「会改变什么」。这扩展了「颜色只给状态」的不变式（见 `docs/design/reading-skins.md`），但「工具名不上色」不变。分类色以继承 token 声明在 activity 上，嵌套工具树取自己最近的一处，不会被祖先的类别污染。
  - **右对齐数字列**：工具行第三列与结尾读数共享一条右缘——设计稿承诺过、此前只有 `flex: none` 顶替的那一列。
  - **推理 `✻` 呼吸**：推理跟随中做 2s 呼吸（与 `--think-shimmer` 同周期），结束后静止。
- **修忙碌状态行每秒抖一次**：`status.delving` 把耗时嵌在句子里，句子每秒变化，而 `StatusText` 的换字动画以字符串是否相等判断——于是每秒把整串滑 8px 并模糊一次。现在换字动画按**相位**判断（`swapKey`），秒数原地跳动，只有工作 ↔ 思考 ↔ 结束这类真实相位变化才播动画。三套皮肤都受益。
- 三处新增动效（光标 / 呼吸点 / 推理星）共享一组计时 token，`data-motion=off` 与 `prefers-reduced-motion` 各一处即可全部停下；两处新装饰件（窗口标题、状态行动词与耗时）仍是「始终渲染 + `aria-hidden` + CSS 按皮肤显隐」，React 里没有皮肤分支。
- **动画名必须写在 `animation` 简写里（教训入册）**：CSS Modules 会把 `@keyframes` 的名字哈希掉（`caretBlink` → `_073RcW_caretBlink`），但**不会**改写自定义属性值里的名字。最初把三处动画的简写整个塞进 `--dx-*-animation` token，构建产物里 `animation: var(--dx-caret-blink)` 引用的仍是未哈希的 `caretBlink`——三处动效会在真实构建里静默不动，而测试用的假 CSS loader（Proxy）恰好掩盖了这一点。现在 token 只装**计时**（`1s linear infinite`；停止态用合法的 `1s linear 0`——0 次迭代，动效不播但元素保持静态可见），动画名一律写字面量，并加了一条静态测试守住这条规则。
- 测试 120 → **137 项**：新增 `shortCwd`、`pickStatusVerb`（确定性、词池覆盖、不与相位标签撞词）、`StatusText` 分片（恰好一个活区、装饰件不进可访问树、秒数不重播动画）、流式光标的 DOM 前提（Markdown 末块是文本元素、`.blocks[data-streaming]` 钩子）、以及上面那条 keyframes 引用规则的静态检查。

## 0.7.4 - 2026-09-11

- **修终端皮肤工具行的 `⏺` 只剩半个圆**：宿主 `DisclosureRow` 的前导格固定 16px，而终端在这一格里放了两个字形——`⏺` 标记加 12px 状态字形，实测约 23px。溢出的部分被该格的居中排布平分到两侧，左侧那半悬出行盒，又被行盒自身的 `overflow: hidden` 裁掉，于是 `⏺` 只剩右半。现在这一格按内容取宽（下限 28px）并左对齐：字形再宽也只是把格子撑开，不会重演裁剪；标记与展开后的箭头共用同一条左缘，展开时不跳。
- **修终端皮肤贴底时的过大留白**：终端画了窗口边框后，软卡那套"按 composer 高度推导"的底部留白在边框下读起来像一圈画歪的边距。在真实界面上量到两处 1:1 —— 窗口下边框到输入框卡片上沿的距离，正好等于根节点预留的这段空间（下限生效时 56px、公式值生效时 66.5px）；宿主本身已经预留了输入框卡片的高度，`--dsh-composer-height` 又多算了状态行与外边距，再推导一次就是重复留白，composer 变高时还会跟着变大。终端改为给一个定值，且就是皮肤自己的块间距 `--dx-gap-block`（8px）：窗口被当成一个块，用一条终端行距收尾。软卡 / 纸面维持原公式不变。
- **并入 R4/R5 线**（并行线上的 0.6.1，作者 wangXuanding2003，2026-09-08；本次分叉合并并入）：**会话导出 Markdown（R4）**——阅读页工具栏新增「导出」，一键把本轮会话下载为 Markdown，与阅读视图同一文本抽取管线（提问 + 回答按显示顺序、执行过程保持折叠），同轮多段回答合并为单一标题，文件名带时间戳 `deckseek-export-YYYYMMDD-HHmm.md`；**轮次键盘导航（R5）**——Alt+↑ / Alt+↓ 在用户消息之间跳转，沿用导轨的视口规则、平滑滚动、落点闪烁与 pending 锁，被窗口折叠的消息沿按键方向顺延，输入框 / 查找框内不触发。

## 0.7.3 - 2026-09-11

- **修「加载更早记录」点了没反应**：阅读视图只渲染最后 15 轮，更早的折成「展开更早的 N 轮」占位符；而宿主的翻页按钮取回的一整页全部早于这个窗口，于是内容刚取回来就被窗口切掉，按钮看起来是死的。现在显式加载成功后会撤掉渲染窗口，把宿主已加载的轮次全部渲染。被动窗口（尚未加载的历史）与滚动靠近自动展开的行为不变。
- 原生对话渲染全部已加载节点、没有这个窗口，它是插件自己的渲染上限；与宿主翻页叠加后互相抵消，是这次失效的来源。

## 0.7.2 - 2026-09-11

- **终端皮肤按终端重做**：整列等宽（此前只有工具行和控件是等宽）、外面加一圈窗口边框、输入行改成 `> ` 提示行——原来的淡底 + 左色条 + 头像都属于气泡语义，与"不要气泡、头像、卡片和阴影"冲突，已全部去掉；工具行 `⏺` 起头、结果块挂 `⎿`、思考行标 `✻`；插件两条投影 token 在终端皮肤下解析为 `none`。
- **修掉终端皮肤从未生效的密度**：`--dx-gap-block: 8px` 从 0.7.0 起就声明了，却没有任何规则消费它，所以块间距一直继承软卡的 22/16/16——这是"空隙太大"的来源。现在 `.column` 真正用它，轮次间距 4、组内 5。

## 0.7.1 - 2026-09-11

- **忙碌状态行回到会话流**：「深度求索中…」此前用 `position: sticky` 悬浮在阅读区底部并带 `z-index`，盖在正文之上；现在它是本轮最后一个元素，跟在最后一块内容之后、随滚动离开视口。与原生对话把 `role="status"` 放在消息列表末尾的做法一致。
- **纸面皮肤重做用户消息与回答的区分**：原先靠"26px 小槽位里的灰色小字「你」+ 正文缩进 40px"，左缘参差、标签又太安静，看着像排版错位而不是"轮到我说"。现在取消缩进、恢复单一左缘，名签「你」独占一行并牵一条发丝线到右缘开轮；用户正文保持 15/26，与回答 17/30 的字号落差不变。

## 0.7.0 - 2026-09-11

- 三套阅读皮肤：纸面（排版流）、软卡（卡片）、终端（行列），在 DSH 设置的独立 DeckSeek 页里切换，即时生效。
- 皮肤只表达结构、密度、字体与圆角；颜色全部取自宿主主题 token，亮暗主题自动适配。
- 软卡取代 0.6.x 的统一卡片体系：移除左缘色条，回答卡以填充 + 描边 + 投影承担层级。
- 默认皮肤为软卡。

## 0.6.4 - 2026-09-10

- **失败卡配色重做**：底色改为 `color-mix(red-500 @ 10%)`（red-500 = rgb(239,68,68)，宿主静态色阶自带）、色条/标题同用 red-500；正文不再整卡红字——标题红色、错误正文用普通墨色 + 等宽字体，对比度回升
- **TRANSPORT 类错误码改徽标**：随标题同行的小徽标（等宽、次级色、芯片圆角），不再独占一行
- **主次分层**：记录档（工具行、未知记录、系统提示、已思考 meta、轮次统计）底色降到宿主 layer-1（暗色 #232323，介于页面与内容卡之间）+ 细边框（`border-l1`，暗色 rgba(255,255,255,0.06)）；内容档维持 `module-platform`。灰色块不再一片平
- **排版**：小标题更小更淡（meta 行 0.6875rem/tertiary，状态字 tertiary）；错误正文、TRANSPORT、token 统计改等宽字体；状态卡行高 1.375→1.5rem；"思考与过程"的时间轴竖线加粗到 2px
- **已思考默认折叠**：已关闭回合的推理卡默认只显示标题行（思考 · 步骤 N + 展开按钮），点击展开全文；进行中的回合保持跟随预览不变
- 移除因此失去引用的文案键 `reasoning.scrollable`

## 0.6.3 - 2026-09-10

- **修复：用户卡图标不可见**。第一版给图标和左缘色条上色用的是 `specific-bubble`——那是气泡的填充色：暗色主题下它是 `bluish-850`，与卡片底色 `bluish-800` 只差 5 个色阶，"人"标识整体隐身，卡片左侧留出一大段空当，文字看起来像被推到右边。现图标改用 `label-secondary`（两个主题都有对比度），用户卡底色恢复 `specific-bubble` 填充作为身份标识，去掉隐形的色条。教训入册：图标/色条是"墨"，只能用 `label-*` / `state-*`，表面填充 token 不能当墨用

## 0.6.2 - 2026-09-10

- **统一卡片体系（第一版）**：阅读区全部元素改用同一套卡壳——同样的圆角、同样的左缘色条位置、同样的边框规则，只按三档改变体量与色彩权限。圆角从 8 种取值（6/7/8/9/12/16/22/50%）收为 3 级：卡片 12、卡内面板 8、芯片 6
  - **内容档**（12/16）：用户消息（原气泡改卡片，左侧「人」图标 + 气泡色色条）、回答、推理（中性色条）
  - **记录档**（8/12）：工具行整块成为卡片（原为透明行）、工具详情面板、未知记录、系统提示、轮次统计与 meta
  - **状态档**（10/14）：失败卡（错误色条）、notice（中性色条）、待确认（业务色条）
  - **卡内面板降级**：工具详情、原始 JSON、未知记录预览、系统提示正文、图片帧改为 `bg-base` + 边框，与卡片底色错开一层（此前同用 `module-platform`，卡片一换底色就会糊成一片）
  - 色条用内阴影实现，不用 `overflow: hidden`——回答卡的复制芯片悬浮在卡片边界外，裁剪会把它切掉
  - 设计依据与待调点：`docs/design/unified-card-system.md`

## 0.6.1 - 2026-09-10

- **失败卡提示去重**：卡片上的「详情保留在执行记录中。」只在本轮没有底部终态行时出现——此前一张卡片一句、底部状态行再来一句，同一屏最多说三遍；重试提示里重复的同一句尾句一并移除
- **失败卡标题带工具名**：显示为「工具执行失败 · edit」，此前单独一行只有工具名（非 shell 工具没有退出码/信号时，那行退化成裸工具名，等于空白信息）
- **工具行路径接会话工作区**：工作区内的路径显示为相对路径。此前 `toolRowModel` 从未收到 `cwd`，缩写函数拿到 undefined 直接原样返回，长绝对路径在相邻两行里重复
- **失败卡更紧凑**：内部改为 flex 定距（6px）并清零段落外边距，消除标题/正文/提示之间的双重间距

## 0.6.0 - 2026-09-08

- **字符级搜索高亮（R2）**：所有查询出现位置经 CSS Custom Highlight API 精确染色，当前出现蓝底反白；计数升为真实出现次数；块级淡底保留为第二层
- **rem 字号化（R3）**：阅读视图全量字号/行高转 rem——宿主或浏览器字号缩放即时生效（几何保持 px，native 覆盖层不动）
- **复制按钮悬浮化**：从独立行改为悬浮于卡片右上角的芯片（hover/聚焦浮现，自带底色保证可读），回答区信息密度提升

## 0.5.0 - 2026-09-08

- **长会话尾部窗口**：打开长会话时只渲染最近 15 轮，更早轮次折叠为一行占位；滚动接近或点击"展开更早的 N 被轮"即自动展开（插入高度已做滚动位置补偿）。首开/内存成本不再随历史线性增长
- **MCP App 提示词作用域修复**：回车发送/填充现在定位同一会话视图内的 composer（此前取页面第一个 textarea，多视图时可能填错）
- **搜索索引懒建**：仅在查找面板打开时构建（此前每次节点增减都全量重建）

## 0.4.9 - 2026-09-08

- **长会话性能（#5）**：回合组件改为按节点身份的浅比较订阅——流式 chunk 只重渲染活跃回合，其他回合全部跳过（此前每个回合组件都整快照订阅、全量重渲染）；100+ 步会话的流式渲染成本从 O(回合数) 降为 O(1)
- **渲染路径打磨**：思考卡跟随动画的 rAF 帧不再每帧强制样式重算（--reason-preview-height 缓存）；导轨滚动帧的锚点查找从逐帧全量扫描改为按列表缓存
- **开发探针**：`localStorage.setItem('deckseek-probe', '1')` 开启回合渲染计数（窗口标题实时显示），用于性能观测

## 0.4.8 - 2026-09-08

- **回答卡片**：回答正文与复制按钮包进与思考卡/工具卡同语言的卡片容器，一轮对话呈"用户气泡 → 控件行 → 回答卡 → 统计小字"的清晰层级；复制按钮改幽灵样式固定到卡片右下角
- **发送后自动回底**：发送或插话消息后阅读视图自动跳回底部并接管贴底跟随；历史加载与初始挂载不触发
- **Cmd/Ctrl+F 直达查找**：阅读视图内快捷键打开搜索面板并聚焦输入框（Esc 关闭保留）
- **搜索全匹配高亮**：搜索期间所有匹配块常驻淡底，当前命中保持描边闪烁
- **导轨刻度自适应**：回合多时刻度自动压缩排布保持全部可见，超出压缩下限才回退滚动
- **加载更早记录骨架屏**：加载历史时显示脉动占位行
- **样式收尾**：markdown 图片限高 60vh + 边框、轮次统计与卡片内文对齐、轮次间距 16px、空会话品牌化空状态、i18n 与无障碍补漏（详见 ui-style-fixes.md）

## 0.4.7 - 2026-09-08


- **i18n completion** — five hard-coded Chinese strings now route through the locale dictionary: the tool detail notes (returned / media / empty), the unknown-tool fallback label, and the unknown-record array prefix and empty-object summary (which previously duplicated the prefix in English UIs, e.g. "数组 · Array · N items"). The message-rail label reads "Message navigation" in English, and MCP Apps now hand their language (`zh-CN` / `en`) to sandboxed frames instead of always initializing in Chinese.
- **Screen-reader polish** — the thinking / delving status no longer re-announces the ticking clock every second (the live region announces the static phase label instead); streamed answers are announced through a sentence-aware `role="log"` region with the reading area marked `aria-busy` while streaming; the MCP receipt and transient notices are announced via `role="status"`; the reasoning region uses the pre-built localized scrollable label.
- **Keyboard & roles** — the message-rail list is keyboard-scrollable (`tabIndex` + region), the toolbar carries `role="toolbar"` with an accessible label, the search navigation buttons have accessible names, and coarse-pointer devices get a larger rail hit target.
- **Copy feedback unified** — answer / record copy actions share one receipt pattern with timer cleanup on unmount; the bottom-left status dock text is selectable again.

## 0.4.6 - 2026-09-08（有缺陷，请勿使用）

- 该版本的 client bundle 遗漏了 `@deepseek-ai/dsh-util-workspace-path` 的内联（构建环境缺 harness 包产物导致外部化），在 Desktop 加载失败。已被 0.4.7 取代；如需可在 npm 网页端用账号 OTP 撤销。

- **i18n completion** — five hard-coded Chinese strings now route through the locale dictionary: the tool detail notes (returned / media / empty), the unknown-tool fallback label, and the unknown-record array prefix and empty-object summary (which previously duplicated the prefix in English UIs, e.g. "数组 · Array · N items"). The message-rail label reads "Message navigation" in English, and MCP Apps now hand their language (`zh-CN` / `en`) to sandboxed frames instead of always initializing in Chinese.
- **Screen-reader polish** — the thinking / delving status no longer re-announces the ticking clock every second (the live region announces the static phase label instead); streamed answers are announced through a sentence-aware `role="log"` region with the reading area marked `aria-busy` while streaming; the MCP receipt and transient notices are announced via `role="status"`; the reasoning region uses the pre-built localized scrollable label.
- **Keyboard & roles** — the message-rail list is keyboard-scrollable (`tabIndex` + region), the toolbar carries `role="toolbar"` with an accessible label, the search navigation buttons have accessible names, and coarse-pointer devices get a larger rail hit target.
- **Copy feedback unified** — answer / record copy actions share one receipt pattern with timer cleanup on unmount; the bottom-left status dock text is selectable again.

## 0.4.4 - 2026-09-06

- **Fixed: new sessions now actually open on DeckSeek** — the entry registration ran once at plugin load, before the host declared its session body, found no conversation store and silently gave up for every future session. The dock entry now registers reactively when the host's `conversation.session` slot materializes (`slots.subscribe`), so any session without an explicit tab choice — new sessions included — lands on the reading view.

## 0.4.3 - 2026-09-06

- **Tighter end-of-turn spacing**: the bottom clearance deduction is now 120px (was 48px) with the same 56px floor and 45vh ceiling — after a turn finishes, the gap between the last content and the composer / collapsed task bar shrinks by roughly a third without hiding content behind them.

## 0.4.2 - 2026-09-06

- **Tall overlays no longer hollow out the page**: the bottom clearance is capped at 45vh, so pending questions, plan task lists and other states that grow the native composer keep their extra height without leaving a huge empty gap under the reading content.
- **"深度求索中… {time}" running status**: every busy state of an open turn (tools running, preparing, streaming output) mirrors the native umbrella label with a live elapsed clock in both languages — 深度求索中… {time} / DeepSeeking… {time}; the thinking brand label keeps its own wording.
- **"+N -M" diff stats on write/edit rows**: write and edit tool rows now show the line change counts from the settled diff record, matching the native rows.

## 0.4.1 - 2026-09-06

- **New sessions open on DeckSeek by default**: the reading view is the default tab for any session whose user never made an explicit tab choice — previously only the very first session observed after app start got the entry decision. The policy re-arms per session, explicit tab choices are persisted per session (`dsh.conversation.{sessionId}`) and always respected, and the `?reader=1` entry links keep working.

## 0.4.0 - 2026-09-06

- **Message navigation rail redesigned**: a minimal right-edge rail of tiny pill marks (one per user message) in the editor-minimap style — the reading column stays truly centered, the active mark widens and highlights, hovering shows a styled info bubble ("第 N 轮 · title"), and clicking scrolls that message into view (hidden on narrow widths).
- **Reliable message jumps**: a jump lock keeps the reading-scroll anchor compensation from fighting the smooth scroll, so rail / back-to-latest jumps no longer land short, get canceled, or freeze the highlight; the clicked mark keeps the highlight until you scroll on your own, a blue flash marks the landing message even for very short jumps, and at the document end the newest message owns the highlight.
- **No duplicated tool output**: successful tool text results stay inside the folded execution record only — they used to render again in the answer flow, collapsing newlines into giant paragraph walls.
- **Search polish**: the find panel always opens fully in view (scroll-anchoring no longer clips it under the app chrome), and matches scroll the conversation port to the exact hit element with a visible flash instead of doing nothing when the owning message was huge.
- **Back-to-bottom button visible**: the centered ⬇ button now floats above the composer (it used to be pinned behind it by the sticky offset) — auto-follow still never detaches permanently on ordinary button focus.
- **Accessible streaming text**: the reasoning transcript reaches assistive tech as one plain text node instead of hundreds of per-word animation spans.
- **Copy answer chip**: the copy-answer action got a bordered chip style instead of a bare floating icon.
- **All known chat record kinds adapted**: the reading view now renders `system-prompt` (collapsed disclosure with the model-facing text), `turn-process` (one-line process summary mirroring the native labels: tool calls / messages / subagents) and `turn-tail` (compact usage/time stats) natively.
- **Improved unknown-record fallback**: unknown kinds render as a card with a friendly title, content preview or field summary, a copy action and the full raw record — kept because DSH is pre-stable and may add new record kinds.
- **Unified failure cards**: failed tools, commands, compactions and turn errors render as consistent error cards with the reason, exit code / signal / error code, a "details kept in the execution record" hint and an expandable raw record; retry notices share the same wording.
- **In-view search**: live keyword search over user questions and assistant answers — match counts, previous / next navigation, and a flash highlight on the hit block (Enter / Shift+Enter / Esc).
- **Reading position memory**: the reading view remembers the scroll position per session (sessionStorage) and restores it with a short notice.
- **Copy enhancements**: code blocks copy in one click; settled tables reveal a "Copy as CSV" button (RFC 4180 with quoting of commas, quotes and newlines).
- **Bilingual UI (i18n)**: every reading-view string follows the DSH app language via the `<html lang>` marker — the reading tab, toolbar, turn/process status, failure cards, unknown-record cards, tool activity, reasoning controls, MCP app chrome and copy/export labels (Chinese / English dictionaries kept in parity by unit tests).
- **Thinking follow settled**: following cadence tightened to two lines every 360ms, and the card settles at the very end when the reasoning finishes; the bottom clearance above the composer is smaller while still clearing goals/plans.
- **Busy label with elapsed time**: the open-turn status shows "大肥鱼正在思考中… {time}" / "BigFatFish is thinking… {time}" with a live clock, in both languages.
- **No duplicated failure text**: failed tools no longer render the error text twice (failure card + raw text block); the result panel points to the failure card instead.
- **Category tool states**: running/done labels per tool family — 正在阅读/已阅读 Reading…/Read, 正在搜索/已找到 Searching…/Found, 正在写入/已写入 Writing…/Written, etc., in both languages.
- **Reading tab renamed "DeckSeek"**: the independent view tab now carries the plugin brand in both languages.
- **Thinking follow pins above the composer**: the reading column reserves the native composer height at the bottom, so the followed card sits cleanly above the input region instead of leaving a blank band below it.
- **Thinking card shows card chrome from the first line**: removed the borderless "plain text" phase that made early/short thinking look like a raw string before the card frame appeared.

## 0.3.0

Renamed fork release (formerly `dsh-better-display`, now **`dsh-deckseek`**).

- **Rename**: plugin id, manifests (`package.json`, `package-lock.json`, `dshx.yml`, `cordis.yml`, `cordis.patch.yml`), entry module (`src/dsh-deckseek.ts`), loading marker, client name, extension slot and docs now use `dsh-deckseek`.
- **Repository metadata**: `repository` / `homepage` / `bugs` and install instructions point to `JNNarrator/dsh-deckseek`.
- **Fork declaration**: bilingual README and `THIRD_PARTY_NOTICES.md` record the fork of `aa2246740/dsh-better-display` (MIT) and independent maintenance by JNNarrator.
- **Extension slot renamed** `dsh-better-display.block` → `dsh-deckseek.block` (breaking change for third-party slot consumers; documented in DESIGN.md).
- Baseline features unchanged from 0.2.0 (generative MCP Apps / SEP-1865, adaptive theming, reading view).

## 0.2.0

Adds native generative MCP Apps (SEP-1865) support and rich interactive rendering.

- **Generative MCP Apps**: auto-detect ````mcp-app` code blocks (or `mcp-app` custom blocks / `render_ui`/`show_widget` tool results) and mount them as live, interactive cards.
- **Sandboxed iframe**: `sandbox="allow-scripts allow-forms"` without `allow-same-origin`, `referrerPolicy="no-referrer"` — full isolation from host cookies/tokens/DOM.
- **SEP-1865 JSON-RPC bridge**: `ui/initialize`, `ui/resize`, `ui/submit` / `ui/update-model-context`, plus live `host-context-changed` theme broadcasts.
- **Bidirectional feedback**: user interactions produce a natural-language prompt written straight into the composer via React 18 native setter (instant, no stale-DOM whitespace).
- **Live dark/light sync**: MutationObserver + matchMedia drive instant re-theming with zero first-frame flash.
- **Pixel-perfect auto height**: content-bottom bounding-box measurement + ResizeObserver; 60px–2400px smooth grow/shrink, no double scrollbars or wasted whitespace.
- **Redesigned minimal container**: removed protocol/status chrome, 14px-radius subtle card, icon-only reset.
- **Skill pack**: `skills/generative-mcpapps/` with SKILL.md, protocol reference, HTML boilerplate template, and interactive quiz example.
- **Docs**: bilingual `README.md` / `README.en.md`; DESIGN.md contract updated.
- 49 regression tests.

## 0.1.0

First public release of the accepted reading-view plugin, published as `dsh-better-display`.

- Native context and tool details with source-ordered, unmodified reasoning.
- Bounded long-reasoning cards with two-line following, expanded follow and manual pause/resume.
- Successful-turn process folding with a separate final answer.
- Source-ordered text reveal and quiet busy-state shimmer.
- Stable status typography and compact disclosure spacing.
- Native content fallbacks and a trusted-plugin block extension slot.
- 42 regression tests; no changes to DSH Agent, SDK, providers or core.

# Changelog

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

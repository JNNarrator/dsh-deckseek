# UI 布局/样式修复计划与进度

> 工作文档：跨机器续作用。每完成一批就更新状态并提交推送，`git pull` 后从第一个未完成项继续。
> 审查来源：2026-09-07 布局/样式专项审查（30 条）。行号为审查时快照，可能有 ±3 行漂移。

**进度总览：批次 A（高）✅ 已完成 · 批次 B（中）✅ 已完成 · 批次 C（低）✅ 已完成**

> 2026-09-07 三批全部完成：typecheck 0 错误、npm test 83/83。纯视觉项（圆角/间距/对比度）建议在本地 DSH 里过一眼。
> 实施中的两处计划修正：① rail 隐藏的 `.root::before` 占位改为真实 `.railSpacer` 元素（container query 无法命中容器自身的伪元素）；② 600/640 两个断点保持独立阈值，但 rail 一侧已改 `@container`。

图例：⬜ 待修 · 🔧 进行中 · ✅ 已修 · 🟡 部分/有意不改

## 验证口径（每批结束都跑）

```sh
npm run typecheck   # 0 错误
npm test            # 全部通过（当前基线 83 条）
```

纯 CSS/视觉改动无法被现有测试覆盖的，在对应条目标注"人工抽查点"。

---

## 批次 A：高优先级（真功能缺陷）

| # | 位置 | 问题 | 修复 | 状态 |
|---|---|---|---|---|
| A1 | `markdown/MarkdownText.module.css:189-198` | 宽表格静止态 `overflow-x: hidden`，仅 hover 恢复；触屏永远看不全超出列 | `@media (pointer: coarse)` 下 `overflow-x: auto` | ✅ |
| A2 | `markdown/MarkdownText.module.css:311-330` | 表格复制按钮 `opacity: 0` 仅 hover 显形，触屏不可见 | coarse 指针下常显 | ✅ |
| A3 | `markdown/MarkdownText.module.css:146-156` | 行内代码 `inline-flex` 原子盒，长 token 溢出窄列 | `inline-block; max-width: 100%; overflow-wrap: anywhere; white-space: break-spaces`（换行而非滚动，避免 inline-block 滚动容器的基线问题） | ✅ |
| A4 | `Reader.module.css:294-295` | rail 隐藏用 `@media 640px`，分屏窄列时误判（.root 已是 container） | 改 `@container (max-width: 640px)`；`.root::before` 占位改为真实 `.railSpacer` 元素（container query 无法命中容器自身伪元素） | ✅ |
| A5 | `Reader.module.css:41,294` | 工具条无 wrap，<360px 溢出；media 600 的 20px 覆盖宿主侧边距变量 | `flex-wrap: wrap`；`padding-inline: max(20px, var(--dsh-composer-side-clearance, 16px))` | ✅ |

人工抽查点：手机模拟器/DevTools 触屏模式看宽表格滚动、行内长代码换行、窄容器 rail 是否隐藏。

## 批次 B：中优先级（布局打磨）

| # | 位置 | 问题 | 修复 | 状态 |
|---|---|---|---|---|
| B1 | `Reader.module.css:137,287` | statusDock 与 jumpDock 窄屏重叠（both sticky，偏移差 8px） | `.column:has([data-reader-status-dock]) .jumpDock` 提到 dock 之上（composer+52px），dock 不在时维持原位 | ✅ |
| B2 | `Reader.module.css:261` | 搜索栏不 sticky，跳转后 ↑↓/计数滚出视口 | `position: sticky; top: 0; z-index: 3` + 既有不透明底色 | ✅ |
| B3 | `Reader.module.css:16,137,287` + `ReasoningCard.tsx:54,252` | composer 高度 152px 五处硬编码、CSS/TS 双份 | `.root` 定义 `--dsh-deckseek-composer`，CSS 全量引用；TS 改从 port 读该变量（host 在 .root 外读不到） | ✅ |
| B4 | `Reader.module.css:43,271,284,293` + `McpAppFrame.module.css:139-152` | 触控目标普遍 <44px（搜索 ↑↓×、复制、重试、关闭预览、sendKbd） | coarse 指针统一 `min-height/min-width: 44px`（railItem 维持 28×26：超出会破坏 minimap 布局，已记录） | ✅ |
| B5 | `markdown/MarkdownText.module.css:273-282` | markdown 图片无高度上限，长截图独占整屏 | `max-height: 60vh`（object-fit 已有） | ✅ |
| B6 | `McpAppFrame.module.css:87,70,151` | iframe 包裹层 transition height（resize 每帧 reflow）；两处 `transition: all` | 高度过渡移除（附注释）；`all` 改 `background-color, color` | ✅ |
| B7 | `McpAppFrame.module.css:13,36-37,45,66,74-75,103,126,144-146` | 回退色是 Tailwind 体系、深色 hover 阴影不可见、receipt token 与回退色矛盾 | hover 阴影走 `--dsh-reader-shadow-float`；receipt 回退色对齐 business-primary（其余裸色值确认仅为 var() 回退，保留） | ✅ |
| B8 | `markdown/MarkdownText.module.css:225-243` | 表格单元格缺 `overflow-wrap`；max-width 声明重复（死代码） | 补 `anywhere`；删重复行 | ✅ |
| B9 | `Reader.module.css:244,251,260,161` | 折叠滚动帽 141/180/240/400 四个魔法数（agent 报告的 ContextBody:52 实为误报，141 只在 systemPromptBody） | 抽 `--dsh-reader-code-max-height`（180），unknownPreview 用之；141/240/400 为有意特例并加注释 | ✅ |
| B10 | `Reader.module.css:164` | container 420 的 `padding-left: 33px` 是 16+7+10 像素算术 | 改 `calc(16px + 7px + 10px)` 并注释来源 | ✅ |
| B11 | `Reader.module.css:234` | `.stopped` 11px tertiary 灰底，对比度存疑且是重要状态 | 升 `label-secondary` / 12px | ✅ |
| B12 | `markdown/MarkdownText.module.css:66-72` | forced-colors 把链接透明命中边框画成实线框 | 透明 border 改 padding + 负 margin（盒尺寸不变，forced-colors 下无幻影边框） | ✅ |

人工抽查点：窄屏 dock/⬇ 不重叠；搜索跳转后工具栏常驻；iframe resize 无整列抖动；深色下 MCP 卡片 hover 有反馈。

## 批次 C：低优先级（体系化打磨）

| # | 位置 | 问题 | 修复 | 状态 |
|---|---|---|---|---|
| C1 | `Reader.module.css:34` | railDash 过渡 width（布局属性） | `transform: scaleX(0.667)` ↔ none + origin center | ✅ |
| C2 | 两份 CSS 多处 | 圆角 4/5/6/7/8/9/10/11/12/14/16/22 十一档混用 | 收敛为 6/8/12/16；pill（railItem/railDash/user/jump）保留 | ✅ |
| C3 | `Reader.module.css:146,152,161,244,251,260` | 等宽字体栈三套并存 | 统一 `var(--ds-font-family-code, <完整栈>)` | ✅ |
| C4 | `Reader.module.css:39,288` + `McpAppFrame.module.css:13` | 阴影两套体系 | 抽 `--dsh-reader-shadow-pop/float` 统一 | ✅ |
| C5 | `Reader.module.css:28` | railList 隐藏滚动条且无"下面还有"提示 | hover/focus 显示 thin 滚动条 + 边框色 scrollbar-color | ✅ |
| C6 | 全部 button 类 | 无 `:active` 按压态 | textButton/historyButton/iconButton/jump/dialogClose 补 `:active` | ✅ |
| C7 | `markdown/MarkdownText.module.css:163-167` | katex-display 横向滚动缺 `overscroll-behavior-x: contain`（tableScroll 已有） | 补齐一致 | ✅ |
| C8 | `Reader.module.css:281,284` | imageDialog 顶部 38px padding 是为关闭钮让位的魔法数 | 改 flex column 布局，关闭钮回流到右上 | ✅ |
| C9 | `Blocks.tsx:57-60` + `McpAppFrame.tsx:229-240` | 加载态偏简（图片纯文字、iframe 纯空白） | iframe ready 前加 pulseDot 占位（复用现成动画）；图片占位保持现状 | ✅ |

## 有意不改（记录原因）

| # | 位置 | 内容 | 原因 |
|---|---|---|---|
| S1 | `Reader.module.css:4-5` 及全文 px 字号 | 字号不随宿主字号缩放 | 全量 px→rem 机械改动面过大且无宿主字号变量可依；浏览器/系统缩放已可用。留待宿主提供字号变量后再做 |
| S2 | `Reader.module.css:27` | rail sticky top:12px 未考虑宿主 fixed 头部 | 宿主未暴露头部高度变量；当前桌面版无遮挡实例。等宿主变量出现再引用 |
| S3 | `motion.tsx:134,171` + `ReasoningCard.tsx:267` | WAAPI 手风琴动画动的是 height（布局属性） | 有意的展开/退役模式，cancel/fill 清理干净；长列表出现卡顿时再改 transform 方案 |

---

## 容器感排查（2026-09-08 第二轮）

**结论**：一轮对话里只有回答正文裸排在背景上（用户消息有气泡、思考/工具/失败/通知全有卡片）——补一张"回答卡片"即可成立包裹感。

| 元素 | 现状 | 处理 |
|---|---|---|
| 回答正文 `.answer`（含复制按钮） | 裸文本 | ✅ 加标准卡面（bg-module-platform + border-l2 + 12px 圆角 + padding 12/16） |
| 复制按钮 | 卡内左下、边框盒与卡同底色显歪 | ✅ 幽灵样式（去边框盒）+ `row-reverse` 固定到卡片右下角 |
| 轮次间距 `.turn + .turn` | 12px | ✅ 16px（卡片化后呼吸感） |
| 轮次统计 `.turnTail` | 裸小字 | ✅ padding-left 16px 与卡片内文对齐（保持裸排，元数据语义） |
| markdown 图片 `.image` | 无边框 | ✅ 加 border-l2 与附件图统一 |
| "已思考"折叠头 / 思考中状态标签 | 裸控件行 | 有意保留（控件语义，镜像原生） |

注意：多段回答（工具穿插）会渲染多张同面卡片，与 ChatGPT 的内联工具卡节奏一致；流式时卡片首帧即在，无跳变。

**行为追加（同轮）**：发送/插话消息后阅读视图自动回底（`Reader.tsx` 监听尾部节点——新尾部为用户消息即调用既有 `scroll.jump()`，回弹锁保证贴底跟随接管；初始挂载与历史加载不动尾部，不误触发）。

---

## 界面整体优化路线（2026-09-08 立项）

> 全界面排查后的 8 个优化点，按性价比排序。图例：⬜ 待做 · 🔧 进行中 · ✅ 已完成 · 🗄️ 暂缓。
> 边界说明：侧边栏/标签栏/底部统计条/输入框为 DSH 原生 chrome，插件无权改动，不在本路线内。

| # | 优化点 | 价值 | 成本 | 状态 |
|---|---|---|---|---|
| 1 | **新会话空状态**：DeckSeek 页签首屏品牌化空状态（标识 + 开始提示 + 能力一句话），替代空白 | 首屏观感 | 低 | ✅ 已实现并入档；**实测发现 Desktop 流程基本不可达**——新会话首屏是原生"探索未至之境"首页，阅读视图要等首条消息后才挂载（届时已有内容）。Web 变体/边缘场景生效，代码保留 |
| 2 | **Cmd/Ctrl+F 直达查找**：阅读视图键盘快捷键打开搜索面板 | 高频便利 | 低 | ✅ 已实现（面板打开即聚焦输入框；Esc 关闭原有保留） |
| 3 | **搜索全匹配高亮**：所有匹配淡底 + 当前命中加强（现仅当前命中闪烁） | 长文定位 | 中 | ✅ 已实现（`.searchMarked` 常驻淡底，定位逻辑抽为 `locate()` 复用） |
| 4 | **代码块语言标签**：markdown 代码块左上角显示语言 | 对齐主流阅读器 | 低 | ✅ **无需改动**——官方 `CodeBlock` 自带语言横幅（`infostring` + 复制按钮同排），围栏落定即显示；流式期间作者有意隐藏（避免语法高亮抖动）。实现方式核查：`lang` 已传入组件仅作高亮语法之用，标签由组件自带 |
| 5 | **长会话性能**：整快照订阅 → 按轮订阅/虚拟化（100+ 步会话流式卡顿的根治） | 最大工程项 | 高 | ✅ 0.4.9 完成回合组件按节点身份浅比较订阅（流式只重渲染活跃回合）+ 思考卡/导轨 rAF 布局读优化；量化对比见下方说明 |
| 6 | **导轨刻度密度**：回合多时刻度自动压缩排布（`--rail-squeeze`，下限 0.3），全部可见；超出压缩下限才回退滚动 | 打磨 | 中 | ✅ |
| 7 | **加载更早记录骨架屏**：加载历史时显示两行脉动占位（复用 toolStatePulse，reduced-motion 关闭） | 打磨 | 低 | ✅ |
| 8 | 工具条 sticky | searchRow sticky 已覆盖主场景 | — | 🗄️ 暂缓 |

## 第三轮（2026-09-08 追加，随 0.5.0 发布）

| # | 优化点 | 状态 |
|---|---|---|
| T1 | **MCP App 提示词作用域修复（M8 补完）**：`findComposerTextarea` 从卡片向上找同会话视图的 composer，替代 document 级第一个 textarea | ✅ |
| T2 | **长会话尾部窗口**：初始只渲染最近 15 轮，更早轮次折叠为一行占位（带锚点，导轨跳转可落）；滚动接近自动展开 10 轮 + 滚动位置补偿；点击展开全部。首开/内存成本不再随历史线性增长 | ✅ |
| T3 | **搜索索引懒建**：仅在查找面板打开时构建（此前每次节点增减都 O(全会话) 重建） | ✅ |

v1 已知取舍（T2）：折叠轮次的搜索匹配会计入计数但需展开后才能定位/高亮；深位置恢复降级为回到窗口顶部后向上滚动展开。

另见上方 S1-S3（有意不改项）。

---

## 变更日志（跨机器续接从这里看）

- 2026-09-07：文档创建，批次 A/B/C 全部待修。
- 2026-09-07：**三批全部完成**（typecheck 0 错误、npm test 83/83）。计划修正两处：rail 占位改真实元素 `.railSpacer`（container query 限制）；B1 用 `:has` 仅在 dock 可见时抬升 jumpDock。剩余后续工作 = 三个 S 项（有意不改）+ 人工视觉抽查。
- 2026-09-08：修复进入 **0.4.7** 并已发布 npm + 装入 desktop profile。0.4.6 曾发布但 client bundle 漏打 `@deepseek-ai/dsh-util-workspace-path`（当时无 harness 构建环境），在 Desktop 加载失败，已被取代（该 token 无法 unpublish，撤销需网页端 OTP）。
- 2026-09-08：**0.4.8 发布**（npm + desktop profile）：本路线图的回答卡片/自动回底/Cmd+F/全匹配高亮/刻度自适应/骨架屏 + 上一轮 i18n、无障碍、容器感全部内容随版本发出。#5 长会话性能留待下一班。
- 2026-09-08：#1 空状态实现后实测发现 Desktop 新会话首屏走原生"探索未至之境"首页，阅读视图要等首条消息后才挂载——该状态在 Desktop 流程基本不可达（代码保留，Web/边缘场景生效）。
- 2026-09-08：**0.5.0 发布**（npm + desktop profile）：第三轮 T1/T2/T3（MCP 作用域修复、长会话尾部窗口、搜索索引懒建）。
- 2026-09-08：**#5 完成（0.4.9 已发布 + 装入 profile）**。改造依据 harness store 源码事实（packages/client/store + ui-chat 快照构建器）：纯文本流式期间 order/timeline/无关节点身份稳定，热点仅剩回合组件的整快照订阅；改为按节点身份浅比较订阅后，每 chunk 渲染成本 O(回合数)→O(1)。**量化对比待测**：发版时屏幕锁定无法读数——探针已内置为长期工具，`localStorage.setItem('deckseek-probe','1')` 开启后窗口标题实时显示回合渲染计数，流式一轮即可读出每秒渲染量。
- **本机构建环境已就绪**（后续发版直接用）：`~/Documents/workspace/deepseek-harness`（克隆）+ `deepseek-harness/tools/dshx`（devkit，含 lightningcss）+ 插件 node_modules 已 link 到 harness。构建命令：`DSHX_HARNESS=~/Documents/workspace/deepseek-harness npm run build`。注意：harness 首次需 `pnpm install` + `pnpm run build:lib:client`（部分测试文件类型报错可忽略，核心包产物会发出）；`packages/util/workspace-path` 需单独补 `lib/index.js`（tsc 手编，link 脚本映射表漏了这个包的链接）。

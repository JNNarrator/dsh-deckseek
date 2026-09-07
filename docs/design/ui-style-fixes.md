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

## 变更日志（跨机器续接从这里看）

- 2026-09-07：文档创建，批次 A/B/C 全部待修。
- 2026-09-07：**三批全部完成**（typecheck 0 错误、npm test 83/83）。计划修正两处：rail 占位改真实元素 `.railSpacer`（container query 限制）；B1 用 `:has` 仅在 dock 可见时抬升 jumpDock。剩余后续工作 = 三个 S 项（有意不改）+ 人工视觉抽查。

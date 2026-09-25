# 阅读区皮肤（Reading Skins）

> 设计稿：2026-09-11 讨论定稿。**取代** [unified-card-system.md](unified-card-system.md) 的三档卡片体系（该体系并入本文的「软卡」皮肤）。
> 起因：0.6.1–0.6.4 一直在既有卡片语言里做减法和调色，观感仍"平、糊、噪"。根因不是配色，是**只有一种表面处理**——卡片既是容器又是分隔又是身份，承担太多，只能靠色条和描边打补丁。

## 状态

- 三套皮肤全部保留：**纸面 / 软卡 / 终端**。
- 设置入口：DSH 设置里的独立 **DeckSeek 页**。
- 颜色策略：皮肤只表达**结构、密度、字体、圆角**；所有颜色取自宿主主题 token，亮暗自动适配，两套主题不各做一份。
- 默认皮肤：**软卡**。

## 架构

### 一份 DOM，皮肤是根上的一个属性

阅读视图渲染**一套**组件树；皮肤只改变阅读区根元素的属性：

```
<div class="root" data-deckseek-skin="paper | soft | terminal">
```

所有皮肤差异写在以该属性为前缀的 CSS 里。React 侧**不做皮肤分支**（唯一例外见「装饰性 chrome」）。这样皮肤新增一套的代价是"再加一块 token 定义"，不是"再写一个视图"。

### 设置链路

宿主半（`src/dsh-deckseek.ts`，当前是空壳）：

```ts
ctx.inject(['settings'], (settingsCtx) => {
  settingsCtx.settings.register('deckseek', DeckSeekSchema)   // { skin: 'paper' | 'soft' | 'terminal' }
})
```

- 命名空间 `deckseek`，字段 `skin`，默认 `'soft'`。
- 宿主半不读这个值、不参与渲染，只负责把命名空间注册进设置文档（与 `packages/client/ui-theme` 的 `ui-theme` 命名空间同形）。

客户端半（`src/client/index.tsx`）：

```ts
const scope = ctx.settingsScope.bind<DeckSeekSettings>({ namespace: 'deckseek' })
ctx.slots.inject('settings.section', () => ctx.slots.register({
  name: 'settings.section', id: 'deckseek', order: 30,
  label: () => ui('settings.nav'), inject: sectionInjected,
}, DeckSeekSection))
```

- `dsh.client.inject` 增加 `@deepseek-ai/dsh-client-ui-settings`（`settingsScope` 与 `settings.section` 的声明方）。
- 读：`scope.getSnapshot().value?.skin ?? 'soft'`；`status === 'loading'` 时按默认渲染。
- 写：`scope.set('skin', next)`。写入即时生效，不需要重启。
- 文案走插件现有的 `src/client/locale.ts`（zh/en 双字典，`ui()` 读 `<html lang>`），**不接入宿主的 `ctx.locale`**。理由：本插件在仓库之外分发，已有自成一套且被现有测试覆盖的文案机制；再引入宿主 locale 命名空间会让两套机制并存。

### 首帧不闪

`status: 'loading'` 期间先按默认皮肤渲染、拿到值再切，会让每次打开都闪一下。宿主半监听 `webserver/index-inject`（`ui-theme` 的做法）把当前 skin 写进 index 可以让客户端首帧即正确皮肤。

**实施阶段核查后决定不做**：这条路要新增 `@deepseek-ai/dsh-host-webserver` 作为宿主 peer 依赖，并往每次 index 渲染塞一段 inline script；而 settings 镜像在客户端启动时就通过 RPC 加载，阅读视图是用户打开视图时才挂载，实际几乎观察不到闪烁，且默认皮肤（软卡）下多数用户本就不会看到切换。代价与收益不成比例。

改为 `useSyncExternalStore` 的加载期默认值。**若实际观察到闪烁**，再按上面这条补 boot injection——它是已知的升级路径，不是被否决的方案。

### 边界与失败

- **宿主未组装 settings 服务**：`register` 不发生，客户端 `status === 'unavailable'`。按默认皮肤（软卡）渲染，DeckSeek 设置页仍显示但控件禁用，并给出一行说明。
- **读到未知 skin 值**（旧版本写入过、或手工编辑了设置文件）：回退 `'soft'`，不抛错、不写回。
- **`writable === false`**（memory 模式）：控件禁用，同第一条的说明。
- **写入被拒或失败**：`set()` 落定后以 `getSnapshot()` 为准重新渲染，不做乐观更新。

### token 层

皮肤差异收敛为一组插件级自定义属性，定义在 `Reader.module.css` 的 `.root` 上，由 `[data-deckseek-skin=…]` 覆盖：

| token | 含义 |
|---|---|
| `--dx-radius-card / panel / chip` | 三级圆角 |
| `--dx-surface-record / answer / user / failure` | 各档底色 |
| `--dx-border-record / answer` | 描边（含 `none`） |
| `--dx-shadow-card` | 投影（仅软卡的回答卡非 `none`） |
| `--dx-rule` | 行分隔线的颜色与宽度（`none` 表示无） |
| `--dx-pad-card-y / -x`、`--dx-pad-row-y` | 内边距 |
| `--dx-gap-block`、`--dx-gap-item` | 块间距与组内间距 |
| `--dx-font-chrome`、`--dx-font-prose` | 字体族 |
| `--dx-size-answer / user / body / chrome / meta`、`--dx-lead-*` | 字号与行高阶梯 |
| `--dx-lead-surface`、`--dx-lead-radius` | 前导格的外观 |

**颜色只用宿主 token**，插件里不出现字面色值——包括投影：软卡的回答卡用宿主的 elevation token，不再是手写的 `rgba(0,0,0,…)`（0.9.0 改；此前那条"唯一例外"已消失）。需要"某种状态的淡背景"时用 `color-mix(in srgb, var(--dsw-alias-state-*) N%, transparent)` 派生，随主题自动变。**唯一的字面量例外是 `var()` 的兜底值**（`McpAppFrame.module.css`：沙箱帧在宿主 token 缺失时也要能显示），由 `tests/skin-css.test.ts` 守着。

## 依赖的宿主事实

- **宿主有完整的 elevation 体系**（0.9.0 更正：早期结论"没有 elevation/shadow token"是错的）。`body` 上定义 `--dsw-shadow-lv1/2/3` 与 `--dsw-elevation-stroke`（经可重绑的 `--dsw-elevation-stroke-color` 画 0.5px 发丝描边）、`--dsw-elevation-panel / prominent / soft`（描边 + 两层极淡柔光）。宿主自己的用法即分档：composer 用 `soft`、浮动圆钮用 `panel`、弹窗用 `prominent`。**柔光几乎不可见，分离由描边承担**——这正是亮色主题需要的东西。高层级表面按宿主约定 `border: 0`，不占布局。
- **宿主有正文尺寸轴，皮肤必须骑它**。`--dsh-content-font-size`（12–17px，用户设置，默认 14）由 bootstrap 写在 `body` 上，`--dsh-content-font-delta` 是它与 14px 之差；Markdown 阶梯（`--dsw-font-markdown-h1..h4 / base / table / code`）全部由这两个量推导，低一档的 `--dsh-content-font-size-secondary` + `-delta-secondary` 供表格与流内次级文本。插件侧只声明一个别名 `--dx-font-delta: var(--dsh-content-font-delta, 0px)`，让行高、前导格、块间距跟着字号走（见下「字号与家具」）。
- **亮色主题下 `bg-layer-1/2/3` 全是纯白**（`--dsw-static-neutral-bluish-00`），`bg-base` 也是白。亮色没有背景阶梯，层级只能靠描边 + 投影 + `bg-module-platform`(#F5F6F7)——所以软卡改用宿主 elevation 的 0.5px 描边来分层。
- 暗色下 `bg-base` #151517、`layer-1` #232324、`layer-2` #2C2C2E、`layer-3` #353638、`module-platform` #353638。
- 中性半透明底 `interactive-bg-hover`（亮 `rgba(38,49,72,.06)` / 暗 `rgba(255,255,255,.08)`）**在两种主题下都恰好"离页面一档"**，是唯一可直接当静态底色用的中性 token。
- 墨色阶：`label-primary` / `label-secondary` / `label-tertiary` / `label-caption`（亮暗各自成阶梯）。
- `border-l4` 比 l1–l3 重一档，elevation 描边默认用它。

### 字号与家具（0.9.0）

皮肤的字号写在 rem（跟随浏览器缩放），但宿主那套"正文字号"是**另一根轴**：它只改文本，不改 rem。因此**行高、前导格、块间距不能写死 px**，否则用户把正文字号调到 17px 时文字变大、家具不动。凡是"必须与文本行盒对齐"的尺寸都读 `calc(<基准> + var(--dx-font-delta))`：根底部留白下限、`.column` / `.mainFlow` / `.blocks` 的块间距、`.disclosureButton` 与状态行的高度、`.user` / `.answer` / `.toolActivity` / `.reasonHeading` / `.reasonText` 的纵向内边距、工具前导格的 22px 高。

终端皮肤**有意不参与**：它的节奏是等宽行，行高本来就是 rem，`--dx-gap-block` 保持定值 8px。

同样地，**Markdown 阶梯必须在消费处重绑**：`.markdown` 用 `font: var(--dsw-font-markdown-base)` 这个简写会把继承来的字号重置掉，所以皮肤自己设的 `font-size` 到不了正文——纸面以为在画 17px，实际每段都是宿主的 14px。纸面因此在 `.answer` 上重绑 `--dsw-font-markdown-base / -h1..h4 / -table / -table-head`（阶梯整体 +3px，保持宿主原有的 +7/+5/+4 层级形状），并在 `.user` 上重绑一档（15/26）。软卡与终端目前仍是宿主字号，属于已知的同类缺口，未在本批处理。

## 三套皮肤

| | 纸面 paper | 软卡 soft | 终端 terminal |
|---|---|---|---|
| 一句话 | 排版流：读文章 | 卡片：留白与体量 | 行列：看仪器 |
| 容器 | 无 | 卡片 | 无 |
| 圆角 卡/面板/芯片 | 0 / 4 / 4 | 16 / 10 / 6 | 0 / 3 / 3 |
| 分隔 | 无（名签牵一条发丝线到右缘；末尾统计一条） | 卡内行间 1px `border-l1` | 窗口边框 + 每行下缘 1px `border-l1` |
| 记录底 | 透明 | `interactive-bg-hover` | 透明 |
| 回答底 | 透明 | `bg-module-platform` + `border-l2` + 投影 | 透明 |
| 用户底 | 透明，单一左缘 + 名签「你」牵发丝线到右缘 | `specific-bubble`，右下 4px 小角右对齐 | 透明，`> ` 提示行（无淡底、无色条、无头像） |
| 投影 | 无 | 仅回答卡 | 无 |
| 前导格 | `›`，无容器 | 22px 圆角方块 + 工具首字母 | 12px 状态字形（✓ / ✗ / ▸） |
| 数字列 | 行内右推 | 行内右推 | 右对齐专用列 |
| chrome 字体 | 无衬线 | 无衬线 | 等宽 |
| 颜色许可 | 只有失败 | 失败 + 用户身份 | 状态（成功 / 失败 / 进行中）+ 工具类别（执行 / 改动） |

### 字号阶梯

| | 纸面 | 软卡 | 终端 |
|---|---|---|---|
| 回答 | 17 / 30 | 16 / 28 | 14 / 24 |
| 用户 | 15 / 26 | 14 / 23 | 12.5 / 20 |
| 过程正文 | 13.5 / 25 | 13.5 / 24 | 12.5 / 20 |
| 工具行 | 12.5 / 26（等宽） | 13 / 22 | 12.5 / 20（等宽） |
| 标题 / 元信息 | 11.5 / 18 | 12 / 19 | 11 / 17 |

字号落差本身就是层级手段：纸面靠 17 vs 11.5，软卡靠卡片体量，终端靠列对齐。

### 密度

| | 纸面 | 软卡 | 终端 |
|---|---|---|---|
| 块间距 | 20–24 | 12 | 8 |
| 组内间距 | 8–10 | 10–14 | 4–6 |
| 卡内边距 | — | 13–16 / 16–18 | — |
| 行内边距 | 行高承担 | 7 / 0 | 2–3 / 0 |

### 各自要点

- **纸面**：零卡片。用户消息不缩进、占单一左缘，靠独占一行的名签「你」加一条牵到右缘的发丝线开轮——先前"26px 小槽位标签 + 正文缩进"的做法会把左缘读成排版错位，而不是"轮到我说"；工具行等宽小字平铺、无容器；回答放大到 17px 独占节奏；只有失败出现颜色。层级全靠留白与字号落差。
  - **0.9.0 起推理也走这条单一左缘**：不再缩进 16px + 挂 `border-l2` 竖线（那是文档的引注语言，等于第二个左缘），改为与正文共用左缘，并用本皮肤已有的"名签 + 牵到右缘的发丝线"开块——发丝线挂在名签「思考」上，因此读到的是 `思考 ────── 第 N 步`，步数落在右缘当页码。开块规则在推理很长时仍能划出"另一种文本从这里开始"。
  - **0.9.0 起回答的排版阶梯真正生效**：`font:` 简写会重置字号，所以 17px 只作用在 chrome 上、正文一直是宿主的 14px；现在在 `.answer` 上重绑整条 Markdown 阶梯（+3px，保持宿主 +7/+5/+4 的层级形状），并配一套文章尺度的正文节奏（段间距 16→20，正好维持宿主 16/24 的比例；列表符号的行盒跟随 30px 正文行高，而不是宿主写死的 28px）。表格本就是 deepsuite 的书目体（表头 `border-l3`、行间 `border-l2`、无竖线无斑马），随阶梯放大到 secondary 档。
- **软卡**：卡片承载内容，靠体量分层。回答卡最重——0.9.0 起用宿主的 `--dsw-elevation-panel`（0.5px 发丝描边 + 两层几乎不可见的柔光，`border: 0`，不占布局），替掉此前手写的 `0 8px 24px rgba(0,0,0,.28)`：宿主的分档是 composer 用 `soft`、浮动圆钮用 `panel`、弹窗用 `prominent`，内容卡取 `panel`；**分离由描边承担，这恰好是亮色主题需要的东西**。记录卡最轻（一层中性 tint，无描边无投影）。用户卡 0.9.0 起**从品牌强调色派生身份色**：`color-mix(in srgb, --state-business-primary 10%, --specific-bubble)` + 同色系 0.5px 内描边——宿主那个 `specific-bubble` 填充是中性色（暗色 #2C2C2E），所以亮色下"所有表面都是白"时用户卡与页面分不开。**不用左缘色条**——卡片有真正体量后色条是多余补丁。
- **终端**：一条竖轴贯穿，整列等宽（不只是工具行），外面一圈窗口边框。输入行是 `> ` 提示行，工具行 `⏺` 起头、结果块挂 `⎿`、思考行标 `✻`。12px 状态字形列对齐到底，中间内容，右边右对齐的数字列（耗时、±行数、token）。发丝线逐行分隔，零卡片零圆角零投影。颜色只给状态，工具名不上色。密度最高：块间距 8、组内 4–6，由 `--dx-gap-block` 真正消费——此前该 token 无人引用，间距一直继承软卡的 22/16/16。
- **终端 v3 语汇（0.8.0）**：参考 [dsh-TUI](https://github.com/ccch1mneyyy/dsh-TUI) 的机制（不抄它的配色——颜色仍是宿主 token），把"等宽深色排版"推进成"会呼吸的仪器面板"。① **窗口标题栏**：工具栏成为窗口自己的标题行，工作区路径在左、一条发丝线牵到右缘的控件；② **流式光标**：正在写的回答末行带 `▌` 方波光标；③ **状态行**：呼吸点 + 本轮的动词（按轮次 key 确定性取词，见 `status-verb.ts`）+ 右对齐的耗时；思考相位仍用语义标签，不只换风味；④ **工具标记按类别取色**：执行 = amber、改动 = brand blue、只读 = 中性灰，红留给失败；`▸/✓/✗` 仍按状态取色（"失败永远赢"）；⑤ **右对齐数字列**：工具行第三列与结尾读数共享一条右缘；⑥ 推理跟随中 `✻` 做 2s 呼吸。逐项依据见 [terminal-skin-v3.md](terminal-skin-v3.md)。
- **0.9.0 横切优化（三套皮肤共有）**：① **家具跟着宿主的正文字号轴缩放**（见上「字号与家具」），行高、前导格、块间距不再写死 px；② **焦点环每皮肤一个 token**——软卡 4px 柔光环、纸面 4px 稍紧、终端 1px 硬环（终端不画光晕）；只用在内容层的四个控件（`.disclosureButton` / `.toolHeading` / `.reasonAction` / `.answerActions .iconButton`），其余控件仍用宿主的 2px 描边，`forced-colors` 下回退成描边——焦点环是阴影，既会被 `overflow: hidden` 的祖先裁掉，也会被系统强制色整体丢弃；③ **软卡的展开箭头改为悬停 / 键盘聚焦才出现**（展开时与触屏常显），卡片边缘少一件常驻家具。
- **软卡 / 纸面的这一轮优化（0.9.0）源自 [DeepSeek-Reasonix](https://github.com/esengine/DeepSeek-Reasonix) 的对照**：它的 `desktop/frontend` 把宿主自己的 `ui-chat` / `ui-primitives` 整套移植了过去（`harness-chat/README.md` 列了来源），所以改的是同一批原语，解法可直接比。取的是机制（宿主 elevation 分档、字号增量轴、运行行的掠过高光、悬停才出现的箭头、共享左缘的流内行），不是它的配色。

## 装饰性 chrome 的渲染与隐藏

三套皮肤各自有对方没有的装饰件（纸面的角色标签、终端的会话栏与状态字形、软卡的字母方块）。策略是 **React 始终渲染全部装饰件，由 CSS 按皮肤隐藏**，而不是在 React 里分支：

- 隐藏用 `display: none`，装饰件一律 `aria-hidden="true"`。
- 例外：终端的字形会视觉取代现有的状态文字（完成 / 失败）。此时状态文字改为 `srOnly` 保留可访问名，不能直接删。
- 0.8.0 新增的装饰件走同一策略：窗口标题（`.framePath`，`cwd` 只此一处可见）、状态行的呼吸点与动词。终端忙碌时语义标签整串 `display: none`，而活区（`role="status"`）始终由 `ariaText` 那个静态标签承担，可访问名不随秒数跳动。
- **动词与耗时的分片**：耗时此前嵌在 `status.delving` 的句子里，句子每秒变化，`StatusText` 的换字动画于是每秒把整串滑一次（8px + 2px 模糊）。现在 `StatusText` 用 `swapKey`（相位）判断是否换字，秒数原地跳动；终端另外把一个独立耗时刻度挂在 `.statusClock`。
- 代价是少量"渲染了但不显示"的节点；收益是皮肤完全不出现在组件逻辑里，可单测、可回归。

## 状态与控件层

- **状态档**（失败卡、notice、待确认、已停止）：三套皮肤都必须保持"最显眼"的位置。淡背景统一用 `color-mix(state-*)` 派生，红色只出现在色条/描边与标题，正文用普通墨色——0.6.4 已确认整卡红字对比度差。
- **控件层**（工具栏、搜索面板、历史按钮与骨架、空状态、回到底部圆钮、右侧导轨、复制悬浮芯片）：随皮肤一起变。终端皮肤下这些控件也走等宽与直角；否则"内容是一套、控件是另一套"会重新制造凌乱。
- **忙碌状态行**（"深度求索中…"）随会话流收尾，是本轮最后一个元素，跟在最后一块内容之后、随滚动离开视口。原生对话把它作为 `role="status"` 的普通行放在消息列表末尾，插件同样不做悬浮层：盖在内容上的状态行恰好挡住读者正在等待的那段内容。
- 圆角与密度从同一组 token 取值，保证控件与内容同源。

## 不变式

以下契约不因本次改动改变：

- `DESIGN.md` 的行为契约：流式揭示、推理跟随的两行步进与缓动、2s 字形 shimmer、28px 视口遮罩、14px/24px 状态标签。
- 折叠语义：成功轮次才收拢执行过程，失败/中断/待确认/未知终态保持可见。
- 图标、色条这类"墨"只能用文字/状态 token（`label-*`、`state-*`），不能用表面 token（`specific-bubble` 在暗色是 #2C2C2E，叠在同色卡片上完全隐身——0.6.3 踩过）。
- **颜色许可的扩展（0.8.0）**：终端皮肤的 `⏺` 标记按工具类别取色，颜色因此表达两件事——**状态**（`▸/✓/✗`：进行中 / 成功 / 失败）与**会改变什么**（执行 / 改动 / 只读）。这扩展了 0.7.x 的"颜色只给状态"，但"工具名不上色"仍然成立：上色的是标记，不是名称，也不是语法。
- 分类色只在宿主已有的状态色族里取（`terminal`（执行命令）= `state-warn-primary`、`write`（改动）= `state-business-primary`、只读 = `label-tertiary`），红色留给失败。宿主没有 progress / meter 专用 alias，也没有第 5、第 6 个可用色相，**不硬凑六色**。
- 回答卡内的 Markdown 代码块仍由宿主 `ui-primitives` 渲染，不由插件接管。

## 旧体系处置

- `docs/design/unified-card-system.md` 标记为**已被本文取代**，保留原文不再更新（它的三档体系并入软卡，左缘色条被移除）。
- 0.6.x 引入的 `--dsh-card-*` token 组由 `--dx-*` 取代。

## 实施分期

1. **设置链路打通**：宿主命名空间、客户端 bind、设置页、皮肤属性到达 Reader。此阶段只接默认皮肤，观感不变，可单独验证设置链路而不被视觉改动干扰。
2. **token 层与三套皮肤落地**：`--dx-*` 定义 + 三块皮肤覆盖 + 三套规格。
3. **控件层与装饰件收尾**：控件随皮肤、装饰件按皮肤显隐、亮暗共 6 组过目。

## 版本

`0.9.0`——软卡与纸面的排版/表面打磨：纸面的 Markdown 阶梯与正文节奏真正生效、推理改共用左缘；软卡改用宿主 elevation 与派生身份色；三套皮肤共有的字号增量轴与逐皮肤焦点环。此前 `0.8.0` 是终端皮肤 v3，`0.7.0` 是设置页与三套皮肤，`0.7.1`–`0.7.4` 是各自的修正。

## 测试与验收

- **单元**：皮肤解析纯函数（合法三值、未知值回退默认、缺失回退默认）；设置页组件渲染（三个磁贴、选中态、点击调用 `scope.set`）；终端 v3 新增纯函数与分片渲染（`shortCwd`、`pickStatusVerb`、`StatusText` 的活区/装饰件分片），以及 keyframes 引用规则的静态检查（见下）。现有测试保持通过（当前基线 **140 项**，见 `npm test`；新增 locale 键会触发中英键集一致性测试，需同步）。
- **sheet 契约（`tests/skin-css.test.ts` 静态检查）**：① `@keyframes` 名必须写在 `animation` 简写里（见下）；② **除 `var()` 兜底外不得出现颜色字面量**（`McpAppFrame` 的沙箱帧是唯一白名单，它在宿主 token 缺失时也要能显示）；③ 每个被 `var(--dx-…)` 读取的插件 token 必须在某处声明过——读一个不存在的 token 是静默失效，声明整条会掉；④ 每套皮肤都必须声明 `--dx-focus-ring`。检查前会剥掉注释：注释里常引用"不许用的那个颜色"。
- **动效的写法约束（0.8.0 教训）**：CSS Modules 会哈希 `@keyframes` 的名字，但不会改写自定义属性值里的名字——动画简写整个塞进 token 会让动效在真实构建里静默失效（测试的假 CSS loader 看不见）。**动画名一律写在 `animation` 简写里，token 只装计时**，`tests/skin-css.test.ts` 守着这条规则。
- **类型**：`npm run typecheck` 零错误。
- **构建**：`DSHX_HARNESS=<带 tools/dshx 的检出> npm run build` 成功；装进 `web` profile 后启动无错。
- **视觉（人工验收，写进 PR 说明）**：三皮肤 × 亮暗共 6 组，各过一眼；重点看亮色下"回答卡与记录卡是否还分得开"（亮色没有背景阶梯，这是最容易糊的地方）。

## 明确不做

- 不做按会话独立皮肤（全局一个设置足够）。
- 不做自定义强调色、字号滑杆、圆角滑杆。
- 不做皮肤级动效差异（动效是同一个契约）。
- ~~不做 ANSI 色彩块~~ **部分修订（0.8.0）**：语法仍不上色，但终端皮肤的 `⏺` 标记按工具类别上色（见「不变式」的颜色许可扩展）。颜色依旧不承载"这段代码是什么语言"，只承载状态与"会改变什么"。
- **不做实时 token / TPS / 上下文占用**（0.8.0 明确）：宿主把 token 与上下文做成 projection（`dsh-token-meter` 的 `tokenUsage` / `contextPressure`、`dsh-session-stats`），插件要读就得新增两个宿主 peer 依赖与类型增强。当前状态行的数字只用插件已持有的数据：轮次耗时、工具 ±行数、`turn-tail` 的用量分桶（原句写的 `tok·s⁻¹` / `ttft` 在 0.1.7 已被宿主删除，逐轮粒度不存在了，见 `compat-0.1.7.md` §11.3）。**0.1.7 修订（2026-09-23）**：宿主现在自带这一层（`StatsPills` + `ContextMeter`），且它们挂在 `conversation.composer.dock` / `conversation.composer.bar` 上 —— 本插件替换的是 `conversation.view`，两者是兄弟槽，**遮不住它们**。所以「不做」升级为**「不重复」**：用户本来就看得见，插件不再印第二份会话级读数，免得同屏出现两个不同源的数字。上下文占用百分比因此也不再是空白。
- ~~终端皮肤不做假终端提示符~~ **已被用户要求推翻**：`> ` 输入行、`⏺` / `⎿` / `✻` 字形与窗口边框是点名要的，取代了此前"不做终端 cosplay、只做终端风味的阅读皮肤"这一判断。
- **受宿主所有权所限，终端皮肤改不到**：底部输入框（`packages/client/ui-chat` 的 composer）、`[y]/[n]/[a]` 危险操作确认（`packages/interaction/user-approval`、`tool-ask-user`）、应用级状态栏——model / git / agent 这些数据插件也拿不到，插件手上只有 `cwd` 与本轮 token。动它们等于改宿主，不属于本插件范围。

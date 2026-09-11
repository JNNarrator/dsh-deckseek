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

**颜色只用宿主 token**，插件里不出现字面色值。唯一例外是投影用的 `rgba(0,0,0,…)`——宿主没有 elevation token（见「依赖的宿主事实」）。需要"某种状态的淡背景"时用 `color-mix(in srgb, var(--dsw-alias-state-*) N%, transparent)` 派生，随主题自动变。

## 依赖的宿主事实

- **没有 elevation/shadow token**。所以软卡的回答卡投影只能自己写 rgba。
- **亮色主题下 `bg-layer-1/2/3` 全是纯白**（`--dsw-static-neutral-bluish-00`），`bg-base` 也是白。亮色没有背景阶梯，层级只能靠描边 + 投影 + `bg-module-platform`(#F5F6F7)。
- 暗色下 `bg-base` #151517、`layer-1` #232324、`layer-2` #2C2C2E、`layer-3` #353638、`module-platform` #353638。
- 中性半透明底 `interactive-bg-hover`（亮 `rgba(38,49,72,.06)` / 暗 `rgba(255,255,255,.08)`）**在两种主题下都恰好"离页面一档"**，是唯一可直接当静态底色用的中性 token。
- 墨色阶：`label-primary` / `label-secondary` / `label-tertiary` / `label-caption`（亮暗各自成阶梯）。

## 三套皮肤

| | 纸面 paper | 软卡 soft | 终端 terminal |
|---|---|---|---|
| 一句话 | 排版流：读文章 | 卡片：留白与体量 | 行列：看仪器 |
| 容器 | 无 | 卡片 | 无 |
| 圆角 卡/面板/芯片 | 0 / 4 / 4 | 16 / 10 / 6 | 0 / 3 / 3 |
| 分隔 | 无（仅末尾统计一条发丝线） | 卡内行间 1px `border-l1` | 每行下缘 1px `border-l1` |
| 记录底 | 透明 | `interactive-bg-hover` | 透明 |
| 回答底 | 透明 | `bg-module-platform` + `border-l2` + 投影 | 透明 |
| 用户底 | 透明，左对齐 + 角色标签「你」 | `specific-bubble`，右下 4px 小角右对齐 | `state-business-primary` 8% tint + 左 2px 条 |
| 投影 | 无 | 仅回答卡 | 无 |
| 前导格 | `›`，无容器 | 22px 圆角方块 + 工具首字母 | 12px 状态字形（✓ / ✗ / ▸） |
| 数字列 | 行内右推 | 行内右推 | 右对齐专用列 |
| chrome 字体 | 无衬线 | 无衬线 | 等宽 |
| 颜色许可 | 只有失败 | 失败 + 用户身份 | 状态（成功 / 失败 / 进行中） |

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
| 行内边距 | 行高承担 | 7 / 0 | 7 / 16 |

### 各自要点

- **纸面**：零卡片零分隔线。用户消息左对齐、前置小号角色标签「你」；推理缩进 16px 挂一条 `border-l2` 竖线；工具行等宽小字平铺、无容器；回答放大到 17px 独占节奏；只有失败出现颜色。层级全靠留白与字号落差。
- **软卡**：卡片承载内容，靠体量分层。回答卡最重（`bg-module-platform` + `border-l2` + 投影），记录卡最轻（一层中性 tint，无描边无投影），用户卡用宿主身份色并收一个 4px 小角保留对话感。**不用左缘色条**——卡片有真正体量后色条是多余补丁。
- **终端**：一条竖轴贯穿。12px 状态字形列对齐到底，中间内容，右边右对齐的数字列（耗时、±行数、token）。发丝线逐行分隔，零卡片零圆角。颜色只给状态，工具名不上色。密度最高。

## 装饰性 chrome 的渲染与隐藏

三套皮肤各自有对方没有的装饰件（纸面的角色标签、终端的会话栏与状态字形、软卡的字母方块）。策略是 **React 始终渲染全部装饰件，由 CSS 按皮肤隐藏**，而不是在 React 里分支：

- 隐藏用 `display: none`，装饰件一律 `aria-hidden="true"`。
- 例外：终端的字形会视觉取代现有的状态文字（完成 / 失败）。此时状态文字改为 `srOnly` 保留可访问名，不能直接删。
- 代价是少量"渲染了但不显示"的节点；收益是皮肤完全不出现在组件逻辑里，可单测、可回归。

## 状态与控件层

- **状态档**（失败卡、notice、待确认、已停止）：三套皮肤都必须保持"最显眼"的位置。淡背景统一用 `color-mix(state-*)` 派生，红色只出现在色条/描边与标题，正文用普通墨色——0.6.4 已确认整卡红字对比度差。
- **控件层**（工具栏、搜索面板、历史按钮与骨架、空状态、回到底部圆钮、右侧导轨、复制悬浮芯片）：随皮肤一起变。终端皮肤下这些控件也走等宽与直角；否则"内容是一套、控件是另一套"会重新制造凌乱。
- 圆角与密度从同一组 token 取值，保证控件与内容同源。

## 不变式

以下契约不因本次改动改变：

- `DESIGN.md` 的行为契约：流式揭示、推理跟随的两行步进与缓动、2s 字形 shimmer、28px 视口遮罩、14px/24px 状态标签。
- 折叠语义：成功轮次才收拢执行过程，失败/中断/待确认/未知终态保持可见。
- 图标、色条这类"墨"只能用文字/状态 token（`label-*`、`state-*`），不能用表面 token（`specific-bubble` 在暗色是 #2C2C2E，叠在同色卡片上完全隐身——0.6.3 踩过）。
- 回答卡内的 Markdown 代码块仍由宿主 `ui-primitives` 渲染，不由插件接管。

## 旧体系处置

- `docs/design/unified-card-system.md` 标记为**已被本文取代**，保留原文不再更新（它的三档体系并入软卡，左缘色条被移除）。
- 0.6.x 引入的 `--dsh-card-*` token 组由 `--dx-*` 取代。

## 实施分期

1. **设置链路打通**：宿主命名空间、客户端 bind、设置页、皮肤属性到达 Reader。此阶段只接默认皮肤，观感不变，可单独验证设置链路而不被视觉改动干扰。
2. **token 层与三套皮肤落地**：`--dx-*` 定义 + 三块皮肤覆盖 + 三套规格。
3. **控件层与装饰件收尾**：控件随皮肤、装饰件按皮肤显隐、亮暗共 6 组过目。

## 版本

`0.7.0`——新增设置页与三套皮肤，是视觉层的大改。

## 测试与验收

- **单元**：皮肤解析纯函数（合法三值、未知值回退默认、缺失回退默认）；设置页组件渲染（三个磁贴、选中态、点击调用 `scope.set`）；现有 101 项测试保持通过（新增 locale 键会触发中英键集一致性测试，需同步）。
- **类型**：`npm run typecheck` 零错误。
- **构建**：`DSHX_HARNESS=<带 tools/dshx 的检出> npm run build` 成功；装进 `web` profile 后启动无错。
- **视觉（人工验收，写进 PR 说明）**：三皮肤 × 亮暗共 6 组，各过一眼；重点看亮色下"回答卡与记录卡是否还分得开"（亮色没有背景阶梯，这是最容易糊的地方）。

## 明确不做

- 不做按会话独立皮肤（全局一个设置足够）。
- 不做自定义强调色、字号滑杆、圆角滑杆。
- 不做皮肤级动效差异（动效是同一个契约）。
- 终端皮肤不做 ANSI 色彩块、不做假终端提示符。

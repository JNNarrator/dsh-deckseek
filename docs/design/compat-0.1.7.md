# 迁移计划：dsh-deckseek 对齐 DSH 0.1.7-rc.1

目标宿主：`0.1.7-rc.1`（rev `46a7f68`，2026-09-23），路径 `/Users/jiangnan/Documents/deepseek-harness`。
不保留对 `0.1.3-alpha.2` 的兼容——单一目标版本。

## 已定决策

- **设置命名空间：选 (B)** —— 接受命名空间随条目 id 变为 `dsh-deckseek`，不做 `cordis.patch.yml` 条目 id 改名。老用户已有的 `deckseek: {skin: ...}` 会失效并落回默认 `soft`。
- **图标：重新设计** —— 不满足于机械改名，按 0.1.7 的双档权重体系（`Regular` 1px / `Medium` 1.3px）重新决定每个调用点该用哪一档。
- **展示同步**：新宿主自带对话展示的全部可见内容，插件新版要同步呈现（见 §11）。

## 0. 基准事实

- 插件 `node_modules/@deepseek-ai/*` 已全部软链到 0.1.7-rc.1 checkout；该 checkout 工作树干净，`lib/` 已构建。
- 当前 `npx tsc -p tsconfig.json --noEmit` 报 **27 个错误**，分布 9 个文件。
- 已构建的 `lib/client.js` 仍在引用已删除的图标导出，属**运行时崩溃**，不只是类型问题。
- 桥接层（slot 名、服务签名、`dsh.client.inject` 语义、`tools/dshx` 构建适配器）**未变**，无需改动。

## 1. 图标改版（10 个错误，最高优先级）

0.1.7 把所有产品图标改为尺寸中立的双档命名（`.agents/notes/implemented/architecture/2026-09-16-size-neutral-product-icon-weights.md`）：
`Regular` = 1px 描边，`Medium` = 1.3px 描边，尺寸一律由 `size` prop 控制。

**已定：重新设计，不做机械改名。** 借这次机会把"哪个调用点该用哪一档"重新判一遍——原实现里 `Icon*Outline16` 的 16 既是名字也是默认尺寸，语义是混的。

映射与选档：

| 现在 | 改为 | 档位理由 |
| --- | --- | --- |
| `IconUserOutline16` | `IconUserOutlineRegular` | 用户底纹带的段标，非交互 |
| `IconBrowseOutline16` | `IconBrowseOutlineRegular` | 上下文注入行的参考标记，非交互 |
| `IconFolderClose16` | `IconFolderCloseRegular` | 同上 |
| `IconApiOutline14` | `IconApiOutlineRegular` + `size={14}` | 原 14px 几何，必须显式传 size 保持尺寸 |
| `IconEditOutline16` | `IconEditOutlineRegular` | 工具行族标 |
| `IconSearchOutline16` | `IconSearchOutlineRegular` | 工具行族标 |
| `IconSkillOutline16` | `IconSkillOutlineRegular` | 工具行族标 |
| `IconSparkle16` | `IconSparkleRegular` | 工具行族标 |

选档原则：**`Regular` 为默认**。仅对"用户可点的常驻控件"考虑 `Medium`——本插件的常驻控件是工具栏三个按钮（查找 / 动效 / 导出）与「回到最新」，若其中有用图标的，按上游"刻意强调"的口径取 `Medium`。工具行族标、上下文参考标记一律 `Regular`。

落点：`src/client/Reader.tsx`、`src/client/ToolActivity.tsx`、`src/client/native/ContextInjectionRow.tsx`、`src/client/native/ReferenceIcon.tsx`。

同时建议抽一层 `src/client/icons.ts` 薄映射（导出本插件用到的图标名），把档位选择集中到一处，避免以后再跟着上游改名散改四处。

## 2. 设置服务重写（2 个错误）

0.1.7 删除了 `ctx.settingsScope`，且设置命名空间**改为等于 cordis 条目 id**（对照 `ui-theme`：条目 id `ui-theme` = 命名空间 `ui-theme`）。

**已定：采用 (B)**，命名空间变为 `dsh-deckseek`（= `cordis.patch.yml` 里的条目 id）。老用户的 `deckseek.skin` 设置会失效、落回默认 `soft`；在 CHANGELOG 里作为破坏性变更写明。

宿主半边 `src/dsh-deckseek.ts`：

```ts
// 现在（已失效）
ctx.inject(['settings'], (c) => c.settings.register('deckseek', DeckSeekSettingsSchema));

// 改为：导出 Config，让 settings 从 entry.fiber.runtime.Config 读取
export const Config = DeckSeekConfigSchema;   // ⚠️ 必须是 volatile schema，见下方陷阱
export function apply(ctx: Context): void {
  ctx.inject(['settings'], (c) => {
    c.effect(() => c.settings.configure({ auto: false }, ctx.fiber)); // 自绘页面，不要自动生成
  });
}
```

**⚠️ 陷阱（2026-09-25 实测踩到，用户报「插件崩了、设置面板点不了」）**：这里**不能**直接导出持久的
`DeckSeekSettingsSchema`。0.1.7 的设置系统不再照单全收注册进来的 schema，而是用
`volatileForm(schema)`（`@deepseek-ai/dsh-settings/src/schema.ts`）自己派生要下发的表单，该函数
**只保留带 `meta.volatile` 的字段**：对象里一个 volatile 字段都没有时它返回 `undefined`，
`describe()` 随即把这整条条目当「没有设置」丢弃（`packages/settings/settings/src/index.ts`）。
于是命名空间不下发 → 客户端 `configForms.get(ns)` 永远停在 `loading` / `writable:false` →
设置节每个控件都 `disabled` 并显示只读提示；真有写入到达宿主则抛
`Plugin entry "dsh-deckseek" has no volatile fields`。**旧的 `ctx.settings.register()` 路径不要求
volatile 标记**，所以这是迁移独有的回归，且 `tsc` 看不见（volatility 是运行时元数据）。
正确做法是照抄宿主 `ui-theme` 的**双 schema 分工**：持久信封 `DeckSeekSettingsSchema` 保持纯净，
另立 volatile 孪生 `DeckSeekConfigSchema`（同字段、同默认值、保留 `.loose()`）导出为 `Config`。
注意 `.volatile()` 会改变 schema 的 Mode 类型参数，所以无法在其上保留 `z<DeckSeekSettings>` 标注。
守卫见 `tests/skin-settings.test.ts`（含 2 项专门断言 volatility 的用例，变异验证过）。

浏览器半边 `src/client/index.tsx`：

```ts
// 现在
export const inject = ['slots', 'sessions', 'settingsScope'];
const scope = ctx.settingsScope.bind<DeckSeekSettings>({ namespace: DECKSEEK_SETTINGS_NAMESPACE });
scope.getSnapshot().value?.skin / scope.getSnapshot().writable / scope.set(SKIN_FIELD, next) / scope.subscribe(listener)

// 改为
export const inject = ['slots', 'sessions', 'configForms'];
const form = ctx.configForms.get<DeckSeekSettings>(DECKSEEK_SETTINGS_NAMESPACE);
form.getSnapshot().value?.skin / form.getSnapshot().writable / form.set(SKIN_FIELD, next) / form.subscribe(listener)
```

`DECKSEEK_SETTINGS_NAMESPACE` 常量值由 `'deckseek'` 改为 `'dsh-deckseek'`（须与条目 id 一致）。

`ConfigFormSnapshot` 新增 `status: 'loading' | 'ready' | 'unavailable'`，`set` 返回 `Promise<boolean>`（原 `Promise<void>`）。渲染默认皮肤的逻辑需覆盖 `unavailable`。

## 3. `RunningToolCall` 变为判别联合（2 个错误）

```ts
// 0.1.3：argsRaw 必填
interface RunningToolCall { ...; argsRaw: string; ... }

// 0.1.7：拆两态，argsRaw 只在 start 上
type RunningToolCall = PreparingToolCall | StartedToolCall   // Preparing 无 argsRaw
```

落点：`src/client/native/tool-call-model.ts:220`、`src/client/tool-activity.ts:99`。

改法：用 `phase` 判别取 `argsRaw`，`preparing` 态按空串处理（现有 `argsRaw === ''` 分支已能兜住），并把工具行状态渲染成"输入生成中"——`locale.ts` 里 `tool.phasePreparing` 词条已存在，无需新增文案。

## 4. 上下文来源字段改名（2 个错误）

`records.ts`：`provenance` → `producer`，`AssistantProvenanceView` → `AssistantProviderMetadataView`，`ContextProvenanceView` → `ContextProducerView`（模块 `context-provenance.ts` → `context-producer.ts`）。

落点：`src/client/native/ContextInjectionRow.tsx:14`、`src/client/Reader.tsx:47`。

## 5. primitives 标签契约（4 个错误）

`src/client/primitive-labels.ts` 需补齐/删除：

- `ReadBlockLabels` 现在 `extends CodeToolbarLabels` → 必填新增 `codeLabel`、`wrapLabel`、`unwrapLabel`
- `TerminalBlockLabels` → 必填新增 `noExitCode`
- `DiffBlockLabels` → 删除 `files`（0.1.7 的 DiffBlock 已不再渲染文件计数），同样 `extends CodeToolbarLabels`

`SearchBlockLabels`、`WebBlockLabels`、`JsonTreeLabels`、`MarkdownLabels` 未变。

## 6. `useSessionPendingInteraction` 被删除（5 个错误）

该 hook 及其 declaration merge 在 0.1.7 整体移除。替代路径（对照 `ui-conversation/src/client/skeleton/ConversationContent.tsx:31`）：

```ts
// 现在
props.useSessionPendingInteraction((s) => s.get(props.sessionId))

// 改为（useSessionStatus 是 GlobalStandardProps 成员，已验证可用）
props.useSessionStatus((s) => props.sessionId === undefined ? undefined : s.get(props.sessionId)?.pendingInteraction)
```

落点：`src/client/Reader.tsx`（165、166、273、299、315 行附近）。

已用类型探针确认：`sessionId`、`useChat`、`useSession`、`useProjection`、`useWorkspaces` **都还在**，只有这一个 hook 消失。Reader.tsx:165 报的 `sessionId | useChat` 是该 `Pick` 的级联错误。

## 7. peer 版本范围补洞（配置，0 个错误）

`package.json` 里 11 个 `@deepseek-ai/dsh-*` peer 现为：

```
>=0.1.2-rc.1 <0.1.3-0 || >=0.1.3-rc.1 <0.2.0-0
```

`0.1.3-alpha.*` 与 `0.1.3-beta.*` 落在两段之间，会被 0.1.7 新增的 peer 闸门（`evaluatePluginCompatibility`，`includePrerelease: true`）判为不兼容。

目标只支持 0.1.7-rc.1，故收窄为：

```
>=0.1.7-rc.1 <0.2.0-0
```

已验证：`0.1.7-rc.1` / `0.1.9` / `0.1.12` 通过，`0.2.0-rc.1` 拒绝。同时把 `devDependencies` 里过期的 `0.1.2-rc.1` / `0.0.1-rc.1` 固定版本对齐到 0.1.7-rc.1。

> **2026-09-23 复核更正（重要，和 §11.7/§11.13 同类）。** 上面这一段对旧范围的描述是**错的**，
> 而且错的方式让整节的必要性被高估了。实测（`semver@7.8.5`，与闸门同版本）：

| 范围 | `satisfies('0.1.7-rc.1', r)` 默认 | 加 `includePrerelease: true` |
| --- | --- | --- |
| `^0.1.3-alpha.2` | `false` | **`true`** |
| `^0.1.3` | `false` | **`true`** |
| `~0.1.3-alpha.2` | `false` | **`true`** |
| `>=0.1.7-rc.1 <0.2.0-0` | `true` | `true` |

**闸门传了 `includePrerelease: true`，所以旧范围本来就会放行 `0.1.7-rc.1`。**
把插件 manifest 的 11 个 peer 全改回 `^0.1.3-alpha.2` 再喂给真正的
`evaluatePluginCompatibility`，返回的是 `undefined`（兼容）——**它不会被拒载**。
`^0.1.3-alpha.2` 解析成 `>=0.1.3-alpha.2 <0.2.0-0`，0.1.7-rc.1 落在里面。

所以这一节的真实性质要说清楚，两件事分开：

1. **收窄范围不是「修崩」，是收紧声明。** 断言的意图从「0.1.3 起的任何版本都行」变成
   「只有 0.1.7-rc.1 起、且已在 0.1.7 上验过」。这是**正确**的意图——插件确实在 0.1.3 上跑不起来
   （§3–§6 的 17 处类型错误就是证据）——但它是**可读性与诚实度的修正，不是解除拒载的修复**。
   §0 与 CHANGELOG 里「旧 peer 范围会被直接拒载」的表述都夸大了。
2. **闸门本身确实存在且确实会拒**（`0.2.0-rc.1` 会被拒），只是**不会拒绝我们原来的范围**。

> **方法学教训（第三次同类）。** 这里的错误不是「没查」，是**看错自己查出来的表**：
> 我确实跑了 semver，也把 `includePrerelease` 那一列打了出来，然后引用了 `plain` 那一列——
> 两列紧挨着，结论正好相反。**当一个实验有两列条件、两列结论相反时，引用前必须重念一遍列名**；
> 更好的做法是**根本不要打印对照列**，只打印闸门实际用的那一个配置。
> 前两次同类：§11.5 的 ocr/`provenance`、§11.6 的折叠头。

## 8. 验证

1. `npx tsc -p tsconfig.json --noEmit` → 0 错误。
2. `npm test` → 现有 171 项全绿；为本次改动补测试：图标映射、`phase` 判别的 `argsRaw` 取值、`pendingInteraction` 取值、标签契约。
3. `npm run build` 重建 `lib/`，确认 `lib/client.js` 不再出现任何已删除的导出名（`grep -c IconUserOutline16 lib/client.js` 应为 0）。
4. 真实宿主验收：`dshx` 挂载后在 web 里跑一次会话，重点看三套皮肤下的工具行（`preparing` 态）、上下文注入行、设置页皮肤切换、以及 `0.1.7` 新 peer 闸门是否放行。

## 9. 建议执行顺序

1. **§7 peer 范围** —— 一行配置，决定插件能否被 0.1.7 的准入闸门放行。
2. **§1 图标改版** —— 唯一的运行时崩溃点。
3. **§2 设置服务** —— 含命名空间变更（已定 B）。
4. **§3–§6 API 迁移** —— 每步跑一次 `tsc`，逐步清零 27 个错误。
5. **§11 展示同步** —— 在上面全部清零、插件能在 0.1.7 上正常跑起来之后再做，属于增量补内容。

## 10. 风险

- **命名空间迁移**（§2，已定 B）：老用户 `deckseek.skin` 失效落回 `soft`。属已知取舍，需在 CHANGELOG 里写明。
- **图标档位**（§1）：`Medium` 是新增的表达能力，选错档位只影响观感，不影响功能。已定原则见 §1。
- `DiffBlockLabels.files` 的删除意味着宿主 diff 块的折叠文件计数消失；若该信息在阅读页仍有价值，需改由插件自己渲染（当前 `Reader.tsx` 已有自己的折叠计数逻辑，预计影响有限）。
- **§11 的体量未知**：新宿主对话展示面比旧版大得多（`ui-chat/src/client/chat/` 从 42 个文件增至 58 个），展示同步可能显著大于前六节之和。需按审计结果排优先级，不要一次全做。

---

# §11 展示同步：新宿主对话展示 vs 插件

审计方式：9 个并行子代理分面审计 `ui-chat` / `ui-tool` / `ui-primitives` 的原生渲染面，逐个对照插件现状。
基线：插件 `native/upstream.json` 钉在 `b150a551b8`（0.1.1-rc.2，08-21），距 0.1.7-rc.1 有 **6529 个提交**，
`ui-chat` + `ui-conversation` + `ui-tool` 三个包 **257 个文件、+25254/−9034 行**。

## 11.0 一个前提被推翻了

插件有多处文档写明「我们没有那个投影，所以不印 token / 速度 / 上下文占用」：

- `src/client/frame-meter.ts` 文件头：*"this plugin has no such projection and does not add one, so the bar reports volume instead of spend"*
- `docs/design/reading-skins.md:212`：「不做实时 token / TPS / 上下文占用（0.8.0 明确）」，理由是需新增两个宿主 peer 依赖
- `docs/design/terminal-skin-v4.md:79`：「四家在这一格都印 token / 花费 / 上下文占用，我们没有那个投影」

**0.1.7 里这个前提不再成立。** 宿主现在自带：

| 新包 / 契约 | 提供 |
| --- | --- |
| `packages/session/session-stats` | `sessionStats` 投影（轮次、步数、LLM 用时、工具用时、TTFT、解码速度） |
| `packages/llm/token-meter` | `TokenUsageProjection` |
| `ui-chat/src/client/contract/turn-metrics.ts` | `assistantStepReading()` → `{ttftMs, decodeMs, outputTokens}` |
| `ui-chat/src/client/chat/token-format.ts` | `formatTokens` / `formatExactTokens` / `formatCacheHitPercent` |

所以 §11 不是「补几个装饰」，而是**插件当初主动放弃的那一层现在可以做**了。

> **2026-09-23 复核更正（重要，方向性）**：上表成立，但**结论要用错一半**。
> 这四样东西是宿主**新加给宿主自己**的，而它们全都挂在**插件没替换的槽**上：
>
> - `StatsPills`（`sessionStats` 投影）→ `conversation.composer.dock`，渲染于 `InputBar.tsx:500`；
> - `ContextMeter` → 同一个 dock（`activity ? null : <ContextMeter …>`）；
> - 会话/轮次 usages 的弹窗 → 同一处。
>
> 插件的阅读视图替换的是 `conversation.view`（`DefaultConversationViews.tsx:39`），
> 与 `conversation.composer.bar` 是**兄弟**。所以**这一层用户本来就看得见，一天都没丢过**——
> 「插件当初放弃的一整层」这个说法对**会话级读数**不成立，只对**插件自己那条行内单行**
> （turn-tail 的用量行，§11.3 已修）成立。
>
> 也就是说 §11.11「第二批」里第 6 项（会话统计条）**应当撤销**：复刻会让屏幕上出现两份
> 不同源的统计条。真正还没做的是**逐轮**用量面板（第 7 项）。
>
> 引申出的方法问题：**「宿主新增了什么」和「用户看不到什么」是两个问题**。本轮之前
> 只查了前者，于是把「宿主变强了」直接记账成「插件欠了」。审计必须走完
> 「这个能力挂在哪个槽 → 那个槽有没有被插件替换 → 用户实际看见的是哪一份」三步。

## 11.1 全局机制：两个新的用户设置档位

新宿主把「展示多少」做成了用户可选的档位，插件完全没有对应概念（插件只有一个 `skin`）。

**工作细节档位**（`ui-chat/src/chat-settings.ts`）

```
TRANSCRIPT_VIEW_FIELD = 'transcriptView'
TRANSCRIPT_VIEW_MODES = ['compact', 'standard', 'detailed', 'verbose']
DEFAULT_TRANSCRIPT_VIEW_MODE = 'standard'
LEGACY: 'normal' → standard, 'expanded' → detailed
```

四个档位映射到 `presentation-policy.ts` 的四个能力开关：

| 档位 | foldCompletedTurns | stepGrouping | liveProcessDetail | settledReasoningPreview |
| --- | --- | --- | --- | --- |
| compact | true | collapsed | false | false |
| standard | true | collapsed | true | true |
| detailed | true | history | true | true |
| verbose | false | none | false | true |

渲染方只读这四个布尔，**从不比较 mode 枚举**（这是它的契约）。用户入口：设置 → 通用 → `TranscriptViewRow`。

**性能/用量档位**（同文件）

```
PERFORMANCE_USAGE_MODES = ['compact', 'detailed']
DEFAULT_PERFORMANCE_USAGE = 'detailed'
```

控制 composer 统计条与逐轮用量 pill 的密度。另有 `linkOpening: 'sidebar' | 'new-tab'`。

> 缺口：`[影响:高][工作量:中]` 插件无任何档位概念。`grep transcriptView|stepGrouping|liveProcessDetail src/` 零命中。
> 证据：`skin.ts:7 SKIN_IDS = ['paper','soft','terminal']`、`DeckSeekSection.tsx` 只有 skin 一个字段。

**已实现（本插件侧的对应物）。** 插件**不**导入宿主的 `ChatPresentationPolicy`：`ui-chat`
不在 `PLATFORM_MODULES` 里，导入会让 bundle 依赖一个非平台模块。因此插件自带一份同语义的
`WorkDetailPolicy`（`src/skin.ts`），字段一一对应，`stepGrouping` 收敛成一个布尔
`groupProcess`（插件还没有宿主的 `'history'` 那一档，所以 `detailed` 暂时等于 `standard`）：

| 档位 | foldCompletedTurns | groupProcess | liveProcessDetail | settledReasoningPreview |
| --- | --- | --- | --- | --- |
| compact | true | true | false | false |
| standard | true | true | true | true |
| detailed | true | true | true | true |
| verbose | false | false | false | true |

用户入口：设置 → DeckSeek → 「过程细节」四个 tile（`DeckSeekSection.tsx`），字段
`workDetail`，`legacy normal/expanded` 由 `parseWorkDetail` 折到 standard/detailed。
渲染侧只读布尔，`turnStructure(policy)` 把两个维度合成 `flat | folded | open-header`：

- `expanded`：`processExpanded(choice, boundary, policy)`，显式用户选择永远优先。
- `flat`（verbose）：跳过 `Disclosure`，过程行直接铺在正文流里。
- `liveProcessDetail`：`StatusText` 的 `detail` 槽显示 `liveToolEntry(flow)`
  经 `toolRowModel().title` 得到的在飞命令/路径/查询；窄栏先丢它，再丢时钟。
- `settledReasoningPreview=false`：已结束的思考卡只留标题行（`ReasoningCard` 的 `resting`）。

## 11.2 新节点：`turn-trigger`（零覆盖）

`ChatNodeDataMap` 从 15 种增至 16 种，新增的 `turn-trigger` 在插件里 **0 引用**。

它是一个可展开的 notice，说明「这一轮不是人发起的」：`TurnTriggerNodeView.tsx` 渲染
来源家族图标（14px）+ 标题 + 时间 + chevron，展开后是解释行 + `NoticeBody`。

10 个来源家族（`turn-trigger.ts` 的 `TRIGGER_ICONS`）：`request` / `goal` / `agent` / `team` /
`subagent` / `github` / `webhook` / `schedule` / `job` / `plugin`，由 `source.kind` 判定
（`goal`、`agent-message`、`team-message`、`subagent-settled`、`webhook`+`provider==='github'`、
`schedule`、`tool-jobs`、`cordis-host-runner`，未知落 `request`）。

> **已修**（曾为零覆盖，落 `UnknownRecord` 显示原始 JSON）：新增 `native/TurnTriggerRow.tsx`，
> `Reader.tsx` 的进程节点分派增加 `turn-trigger` 分支，`projection.ts` 的 `hasProcessContent`
> 也纳入该 kind。10 个家族 → 10 个标题键 + 8 个字形（`goal`/`agent`/`team`/`subagent`/`webhook`/
> `schedule`/`job`/`plugin` 各有其一，`github` 用 `BranchGlyph`，其余落 `TriggerGlyph`）。
> 未知或畸形 `source` 一律归到中性的 `request` 而不是丢行——「这轮自己开始的」比「无归属」更糟。
>
> 与上游的两处**有意分歧**：
> 1. 上游把 `turn-trigger` 归入「turn 无关」的独立根（`TURN_PROCESS_INDEPENDENT_KINDS`），
>    插件把它算作 process 内容。理由是插件的折叠只折叠**能被摘要的**证据，而触发通知的正文
>    摘要不出来，漏掉它会让人看不出这轮为什么开始。
> 2. 上游标题走宿主 `t('message.trigger.*')`；插件用自己的 `locale.ts` 字典（`ui-chat` 不在
>    `PLATFORM_MODULES`，拿不到那个座位），键名 `trigger.*`，`triggerTitleKey()` 用显式
>    `Record<TriggerFamily, TriggerTitleKey>` 而不是模板串拼键，缺键会在 tsc 报错而不是
>    把键名渲染出来。
>
> 形状确认：`turn-trigger` 的 payload 就是 `ContextMessageNode`（`message.ts:35`），与 `context`
> 同形，所以复用 `ContextInjectionRow.module.css` 的几何 + `NoticeBody`，只多一条解释行。
> 证据：`TurnTriggerNodeView.tsx:29-49` + `turn-trigger.ts:21-70`。

## 11.3 统计与用量层（全新，最大的一块）

**会话级统计条 `StatsPills`**（挂在 `conversation.composer.dock`）

- compact 档：TPS + 缓存命中率两个静态读数
- detailed 档：两个可点 pill →
  - `TimePill`：`N turns M steps · X tok/s`，弹窗「会话统计」含模型用时、工具用时、首 token 平均、输出速度
  - `UsagePill`：总量 + 缓存命中，弹窗「Token 用量」含缓存命中 / 未缓存输入 / 缓存读取 / 缓存写入 / 输出
- 数据来自 `sessionStats` 投影，无投影时用 `deriveStats()` 兜底折叠

**逐轮用量 `TurnUsagePanel`**

`IconDatabaseOutlineRegular` + 「用量 N tok」→ 弹窗「本轮用量」：精确总量、`routes`（`provider/model`）、
缓存命中率、未缓存输入、缓存读取、缓存写入、输出（含「其中推理 N tok」）。门控在 `performanceUsage === 'detailed'`。

**`ttftMs` / `tokensPerSecond` 搬家了**（这点最关键）

OLD 的 `chat-nodes.ts` 有 `ttftMs` / `tokensPerSecond`，NEW **删掉了**，`turn-tail.ts` 里
`deriveTurnMetrics` 整段移除，`turn-metrics.ts` 瘦身为只剩 `assistantStepReading()`。
逐轮粒度没有了 —— TPS/TTFT 现在只在**会话级**（`StatsPills`）以平均/合计出现。
OLD 的 `TurnTimePanel`（`message.ranFor` / `message.turnTime.*`）整段删除。

> **已修**（曾为静默丢字）：插件 `TurnTailData` 原来声明 `tokensPerSecond` / `ttftMs`，0.1.7 这两个
> 字段已不存在，读它们不报错、不降级，只是少两段文字。现在删掉这两个死字段，改读
> `tokenUsage` 的真实分桶：单行显示总量 + 缓存命中率（分母用 provider 自己的
> `uncachedInputTokens + cacheReadTokens`，即它实际看到的 prompt）+ 推理占比；未上报的桶**不显示**
> 而不是显示 0。完整分桶（未缓存输入 / 缓存读取 / 缓存写入 / 输出 / 推理 / 路由
> `provider/model`）挂在该行的 `title` 上——那也是一轮由哪些 provider/model 服务的唯一可见处。
> 逐轮 TPS/TTFT **不再补**：0.1.7 把它们降级到会话级了，逐轮粒度已不存在，硬造只会是假的。

> **2026-09-23 复核：会话级读数不是缺口，是「原生还在」。** 此前记为
> `[影响:高]` 的「插件不读 `sessionStats`，会话级读数也没有」是**错的**——错的不是代码，是
> 审计把「插件没实现」当成了「用户看不到」。实测链路：

1. `StatsPills` 注册在 `conversation.composer.dock`（`ui-chat/src/client/apply.ts:229`）。
2. `conversation.composer.dock` 的渲染点在 **`InputBar.tsx:500`**。
3. `InputBar` 注册在 **`conversation.composer.bar`**（`ui-conversation/src/client/apply.ts:380-492`）。
4. 插件的阅读视图替换的是 **`conversation.view`**，渲染点是 `DefaultConversationViews.tsx:39`。

   两者是**兄弟节点**，不在一条渲染链上。`conversation.view` 只被 Conversation 的
   `viewArea` 内部消费，而 `conversation.composer.bar` 是独立的 composer 槽。
   （与 §11.7 的 `forkAt` 是相反结论：那里是**同一个槽的 owner props 不含**，这里
   **根本不在同一个槽**。）

> 结论：**0.1.7 的会话统计条在插件视图下照常显示**，不需要插件复刻。
> 复刻反而会出两份统计条（一份插件渲染、一份原生渲染），且插件的数字会与原生不同源。
>
> 同时纠正一条方法问题：`useProjection` **本来是拿得到的**。它声明在
> `SessionStandardProps`（`ui-session/src/client/index.ts:169`），属于每个 session 作用域槽位都有的
> **标准套件**，`PropsRuntime<'conversation.view'>` 里就有。用 `src/` 内的探针实测过
> （`'useProjection' extends keyof PropsRuntime<'conversation.view'>` → `'YES'`）。
> 所以「插件拿不到投影通道」这个前提也是错的——不需要它，但拿得到。
> 教训同 §11.5/§11.6：**先把「谁能看到什么」查清，再决定要不要实现**；
> 两次误判都源于只读了插件代码、没读宿主的挂载点。

> 缺口（剩余，已按上面的结论缩减）：
> `[影响:中][工作量:中]` 无**逐轮**用量面板（原生 `TurnUsagePanel` 弹窗）。分桶与 `routes`
> 已在该行 `title` 上，缺的是可展开的面。
> `[影响:低][工作量:小]` 插件的 `formatTokens()` 手写 `Math.round(value/1000)`，与宿主本地化的
> K/M 档 + 分组分隔符不同（M 量级会话会偏离）。**有意保留**：`ui-chat` 不在 `PLATFORM_MODULES`，
> 导入宿主的 `token-format` 会把第二份 chat 打进包里；这里按内联脚注的排版取舍，注释已记录。

## 11.4 工具行

原生走 `tool.call.toolview` 键控槽（`ToolCallTree.tsx`），按工具名派发到 12 个 toolview + 36 个 details 键。
插件不用这个槽，自己渲染 `ToolActivity`，数据经 `readerFlow()` 合并 draft 与 block。

**三阶段生命周期**：`RunningToolCall = PreparingToolCall | StartedToolCall`，`PreparingToolCall` **无 `argsRaw`**。
原生 preparing 阶段只显示 icon + title（bash 连 summary 都不给），`expandable=false`。
args 需经 `bindToolCallArgumentsPartial()` 订阅 assistant-step 增量。

> 缺口（按影响排序）：
> - `[高][大]` `native/tool-call-model.ts` 仍按单阶段建模，`toolRowModel()` 直接读 `block.argsRaw`；
>   preparing 传入时 `undefined ?? ''` 落到 `block.callId`，摘要显示**裸 callId**。
> - `[高][中]` 不处理 `todo_write`：无 `todo-history`、无 `todoDiffModel`，逐项 diff（新增/移除/状态/顺序、`unchanged` 折叠）全丢，退化为原始 JSON。
> - `[高][大]` 无 `details-row` 等价物：36 个已记录工具（`create_goal`/`schedule_*`/`cordis_inspect_*`/`workflow`/`lsp`/`subagent`/`job_*`/`team_task_*`…）全部退化为裸 JSON。
> - `[高][小]` 无 auto-review 拒绝呈现（`tool.autoReviewRejected` + `tool.autoReviewNotExecuted {reason}`）。
> - `[高][中]` 无 `ask-question-row` 等价物：`ask_user_question` 落入 `other`，问题/答案配对与 `ask.waiting|answered|cancelled|interrupted|skipped` 全丢。
> - `[中][小]` `read_image` 分类缺失（旧拷贝的 `TOOL_VARIANTS` 无此项）→ 落入 `others`，标题退化为 "Tool call"。
> - `[中][小]` 卡片行数上限硬编码 `maxLines={18}`，原生按类分档（read/search 8、diff 9）。
> - `[中][小]` 无 search 截断恢复行（`searchBody.recovery`）。
> - `[低][小]` 无逐工具图标映射（原生 `detailIcon()` 9 种前缀 vs 插件 6 个粗类别）。

## 11.5 用户消息 / 上下文 / 错误 / 重试

> 缺口：
> - `[高][中]` `user`/`steering` 不读 `data.referenceLabels` / `data.skillNames`，会话引用与技能注入标注全丢。
>   **2026-09-23 复核**：`referenceLabels` **已修**（见本节末尾「已修」）；`skillNames` 仍缺。
> - ~~`[高][中]` `user` 的 image / file 附件不渲染 —— `contentBlocks`（`Blocks.tsx:107-110`）只筛 `type === 'text'`，
>   粘贴的图片与上传的文件在阅读视图彻底消失~~
>   **2026-09-23 复核更正：这条是错的，又一次误判。** `contentBlocks`（`Blocks.tsx:70-76`）的映射是
>   `text → {kind:'text'}`、**`image → {kind:'image', attachment}`**、其余 → `{kind:'other', block}`，
>   并没有「只筛 text」。`fallback` 的 `case 'image'` 走 `ImageBlock`（带预览 dialog、文件名 `figcaption`、
>   `loadImage`）。图片附件**正常渲染**。文件附件（非图片）落进 `kind: 'other'`：
>   不是被丢，而是退化为宿主 `FileTypeIcon` 那类专用卡片没有实现。
>   这是**第三次**同类误判（前两次：§11.5 的 session 前言 context 行、§11.6 的折叠头），
>   三次都因为「只读插件代码 + 凭印象推断宿主行为」而**把「实现得弱」记成「完全丢失」**。
> - `[中][小]` `system-prompt` 忽略 `data.update`，中途替换系统提示词与首次提示词同名。
> - ~~`[中][中]` `model-retry` 显示原始 JSON~~ —— **已修**：新增 `native/ModelRetryRow.tsx`。现在出
>   状态句（`等待重试：第 2/5 次，约 4 秒后`）、`等待 / 失败原因 / 供应方` 三行明细，`AUTH`
>   换成可行动文案（「凭据无效或已过期，重试不会成功」）而不是留一个状态码给读者自己推断。
>   `mode: 'always'` 的上限显示 `∞` 而不是它的数字字段——那个模式没有上限，印数字等于声称一个
>   不存在的限制。`scheduled` 且仍在等待时**实时倒数**（250ms tick，归 1 即停），`started` /
>   `cancelled` 后停在原始等待时长，免得一份早已结束的记录继续跳秒。倒数的 deadline 锚在**本
>   浏览器首次渲染**，不是事件的 `time`：后者来自宿主时钟，可能不在同一纪元，直接相减会得到
>   负数或离谱的值。
> - `[中][小]` `turn-max-tokens` 只有一行纯文本，缺 warning 状态点与「如何继续」提示行。
> - `[中][中]` `context` 行可见性绑在 turn 的 process 折叠上：只在 `hasProcessContent` 为真的分组里经
>   `ProcessNode` 渲染（`MainNode` 对 `context` 是 `return null`）→ session 前言的 context 行要展开分组才出现。
>   **2026-09-23 复核更正**：曾记为「session 前言的 context 行完全不出现」，用真实 `Reader` 挂载实测后为**误判**
>   ——session 作用域的 context 节点同样经 `ProcessNode` 渲染，正常出现（探针见下）。真实缺口只是``折叠``，
>   不是``丢失``。同类误判已出现两次（另一次是「用户图片/文件附件被丢弃」），故记于此：**审计结论必须先用真实挂载验证再动手**。
> - ~~`[低][小]` `context` 行图标退化为旧版 `IconBrowseOutline16`，与原生区分 inject/recall 的
>   `IconContextInjectionOutlineRegular` 不一致。~~
>   **2026-09-23 复核更正：已不成立。** `ContextInjectionRow.tsx:42-45` 现在按 `producer.role` 分叉：
>   `recall` → `ReferenceIcon kind="session"`（`data-context-recall-icon`），否则 → `ContextGlyph size={14}`。
>   与原生一样区分了 inject / recall。
> - ~~`[低][小]` `context` 行仍读旧字段 `provenance`（0.1.7 已改名 `producer`）→ role/label 恒为空。~~
>   **已修**（§4）：`native/ContextInjectionRow.tsx` 现在读 `ContextMessageNode['producer']`，role 决定
>   图标与标题（inject / recall 分叉），label 进折叠行的 `data-context-source`；全库已无 `provenance` 残留。
> - `[低][小]` `command` 无 outcome 时静默不渲染（原生始终出 `GenericCommandCard`）。
> - `[高][中]` 用户消息无 per-message 图标操作（复制 / 分支），插件只在助手答案卡提供 `CopyAnswer`。
>   证据（2026-09-23 复核，已核对上游原文）：`MessageItem.tsx:327-336` 把
>   `<MessageIconActions text={text} time={data.time} clock="start" t={t} />` 作为 `actions` 传给
>   `UserStyleBubble`——即**用户气泡自带复制按钮与起始时刻**。插件侧 `Reader.tsx` 的用户分支
>   （~137-152）只有 `userRole` / `userGlyph` / `Blocks` / 引用行，没有 actions 位。
>   （分支按钮在用户消息上本来就不可用：同样是 `forkAt` 平台硬限制，见 §11.7。）
> - `[高][小]` 用户/助手消息不显示时间戳，插件全库无 `formatMessageClock` 等价物。
>   证据：`chat/message-chrome.ts:100-114`（`formatMessageClock(time, t, now = Date.now())`）+
>   `MessageItem.tsx:333` 的 `time={data.time}`、`clock="start"`。
>   **注意**：助手侧的「结束时刻」已由 §11.7 的 `messageClock()` 补上（`TurnRecords.tsx` 的 turn-tail 行），
>   所以本条剩下的真实缺口只有**用户消息的起始时刻**——`messageClock()` 已存在且已测，
>   补用户侧是接入而不是新建。> - `[中][小]` `turn-error` 不本地化 `AUTH` 失败信息，直接把提供商原文透出（原生会脱敏替换为 `message.failure.auth`）。
>   证据（2026-09-23 复核，已核对双方原文）：上游 `MessageItem.tsx` 的
>   `failureMessage(message, code, t)` 做 `code === 'AUTH' ? t('message.failure.auth') : message`；
>   插件 `Reader.tsx:158` 是 `<FailureCard message={node.data.message} code={node.data.code} />`，
>   而 `FailureCard`（`FailureCard.tsx:20-34`）把 `code` 原样渲染成 `<code>` 小片、对 `message` 不做任何替换。
>   → AUTH 场景下读者看到的是一串提供商原文加一个 `AUTH` 状态码，没有任何「重试不会成功」的行动指引。
>   修法很小：在 `Reader.tsx:158` 处按 `code` 选文案，复用 §11.5 已为 `model-retry` 写好的同一条
>   `AUTH` 文案（`retry.*` 那一族），不必新增机制。> - **已修** `user` / `steering` 忽略 `data.referenceLabels`（`referenceLabels` 是引擎解析出来的 `@` 提及，
>   不在 `content` 里；正文照常渲染所以是静默丢失）。插件用户正文走 Markdown（皮肤文档的既定设计），
>   无法在不放弃 Markdown 的前提下复用宿主行内 chip，故在气泡下方以一行呈现，等价于宿主
>   `message.referenceSummary`。`data.skillNames` 仍被忽略——宿主只把它用于行内 `/` chip，没有对应
>   的汇总行，插件不自行发明 UI，属已知缺口。
> - `[低][小]` 用户消息多余内容块（`message.extraBlock`）与未知块兜底缺失。
>   证据：`MessageItem.tsx:218` vs `Blocks.tsx:105-125`。

## 11.6 turn-process 与分组

原生有两层：**Turn 级折叠按钮**（`TurnProcessNodeView`）+ **分组头**（`ChatGroupSeat` 的 `ProcessGroupHeader`）。

分组头为 14 个活动类别各配图标，标题三态：
已关闭 → 按活动类别排名的动作短语（`已读取文件并搜索代码`）；
未关闭且 preparing → `准备读取文件`；
未关闭 → `正在读取文件`。detailed 档还把正在执行的命令/路径/查询/推理段实时拼在标题后（160 字符上限），
带 `TextShimmer` 流光与 150ms 防抖。

> 缺口：
> - `[高][中]` 无分组头 → 没有「活动类别图标 + 实时类别标题」这一层。
> - `[高][中]` 折叠摘要口径不同：插件只给 `N 次工具调用 · M 个文件 · K 次失败`，原生给按活动排名的动作短语。
> - `[高][中]` 无实时详情行（`liveProcessDetail`）。
> - `[高][小]` 无「准备中」阶段文案。
> - `[中][小]` 折叠默认值不同：插件 `processExpanded` 只对 `closed && completed` 折叠，
>   原生 `foldCompletedTurns: true` 在 compact/standard/detailed 三档都折叠已完成的轮。
> - ~~`[中][中]` 无 `hasInterleavedInput`（人类中途插话强制展开）语义。~~ —— **已实现**（见下）。
> - `[中][中]` 无 `compactAnswer`（折叠时答案压缩显示）。
> - `[中][小]` `turn-process` 九字段只消费三个计数（`inlineReasoning` / `processStartSeq` / `answerAnchorSeq` / `answerStep` 未用）。
> - `[低][小]` 组体溢出渐隐与组内独立滚动缺失（原生 `max-height: min(400px,50vh)` + fadeTop/fadeBottom）。
> - `[低][小]` 无「3 类以上收敛成 `{title}等`」规则。

**已实现（折叠头一行字）。** `frame-meter.ts` 新增 `activityRanks` / `dominantCategory` /
`activityPhrase`：按活动家族统计一轮的工作量，最多的排前，同数按固定次序
（`terminal > write > read > search > web > other`）拆解，保证跨渲染稳定。短语最多取前三个家族
（**2026-09-23 更正**：此处原写「前两个」，是补齐原生 `{title}等` 收敛之前的旧值，见本节末），
用语言自己的连接词拼（`运行了命令并读取了文件` / `ran commands and read files`）；单一家族独立成句。
`other` 不丢——认不出的调用也是读者该知道被折起来的工作。

折叠头现在是「家族字形 + 动作短语 + 计数」三层：字形取该轮占比最高的家族（`ACTIVITY_GLYPHS`，
与行内图标同一套词汇），短语用标签色（它是头的句子），计数仍用暗色（它只是脚注）。

**真机复核（2026-09-23）。** 用真实 `Reader` 挂载一个已关闭且 `completed` 的轮，实测折叠头出现：
`data-reader-turn-state=closed data-reader-turn-result=completed` → `[data-reader-fold-activity]` 存在，
短语为 `读取了文件并调用了工具`（该轮 2 次 read + 1 次 terminal，家族排名取前二，次序正确）。
同时更正两条此前的错误记录：
1. 折叠头**不限于** compact 档——`WORK_DETAIL_POLICIES` 里 `foldCompletedTurns` 对
   compact/standard/detailed **三档都是 `true`**，`processExpanded` 对 `closed && completed` 一律折叠，
   所以默认档就有这一层（此前记为「只在 compact 范围生效」是错的）。
2. 复核还确认了挂载一个轮所需的最小夹具：`boundaryOf` 读的是
   `snapshot.timeline.turns.get(group.turn)`，**不是**节点自己的 `location.turn`；夹具必须同时给出
   `timeline.turns` 与带 `end.data.reason.kind` 的真实 `TurnLocation`，否则 `status` 恒为 `unknown`、
   轮永不折叠、折叠头**静默不出现**。这一点已写进 `tests/` 的夹具约定。
三者都受同一个门控——只有折叠态才算，展开态已经逐条列出调用，这个 walk 会重读每个调用的参数。
`Disclosure` 因此多一个 `activity` 槽（`data-reader-fold-activity`），默认视觉隐藏，
终端皮肤绘制，其余皮肤保留给辅助技术。

**已实现（中途插话强制展开）。** 原生把这条算作 `ChatPresentationPolicy` 之外的一层：
`turn-process-presentation.ts:40-80` 先找出这一轮**第一个可见的人类输入**（`user` / `steering` /
`turn-trigger`）当基准，再看它**之后**是否还有同类节点，有就 `hasInterleavedInput = true`，
`ChatGroupSeat.tsx:144` 据此把折叠强制打开。它不是展示偏好，是**正确性地板**——折叠不能吞掉
打断它的那条消息本身。

插件的实现分两处：`projection.ts` 里 `isInputNode` + 导出的纯函数
`hasInterleavedInput(keys, get)`（先按可见性过滤、再定位第一个输入、再向后扫描）；`Reader.tsx` 的
`TurnGroup` 订阅它并作为第 4 个参数交给 `processExpanded`。四个刻意的取舍：
1. 做成**纯函数**而不是内联，所以能单测、能被变异验证。
2. 向后扫描「第一个」输入而不是假定 `keys[0]`——`startsWithUser` 对 `turn-trigger` 起头的轮是
   `false`，索引 0 不一定是输入。
3. 可见性过滤发生在定位基准**之前**，否则一条隐藏的开场输入会把基准挪掉。
4. 作用点在 `processExpanded` 内、`choice !== undefined` 之后——**读者自己点开的/收起的永远优先**，
   地板只在读者没有表态时生效。四个折叠档都适用，不只默认档。

**变异验证（2026-09-23）。** 三条守卫各自都能被抓到，且都是**毫秒级**失败：
把座位里的 `interleaved` 参数删掉、把订阅换成常量 `false`、把 `group.keys` 换成 `mainKeys`
（这样开场输入被丢掉，下一个输入就被误判为插话）——三者都让
`a later human message keeps the completed turn open` 变红。

> **测试写法教训（重要）。** 这条守卫最初写成
> `assert.equal(view.container.querySelector('[data-reader-fold-activity]'), null)`。
> 断言**通过**时没问题，一旦**失败**，node 的 differ 会去深度格式化那个 **DOM 元素**——
> React 的 DOM 节点带循环的 fiber 引用——于是整个文件在 `tests 1 / pass 0` 的状态下卡到
> 65 秒超时被杀。**失败时卡死等于没有守卫**：最需要它工作的那一刻它不工作。
> 修正：永远比较**布尔值**，`assert.equal(node === null, true)`，绝不把元素交给 differ。
> 本仓库里同形的 `assert.equal(..., null)` 已一并改成布尔形式。

**已实现（分组头的三态标题）。** 原生 `ChatGroupSeat` 的头是三种状态，不是一种：
`data.closed` 时读收敛后的短语；未关闭且 `summary.preparing` 时读
`message.stepProcess.prepare.<activity>`（且 `thinking` 被替换为 `tools`，因为「准备思考」
不成话）；未关闭且已开始读 `message.stepProcess.<activity>`。插件补上后两态，键为
`frame.prepare.{terminal,write,read,search,web,other,tools}` 与 `frame.running.{…}`，
家族词汇沿用插件已有的 **6 族** `ToolCategory` 而不是原生的 14 个动作名——插件的行只有 6 路，
用两套词汇会让头部和行说不一致的话。`liveFramePhase` 只在 `boundary.status === 'open'`
时解析，所以一个已结算的轮次为零成本；没有在途调用时返回 `null`，调用方退回原有的
`status.*` 相位句子。

> **本轮发现一处长期死代码（重要）。** 头部详情行 `liveDetail` 自写下起就**从未渲染过**：
> 它先取 `liveToolEntry(flow)`，再 `if (entry.block === undefined) return undefined;`——
> 而 `liveToolEntry` 当时的谓词正是 `entry.block === undefined`。两个条件互斥，
> 该 memo 恒为 `undefined`。根因是 `liveToolEntry` 把 0.1.7 的两种**在途**阶段读错了一种：
> 0.1.7 把一次调用拆成「准备」（无 block）与「已开始」（有 block、但 block 无 `kind`，
> 是它自己流式抵达的头部），只有带 `kind` 的才是冻结结果。旧谓词把「已开始」当成已结算，
> 于是**绝大多数真正在跑的调用都看不见**。已修正为「未结算 = 无 block，或有 block 但无 `kind`」，
> `Reader.tsx` 侧的互斥守卫一并去掉。`activityPhase`（tool-activity.ts:121）本来就正确区分了这两态，
> 是本轮的对齐依据；`liveFramePhase` 改为读 `activityPhase` 而不是自己再判一次。
> 变异验证：把谓词改回旧写法，`frame-meter` 立即报错（1.7 ms），恢复后逐字节一致。
> 教训与 §11.13 同源：**两个各自合理的守卫叠在一起会静默抵消**；一个 memo 恒为 `undefined`
> 不会报错，只会让那一行永远空着。

**已实现（折叠头的「等」收敛）。** 宿主 `processTitle` 的规则是：取排名前 **3** 个家族，
2 个用 `joinTwo` 连接，3 个用逗号连接，**超过 3 个**才把整串包进 `more`（zh `'{title}等'`）。
插件原先把上限写成 2（`MAX_PHRASE_FAMILIES = 2`）并且没有 `more` key，所以一个翻了
5 类工具的回合只会报出 2 类。现已对齐：上限 3，新增 `frame.activity.comma`（zh `'，'` /
en `', '`）与 `frame.activity.more`（zh `'{title}等'` / en `'{title}, etc.'`）。

> **本轮删掉了两段抄来但永远走不到的分支（重要，和上一轮同一类问题）。**
> 宿主 `processTitle` 还有两个细节：一是中文标签都是 `已X`，所以它会把后项的公共前缀
> `已` 省掉（`已读取文件` + `已搜索代码` → `已读取文件和搜索代码`）；二是英文标签是句首大写，
> 所以它会把后项改成小写。我一开始**两个都照抄了**，然后做变异验证——两段分支各自存活：
> 把 `shared` 硬写成 `false`、把 `continuation` 改成恒等函数，测试全绿。
>
> 原因是这两段分支在**本插件的词表上不可能触发**：插件的中文标签是 `运行了X` 型
> （`运行了命令`/`修改了文件`），没有任何公共前缀；英文标签本来就是小写短语
> （`ran commands`），不需要降格。也就是说它们是**货真价实的死代码**。
>
> 处理方式是**删掉这两段，而不是补测试让它们看起来在工作**。补测试只能把「常量等于几」
> 钉住，钉不住行为——这正是上一轮 `liveToolEntry` 那类 bug 的形状。删掉之后改用一个
> **不变量测试**守住前提：遍历 6 个家族断言 zh 标签不以 `已` 开头、en 标签首字符已是小写。
> 这样将来谁把标签改成 `已读取文件` 或 `Read files`，就会红——而那才是真正需要重新引入
> 这两段逻辑的时刻。
>
> 教训：**抄上游的行为之前，先确认自己的词表能不能让它触发**；变异验证是发现「抄来的分支
> 是死的」最省事的办法，因为死代码的特征就是「怎么改都不红」。

**已补上真机守卫（2026-09-23）。** 三态标题此前只有纯函数测试（`frame-meter`），
没有任何一项能证明这条路径在真实 `Reader` 挂载下**可达**——而本仓库已经因为这一点吃过一次
大亏（`turn-trigger`/`model-retry` 的分支曾写在没有任何节点经过的 `ProcessNode` 上，
tsc 干净、纯函数全绿）。`reader-seats` 现新增 3 项挂载测试：
运行态给出家族短语（`正在运行命令`）且**替换掉**而非叠加通用状态句；
详情行给出**具体工具名**（`Bash`）——标题说家族、详情说工具，二者刻意不是同一个字符串；
结算后不再自称在跑。
变异验证 4 条全部被抓到：live 分支不可达（14/16）、`liveFrame` 恒 `undefined`（14/16）、
去掉 `policy.liveProcessDetail` 守卫（15/16）、删掉详情行 span（15/16）。
第三条**首次证明 `liveDetail` 的策略守卫是承重的**（上一轮只证了 `liveToolEntry` 那一半）。
教训：**纯函数测试全绿不等于那条路径可达**；一个座位分支至少要有一项挂载测试。

**已实现（组体溢出渐隐与组内独立滚动）。** 原生给折叠的 process 组一个高度上限
（`max-height: min(400px, 50vh)`）并给有内容被藏住的那一侧加渐隐。插件此前两样都没有：
长回合直接长出去，由读者滚动整篇 transcript。现在 `process-scroll.ts` +
`Reader.module.css` 的 `.cappedBody` / `.fadeTop` / `.fadeBottom` 补上。

**这刻意不是宿主 `use-process-scroll` 的移植。** 宿主那一份建在宿主的共享跟随控制器
（`use-scroll-follow`）上，带着本插件没有座位的几件事：对增长中的组体做平滑自动跟随、
`scrollend` 结算、以及从可编辑控件冒泡出来的事件触发中断。插件**不该**再添一个跟随控制器：
transcript 自己的跟随层已经占着「读者想待在哪儿」这个意图，两个控制器互相不同意比只有一个更糟。
所以只抄读者真能看见的部分：**上限**与**两侧渐隐**。组体不自动跟随是设计选择，不是省略。

**上限是 CSS 给的，不是这里量的。** 这一点很重要：`max-height` 才是让 `scrollHeight`
超过 `clientHeight` 的东西，因此不加载样式表的环境（jsdom、以及任何没有 CSS 的渲染路径）
看不到溢出，也就看不到渐隐。所以渐隐**一律由实测指标推导，从不假设**。
推论：哪一档该被限高是调用方的决定（`Reader` 只给真正会折叠的那一档加），
所以 `useProcessScroll` **不接收 capped 参数**——没有被限高的组体本来就没有溢出，
自己就会报出「无内容被藏住」。

**折叠守卫读 `open` prop，不读 DOM 祖先。** 这是新挂载测试抓到的真 bug：`sync` 原先照抄宿主的
`body.closest('[hidden], [data-expanded="false"]')`，但宿主的组体在 `ChatGroupSeat` 的树里，
祖先带着 `data-group-expanded-mode`；**插件的 `Disclosure` 不包裹自己的 body**——标题按钮与
flow body 是 `<section className={css.turn}>` 里的兄弟节点，所以那个选择器永远匹配不上。
教训：**宿主靠祖先选择器拿到的状态，兄弟结构里只能靠 prop 拿**；照抄选择器等于抄了一个
永远为假的条件。这也是本项目第四次「抄来即死」——前三次是 `sharedPrefix`/`continuation`、
`isScrollKey`/`SCROLL_KEYS`，以及本轮的 `saved` 位置恢复。

**本轮删掉了一段永远跑不到的位置恢复（重要，和前几次同一类）。** 原实现用 `saved` ref +
layout effect 保住滚动位置，理由是「React 复用同一元素、浏览器在限高短暂移除时会夹紧 `scrollTop`」。
变异验证：去掉 `onScroll` 里的写入（M3）与去掉恢复那一行（M4）**都不红**（9/9）。
给恢复分支插计数器后跑整个文件：`RESTORES: 0, savedWas: null`——**这条分支按构造就不可达**：
layout effect 的依赖是 `[bodyRef, capped, open, sync]`，而 `sync` 是 `useCallback([bodyRef, open])`，
所以它只在 `open` 变化时重跑，而每一次经 `open`/`capped` 变化进入的运行都先走
`if (body === null || !open || !capped) { saved.current = null; … }` 把 `saved` 清空。
于是 `saved.current` 在恢复路径上**永远非空不了**。结论：`saved`、那段 layout effect 的恢复、
以及 `onScroll` 的写入全是死代码，一并删除，而不是写测试把它装成活的。
删完后 `capped` 参数也失去了唯一用途，一起删掉。
教训：**变异存活可能意味着代码不可测，而不是测试太弱**；同时，**环境可能白送你正在测的行为**
——jsdom 既不夹紧 `scrollTop` 也不重建元素，所以「位置在重渲染后保持」这类断言无论插件怎么写
都会过。判断办法就是 M3/M4 那种「把源码删掉它还会不会过」。

**已补上守卫（2026-09-23）。** 新增 2 项测试，且都用可信变异验证过（不是「改到不红」）：
`process-scroll` 的「重新展开要把被抑制的渐隐报回来」——变异为**从 `sync` 的依赖里漏掉 `open`**
（漏依赖是这类 bug 最可信的形态），2.3 ms 干净报错；`reader-seats` 的
「只有会折叠的档位才给组体限高」——变异为把 `capped` 写死成 `true`（`standard` 与 `verbose`
只差这个设置，其余 fixture 完全相同），14.6 ms 干净报错。
一条方法学记录：`sync` 由**无依赖** effect 在每次渲染后调用，所以它安全的前提是两个
`setEdges` 在无变化时都保留原对象；把折叠分支改成「抑制计算但不 `return`」会让它落到计算分支，
两个 `setEdges` 互相竞争 → **无限渲染循环**，表现为跑满 runner 上限（实测 224 s）且**没有单测行**，
和「把 DOM 节点传给 `assert.equal`」是同一种形态。这种失败**无法用断言固定**，所以只记录在
测试文件头部，不去写一个假装能守住它的测试。

仍缺：`compactAnswer`（折叠时答案压缩显示）。

## 11.7 turn-tail

> 缺口：
> - `[中][小]` 不渲染任何 action：原生有复制、branch/fork（`branchUnavailable` 门控）、结束时间戳、`extraActions` 槽。
> - `[中][小]` 同上，`tokenUsage` 只取 `totalTokens`，明细全丢。

> **2026-09-23 复核更正（方向性）。** 上面第一条里的 **branch/fork 曾被记成「平台硬限制，
> 不可达」——那个结论是错的**，已在下面第 3 条更正并实现。错的不是对槽的描述（那些字都对），
> 而是从「不在我这个座位的 owner props 上」推到「能力不可达」。`forkAt` 在宿主怀里只是
> `sessions.fork` + `uiWorkspace.openSession` 两次普通服务调用，插件够得着。
> `extraActions` 确实仍然不可达。**「查了槽」只算查了一半——要顺着实现追到服务。**

### 已修（2026-09-23）

**1. 结束时间戳——补上了。** 原生的 `TurnTailNodeView` 在尾行用
`<MessageIconActions clock="end" time={closing.time}>` 印出该轮的结束时刻；插件此前只在头部印**时长**，
没有任何绝对时刻，读者无法知道「这轮是什么时候结束的」。

- `TurnTailData` 补齐契约字段：`turn` / `seq` / `time` / `closing` / `branchUnavailable`
  （此前只声明 `tokenUsage`，其余五个字段全部读不到）。
- 时刻取 `closing?.time ?? data.time`。**这个次序是必须的**：`data.time` 是 turn-tail
  节点自己的到达时刻，对一轮重试或续跑的对话来说晚于它所收束的那个回答。夹具里把两者故意拉开十分钟，
  并且断言的是 `closing.time` 的 ISO 值——否则「读错字段」也能通过（第一次变异测试正是这样漏掉的）。
- 新增 `messageClock(time, lang, now)`，镜像宿主的 `formatMessageClock`：当天只印 `HH:MM`，
  非当天补上日期（同年 `clock.md`，跨年 `clock.ymd`），`now` 可注入以便测试跨日边界。
  宿主那两个 key 的取值已抄齐（zh `{m}月{d}日` / en `{m}/{d}`）。
- 行结构改为「用量 · 时刻」，两者**各自独立**：`stats === null && ended === undefined` 才整行不渲染。
  没有用量但有时刻仍然出这一行（宿主每轮都发一个 tail，无条件渲染会在每个回答下留一行空行）。

**2. 复制——不是缺口，是位置不同。** 原生把复制放在尾行的 `MessageIconActions` 里；
插件放在回答卡上（`CopyAnswer`，`Reader.tsx:93`，门控为「最后一段 + 轮已关闭」）。
能力在，座位不同。**不重复再加一个**。

**3. branch/fork——上一版写成「平台硬限制，已确认不可达」，这个结论是错的。** 这里保留原文并更正，
因为「怎么错的」比结论本身更有用。

原文的推理是：`forkAt` 声明在 `ChatNodeOwnerProps`（`conversation.chat.node` 槽的 owner props）
上，而阅读视图挂的是 `conversation.view`，其 owner props 是 `ConvViewOwnerProps`：

```
{ inspectCall, viewRequest, openView, completeViewRequest }
```

`forkAt` / `openFile` / `openSkill` / `renderMessageImages` / `fileMentions` / `turnProcess`
**都不在其中**。——这一段**每个字都是对的**：`ChatNodeOwnerProps` 确实是 `forkAt` 在**槽层**
上的唯一载体（`ui-chat/src/client/contract/slots.ts:110-133`，投递给 keyed 槽
`'conversation.chat.node'`；插件的座位替换了整个 Chat 视图，宿主的 chat-node 渲染器根本不会跑）。

错的是从「槽里拿不到」推到「能力不可达」。**`forkAt` 不是一个槽特权，它是两次服务调用。**
宿主自己的实现在 `ui-chat/src/client/apply.ts:216-223`：

```ts
forkAt: (seq) => {
  ctx.sessions.fork({ sessionId, atSeq: seq, increaseTitle: true })
    .then((childId) => { ctx.uiWorkspace.openSession(childId) })
    .catch(() => {
      // Fork or child-title failure leaves the source view unchanged.
    })
},
```

`ctx.sessions` 与 `ctx.uiWorkspace` 都是普通 Cordis 服务，插件够得着。所以这个能力**能重建**，
而且重建比收一个 prop 更诚实：它是「本插件自己做的两次调用」，不是「宿主塞给我的东西」。

> **方法学更正（比本条更值钱）。** §11.13 已经写过：判断「插件看不到 X」是不是缺口，
> 要**追宿主挂在哪个槽上**。这里补上推论 A：**「不在我这个座位的 owner props 上」不等于
> 「不可达」**——要顺着能力的实现往下追到它调用的**服务**。我上一版停在第一步就下了结论，
> 把一个能做的功能记成了平台限制。
>
> **推论 B：一个服务同时有服务端与客户端两份契约类型时，先看客户端那份。**
> 本条的第二个错误是这样来的：`packages/api/session-controller/src/types.ts:318-326` 的
> `SessionForkRequest` **没有** `increaseTitle`，我据此判定「客户端也不支持」。
> 但插件看到的是 **client** 契约
> （`packages/api/session-controller/src/client/contract/sessions.ts:132`）：
> `fork(opts: { sessionId; atSeq?; increaseTitle? }): Promise<SessionId>`——`increaseTitle`
> **在**，而且直接 resolve 出子 `SessionId`（不是 `SessionForkValue` 包装）。两份契约不一样，
> 我读错了其中一份。

**现在的实现。** `forkAt(seq)` 由 `index.tsx` 组装：`sessions.fork({ sessionId, atSeq: seq,
increaseTitle: true })` → `ctx.get('uiWorkspace')?.openSession(childId)`，失败静默吞掉
（对齐宿主：fork 失败时源视图原封不动）。

- **`'uiWorkspace'` 不进 `inject` 列表，用 `ctx.get('uiWorkspace')?` 懒取。** 不是图省事：
  没有工作区浏览器的部署应该让分支按钮退化成空操作，而不是让整个插件加载失败。
- **`increaseTitle: true` 与宿主一致**：分支出来的对话要有个能区分于父对话的标题。
- `openSession` **同步返回 void**（`ui-workspace/src/client/navigation.ts:36`），不像
  `openWorkspace` 那样返回 Promise 并可能被后来的调用取代，所以不需要等待。
- **`forkAt` 只挂在 `SeatProps` 上，不挂 `BlockRenderProps`**。这条是 tsc 逼出来的：
  放进共享别名会让 `MarkdownText` / `ToolMedia`（`Reader.tsx:148`、`:158`）因为少传一个
  用不到的字段而编译失败。**能不给就不用给：加宽一个被广泛展开的 `Pick<>` 之前，
  先确认每个消费者都供得起这个字段。**
- `MainNode` 是具名解构 props 的，所以 `forkAt` 必须在参数表里**写明**——`...render` 剩余参数
  **不会**把它带进作用域（本轮这个坑踩了两次，第一次的表现是 `error TS2304: Cannot find name
  'forkAt'`，因为字段落在了 rest 里）。

**按钮的门控是「禁用」，不是「隐藏」。** 对齐宿主的 `MessageIconActions`：按钮**始终在**，
不可用时 `aria-disabled` + `data-unavailable` + 一个 `aria-describedby` 指向的视觉隐藏说明，
并且 `onClick` 才是 `undefined`。理由：宿主用 `aria-disabled` 而不是原生 `disabled`，
是因为**原生 disabled 的按钮不派发 hover/focus**，而 tooltip 要靠这两个事件——所以「禁用」
必须同时是「点击被忽略」，两件事分开写，缺一个就变成一个点得动的假禁用按钮。

- `seq` 取 **`data.seq`**（尾节点自己的序号），不是它所收束回答的序号。宿主传的就是这个；
  在回答的序号上 fork 会**截断这一轮**，因为 tail 节点在它收束的回答之后才到达。
- 时刻取 `data.closing?.time ?? data.time`（§11.7 第 1 条已定）。
- 提前返回改成「三个理由任一成立就渲染」：
  `if (stats === null && ended === undefined && !branchable) return null;`。
  只按 `stats` 门控会把分支按钮从**恰好只有它可报**的那些轮次上拿掉——而那正是读者最想分支的轮次。
- 行根元素从 `<p>` 改成 `<div>`：**`<button>` 不是 phrasing content，放在 `<p>` 里是非法 HTML**。
  宿主的尾行根也是 `div`。`.turnTail` 只写布局（margin/padding/字体/配色），换元素不影响样式。

**测试**（`tests/fork.client.test.tsx` 3 项 + `tests/reader-seats.client.test.tsx` 4 项，全部变异验证过）：
- 本仓库**此前没有任何测试驱动 `apply()`**（`grep -rln "apply(" tests/` 为空），
  所以 `tests/fork.client.test.tsx` 是第一个。它读**注入出来的 face**，不搭一个假的替身——
  「调错服务」「漏参数」「开错会话」这三类错误，只有穿过 `apply` 才能被看见。
- `branching forks the session at the tail and opens the child`：断言 fork 参数三元组
  与打开的会话；另外断言**同一 session 两次 `inject()` 返回同一个对象**（face 每帧重建
  会让 React 每次都拿到新函数标识）。
  变异：`atSeq: seq - 1` → 挂（2 项红）；去掉 `increaseTitle` → 挂；`openSession(sessionId)`
  开成父会话 → 挂。
- `a host without a workspace browser still forks`：`ctx.get('uiWorkspace')` 返回 `null` 时
  仍然 fork 成功。这条钉住「懒取而不是进 `inject`」的决定。
- `a refused fork is swallowed instead of escaping the click handler`：拒绝不得从点击处理器逃出去。
- `the tail branches at its own sequence, not the answer it closes`：夹具故意让 `seq` 与
  `closing.time` 所指不同，点击后断言收到的序号是尾节点自己的。
- `a turn that cannot be branched explains itself instead of hiding the control`：
  按钮**还在**、`aria-disabled`、`data-unavailable`、`aria-describedby` 指向真实节点、
  点击不 fork。变异：让 `onClick` 忽略 `unavailable` → 挂。
- `a bare tail still offers a branch even with nothing else to report`：夹具**故意不带**
  `time` / `closing` / `tokenUsage`——只有这个形状才让提前返回里的 `branchable` 判断**承重**。

> **本轮抓到一个「测试绿但没测到」的实例（与 §11.6 同类，值得单记）。**
> 这条测试第一版夹具留着 `time: 1_700_000_010_000`，于是 `ended !== undefined`，整行本来就
> 会渲染；我把提前返回里的 `!branchable` 去掉后**测试照样全绿**——`branchable` 是个死条件，
> 被另一个理由遮住了。改掉夹具、让它真的成为「什么都没有的尾行」之后，同一个变异立刻干净报错。
> 教训：**一条守卫的每个前提都必须能被单独逼近**；夹具顺手给的一个字段，会把另一个字段的守卫
> 变成永远为真的装饰。这也说明这条测试原来的断言 `assert.notEqual(end, null)` 是假守卫——
> 它测的是 `time` 那条路径，不是 `branchable` 这条。

> `extraActions`（`conversation.chat.assistant-actions`）**仍然不可达**：它是宿主的 chat-node
> 渲染树提供的插槽句柄，阅读视图不在这棵树里。这一条上一版是对的，保留。
> 与 `forkAt` 相关的另一个后果也保留：原生用 `data.branchUnavailable || hasLaterChatNode`
> 决定禁用，其中 `hasLaterChatNode` 需要 `snapshot.locations.getTurn(turn)`；插件复用的是
> 宿主**已经算好**的 `data.branchUnavailable`，所以没有「自己算错导致按钮状态错」的风险。

**4. `tokenUsage` 明细——此前已修**（§11.3）：行内印总量 / 缓存命中率 / 推理占比，
完整分桶与计费路由挂在 `title` 上。

**测试**（`tests/reader-seats.client.test.tsx` + `tests/fork.client.test.tsx`，全部变异验证过）：
- `the turn tail stamps when the turn ended` —— 断言 `datetime` 等于 `closing.time` 的 ISO；
  把 `data.closing?.time ?? data.time` 改成 `data.time` 会挂。
- `a tail with nothing to report renders no row` —— 把 `stats === null && ended === undefined`
  放宽成 `stats === null` 会挂。
- `an end stamp renders even when the turn reported no usage` —— 同上。
- `the tail branches at its own sequence, not the answer it closes` —— 点击后断言收到的序号
  是尾节点自己的；把 `data.seq` 换成「回答序号」会挂。
- `a turn that cannot be branched explains itself instead of hiding the control` ——
  禁用态仍在、`aria-disabled` / `data-unavailable` / `aria-describedby` 都成立、点击不 fork；
  让 `onClick` 忽略 `unavailable` 会挂。
- `a bare tail still offers a branch even with nothing else to report` —— 夹具故意不带
  `time` / `closing` / `tokenUsage`；把提前返回里的 `!branchable` 去掉会挂。
- `branching forks the session at the tail and opens the child` / `a host without a workspace
  browser still forks` / `a refused fork is swallowed instead of escaping the click handler`
  （`tests/fork.client.test.tsx`，驱动 `apply` 本身）。
- `tests/locale.test.ts` 的 `messageClock prints a bare clock for today and a dated stamp otherwise`
  覆盖当天 / 同年 / 跨年三种形态、双语。

## 11.8 阅读 / 滚动 / 导航

原生把这套行为拆成 7 个新 hook（`use-chat-scroll` / `use-chat-reading` / `use-chat-viewport` /
`use-chat-navigation` / `use-scroll-follow` / `use-process-scroll`）+ `TurnNavigator.tsx`。

**关键：这个面插件整体不比原生弱，几处反而更强。** 所以这一节不是「补齐」，而是「别在重构中丢掉」：

| 行为 | 插件 | 新原生 |
| --- | --- | --- |
| 轮次间键盘跳转 | 有（Alt+↑/↓） | 只有点击（`TurnNavigator.tsx`） |
| 选中文本/焦点在输入框时暂停跟随 | 有 | **没有** —— 仍会自动跟随，打断阅读与选择（`use-chat-reading.ts:126`） |
| 推理流式逐段跟随 | 有（两行步进） | 没有（`ReasoningRow.tsx`） |
| 跳转后目标高亮反馈 | 有 | 没有（`TurnNavigator.tsx:74`） |
| 恢复阅读位置提示 | 有 notice | 没有（`use-chat-reading.ts:88`） |
| 平滑滚动 + jump-lock | 有 | 瞬间跳转（`use-chat-viewport.ts:391`） |
| 未读/新内容标记 | 无 | 无 |
| 阅读状态采样延迟 | — | 500ms（`use-chat-reading.ts:8`），跟随手感滞后 |

> 唯一值得抄的：原生 `use-process-scroll` 的**组内独立滚动 + 上下渐隐遮罩**（见 §11.6）。
> 其余差异建议**保持插件现状**，不要为「同步」而回退。

## 11.9 压缩与命令

**又一处插件更强的面。** 插件的「记忆分隔线」是 0.10.x 专门设计过的（横贯列的发丝线 + 胶囊 +
可展开的记忆备忘 + `compaction.ts` 抽出的三态文案）；新原生 `CompactionItem` 只是
一条 24px 暗色行 + 图标 + 文字，摘要裸挂在按钮下方、无容器框、无备忘标题栏。

| 项 | 插件 | 新原生 |
| --- | --- | --- |
| 压缩失败呈现 | `FailureCard`（标题 + 完整结算文本） | 无专用呈现，走 `GenericCommandCard` |
| 普通命令失败 | `FailureCard` + 回退指引 | 13px 行内红字 |
| 计数缺失的三态文案 | 有（仅 items / 仅 tokens / 皆无） | 只有一种，缺失时退化 |
| tokens 紧凑格式化 | `1.2k` | 原始整数（未复用自家 `formatTokens`） |
| 命令多行输出 | 任意文本都完整渲染 | 仅含 `\n` 才可展开 |
| 运行中命令文案 | 「正在整理上下文…」 | `TextShimmer` 微光 + 通用 `command.running` |
| `/compact` 成功标题 | 不带命令名 | 复用常量 `'compact'`，标题恒为英文命令名 |

> 建议：**保持插件现状**。仅两条可考虑对齐原生：摘要为空时用普通 `span` 而非禁用按钮（原生已这么做），
> 以及 tokens 格式化改用宿主 `formatTokens()` 以与 §11.3 的读数一致。

## 11.10 助手正文与 Markdown

| 缺口 | 影响 / 工作量 | 证据 |
| --- | --- | --- |
| 推理正文用纯文本渲染，原生用 Markdown（表格/代码/KaTeX），思考中的 Markdown 显示为原文 | 高 / 小 | `word-motion.tsx:58,101` vs `ReasoningRow.tsx:70` |
| 推理折叠摘要无「已完成段落首行」预览与 `**` 去除，流式时摘要抖动 | 中 / 中 | `ReasoningRow.tsx:16-32` vs `Blocks.tsx:97` |
| 推理展开态由卡片自持 `useState`，不随外层 Turn 折叠复位（原生有 `disclosureReset`） | 中 / 中 | `ReasoningCard.tsx:17` vs `ReasoningRow.tsx:54` |
| 本地路径图片语法不渲染（非 http(s) 目标只显示 alt 文本） | 中 / 中 | `markdown/render.tsx:467-471` vs `AssistantMarkdown.tsx:23-28` |
| Markdown 图片无灯箱/大图查看 | 中 / 中 | `render.tsx:467+` vs `ui-primitives/.../render.tsx:660` |
| 缺 `variant="compact"` 紧凑排版（推理/次要正文只能用完整文档字号） | 中 / 小 | `MarkdownText.tsx:175,197-198` |
| 无 `MarkdownDelegateProvider`，本地文件链接不可点 | 中 / 大 | `MarkdownDelegate.tsx:42-54` vs `render.tsx:517-520` |
| 文件链接无 HoverCard 图片预览 | 低 / 中 | `render.tsx:585-605` |
| `other` 块仅在 mcp-app 且有 html 时识别，其余降级「不支持」+ 原始 JSON | 低 / 小 | `Blocks.tsx:111-123` vs `AssistantMarkdown.tsx:131-139`（用本地化 `message.unknownBlock`） |

**插件领先、不要丢的**：
- ```mcp-app 围栏 → `McpAppFrame`（新原生 `ui-primitives/.../render.tsx:387-404` **已无此分支**）
- 流式文本的 sr-only `role="log"` 播报（原生推理行只有视觉隐藏的「思考中」，读屏反馈更弱）

## 11.11 建议优先级（§11 内部）

**先说清楚方向：§11 不是单向「补齐」。** 审计发现插件的压缩分隔线、命令失败卡、
阅读/滚动/导航（键盘跳转、选中暂停跟随、推理逐段跟随）、mcp-app 围栏、sr-only 流式播报
都**强于或领先**新原生。这些**不要为「同步」而回退** —— 展示同步只针对「原生有、插件没有」的项。

不要一次全做。按「信息量 ÷ 成本」排：

**第一批（高信息、低成本，且多为 bug 级）**
1. §11.3 的 `ttftMs`/`tokensPerSecond` 字段失效 —— 现在是**静默丢字**。
2. §11.5 的 `producer` 字段（与 §4 合并做）—— 现在上下文行 role/label **恒为空**。
3. ~~§11.2 `turn-trigger` 渲染~~ —— **已完成**（`native/TurnTriggerRow.tsx`）。
4. §11.4 的 `argsRaw` preparing 修复 —— 现在会显示**裸 callId**。
5. §11.4 的 `read_image` 分类 —— 旧拷贝缺项，标题退化为 "Tool call"。

**第二批（新增一层信息）**
6. ~~§11.3 会话统计条（`sessionStats` 投影）~~ —— **撤销，不该做**。宿主自己的 `StatsPills` /
    `ContextMeter` 挂在 composer dock，插件只替换 `conversation.view`，**看不到的东西一天都没少**；
    复刻等于同屏两份不同源统计。见 §11.0 与 §11.3 的 2026-09-23 复核。
7. §11.3 逐轮用量 pill + 弹窗（**这个是真空缺**：分桶已在 `title`，缺可展开的面）。
8. §11.5 用户消息的引用标注（`referenceLabels` 已修，`skillNames` 仍缺）+ 图片/文件附件 + 时间戳 + per-message 图标操作。
9. §11.10 推理正文改走 Markdown。

**第三批（结构性）**
10. ~~§11.1 工作细节档位（四档）~~ —— **已完成**（`src/skin.ts` 的 `WORK_DETAIL_POLICIES` + 设置面板第四项）。
11. ~~§11.6 分组头 + 实时标题 + 实时详情~~ —— **已完成**（折叠头三层：家族字形 + 动作短语 + 计数；
    实时详情行走 `liveProcessDetail`）。剩余小项见 §11.6「仍未做」。
12. ~~§11.7 turn-tail 的结束时间戳~~ —— **已完成**。branch/fork 与 `extraActions` 为平台硬限制，见 §11.7。
13. §11.4 的 todo / details / ask-question 三类专用行。


## 11.12 渲染路径只有一条（本轮修的静默失效）

`Reader.tsx` 里有两处节点渲染：`ProcessNode`（折叠区里的过程条目）和 `MainNode`（分组首节点，以及所有非过程节点）。

本轮之前，`turn-trigger` 和 `model-retry` 的分支只写进了 `ProcessNode`。看起来合理——两者都"像"过程性内容——但 `MainNode` 才是这两类节点实际走的路径：`turn-trigger` 是 turn 的**第一个**节点（走 `startsWithUser` 那条 `:324`），`model-retry` 也不是过程条目（走 `:334`）。结果是：

- 新写的 `TurnTriggerRow` **完全不可达**，触发器节点仍然什么都不显示；
- 旧的一行 `retryState === 'scheduled' ? ... : null` 还留在 `MainNode` 里，与 `ProcessNode` 里新的 `ModelRetryRow` 相互矛盾——同一个重试会因为 turn 走哪条路而渲染成两种样子；
- **tsc 全绿、202 个测试全绿**，因为没有任何测试挂载真实的 `Reader`。

修法：把两个分支移进 `MainNode`，`ProcessNode` 只保留 `context` / `command` / `manual-compaction`。分组首节点（`:324`）和过程条目（`:334`）从此共用同一套分支。

附带发现并修掉两件事：

1. `MainNode` 没有宿主 `chat` locale seat（它直接读插件词典），所以 `TurnTriggerRow` 的 `t` 改为可选：`NoticeBody` 需要的 `message.unknownBlock` / `json.truncated` 在没有 seat 时回落到插件自己的 `block.unknown` / `truncate.label`。行的标题与说明本来就来自插件词典，不受影响。
2. `data-trigger-family` 原先只挂在**展开后**的 body 上。折叠态（默认态）因此读不出家族——而"这个 turn 是谁唤醒的"恰恰是这一行存在的唯一理由。已把标记上移到自带的 wrapper，折叠行也声明家族；`tests/turn-trigger.client.test.tsx` 现在先断言折叠态能读出 `data-trigger-family="schedule"`，再断言 body 尚未渲染。

**补上的防线**：`tests/reader-seats.client.test.tsx` 真正挂载 `Reader`（不再只测组件本身），断言触发行与重试行**出现在渲染树里**。这类断言是唯一能发现"分支写在了不会走到的路径上"的检查——组件单测全绿也照样漏。写完后做了一次变异验证：把 `MainNode` 里的 `model-retry` 分支改回 `return null`，3 条断言中 2 条立刻失败（触发器那条仍通过，说明失败是定向的而不是整体崩）。

教训（与 §11.3、§11.2、§11.5 属同一族）：**渲染分支写在了运行时不会被走到的路径上**。类型系统不会报警（分支合法），纯函数测试也不会报警（函数都对）。判断一个节点分支是否可达，必须看它在 `Reader` 里真正经过哪条 `MainNode`/`ProcessNode` 调用，而不是看它"像不像"过程内容。


## 11.13 审计方法返工：三条「缺口」里有一条根本不存在

本轮没写新功能，而是回头把 §11 的审计结论逐条对回宿主的**挂载点**。结果三条里有一条
是纯误报、两条证据失焦。这一节记的是**怎么错的**，因为错的模式是可重复的。

### 误报：会话说统计条「用户看不到」（§11.3）

原结论：`[影响:高]` 插件不读 `useProjection('sessionStats')`，会话级读数也没有。

实测链路：

| 步骤 | 事实 | 出处 |
| --- | --- | --- |
| 1 | `StatsPills` 注册在 `conversation.composer.dock` | `ui-chat/src/client/apply.ts:229` |
| 2 | 该槽渲染于 `InputBar` 内部 | `ui-conversation/src/client/skeleton/InputBar.tsx:500` |
| 3 | `InputBar` 注册在 `conversation.composer.bar` | `ui-conversation/src/client/apply.ts:380-492` |
| 4 | 插件替换的是 `conversation.view`，渲染于 `DefaultConversationViews.tsx:39` | — |

两者是**兄弟槽**，不在一条渲染链上。宿主自己的 `skeleton.client.spec.tsx` 就是把
`conversation.view` 和 `conversation.composer.bar` 当两个独立分支分别挂载的
（`:265` 与 `:415` 一带），这本身就是佐证。

所以**用户一直看得见会话统计**。插件「没实现」和「用户看不到」被混为一谈了——后者才是缺口。
复刻的结果会是同屏两份不同源的统计，**比不实现更糟**。

注意这与 §11.7 的 `forkAt` 是**相反的**结论，两者的区别值得记住：

- `forkAt`：**同一个槽**的 owner props 里没有 → 真的够不着，是平台硬限制。
- `sessionStats`：**根本不在同一个槽** → 够不着也无所谓，因为宿主自己那份还在渲染。

### 证据失焦：把「实现得弱」记成「完全丢失」

- §11.5 写「用户 image / file 附件被丢」——错。`contentBlocks`（`Blocks.tsx:70-76`）第二行就是
  `image → {kind:'image', attachment}`，`fallback` 的 `case 'image'` 走 `ImageBlock`。图片正常渲染；
  非图片文件落进 `kind:'other'`，是**退化为通用卡**而不是丢失。
- §11.5 写「`context` 行仍读 `provenance`」——错。全库已无 `provenance`，
  `ContextInjectionRow.tsx` 读的是 `producer`。
- §11.5 写「`context` 行图标退化为旧版 `IconBrowseOutline16`」——错。
  `ContextInjectionRow.tsx:42-45` 已按 `producer.role` 分叉（recall → `ReferenceIcon`，否则 → `ContextGlyph`）。

同类误判至此**累计四次**（另一次是 §11.6 的折叠头）。四次都是同一个动作：
**只读插件代码，然后凭印象推断宿主会怎么做**。插件代码只能证明「插件做了什么」，
证明不了「读者最终看到什么」——后者由「宿主哪个槽渲染了什么、那个槽有没有被替换」共同决定。

### 一条被冤枉的前提（§11.0）

§11.0 记「插件当初放弃的一整层信息现在可以做了」。前半句对，后半句对**会话级读数**不成立
（见上）。真正成立的只有插件自己那条**行内单行**（turn-tail 的用量行，§11.3 已修）。
§11.11「第二批」第 6 项据此撤销。

### 本轮确立的审计口径

判断一条「原生有、插件没有」，必须走完三步，缺一步就会重犯上面的错：

1. 这个能力**挂在哪个槽**？（读宿主的 `slots.register` / `renderSlot`，不是读插件）
2. 那个槽**有没有被插件替换**？（插件只替换 `conversation.view` 这一处）
3. 用户实际看见的是**哪一份**？

以及一条配套的：**注了 `[影响:高]` 的结论要先写探针再写代码**。本轮的 `useProjection` 可达性
就是用 `src/` 内的探针（`'YES'` 干净 / `'NO'` 报 `TS2322`）定下来的——
注意探针必须放在 `src/` 下，放仓库根会被 `tsconfig.json` 的 `"include": ["src"]` 静默排除，
`tsc` 全绿反而什么都不能证明。

### 本轮验证

- `npx tsc -p tsconfig.json --noEmit` → 干净（`src/probe-proj.ts` 探针已删）。
- 全量测试 `252 / 252` 通过。
- 语言键等值 `zh 358 / en 358`，双向漂移 `[[], []]`。
- `lib/` 重建成功；产物核对：`data-reader-turn-end`、`data-reader-turn-usage`、
  `clock.md`、`clock.ymd`、`messageClock`、`data-trigger-family`、`data-reader-fold-activity`
  均在包内，无陈旧产物。

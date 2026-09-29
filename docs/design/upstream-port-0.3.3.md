# 上游回搬计划：`dsh-better-display` 0.3.3 → `dsh-deckseek`

> 工作文档：跨机器续作用。四项工作 **W1–W4 都要做**，按 W1 → W2 → W3 → W4 顺序推进。
> 前置阅读：[compat-0.1.7.md](compat-0.1.7.md)、[compat-0.2.0.md](compat-0.2.0.md)。
> 评估时间 2026-09-29，上游基线 `ae93253`（`dsh-better-display@0.3.3`，2026-09-26）。

## 0. 基准事实

| 项 | 值 |
| --- | --- |
| 两仓库分叉点 | `3b0177f`（2026-09-04） |
| 上次同步 | `b158c5d`（2026-09-15）；上游当时 HEAD `197817b`；只挑搬 4 条（`3759091` `13ed6ee` `17af854` `7049304`） |
| 上游现在 | `ae93253` = 0.3.3；自分叉点 63 个非 merge 提交，**自上次同步起 41 个** |
| 本仓库 | 自分叉点 90 个非 merge 提交 |
| 宿主线 | 上游 peer `>=0.1.7-rc.1 <0.1.8`、devDeps `0.1.7-rc.2`；**本仓库 peer `>=0.1.7-rc.1 <0.3.0-0`、devDeps `0.2.0-rc.1`** |

**结论：不整包 merge，继续按短清单挑搬。** 三条硬约束：

1. `git merge upstream/main` 冲突 **136 个文件**（去掉 `lib/` 构建产物仍有 **33 个**，其中 **21 个在 `src/`**），全部是本仓库重写过的核心文件。两边都在快速重写同一批文件（本仓库 90 提交 / 上游 63 提交），merge 只会得到既不认识上游也不认识本仓库的中间态。
2. `package.json`、`cordis.patch.yml`、`src/dsh-better-display.ts` 冲突会**回退改名**：包名拉回 `dsh-better-display`、条目 id 改回、扩展槽 `dsh-deckseek.block` 一并被覆盖。
3. **宿主版本线是反的**：上游锁死 `<0.1.8`，而桌面宿主已升到 **0.2.0-rc.1**。`0.2.0-rc.1` 不在 `<0.1.8` 内，会被 `evaluatePluginCompatibility` 判为不兼容直接 `disabled`（见 compat-0.2.0.md）。照搬上游的 peer 范围 = 在自己的主力环境上把插件弄坏。
   → **本次四项工作一律不触碰 peer 范围，保持 `>=0.1.7-rc.1 <0.3.0-0`。**

### 0.1 为什么只挑四项：41 条里大多数本仓库已独立做完

这些**不要**作为工作项，避免二次劳动：

| 上游能力 | 上游证据 | 本仓库对应实现 |
| --- | --- | --- |
| 迁到宿主 0.1.7-rc.1 | `d14f9cc` `842d0a0` | 0.11.0 自行迁完（17 处 API 破坏 + 图标字重体系） |
| 逐轮结束时刻 | `98b7fb9` | 0.11.0 `messageClock`（取 `closing.time`） |
| 从一轮分叉 | `e179c22` `093bddb` | 0.11.0 `forkAt`（`src/client/index.tsx:92`，`sessions.fork` + `openSession`） |
| 过程细节档位 | `fold-intensity.ts` | `workDetail`（compact/standard/detailed/verbose，更细） |
| 吸顶件层次阶梯 | `ecdb437` | 0.10.1 已定 `--dx-layer-chrome: 7` + 宿主层级表 |
| 设置节 | `933a45c`、`SettingsSection.tsx` | `DeckSeekSection.tsx` + `skin-settings.ts` |
| 工具行族标 / 单行摘要短语 | 0.2.0 | 0.11.0 族字形 + 按工作量排名短语 |
| 逐轮用量分桶 | 0.3.0 | 0.11.0 改读 `tokenUsage`（含删除的 `tokensPerSecond`/`ttftMs` 处置） |
| 等待时钟逐工具计时 | `WaitClock.tsx` | `status-verb.ts` + `liveProcessDetail` 已覆盖语义 |
| 去 unicode 图标 | `4f5910e` | `icons.ts` + 一格宽字形契约（刻意设计，不搬） |
| 构建适配器 / stock install bundle | `91048c1` `262ee19` | 只对上游的安装方式有意义 |
| 文档/发布提交 | `90d989d` `a79db4c` `e2702a3` `e1822e8` `ae93253` … | 无关功能 |

---

## W1 · 披露动画的活性兜底（工作量 S）

**上游依据**：`8e07d34`「给每个动画披露一个截止时间，行必须能打开」。上游描述的症状：四处界面只在 Web Animation 触发 `onfinish` 时才揭示内容；`fill: 'both'` 会把**起始关键帧**（`height: 0` / `opacity: 0`）一直钉住，而永不推进的动画（被重跑取消、组件卸载、合成器跳过的子树）永远不触发 `onfinish`，于是那一行留在 DOM 里、零高度零透明——**点一下像没反应**。

**本仓库现状（同一个缺陷类，已逐行核对）**：

| 落点 | 现状 |
| --- | --- |
| `src/client/motion.tsx:224`（`ProcessFragment` 展开/收起） | `element.animate([...], { fill: 'both' })`，`onfinish`（:226）里才 `setPresent(open)` |
| `src/client/motion.tsx:261`（`RetiringContent` 退场） | 同上，`onfinish`（:263）里才 `setPresent(false)`；不触发则**旧旁白留在屏上** |
| `src/client/ReasoningCard.tsx:287`（思考卡高度重排） | `onfinish`（:289）里才清 `port.style.maxHeight = 'none'` / `height`；不触发则内联样式一直被动画覆盖 |

本仓库 `motion.tsx` / `ReasoningCard.tsx` 里**没有任何墙钟兜底**（`motion.tsx:133` 的 200ms 是状态词换词 settle，`:406` 是 `jumpLock` 计时，都不是这个）。

> 已复核**不需要**改的第四处：`src/client/word-motion.tsx:28` 用 `fill: 'backwards'`（不在结束后钉住），并已显式处理 `document.hidden` 与清理（:36-42），风险窗口只覆盖动画进行中，判定为低风险，只做记录。

**上游修法（照抄其形状）**：每处加一个幂等 `settle()`，`animation.onfinish = settle`，再用 `window.setTimeout(settle, duration + slack)` 兜底；cleanup 里 `clearTimeout`。上游把 slack 定为 `watchdogSlack: 240`（`fold-choreography.ts` 的 `FOLD_TIMING`）。

**设计**：不重复四遍，抽一个模块 `src/client/animation-deadline.ts`：

```ts
/** 折叠编舞已经用的那道闸，这里统一成同一个数。 */
export const WATCHDOG_SLACK_MS = 240;

/**
 * 让 settle 只跑一次：onfinish 先到就用 onfinish，动画永不推进时由墙钟兜底。
 * 返回清理函数，必须由 effect 的 cleanup 调用，否则接线后仍会settle 到已卸载的树上。
 */
export function settleByDeadline(animation: Animation, settle: () => void, durationMs: number): () => void
```

三处落点改为：`settled` 闩 + `settle()`（内部保留原有的 `running.current === animation` 身份判断，只用于清引用+`cancel()`），`onfinish = settle`，返回 `() => { clearTimeout(deadline); ... }`。

**注意两处上游踩过的细节**：

- `ProcessFragment` 的 cleanup 必须**先清定时器**再 `cancel()`；上游另有一条：`present` 是 effect 依赖，提交它会让 effect 重跑，cleanup 才在「移除已应用」之后取消动画——那是唯一能安全丢掉 `fill` 的时刻。本仓库结构相同，别把这条拆掉。
- `ReasoningCard` 要额外保证 `maxHeight` / `height` **即使动画永不结束也要还原**（把还原动作放进 `settle()`，而不是只放在 `onfinish` 里）。

**验收**：

- 纯函数/假对象测试（新增 `tests/animation-deadline.test.ts`）：① `onfinish` 路径 settle 恰好一次；② `onfinish` 永不触发时到 deadline settle；③ 两者都触发时仍只 settle 一次；④ cleanup 后 deadline 不再 settle。
- **挂载测试**（新增 `tests/disclosure-liveness.client.test.tsx`）：让 `Element.prototype.animate` 返回一个**永不 resolve、只带 `cancel()` 的对象**，挂载真实的折起行→点击展开→断言内容可读（不能断言 DOM 里「有节点」就算过）。这条对应本仓库已写进 CHANGELOG 的教训：**纯函数全绿不等于那条路径可达**。
- 变异验证：把 deadline 去掉，②④ 必须失败。

**风险**：低。唯一要注意的是兜底时长要与动画时长一致（`motion.tsx` 260ms、`ReasoningCard.tsx` 300ms、`RetiringContent` 220ms），不要照抄上游的 380ms。

**状态：已完成（2026-09-29）。** 落地形态与本文档的设计一致，另有两处实现细节值得记：

- 抽出的模块是 `src/client/animation-deadline.ts`（`WATCHDOG_SLACK_MS` + `settleByDeadline`），
  三处的时长各自具名导出：`DISCLOSURE_SIZE_MS` 260、`RETIRE_SIZE_MS` 220、`RESIZE_MS` 300，
  兜底与动画共用一个数，不再有两份副本。
- 本仓库**没有**上游的第四处（`DiffPanel`/`MorphPanel`），所以是 3 个落点；`word-motion.tsx`
  已复核为低风险不改。
- 测试 306 → **315 项**（纯函数 5 + 挂载 4）。**七条变异逐条验证过**：去掉 deadline → 8 项全
  红；cleanup 变空操作、去掉幂等闩、commit 不清定时器、以及三处落点各自退回 `onfinish` →
  每次都被对应的那一项抓到，且都在 3–4 秒内快速失败。
- 挂载测试用**永不 resolve 的动画替身**（happy-dom 的原生 `animate` 是会完成的，不替身就永远
  走不到「不等它」的那条路）。

---

## W2 · 吸顶缝隙的「补漆」（工作量 S）

**上游依据**：`1cf1a53`。吸顶车道只给自己的框刷实心底色，于是**流内的缝隙**（`.turn` 的 14px gap、前一个 cell 的 16px padding、status 车道右侧为控件组预留的宽度）在滚动时透出下面的内容，看上去是一块块「带缺口的实心板」。上游的修法是把每块板**向上／向右补漆**成连续色带：

```css
/* 负偏移、0 模糊、0 扩张、实心底色：只画，不参与布局 */
.turnProcessSticky { box-shadow: 0 -14px 0 var(--dsw-alias-bg-base), var(--reader-control-width, 148px) 0 0 var(--dsw-alias-bg-base); }
.flowCell[data-flow-summary] { box-shadow: 0 -16px 0 var(--dsw-alias-bg-base); }
.closedProcessSummary      { box-shadow: 0 -14px 0 var(--dsw-alias-bg-base); }
/* 半透明皮肤必须退出：玻璃档那几个车道改成 static，阴影要一起清掉 */
.root[data-reader-glass] .flowCell[data-flow-summary],
.root[data-reader-glass] .closedProcessSummary { box-shadow: none; position: static; }
```

三个可直接借用的要点：**偏移量必须等于真实流内间隙**（不是凭感觉给的数）；**横向那一笔用来盖住为控件预留的宽度**；**半透明皮肤必须显式退出**。

**本仓库现状**：本仓库**没有**上游那套逐轮多车道（`turnProcessSticky` / `flowCell` / `closedProcessSummary` 在 `Reader.module.css` 里计数为 0），所以不是照搬三条规则，而是把**手法 + 纪律**用到本仓库自己的吸顶件上：

- `Reader.module.css:123` `.topBar`：`sticky; top: 0; background: var(--dsw-alias-bg-base)`。
- `Reader.module.css:768-771` 终端皮肤的 `.topBar`：`margin: -10px calc(-1 * var(--dx-frame-pad-x)) 0; padding: 10px var(--dx-frame-pad-x) 0;` —— 注释写明是「把 bar 出血到框内沿，否则框内的 10px 边距会有内容从缝里滑过」。**上边那 `-10px` 正是「补缝」，而它用的是负外边距。**
- `Reader.module.css:1178` 终端皮肤 `.statusBar`：`sticky; bottom: 0; z-index: 3`（底边钉住）。
- `Reader.module.css:101` `.rail`：`sticky; top: 12px`（与 `top: 0` 的 `.topBar` 是两条不同基线，是缝隙的高发处）。

**设计**：

1. **凡是为「盖住流内缝隙」而存在的负外边距，一律改用零布局代价的 `box-shadow` 补漆。** 理由是本仓库自己的教训：负外边距改布局，而本仓库已经因为一个改布局的定位方式造出过**幽灵滚动范围**（`Reader.module.css` 里那段注释记着 `scrollHeight 12310 → 2107`，见 :1152；0.12.0 又因为纹理层照抄同思路二次踩坑）。`box-shadow` 只画、不进布局，从机制上排除这类回归。
2. **出血/宽度问题留给外边距**：终端皮肤那条负外边距同时承担「横向出血到框内沿」（宽度），这部分**保留**；只把纵向 `-10px` 换成补漆。
3. **逐处实测取数**：`.turn` 是 `gap: 14px`（`Reader.module.css:129`）、`.turn + .turn` 是 `margin-top: 16px`（:130）、终端框有 `--dx-frame-pad-x` 与 10px 内边距。偏移量按实测填，写进注释说明它对应哪个间隙。
4. **三套皮肤 + 纹理档逐一过**：软卡 / 纸面 / 终端三套，以及 `texture: crt` 等档位。半透明或纹理叠加的档位必须像上游那样**显式退出**补漆，否则会出现一块不透明的假色带。

**验收**：

- 新增守卫（上游同形：`tests/footer-precedence.test.ts` 同时守源码表与构建产物）：断言「凡是不透明吸顶件、且其上方存在流内间隙的，都带补漆声明」，并断言「半透明档位带显式退出」。**按本仓库既有纪律，守卫要按规则自身特征定位，不要用 `split('display: block')` 那种空洞查找**——0.12.0 记过一次：那种写法切到别的规则、取到 `null` 后整段断言**空转通过**。
- 真机复核：**画成什么样要看截图**。`getComputedStyle` 在刚改完样式/刚切皮肤后会读到过期值（0.10.1 与上一次回搬都记录过这个测量陷阱）。
- 变异验证：把 bug 放回去（去掉某条补漆），守卫必须 fail。

**风险**：低—中。唯一的真风险是给「本来不需要补漆」的件加上补漆后，在皮肤切换或窄列下多出一块色带；所以必须逐皮肤截图，而不是只看一套。

**状态：已完成（2026-09-29），但结论与原计划有出入，务必读完。**

- 落地：终端皮肤 `.topBar` 的垂直盖缝由 `-10px` 负外边距改为 `box-shadow: 0 -10px 0`（横向出血保留）；
  `.statusBar` 两侧各补一个 `box-shadow` 偏移。
- **几何上量到**：用户底纹带横向出血到框内沿（带 `x 152..1276`，框内沿 `151..1277`），
  底栏的板只在 `164..1264`；78 个滚动位置里 **18 个**该缝的最上层元素就是底纹带。
- **视觉上没量到**：真实主题下带的底色合成结果与板同色（都是 `(33,33,35)`），缝不可见。
  所以这一项的实质是**把覆盖变成无条件**，不是修复一个已观察到的缺陷。**不要再把它当 bug fix 复述。**
- 测量装置：复用上一轮留下的真 Chrome 路子（`preview/dump.tsx` 导出的真 DOM + 从**构建产物**里
  抽出的样式表 + 宿主 token + 一个滚动容器）。这次把它固化成了
  「找一个带正好压住底栏的滚动位置 → 截图 → 取像素」的一步式流程。
- **两个新陷阱**（都很容易让人得出反向结论）：
  - `elementFromPoint` **验不了** `box-shadow`：命中测试不看阴影。改完 CSS 后它照样报「带在最上层」，
    一度看起来像「修法无效」；而它之所以觉得顶栏没问题，是因为顶栏盖缝用的是**真实盒子**。
    判「画成什么样」只能用像素。
  - **加对比度做对照也不成立**：把带底强制成品红后，缝里的点连同**底栏自己的板**都变品红，
    即带画在了板的上方——那个配置下不存在「缝」这个可判据。画序模型比假设复杂，这个装置
    不足以判定。下次要判这类问题，得先单独确认**画序**，再谈缝。

---

## W3 · 产出行 + 在 Finder 中显示（工作量 M）

**上游依据**：`62dbae1`、`4e7f01a`、`2ac5471`、`66c8cc4`、`933a45c`，文件 `src/client/deliverables.ts`、`src/client/open-file.ts`、`src/client/platform-media.ts`。

### W3a 纯函数层（`src/client/deliverables.ts`，新文件）

上游那层是干净的纯函数，直接可搬：

- `basename` / `dirname`：去尾分隔符后按最后一段切。
- `getTurnDeliverables(turn, flow)`：① 优先读官方轮数据 `turn.data.get('deliverables').produced[].path`；② 无则**兜底扫这一轮成功的写类工具调用**（`write` / `edit` / `apply_patch` / `str_replace_editor` 的 `create|str_replace|insert`），从 `inputFields(raw)` 里取 `file_path|path|filename|filePath`，按出现顺序去重。
- `showDeliverablesRow(status, paths)`：**只在轮结算后**（`status === 'closed'`）且路径非空时出行——写入过程中的行不该打断进行中的过程。
- `createProducedFileMentions(paths, openFile)`：把正文里的内联代码 token 解析成可点的文件引用（精确匹配，或**唯一** basename 匹配；多义时不解析），返回 `MarkdownFileMentions`。

### W3b 直接点亮一处已有但**未被喂数据**的接缝

本仓库**已经有消费端**，只是没有生产端：

- `MarkdownFileMentions` 接口：`src/client/markdown/render.tsx:117`；
- 消费点：`src/client/markdown/MarkdownText.tsx:169`（`fileMentions?: MarkdownFileMentions`）；
- 样式已存在：`MarkdownText.module.css:299-311`（`.fileMention` 及其 `:hover` / `:focus`）；
- 但全库**没有任何调用点传入 `fileMentions`**：`grep -rn fileMentions src tests` 只命中 `markdown/MarkdownText.tsx`（9 处，均为自身参数与转发）与 `markdown/render.tsx`（2 处，接口与上下文声明），**没有任何生产端**。

也就是说 `createProducedFileMentions` 正好是缺的另一半：接上以后，**已经写好、已经带样式的内联文件引用会立刻生效**。这是本次回搬性价比最高的一步。

### W3c 产出行组件

在轮结算后渲染一行 chip（上游 `DeliverablesRow` / `DeliverableChip`）：文件名截断、直接打开、双击打开、在文件夹中显示、复制路径、「显示文件夹」、超过 8 个折叠成 `+N`。**本仓库要按三套皮肤各自出样式**，并且 chip 的视觉要服从既有类型刻度（不要另起一套字号）。

### W3d 打开与「在 Finder 中显示」

两条通路，来源不同：

- **打开**（走宿主既有能力）：`ctx.remote.session.openWorkspacePath({ path })`。上游 `4e7f01a` 修了两点，本仓库照抄：**① 声明 `inject` 里的 `remote.session`**（上游原来漏了，靠 `ctx.remote.session` 恰好存在才没炸）；**② 取 cwd 要用可选链**（`ctx.sessions?.list?.getSnapshot?.()?.byId[id]?.cwd`），并且**路径是 `.` / 空串时直接开 cwd 本身**（开文件夹），不要再 `resolveWorkspacePath` 一次——上游原来把 `.` 解析成了错误的目标。找不到服务时打日志降级，不抛。
- **在 Finder 中显示精确文件**（需要新增**宿主路由**）：上游在 `2ac5471` 里给插件加了服务端路由，按平台 `spawn`：macOS `open -R <path>`、Windows `explorer.exe /select,<path>`、其它 `xdg-open <path>`。本仓库对应落点：

  - `src/dsh-deckseek.ts`：目前 `inject: []`、严格「presentation only」。新增 `webServer` 注入 + 路由（**路径按插件命名空间取 `/dsh-deckseek/reveal`**，不要沿用上游的 `/better-display/reveal`），`ctx.effect(...)` 注册、返回 disposer。
  - 客户端 `revealFile(path)` 未提供时**退回** `openFile(dirname(path))`（上游就是这个降级形状）。

**✅ 决定（2026-09-29，用户确认）：加路由，但路径必须落在该会话的 cwd 之内，且只接受 POST。**

**✅ 已查清（2026-09-29，对 0.2.0-rc.1 的宿主包实测）：服务端确实能自己得知会话的 cwd。**

- **路由契约**（`dsh-client-connection/lib/index.js`、`dsh-api-gateway/lib/index.js` 里宿主的用法）：
  `ctx.inject(['webServer'], webCtx => webCtx.effect(() => webCtx.webServer.register(route), 'label'))`，
  `route = { kind: 'exact' | 'prefix', path, handler: (req, res) => void | Promise<void> }`。
  与上游 `2ac5471` 的形状一致，所以照抄没有障碍。
- **会话的 cwd 在服务端是可达的**，不必相信调用方：
  `workspaceRegistry` 由 `dsh-workspace` 提供（`dsh-workspace/lib/index.js:374` 的 `super(ctx, 'workspaceRegistry')`），
  其 `list()` 返回 `{ id, path, title, sessionIds, createdAt, updatedAt }`，另有 `archivedSessionIds` /
  `pinnedSessionIds`。于是**服务端**可以按 sessionId 反查出该会话的根：在 `list()` 里找
  `sessionIds` 含该 id 的那条，取它的 `path`。宿主自己的 `dsh-api-session-controller` 也在观察头上带
  `header.cwd`，但走注册表这条路更直接、也更少耦合。
- **因此定稿方案**（下一轮实施）：
  1. 客户端 POST `{ sessionId, path }` 到 `/dsh-deckseek/reveal`；服务端 `ctx.get('workspaceRegistry')`
     **懒取**（缺服务 → 直接拒绝，向后端降级，不要写进 `inject` 让它拒载插件）。
  2. 由 sessionId 查出根 → `fs.realpath` 根与目标（目标必须**存在**）→ 用**纯函数**判定
     「解析后仍在根之内」（`realpath` 之后再比对，纯词法比对会被符号链接骗过）。
  3. 判定不过一律 **fail closed**（403），只接受 `POST`（否则 405），错误体是 JSON。
  4. 平台分派照上游：`open -R` / `explorer.exe /select,` / `xdg-open`——但 `xdg-open` 只在明确
     支持的平台上启用，`spawn` 一律数组传参、不拼 shell。
  5. 纯判定规则与「路由 handler」都要可测：把判定抽成模块、把 handler 写成能注入
     `{ registry, realpath, stat, spawn }` 的工厂，测试用假替身直接驱动（405 / 400 / 403 / 未知
     会话 / happy path），并按本仓库纪律做变异验证。

这条定稿时要把下面这件事查清楚，**不要先写代码**：服务端要独立于调用方地知道「这个会话的 cwd 是哪个」，
否则「落在 cwd 之内」只是一句客户端自愿遵守的话。可行路线：客户端 POST `{ sessionId, path }`，
服务端用宿主**服务端**的会话服务查出该 sessionId 的 cwd，再 `realpath` 之后比对前缀；查不到就不做校验、
直接拒绝（fail closed）。若 0.2.0-rc.1 的服务端没有可用的会话服务，则退化为「**只允许已真实存在**且
`realpath` 后仍在配置根之内的路径」，并把这条限制写进 README——**不要**默默放宽成「接受任意路径」。
`xdg-open` 只在明确支持的平台上启用。

**⚠️ W3d 是一条需要单独点头的能力扩张。** 本仓库服务端条目注释写的是「Presentation only: no provider, tool, session-log or permission mutations」，而 `spawn` 一个 OS 进程属于宿主侧副作用。定稿前必须明确：

1. **路径校验**：上游那版接受调用方给的任意路径。本仓库应至少要求路径解析后**落在该会话的 cwd / 工作区根之内**，并且方法限 `POST`、返回 JSON、错误码分明。`spawn` 用数组传参（不走 shell）没有命令注入，但「任意路径 reveal」仍应拒绝。
2. **不改变默认姿态**：路由只在部署确实提供 `webServer` 时注册；缺失时插件照常加载，`revealFile` 走降级。
3. 这条写进 README/DESIGN 的能力清单。

**验收**：

- 纯函数测试（新增 `tests/deliverables.test.ts`）：`basename`/`dirname` 边界（尾斜杠、Windows 反斜杠、无目录）；`getTurnDeliverables` 的官方数据优先、兜底扫描、去重、失败调用排除、`str_replace_editor` 只认三种命令；`showDeliverablesRow` 三态；`createProducedFileMentions` 的精确/唯一 basename/多义不解析。
- 接缝测试：给定一轮产物，正文里的内联 token **确实**渲染成可点的 `.fileMention`（守「生产端接上了」这件事，而不只守纯函数）。
- 实机复核：真会话里跑一次写文件的工具调用，确认 ① 轮结算后出行、② 点文件名能打开、③ 「在 Finder 中显示」在 macOS 上选中到该文件、④ 终端/纸面/软卡三套皮肤下样式成立。
- 服务端路由的负例：非 `POST` 405、空路径 400、越界路径拒绝、`webServer` 缺失时不注册。

**风险**：中。纯函数层与打开通路风险低；**风险集中在新增宿主路由**（能力扩张 + 路径校验 + 跨平台 `spawn`）。

**状态（2026-09-29）：W3a / W3b / W3d-打开 已完成；W3c 与 W3d-显示 未做。**

- 落地：`src/client/deliverables.ts`（纯函数）、`src/client/produced-files.ts`（每轮的解析器
  经 context 下发——解析器在六层之下且沿途每层都 memo，prop 会把它们全打掉）、
  `MotionMarkdown`/`ReadingMarkdown` 转发、`TurnGroup` 计算并 provide、`index.tsx` 的
  `openFile`。
- **最大的收获是那处接缝**：`MarkdownFileMentions` 与 `.fileMention` 早就在，却**没有任何生产端**
  （`grep -rn fileMentions src tests` 只命中定义与消费两处文件）。也就是说「接缝测试」当时
  全绿而功能不可能出现。**新教训：消费端被测过 ≠ 生产端接上了**——与本仓库已经记过的
  「纯函数全绿 ≠ 路径可达」同族，但方向相反。
- 与上游的两处**有意偏差**：① `openFile` 不写进 `inject`，改为 `ctx.get('remote.session')`
  懒取并降级（上游硬声明；本仓库 `forkAt` 已确立「缺服务退化成空操作」的纪律）；
  ② 解析规则要求**唯一**匹配，歧义不解析。
- 测试 320 → 334（纯函数 12 + 真 Reader 挂载 2）；六条变异逐条验证，全部由对应守卫抓到。
- **W3c 已完成**（`DeliverablesRow.tsx` + 三套皮肤 + 6 项守卫 + 5 条变异）。与上游 chip 的差额：
  双击打开、在文件夹中显示、复制路径——后两项随 W3d 的 reveal 一起补，路径已在 chip 的 `title` 上。
- **W3d 已完成**：判定（`src/reveal-path.ts`）+ 路由注册 + 客户端 `revealFile` + chip 的第二个控件；
  6 项接线测试用假宿主 ctx 驱动真实 `apply`，5 条变异验证。**W3 全部完成。**
  注意 `dirname` 对根目录下的文件返回 `.`（继承上游行为，已写进测试注释）。

---

## W4 · 官方渲染桥接（工作量 L，最后做）

**上游依据**：`666d7ec`（`official-slots.tsx` 211 行）、`387b9b2`、`2eb92de`、`8fe67c1`、`51ccb66`、`3683dbc`、`842d0a0`。

### 它解决的是本仓库一个正在漏的洞

本仓库**替换** `conversation.view`（`src/client/index.tsx:59`），因此宿主的官方节点渲染器不会自己出现，只能**逐个重实现**。这与 CHANGELOG 里已经记过两次的症状同源：0.11.0「`turn-trigger` 零覆盖，落进 `UnknownRecord` 渲染成一坨 JSON」、`model-retry` 同理 → 于是本仓库补了 `native/TurnTriggerRow.tsx`、`native/ModelRetryRow.tsx`。宿主每加一种节点类型，本仓库就要补一次。

上游反过来：**把官方注册借到自己的座位里**渲染，永不落后于宿主。它只使用公开注册表操作（`spec` / `entriesOfSlot` / `subscribe` / `inject` / `register`），为每个家族建一个本插件命名的镜像座位：

```ts
export const OFFICIAL_SLOTS = { actions: 'conversation.chat.assistant-actions', tools: 'tool.call.toolview',
  tail: 'conversation.chat.turnTail', nodes: 'conversation.chat.node', images: 'conversation.message.images' } as const;
// 座位名形如 <plugin>.official.<family>/<source>
```

关键设计 —— **`nodes` 家族只镜像「本仓库不自己画」的节点类型**：

```ts
const READER_NODES = new Set(['user','steering','assistant-step','tool-call','turn-tail','turn-process']);
// installOfficialSlots 里：family === 'nodes' ? entry => !READER_NODES.has(entry.options.key ?? '') : undefined
```

其余工具：`mirrorOfficialSlot` 增量镜像（新增不重挂已有卡片、卸载/HMR 先释放再替换）；`officialChildren` 与 `installOfficialSlots` 都**校验 kind/scope**，宿主契约变了就抛错（`Official slot contract changed`）；`readerTailMatch` 只隐藏与本仓库重复的 produced chip，不动官方卡的其它动作与状态。

### 本仓库的落地方案

1. **移植 `official-slots.tsx`**，座位命名空间改为 `dsh-deckseek.official.*`，`registrant` 字符串同步改名。
2. **`SlotMap` 增强声明**：为五个别名座位补类型（`declare module '@deepseek-ai/dsh-client-ui-slots'`）。类型目标需要 `@deepseek-ai/dsh-client-ui-tool`（上游为此把它加进 peerDeps）——先在 0.2.0-rc.1 上确认这个包与各槽的 `kind`/`scope` 仍然一致。
3. **接进 `apply()`**：本仓库已经是 `ctx.slots.inject('conversation.view', () => ctx.slots.register({...}))` 的形状；上游是 `yield installOfficialSlots(ctx)`（生成器）。照上游把 `officialChildren(...)` 合并进注册的 `children`，并在同一处安装镜像。
4. **`READER_NODES` 必须是本仓库自己的集合，不能照抄上游的六个。** 上游那六个是它的子集；本仓库原生渲染的更多——`Reader.tsx:168-190` 的链路已覆盖 `user`、`steering`、`assistant-step`、`tool-call`、`turn-tail`、`turn-process`、`model-retry`、`turn-trigger`、`command`、`manual-compaction`、`compaction`、`context`、`system-prompt`。**漏掉任何一个都会双渲染**。建议由 `Reader.tsx` 的链路**导出**这份集合，让桥接与渲染器读同一个常量，而不是两处各写一遍。
5. **定位为正回退，不是替代**：桥接只接管「本来会落到 `UnknownRecord`」的节点类型（以及可选的 `assistant-actions` / `message.images` 家族）。本仓库对已知类型的原生呈现、折叠、摘要、族标全部保留——这正是上游 `READER_NODES` 的用意。
6. **皮肤边界要显式声明**：镜像进来的官方 UI 不穿本仓库的三套皮肤。给出边界：镜像子树的根加一个稳定 `data-` 标记（便于 CSS 与测试定位），并在 `reading-skins.md` 记一条「官方桥接内容不参与皮肤换装，只做外框与间距适配」，避免以后有人试图给它套皮肤而反复踩坑。
7. **不搬的部分**：`readerTailMatch` 里那套「隐藏与上游重复的 produced chip」是为上游的产出行写的；本仓库若已按 W3 出了自己的产出行，则**只保留去重逻辑**，不要连它的呈现一起搬。

**验收**：

- 用假注册表（实现 `spec`/`entriesOfSlot`/`subscribe`/`inject`/`register`）测 `mirrorOfficialSlot`：新增条目会注册、条目消失会释放、重复 reconcile 不重挂、卸载顺序正确（后注册先释放）；`kind`/`scope` 不符时抛错。
- **契约测试**：对 0.2.0-rc.1 断言五个家族的 `kind`/`scope` 与 `EXPECTED` 一致——宿主升级时这条要**响亮地失败**，而不是安静降级。
- **挂载测试**：构造一个不在 `READER_NODES` 里的节点类型，断言它**经由官方组件**渲染（而不是 `UnknownRecord`）；再断言 `READER_NODES` 里的类型**仍走本仓库自己的渲染器**（守「不双渲染」）。
- 负例：官方组件抛错时应被边界隔离，不拖垮整页阅读。

**✅ 已查清（2026-09-29，对 0.2.0-rc.1 的宿主包实测）——四个前置事实，实施前先看这一节。**

1. **五个族都在，且 kind/scope 与上游的 `EXPECTED` 完全一致**（取自宿主自己的槽位目录
   `dsh-cordis-client-runner/lib/client.js`，那是权威来源）：

   | 族 | 槽位 | kind | scope |
   | --- | --- | --- | --- |
   | actions | `conversation.chat.assistant-actions` | `list` | `session` |
   | tools | `tool.call.toolview` | `keyed` | `session` |
   | tail | `conversation.chat.turnTail` | `list` | `session` |
   | nodes | `conversation.chat.node` | `keyed` | `session` |
   | images | `conversation.message.images` | `single` | `session` |

   所以 `EXPECTED` 表照抄即可，`Official slot contract changed` 这条会在宿主真变了的时候才响。
   五个族也确实都在被宿主的官方插件使用（`ui-tool` / `ui-schedule` / `ui-deliverables` /
   `ui-goal` / `ui-message-feedback` / `ui-attachment`），镜像有东西可镜像。
2. **四个新增依赖都已安装**：`dsh-client-ui-tool`（`tool.call.toolview` 与 `conversation.chat.node`
   的类型来源）、`dsh-session-turn-outline`、`dsh-api-remotes`、`dsh-client-connection`。
3. **`READER_NODES` 必须用本仓库自己的集合，不能照抄上游那六个。** 本仓库 `Reader.tsx` 的座位
   链路实际处理 **15 类**：`user`、`steering`、`assistant-step`、`tool-call`、`turn-tail`、
   `turn-process`、`context`、`command`、`manual-compaction`、`compaction`、`system-prompt`、
   `model-retry`、`turn-trigger`、`turn-error`、`turn-max-tokens`。**漏一个就是双渲染。**
   建议让 `Reader.tsx` 导出这份集合，桥接与渲染器读同一个常量（上游是把六个字面量写在桥接里）。
4. **注册形状与本仓库既有写法一致**：`ctx.slots.inject(<源槽>, () => ctx.slots.register({...}))`，
   桥接层用公开注册表操作（`spec`/`entriesOfSlot`/`subscribe`/`inject`/`register`），与既有
   `conversation.view` 注册同一套 API。

**✅ W4 已完成（2026-09-29）**：`src/client/official-slots.tsx` + `src/client/reader-nodes.ts`，
接进 `apply()`（视图 `children` 声明三个座位 + `ctx.effect` 安装镜像）。
**只镜像 actions / tools / nodes 三族**；`turnTail` 与 `message.images` 有意不镜像——本视图自己画收尾行、
自己渲染图片，借过来就是两份。测试 +11，十条变异逐条验证。**四项全部完成。**

**风险**：**最高**。三点必须提前想清楚：① 宿主槽契约在 0.2.0-rc.1 上是否仍与 `EXPECTED` 一致（不一致就要先改 `EXPECTED`，且这是宿主侧事实，不是本仓库能决定的）；② `READER_NODES` 与本仓库原生链路**同源**，否则双渲染或漏渲染；③ 视觉不一致是**预期代价**，要在文档里认下来，而不是事后当 bug 修。

---

## 1. 推进顺序与依赖

| 序 | 工作 | 工作量 | 依赖 | 独立可交付 |
| --- | --- | --- | --- | --- |
| 1 | W1 活性兜底 | S | 无 | 是 |
| 2 | W2 吸顶补漆 | S | 无 | 是 |
| 3 | W3 产出行 + 打开/显示 | M | 无（W3d 需单独点头） | 是 |
| 4 | W4 官方桥接 | L | 建议在 W3 之后（产出行就位后才能决定去重逻辑） | 是 |

W1/W2 互不相干，可各开一条分支；W3 的 a/b 可先合（纯函数 + 点亮接缝），c/d 分开合；W4 单独一条长分支，并在合并前跑一次全量测试与三套皮肤截图。

## 2. 每次交付都要带上的东西（本仓库既有纪律）

- CHANGELOG 记「上游哪条 commit、落到本仓库哪个文件、复验方式」；挑搬结论写进本文件或新开一节，**别只留在提交信息里**。
- 新增守卫要**变异验证**（把 bug 放回去看它是否 fail）。
- 涉及像素的判断**看截图**，不看 `getComputedStyle`（刚改样式/刚切皮肤会读到过期值）。
- **DOM 断言一律比较布尔值**，不要写 `assert.equal(节点, null)`：这种断言一旦失败，node 的
  differ 会深度格式化 DOM 元素、顺着循环的 fiber 引用遍历，**整个文件卡死**（0.11.0 记过一次，
  W1 又踩一次，第一次变异跑到 101 秒才被杀）。卡死等于没有守卫——失败必须快速返回。
- **替身要定义在真正生效的那一层原型上**：`clientHeight` 是 `HTMLElement.prototype` 上的访问器，
  会盖住 `Element.prototype` 上的同名定义；`scrollHeight` 相反，`Element.prototype` 就够。
  happy-dom 不做布局，几何量全得替身，层级搞错就会「因为根本没进那条分支」而失败。
- 座位分支必须有**挂载测试**，不能只有纯函数测试。

## 3. 台账：本次评估结论（下次别重做）

- 上游基线：`ae93253`（0.3.3，2026-09-26）；自上次同步 `197817b` 起 **41 个提交**，已逐条评估。
- **采纳 4 项**：`8e07d34`（W1）、`1cf1a53`（W2）、`62dbae1`/`4e7f01a`/`2ac5471`/`66c8cc4`（W3）、`666d7ec` 系列（W4）。
- **明确不搬**：见 §0.1 表（多数是本仓库已独立完成，或与皮肤决策冲突）。
- **不整包 merge**：冲突面 33 个源文件 + 命名回退 + 上游 peer 范围会在 0.2.0-rc.1 宿主上被闸门拒载。
- **peer 范围保持** `>=0.1.7-rc.1 <0.3.0-0`，本次四项工作均不触碰。
- 上游仍在活跃开发（其 own 仓库 09-26 仍有提交）。下次复核时，从 `ae93253` 之后接着看即可。

## 4. 备查：上游这 41 个提交的落点速查

| 领域 | commits | 本仓库处置 |
| --- | --- | --- |
| 披露动画活性 | `8e07d34` | **W1 采纳** |
| 吸顶缝隙补漆 | `1cf1a53` | **W2 采纳** |
| 吸顶车道层次 / composer 座位 | `04f81bc` `2db8935` `ecdb437` | 本仓库 0.10.1 已有自己的层次表；只借 `footer-precedence` 的守卫思路 |
| 滚动跟随 / composer 遮挡 | `e824cab` `197817b` `a58944f` `8802a0b` | 与 0.12.0 的跟随时序调整、`jump-lock` 同域，已自行处理 |
| 产物 / 文件打开与显示 | `62dbae1` `4e7f01a` `2ac5471` `66c8cc4` | **W3 采纳** |
| 官方渲染桥接 | `666d7ec` `387b9b2` `2eb92de` `8fe67c1` `51ccb66` `3683dbc` `842d0a0` | **W4 采纳** |
| 设置节 / 侧栏打开模式 | `933a45c` | 设置节已有；侧栏打开模式随 W3 的产物行再定 |
| 等待时钟 / message chrome / live turn | `7c99ceb` `0cf93b1` `98b7fb9` | 语义已覆盖（`status-verb`、`liveProcessDetail`、`messageClock`） |
| 折叠档位 / 自动折叠恢复 | `c518c84` `8e07d34`〔折叠部分〕`22b235f` `c071725` `46f0b5c` `289f8fa` | 档位由 `workDetail` 覆盖；玻璃/动效美学不上（与皮肤决策冲突） |
| 时间轴导轨 / 逐轮用量 / 分叉 | `e179c22` `093bddb` | 已有 `TurnRail` + `forkAt`（`index.tsx:92`）+ 分叉按钮 |
| 技能状态 | `6ce13ec` | 目录发现与本仓库 `skills/` 装法不同，低优先，未采纳 |
| 图标去 unicode | `4f5910e` | 不上（`icons.ts` + 字形契约是刻意设计） |
| 宿主线对齐 / 构建 | `85558aa` `5886c72` `d14f9cc` `91048c1` `262ee19` `e1822e8` | 本仓库已在 0.2.0-rc.1，且安装方式不同 |
| 文档 / 发布 | `90d989d` `bd65f1a` `48c6a00` `06d6430` `4750d6b` `066f10a` `e2702a3` `370405a` `ae93253` 及若干 `Rebuild client bundle` | 无关功能 |

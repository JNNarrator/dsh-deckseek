# 用户五条界面意见：状态行去重、常驻行收紧、宿主文件卡片进场

> 工作文档：跨机器续作用。**2026-09-30 全部落地。**
> 来源：用户 2026-09-30 09:56 的一条五条意见（附截图，截图来自 `~/Downloads` 那次会话：
> `RUN · 1 轮 · 最新一轮 48 步 · /jiangnan/Downloads`，即 session-80b27634 的 turn 1，
> 09:39:57 起跑、09:54:09 结束，**14 分 12 秒**，与截图里那个耗时对得上）。
> 前置阅读：[terminal-skin-v5.md](terminal-skin-v5.md)（状态行与动词）、
> [upstream-port-0.3.3.md](upstream-port-0.3.3.md)（W3 产出行、W4 官方渲染桥接）。

## 一、用户原话与逐条处置

| # | 用户说的 | 处置 |
|---|---|---|
| 1 | 上面有个「正在运行命令 + 时间」，下面还有一个「规划中 + 时间」，重复了，只保留下面那一个 | **删掉回合头部的实时状态行**（`frame.running.*` / `frame.prepare.*` 那套）。头部只留它本来就该说的：思考期品牌句、等待你的操作、会话起始记录。**正在做什么（工具名）不再丢**，改由底部那行携带 |
| 2 | 最下面那一行信息操作栏上下不够紧凑，占地方，上下可以窄点 | 底部状态行 **31px → 23px**（行高 20 → 16、上下内边距 3 → 2、上间距 4 → 2） |
| 3 | 原版对话里「已编辑多少文件」的文件列表可以展开，咱这没有 | **借宿主的座位**：把宿主自己的 turn-tail 卡片接进阅读区——改动文件卡片（「已编辑 N 个文件」/「已编辑 <文件名>」+ 增删行数 + 可展开列表 + 悬停改动浮层 + 点行进 review）原样落地 |
| 4 | 最下面还列了几个文件，可以选择打开方式，咱这也没有 | 同上：宿主 `present` 交付卡片带 `deliverables.file.actions`（`用 … 打开` / `更多打开方式`），本插件把它**连同子槽位一起镜像**进自己的座位，打开方式控件原样可用 |
| 5 | `⠇规划中…14 分 10 秒 深度求索中…` 这一行也太高了，占地方 | 底部工作行 **28px → 20px**；它本来就是/现在是阅读视图**唯一**的工作状态行 |

### 第 1、5 条其实是同一件事

改之前，一轮跑起来时屏幕上同时有两行在说「有活在跑」：

```
▸ 正在运行命令 · Bash                 ← 回合头部（frame.running.* + 工具详情）
  ⋯ 过程行 ⋯
⠇ 推演中…            25 秒            ← 回合底部（动词 + 计时）
```

两行的词汇表还不一样（`正在运行命令` vs `推演中…`），读者要自己把两句话对起来。删掉头部那行、
把「正在做什么」并进底部那行之后：`⠇ 归纳中…  Bash  22 秒`——一行说清「在跑 / 在做什么 / 跑了多久」。

- 头部仍然保留**思考期**的品牌句（`大肥鱼正在思考中… N 秒`）与**等待你的操作**：那是另一种信息
  （模型在想 / 需要你动手），而且此时底部工作行**本来就不渲染**（只在「深度求索」相位出现），
  所以不构成重复。用户只要求删掉那条重复的「正在运行命令」。
- 顺带修掉一处无障碍缺陷：头部的 `StatusText` 自带 `role="status"`，于是运行中同一屏上有**两个**
  polite live region 播报同一件事（头部那条 + 底部那条）；删掉头部那条之后只剩一个。
- 随之退役的代码：`frame-meter.ts` 的 `liveFramePhase` / `liveFrameLabel` / `LivePhase`，
  `locale.ts` 的 14 个 `frame.prepare.*` / `frame.running.*` 键（中英各 7），以及三条纯函数测试。
  **没有留成死代码**：标签的来源没了，留着它们只是假的可选项。

## 二、第 3、4 条：借座位的做法与一条不显然的边界

`conversation.chat.turnTail` 是宿主 `conversation.chat.node`（key `turn-tail`）的**子槽位**，
是一个 `list`。宿主自己的 `TurnTailNodeView` 在收尾消息之后渲染它；阅读区替掉了
`conversation.chat.node`，所以这张卡片在阅读页里从来不出现——正是用户第 3、4 条说的「没体现」。

做法沿用 W4 的桥接（`src/client/official-slots.tsx`）：**把 `conversation.chat.turnTail` 也镜像**
进本插件自己的座位 `dsh-deckseek.official.tail/conversation.chat.turnTail`，阅读视图在收尾行处
渲染它，owner props 与宿主自己那处一模一样：`{ turn, seq, openFile }`，`seq` 取
`closing?.finalNode.seq ?? data.seq`（与宿主 `TurnTailNodeView` 同一表达式）。

三处工程细节：

1. **座位名必须进 `SlotMap`**。平台是**按注册声明的子槽位键**推导组件收到的 `renderSlot` 的：
   一个只存在于运行时的座位，类型系统永远交不出 `renderSlot`。所以 `officialSeat()` 改成
   字面量返回类型、`officialChildren()` 返回字面量键的表、`ReaderProps` 声明
   `PropsRenderSlots<'dsh-deckseek.block' | OfficialTailSeat>`。**把座位变成有类型的键是用它的
   一部分，不是记账**。
2. **子槽位一起镜像**。交付卡片的打开方式控件来自 `deliverables.file.actions`（由
   `ui-open-in-app` 注册）。镜像是递归的：卡片注册时声明的子槽位按别名声明，卡片收到的
   `renderSlot` 被翻译成别名。实测确认：交付卡片渲染出来的 HTML 里有
   `data-slot="dsh-deckseek.official.tail/deliverables.file.actions"` 与
   `data-open-target="file" / data-open-path-more=""`。
3. **空座位不占位**。`useTailSeats()`（桥接发布的座位条目数，注入给视图）为 0 时不渲染外层包裹——
   一个空的 flex 子项**仍然会吃掉列的一个 gap**（回合内 4px / 卡片皮肤 14px）。

### 那半天的坑：谁来让位，不能按「轮次数据」判断

第一版按**轮次数据**让位：`turn.data.get('deliverables')` 里有 `changes`/`presented` 就认为
「宿主要画卡片」→ 本插件自己那行「本轮产出」让位。真机上立刻看到两处都不对：

- **宿主重启后摘要就没了**（README 明说：`该轮之后 Host 重启过` 时卡片不出现）。于是老轮次
  「宿主说要画卡」但**画不出来**，本插件的 chip 行又被让掉了 → **文件列表凭空消失**。
  实测：重启宿主后 3 个 tail 座位全是 `<div data-slot="…" style="display: contents;"></div>`，
  一个子元素都没有，而 `[data-reader-deliverables]` 计数为 0。
- 反过来，`present` 交付卡的数据**是从会话日志折出来的**（重启仍在），所以它会照常画。

**定稿：让位由 CSS 决定，判据是宿主卡片自己的标记元素在不在屏幕上。**

```css
.turn:has([data-reader-official-tail] [data-changed-files]) .deliverablesRoot,
.turn:has([data-reader-official-tail] [data-presented-files-row]) .deliverablesRoot { display: none; }
```

- 两个标记是**宿主自己**打在卡片根上的语义属性（实测取到：改动卡 `data-changed-files="true"`
  / `data-single`；交付卡 `data-presented-files-row="true"` / `data-presented-file="true"`），
  所以同一 tail 里的**计划卡 / 任务卡不会误伤**文件列表。
- **判据刻意不做成数据判断**：`changes` 宣告在日志里（重启后仍在），而摘要只在宿主内存里——
  「有宣告」不等于「画得出卡片」。只有看屏幕才知道。
- 失败方向是**单向**的：宿主哪天改了标记名，规则不匹配 → 本插件的 chip 行**回来**（两张文件列表
  并列，读者一眼能看出），而不是文件凭空消失。
- 本插件的 chip 行**仍然挂载**（只是 `display: none`）：它同时提供正文里文件提及的解析器，
  卸载它会让收尾正文里点名的文件失去可点性。
- CSS 不能被挂载测试覆盖，所以 `tests/tail-cards.test.ts` 把**三处必须一致的命名**（阅读器渲染的
  包裹属性、两个宿主卡片标记、隐藏的就是本插件那一行）钉在源码上。

## 三、实测（真宿主 + 无头 Chrome，2026-09-30）

装置**不在用户环境里跑**：把 `~/.dsh` 拷到 `/tmp/dsk-live/home`，
`DSH_HOME=/tmp/dsk-live/home dsh --profile default --no-open --port 1941x` 从副本起，
无头 Chrome + CDP（Node 24 自带 `WebSocket`，无依赖）驱动，token 由 CLI 自己打印。

| 量 | 改前 | 改后 |
|---|---|---|
| 底部状态行盒高 / 上间距 | 27px / 4px（合计 31px） | **21px / 2px（合计 23px）** |
| 底部工作行（dock）盒高 | 28px | **20px** |
| 运行中一轮里的「有活在跑」行数 | 2 行（头部 + dock） | **1 行** |

截图证据（`/tmp/dsk-live/`，临时目录）：

- `31-live-after.png`：跑 `sleep 90` 的活回合——头部只剩一个折叠箭头，底部
  `⠇ 归纳中…  Bash  22 秒`，状态行 `RUN · 5 轮 · 最新一轮 1 步 · ../workspace/dsh-deckseek`。
- `22-host-cards.png` / `30-after-chips.png`：交付卡片（含 `打开方式` 分隔按钮）与改动文件卡片
  在阅读页里渲染；同一会话里**画不出卡片的老轮次**照样显示 `本轮产出 deckseek-verify.txt 📁`。

## 四、这套装置里踩到的两个坑（下次直接用）

- **不要 `document.querySelectorAll('*')` 挨个 `scrollTop = scrollHeight`**。宿主的会话根节点
  `ST7X_W_root`（`overflow: hidden`）也在列表里，被推到底后整块面板滑出窗口，看起来就像
  「阅读页黑屏」——和 0.12.0 记过的那个黑屏是同一个机制，但这次是**我的手**造成的。
  只滚 `[data-conversation-scroll]`（或 `.ST7X_W_scrollBody`），并在截图前把宿主根节点复位到 0。
- **异步列表的 `seed()` 之后要 `notify()`**：测试里的假 registry，`seed` 不通知订阅者；
  子槽位的镜像只有在**父条目已 seed、子条目先 seed、然后才建镜像**时才会挂上。

## 五、这一轮没做的事

- **没把宿主卡片重画一遍**。`已编辑 N 个文件` 的展开动画、每一行的改动浮层、review tab、
  关联应用菜单全部是宿主自己的实现，本插件只提供座位与列位置。这是 W4 定下的纪律，本轮继续。
- **没碰开封/折叠与跟随逻辑**。用户第 1、5 条只关于「有几行状态」和「那行多高」。
- **没动状态行的横向几何**：终端四角与两侧补漆（W2）保持原样，只是行本身变矮了 6px。

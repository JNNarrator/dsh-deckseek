/**
 * Plugin UI language support. The DSH app marks its current language on
 * <html lang="…">; dictionaries live in this package (the app's own locale
 * packs are build-time static and cannot be extended by plugins). Strings use
 * the same copy as the native chat where the feature exists, so switching the
 * app language switches the reading view too. `currentLocale()` falls back to
 * zh when no browser context exists (unit tests, SSR), matching the plugin's
 * default authoring language.
 */
import type { SkinId, WorkDetailId } from '../skin.js';
export type UiLang = 'zh' | 'en';
export declare const zh: {
    readonly 'reader.tab': "DeckSeek";
    readonly 'reader.sessionClosed': "阅读页对应的会话已关闭。";
    readonly 'reader.toolbarTitle': "阅读 · 原始记录完整保留";
    readonly 'reader.toolbarHint': "基于真实消息类型和轮次边界整理。当前协议没有独立的正文阶段标记，无法确认的内容会继续保留。";
    readonly 'reader.toolbarAria': "阅读工具";
    readonly 'reader.motionFollowOff': "动效 · 跟随系统关闭";
    readonly 'reader.motionOn': "动效开";
    readonly 'reader.motionOff': "动效关";
    readonly 'reader.search': "查找";
    readonly 'reader.searchClose': "关闭查找";
    readonly 'reader.searchPlaceholder': "在阅读页中查找…";
    readonly 'reader.searchNoMatches': "无匹配";
    readonly 'reader.searchPrevTitle': "上一个（Shift+Enter）";
    readonly 'reader.searchNextTitle': "下一个（Enter）";
    readonly 'reader.loadEarlier': "加载更早记录";
    readonly 'reader.loadingEarlier': "正在加载更早记录";
    readonly 'reader.historyFailed': "历史记录加载失败，可再次尝试；现有内容未改变。";
    readonly 'reader.openFailed': "会话暂时无法读取：";
    readonly 'reader.loading': "正在读取会话…";
    readonly 'reader.needQuestion': "需要你回答一个问题";
    readonly 'reader.needConfirm': "需要你的确认";
    readonly 'reader.pendingHint': "请在下方原生操作区处理。此提示不会收进执行过程。";
    readonly 'reader.positionRestored': "已回到上次阅读位置。";
    readonly 'reader.jumpLatest': "回到最新";
    readonly 'reader.showEarlierTurns': "展开更早的 {count} 轮";
    readonly 'reader.export': "导出";
    readonly 'reader.exportTitle': "将本轮会话导出为 Markdown 文件";
    readonly 'export.heading': "DeckSeek 会话导出";
    readonly 'export.user': "用户";
    readonly 'export.steering': "用户 · 补充消息";
    readonly 'export.assistant': "求索";
    readonly 'empty.title': "在下方发送消息，开始一场对话";
    readonly 'empty.hint': "阅读视图会自动折叠执行过程、保留最终回答；页内查找与消息导航随时可用。";
    readonly 'empty.hintLabel': "[提示]";
    readonly 'meter.turns': "{count} 轮";
    readonly 'meter.turnsOne': "{count} 轮";
    readonly 'meter.turnsMore': "{count}+ 轮";
    readonly 'meter.steps': "最新一轮 {count} 步";
    readonly 'meter.stepsOne': "最新一轮 {count} 步";
    readonly 'frame.tools': "{count} 次工具调用";
    readonly 'frame.files': "{count} 个文件";
    readonly 'frame.toolsOne': "{count} 次工具调用";
    readonly 'frame.filesOne': "{count} 个文件";
    readonly 'frame.failed': "{count} 次失败";
    readonly 'frame.activity.terminal': "运行了命令";
    readonly 'frame.activity.write': "修改了文件";
    readonly 'frame.activity.read': "读取了文件";
    readonly 'frame.activity.search': "搜索了代码";
    readonly 'frame.activity.web': "查询了网络";
    readonly 'frame.activity.other': "调用了工具";
    readonly 'frame.activity.join': "{first}并{second}";
    readonly 'frame.activity.comma': "，";
    readonly 'frame.activity.more': "{title}等";
    readonly 'frame.prepare.terminal': "准备运行命令";
    readonly 'frame.prepare.write': "准备修改文件";
    readonly 'frame.prepare.read': "准备读取文件";
    readonly 'frame.prepare.search': "准备搜索代码";
    readonly 'frame.prepare.web': "准备查询网络";
    readonly 'frame.prepare.other': "准备调用工具";
    readonly 'frame.prepare.tools': "准备调用工具";
    readonly 'frame.running.terminal': "正在运行命令";
    readonly 'frame.running.write': "正在修改文件";
    readonly 'frame.running.read': "正在读取文件";
    readonly 'frame.running.search': "正在搜索代码";
    readonly 'frame.running.web': "正在查询网络";
    readonly 'frame.running.other': "正在调用工具";
    readonly 'frame.running.tools': "正在调用工具";
    readonly 'rail.label': "消息导航";
    readonly 'rail.jump': "跳到第 {turn} 轮";
    readonly 'rail.turn': "第 {turn} 轮";
    readonly 'rail.message': "消息";
    readonly 'turn.stopped': "已停止";
    readonly 'turn.errorTitle': "本轮出现错误";
    readonly 'retry.scheduled': "等待重试";
    readonly 'retry.started': "已开始重试";
    readonly 'retry.cancelled': "重试已取消";
    readonly 'retry.status': "{label}：第 {retry}/{max} 次，约 {seconds} 秒后";
    readonly 'retry.delay': "等待";
    readonly 'retry.failure': "失败原因";
    readonly 'retry.provider': "供应方";
    readonly 'retry.auth': "凭据无效或已过期，重试不会成功。";
    readonly 'turn.maxTokens': "已到达输出长度限制，回答尚未完整。";
    readonly 'turn.retryWaiting': "模型请求未成功，正在等待重试。";
    readonly 'turn.you': "你";
    readonly 'turn.preamble': "会话起始记录";
    readonly 'turn.steering': "补充消息";
    readonly 'turn.references': "引用：{labels}";
    readonly 'turn.referenceSeparator': "、";
    readonly 'turn.process': "思考与过程";
    readonly 'turn.foldAriaCollapse': "收起思考与过程";
    readonly 'turn.foldAriaExpand': "展开思考与过程";
    readonly 'status.process': "执行过程";
    readonly 'status.timeSeconds': "用时 {seconds} 秒";
    readonly 'status.timeMinutes': "用时 {minutes} 分 {seconds} 秒";
    readonly 'status.waiting': "等待你的操作";
    readonly 'status.usingTool': "正在使用工具";
    readonly 'status.thinkingName': "大肥鱼正在思考中… {time}";
    readonly 'status.delving': "深度求索中… {time}";
    readonly 'status.clockSeconds': "{seconds} 秒";
    readonly 'status.clockMinutes': "{minutes} 分 {seconds} 秒";
    readonly 'status.outputting': "正在输出";
    readonly 'status.preparingReply': "正在准备回复";
    readonly 'status.processing': "正在处理";
    readonly 'status.steps': "{count} 个步骤";
    readonly 'status.verb.reviewing': "梳理中";
    readonly 'status.verb.analyzing': "推演中";
    readonly 'status.verb.considering': "权衡中";
    readonly 'status.verb.planning': "规划中";
    readonly 'status.verb.checking': "核对中";
    readonly 'status.verb.searching': "检索中";
    readonly 'status.verb.building': "构建中";
    readonly 'status.verb.summarizing': "归纳中";
    readonly 'terminal.stopped': "本轮已停止，已生成的内容仍保留。";
    readonly 'terminal.blocked': "本轮需要处理阻塞事项；请查看原对话与下方操作区。";
    readonly 'terminal.maxTokens': "输出达到本轮长度限制，内容可能尚未完整。";
    readonly 'terminal.error': "本轮未完成；错误信息保留在下方。";
    readonly 'terminal.unknown': "本轮结束状态：{reason}。请在原对话中核对完整记录。";
    readonly 'command.failedTitle': "命令执行失败";
    readonly 'command.fallback': "查看原对话中的命令记录";
    readonly 'compaction.failedTitle': "上下文压缩失败";
    readonly 'compaction.running': "正在整理上下文…";
    readonly 'compaction.divider': "历史上下文已精简优化";
    readonly 'compaction.dividerItems': "已精简 {count} 条历史消息";
    readonly 'compaction.dividerTokens': "历史记忆已整理 · 释放约 {tokens} tokens";
    readonly 'compaction.dividerItemsTokens': "已精简 {count} 条历史消息 · 释放约 {tokens} tokens";
    readonly 'compaction.memoShow': "查看备忘";
    readonly 'compaction.memoHide': "收起备忘";
    readonly 'compaction.memoHeader': "前期对话要点备忘";
    readonly systemPrompt: "系统提示词";
    readonly 'turnProcess.prefix': "执行过程 · ";
    readonly 'turnProcess.thought': "已思考";
    readonly 'turnProcess.toolCalls.one': "{count} 次工具调用";
    readonly 'turnProcess.toolCalls.other': "{count} 次工具调用";
    readonly 'turnProcess.messages.one': "{count} 条消息";
    readonly 'turnProcess.messages.other': "{count} 条消息";
    readonly 'turnProcess.subagents.one': "{count} 个 subagent";
    readonly 'turnProcess.subagents.other': "{count} 个 subagent";
    readonly 'turnProcess.separator': " · ";
    readonly 'turnTail.tokens': "约 {tokens} tokens";
    readonly 'turnTail.cacheHit': "缓存命中 {percent}%";
    readonly 'turnTail.total': "总量 {tokens} tok";
    readonly 'trigger.request': "收到执行请求";
    readonly 'trigger.goal': "继续执行目标";
    readonly 'trigger.agent': "收到任务消息";
    readonly 'trigger.team': "收到团队消息";
    readonly 'trigger.subagent': "子任务状态更新";
    readonly 'trigger.github': "收到 GitHub 事件";
    readonly 'trigger.webhook': "收到外部事件";
    readonly 'trigger.schedule': "定时任务";
    readonly 'trigger.job': "后台任务状态更新";
    readonly 'trigger.plugin': "插件状态更新";
    readonly 'trigger.explanation': "这条通知触发了本轮回复。";
    readonly 'trigger.source': "来源";
    readonly 'turnTail.uncachedInput': "未缓存输入 {tokens} tok";
    readonly 'turnTail.cacheRead': "缓存读取 {tokens} tok";
    readonly 'turnTail.cacheWrite': "缓存写入 {tokens} tok";
    readonly 'turnTail.output': "输出 {tokens} tok";
    readonly 'turnTail.reasoningDetail': "其中推理 {tokens} tok";
    readonly 'turnTail.routes': "路由 {routes}";
    readonly 'turnTail.reasoning': "其中推理 {tokens} tok";
    readonly 'branch.action': "在新对话中分支";
    readonly 'branch.unavailable': "仅可从已完成轮次的最后一条消息分支";
    readonly 'clock.md': "{m}月{d}日";
    readonly 'clock.ymd': "{y}年{m}月{d}日";
    readonly 'failure.note': "详情保留在执行记录中。";
    readonly 'failure.toolTitle': "工具执行失败";
    readonly 'failure.exitCode': "退出码 {code}";
    readonly 'failure.signal': "信号 {signal}";
    readonly 'tool.failureShown': "失败详情见上方失败卡片；原始输出可在「原始数据」查看。";
    readonly viewRawRecord: "查看原始记录";
    readonly 'unknown.copy': "复制记录";
    readonly 'unknown.copied': "已复制";
    readonly 'unknown.arrayItems': "数组 · {count} 项";
    readonly 'unknown.arrayOf': "数组 · ";
    readonly 'unknown.itemsCount': "{count} 项";
    readonly 'unknown.emptyObject': "空对象";
    readonly 'unknown.kind.turnProcess': "执行过程记录";
    readonly 'block.unavailable': "此内容暂时无法在阅读页显示；原对话中的记录未受影响。";
    readonly 'image.zoom': "放大图片";
    readonly 'image.zoomWithName': "放大图片：{name}";
    readonly 'image.alt': "会话图片";
    readonly 'image.loading': "正在加载图片";
    readonly 'image.failed': "图片未能加载";
    readonly 'image.retry': "重试";
    readonly 'image.preview': "图片预览";
    readonly 'image.closePreview': "关闭图片预览";
    readonly 'copy.answer': "复制回答";
    readonly 'copy.done': "已复制";
    readonly 'copy.failed': "未能复制，请手动选择文字";
    readonly 'tool.argsLabel': "工具参数 · {name}";
    readonly 'block.unsupported': "此内容类型尚未接入阅读页，原始内容已保留。";
    readonly viewRawContent: "查看原始内容";
    readonly 'code.copy': "复制";
    readonly 'code.copied': "已复制";
    readonly 'code.copyCode': "复制代码";
    readonly 'code.block': "代码块";
    readonly 'code.wrap': "自动换行";
    readonly 'code.unwrap': "取消自动换行";
    readonly 'table.copyCsv': "复制为 CSV";
    readonly footnotes: "脚注";
    readonly 'tool.prepareWrite': "正在生成文件内容";
    readonly 'tool.prepareTerminal': "正在准备命令";
    readonly 'tool.prepareInput': "正在准备工具输入";
    readonly 'tool.detailReturned': "文件工具已返回。以下为提交的内容；完整返回记录可在「原始数据」查看。";
    readonly 'tool.detailMedia': "图片或扩展内容已在对话中单独展示。";
    readonly 'tool.detailEmpty': "工具没有返回可展示的内容。";
    readonly 'tool.rawNotice': "完整记录 · 只读 · 不执行其中的代码";
    readonly 'tool.rawInput': "工具输入";
    readonly 'tool.rawResult': "工具结果";
    readonly 'tool.inputPending': "输入尚未到达";
    readonly 'tool.subcalls': "子调用";
    readonly 'tool.others': "工具调用";
    readonly 'read.window': "显示 {shown} / {total} 行";
    readonly 'read.collapseAria': "收起文件内容";
    readonly 'read.expandAria': "展开其余 {hidden} 行";
    readonly 'read.collapse': "收起";
    readonly 'read.expand': "展开其余 {hidden} 行";
    readonly 'terminal.signal': "信号 {signal}";
    readonly 'terminal.exitCode': "退出码 {code}";
    readonly 'terminal.noExitCode': "未正常退出";
    readonly 'terminal.running': "执行中";
    readonly 'terminal.failed': "失败";
    readonly 'terminal.done': "已完成";
    readonly 'terminal.noOutput': "没有输出";
    readonly 'terminal.collapseAria': "收起命令输出";
    readonly 'diff.collapseAria': "收起差异";
    readonly 'search.pathsSummary': "{shown} / {total} 个路径{truncated}";
    readonly 'search.matchesSummary': "{shown} / {total} 处匹配 · {files} 个文件{truncated}";
    readonly 'search.truncated': "（结果已截断）";
    readonly 'search.noResults': "没有结果";
    readonly 'search.collapseAria': "收起搜索结果";
    readonly 'web.noResults': "没有结果";
    readonly 'web.sourcesTruncated': "来源已截断";
    readonly 'web.http': "HTTP";
    readonly 'web.contentTruncated': "内容已截断";
    readonly 'json.copyValue': "复制值";
    readonly 'json.copyJson': "复制 JSON";
    readonly 'json.copyPath': "复制路径";
    readonly 'json.copyPrettyJson': "复制格式化 JSON";
    readonly 'json.copyCompactJson': "复制紧凑 JSON";
    readonly 'json.copyFailed': "复制失败";
    readonly 'json.collapseNode': "收起节点";
    readonly 'json.expandNode': "展开节点";
    readonly 'truncate.label': "内容过长，已截断（共 {count} 个字符）";
    readonly 'block.unknown': "未知内容块";
    readonly 'reasoning.label': "思考";
    readonly 'reasoning.step': "步骤 {step}";
    readonly 'reasoning.regionAria': "步骤 {step} 的思考";
    readonly 'reasoning.scrollAria': "步骤 {step} 的思考，可滚动阅读";
    readonly 'reasoning.pauseFollowAria': "暂停自动跟随思考";
    readonly 'reasoning.resumeFollowAria': "继续跟随最新思考";
    readonly 'reasoning.pauseFollow': "暂停跟随";
    readonly 'reasoning.resumeFollow': "跟随最新";
    readonly 'reasoning.manual': "手动阅读";
    readonly 'reasoning.followHint': "取消文字选择后可继续跟随";
    readonly 'mcp.title': "交互式 MCP App";
    readonly 'mcp.summaryChoice': "选择: {choice}";
    readonly 'mcp.summaryAction': "操作: {action}";
    readonly 'mcp.summaryVariant': "方案: {variant}";
    readonly 'mcp.reset': "重置组件状态";
    readonly 'mcp.ready': "已就绪：{receipt}";
    readonly 'mcp.focusSend': "聚焦输入框并回车发送";
    readonly 'mcp.sendDirectly': "回车直接发送";
    readonly 'mcp.streaming': "正在生成交互组件{title}";
    readonly 'mcp.titleSuffixZh': "（{title}）";
    readonly 'mcp.titleSuffixEn': " ({title})";
    readonly 'mcp.component': "组件";
    readonly 'mcp.choicePrompt': "我在{name}中选择了：{choice}{desc}。请根据我的选择继续。";
    readonly 'mcp.choicePromptScore': "我在方案评测中选择了：{variant}{score}。请根据该方案继续分析。";
    readonly 'mcp.actionPrompt': "[{name}] 已完成 {action}{payload}";
    readonly 'mcp.receiptPrompt': "[{name}] {key}: {value}";
    readonly 'mcp.descSuffix': "（{desc}）";
    readonly 'mcp.quoteTitle': "「{title}」";
    readonly 'mcp.actionFallback': "组件操作";
    readonly 'mcp.receiptFallback': "组件回执";
    readonly 'mcp.scoreSuffix': "，得分：{score}";
    readonly 'reasoning.collapseFullAria': "收起完整思考";
    readonly 'reasoning.expandFullAria': "展开阅读完整思考";
    readonly 'reasoning.collapse': "收起";
    readonly 'reasoning.expandRead': "展开阅读";
    readonly 'tool.tabPreview': "生成预览";
    readonly 'tool.tabResult': "结果";
    readonly 'tool.tabInput': "输入";
    readonly 'tool.tabRaw': "原始数据";
    readonly 'tool.nestedHint': "更深的嵌套调用可在原对话查看。";
    readonly 'tool.ledgerTitle': "工具 · ";
    readonly 'tool.receivedChars': "已接收 {count} 字符输入";
    readonly 'tool.submittedWaiting': "已提交 · 等待工具返回";
    readonly 'tool.stoppedInputKept': "已停止 · 输入记录保留";
    readonly 'tool.ranFor': "执行 {duration}";
    readonly 'tool.resultRecorded': "结果已记录";
    readonly 'tool.tabsAria': "{title}的执行数据";
    readonly 'tool.selectionPaused': "为保留选区，预览暂停更新；当前状态见卡片标题。";
    readonly 'tool.allInputFields': "全部输入字段";
    readonly 'tool.inputFieldsLabel': "输入字段";
    readonly 'tool.phasePreparing': "输入生成中";
    readonly 'tool.phaseRunning': "执行中";
    readonly 'tool.phaseReturned': "已返回";
    readonly 'tool.phaseSucceeded': "已完成";
    readonly 'tool.phaseFailed': "失败";
    readonly 'tool.phaseInterrupted': "已中断";
    readonly 'tool.state.writeRunning': "正在写入";
    readonly 'tool.state.writeDone': "已写入";
    readonly 'tool.state.readRunning': "正在阅读";
    readonly 'tool.state.readDone': "已阅读";
    readonly 'tool.state.terminalRunning': "正在执行";
    readonly 'tool.state.terminalDone': "已执行";
    readonly 'tool.state.searchRunning': "正在搜索";
    readonly 'tool.state.searchDone': "已找到";
    readonly 'tool.state.webRunning': "正在获取";
    readonly 'tool.state.webDone': "已获取";
    readonly 'tool.state.otherRunning': "正在执行";
    readonly 'tool.state.otherDone': "已完成";
    readonly 'tool.durationMs': "{count} 毫秒";
    readonly 'tool.durationSeconds': "{count} 秒";
    readonly 'tool.inputGenerating': "正在生成的输入 · 尚未执行 · 末尾 12 行";
    readonly 'tool.fileContent': "工具输入中的文件内容";
    readonly 'tool.previewSuffix': " · 预览前 1,600 行，完整内容在原始数据中";
    readonly 'tool.fileContentLabel': "文件内容";
    readonly 'tool.commandGenerating': "正在生成命令 · 尚未执行";
    readonly 'tool.commandSubmitted': "提交的命令";
    readonly 'tool.inputFieldsReceived': "已收到的输入字段";
    readonly 'tool.interruptedNoResult': "已中断，没有工具结果。已生成的输入仍可查看。";
    readonly 'tool.generatingInputNotStarted': "模型正在生成工具输入，工具还未开始执行。";
    readonly 'tool.startedWaitingResult': "工具已开始执行，正在等待结果。";
    readonly 'tool.retryRecord': "模型重试记录";
    readonly 'tool.commandRecord': "命令记录";
    readonly 'tool.write': "写入";
    readonly 'tool.edit': "修改";
    readonly 'tool.patch': "代码补丁";
    readonly 'tool.file': "文件";
    readonly 'tool.read': "读取";
    readonly 'tool.runCommand': "运行命令";
    readonly 'tool.findFiles': "查找文件";
    readonly 'tool.searchContent': "搜索内容";
    readonly 'tool.searchWeb': "搜索网页";
    readonly 'tool.readWeb': "读取网页";
    readonly 'settings.nav': "DeckSeek";
    readonly 'settings.title': "DeckSeek";
    readonly 'settings.subtitle': "阅读视图的外观与行为。切换即时生效，不用重启。";
    readonly 'settings.appearance': "阅读区外观";
    readonly 'settings.readonly': "当前部署不支持持久化设置，外观保持默认。";
    readonly 'settings.skin.paper': "纸面";
    readonly 'settings.skin.paper.hint': "排版流：留白分组，字号落差大，不用卡片。";
    readonly 'settings.skin.soft': "软卡";
    readonly 'settings.skin.soft.hint': "卡片承载，留白多、字号大，适合久读。";
    readonly 'settings.skin.terminal': "终端";
    readonly 'settings.skin.terminal.hint': "行列对齐，等宽高密度，适合盯执行过程。";
    readonly 'settings.workDetail': "过程细节";
    readonly 'settings.workDetail.hint': "决定一轮的过程默认折起多少。与宿主对话视图同名同义。";
    readonly 'settings.workDetail.compact': "精简";
    readonly 'settings.workDetail.compact.hint': "折起整轮过程，折叠标题不显示实时命令，思考只留标题。";
    readonly 'settings.workDetail.standard': "标准";
    readonly 'settings.workDetail.standard.hint': "折起整轮过程，运行中标题显示命令，思考带首行预览。";
    readonly 'settings.workDetail.detailed': "详细";
    readonly 'settings.workDetail.detailed.hint': "当前轮过程展开，历史轮才折起。";
    readonly 'settings.workDetail.verbose': "全部展开";
    readonly 'settings.workDetail.verbose.hint': "不折起任何一轮，过程与正文一样直接铺开。";
};
export type UiKey = keyof typeof zh;
export declare const en: Record<UiKey, string>;
/** The DSH app marks its language on <html lang="…">; browser fallback otherwise. */
export declare function currentLocale(): UiLang;
/** Translate one key for an explicit language, substituting {placeholders}. */
export declare function uiIn(lang: UiLang, key: UiKey, params?: Record<string, string | number>): string;
/** Translate one key for the current app language. */
export declare function ui(key: UiKey, params?: Record<string, string | number>): string;
/** Structural subset of the native turn-process node payload. */
export interface TurnProcessData {
    readonly messageCount: number;
    readonly toolCallCount: number;
    readonly subagentCount: number;
}
/** One-line turn-process summary mirroring the native labels, for one language. */
export declare function turnProcessLabelIn(lang: UiLang, data: TurnProcessData): string;
/** One-line turn-process summary for the current app language. */
export declare function turnProcessLabel(data: TurnProcessData): string;
/**
 * Structural subset of the native turn-tail node payload.
 *
 * 0.1.7 replaced the per-turn rate fields. OLD's `turn-tail.ts` carried
 * `ttftMs` / `tokensPerSecond` from `deriveTurnMetrics`, and that whole
 * function is gone — per-turn speed and first-token latency no longer exist at
 * this granularity. Reading them silently produced no text at all, which is why
 * they are deleted here rather than kept as optional fields that never arrive.
 *
 * What replaced them is exact provider-reported accounting for the turn:
 * `deriveTurnTokenUsage`. Only totals are unconditional; the cache, reasoning
 * and route buckets are present only when every billed attempt reported them,
 * so a mixed-attribution turn reports no `routes` rather than a partial list.
 */
export interface TurnTokenUsageRoute {
    readonly provider: string;
    readonly model: string;
}
export interface TurnTokenUsage {
    readonly uncachedInputTokens: number;
    readonly outputTokens: number;
    readonly totalTokens: number;
    readonly cacheReadTokens?: number;
    readonly cacheWriteTokens?: number;
    readonly reasoningTokens?: number;
    readonly routes?: readonly TurnTokenUsageRoute[];
}
/**
 * The turn-tail node's payload, as `ui-chat` publishes it.
 *
 * `closing` is the last content-bearing answer in the turn, and it is the only
 * place the turn's end time survives: the tail's own `time` is the tail node's
 * arrival, which for a turn that was retried or resumed is not when the answer
 * landed. `branchUnavailable` says the engine already knows this turn cannot be
 * forked, so a reader never has to be told "no" by a control.
 */
export interface TurnTailData {
    readonly turn?: number;
    readonly seq?: number;
    readonly time?: number;
    readonly closing?: {
        readonly time?: number;
    } | null;
    readonly branchUnavailable?: boolean;
    readonly tokenUsage?: TurnTokenUsage | null;
}
/**
 * Compact token count, e.g. 1234 -> "1.2k".
 *
 * Kept in sync with the host's own `formatTokens` (`ui-chat`'s `token-format`),
 * which the plugin cannot import: `ui-chat` is not a platform module, so
 * reaching into it would bundle a second copy of the chat. The host groups
 * thousands with the locale's separator at the M boundary; the reading view
 * prints its footer inline and so stays with the unseparated M form.
 */
export declare function formatTokens(value: number): string;
/**
 * The turn's cache hit rate, as a whole percent, or null when the turn reported
 * no cache buckets.
 *
 * `uncachedInputTokens` is the provider's own uncached prompt count, so the
 * denominator is the prompt the provider saw: cached plus uncached. A turn that
 * reported cached reads but no uncached input still has a rate — 100%.
 */
export declare function cacheHitRate(usage: TurnTokenUsage): number | null;
/**
 * The wall-clock time a message landed, e.g. "14:03", or "8月3日 14:03" for a
 * day that is not today.
 *
 * Mirrors the host's `formatMessageClock` (`ui-chat`'s `message-chrome`), which
 * the plugin cannot import for the same reason as `formatTokens`. The date is
 * added only when the stamp is not from today, because on the turn a reader is
 * reading right now the date is noise.
 *
 * @param time - Unix epoch milliseconds.
 * @param lang - reading language.
 * @param now - clock to compare against; injected so the day boundary is testable.
 * @returns the formatted stamp.
 */
export declare function messageClock(time: number, lang: UiLang, now?: number): string;
/** Compact one-line turn stats for one language; null when nothing measurable. */
export declare function turnTailStatsIn(lang: UiLang, data: TurnTailData): string | null;
/**
 * The full accounting behind the one-line footer: every bucket the turn
 * reported, plus the routes that billed it.
 *
 * The footer can only carry a couple of numbers before it stops being a footer,
 * so the rest hangs off the row's title. That is also the only place a reader
 * can see which provider/model served the turn, which is exactly the kind of
 * thing a reader only wants when something looks wrong with the numbers.
 * Unreported buckets are left out rather than shown as zero: a turn that never
 * told us its cache write count has no cache write count.
 */
export declare function turnTailDetailIn(lang: UiLang, data: TurnTailData): string | null;
/** Compact one-line turn stats for the current app language. */
export declare function turnTailStats(data: TurnTailData): string | null;
/** Full accounting behind the footer, for the current app language. */
export declare function turnTailDetail(data: TurnTailData): string | null;
/** Friendly label for a record kind, for one language. */
export declare function unknownKindLabelIn(lang: UiLang, kind: string): string;
/** Friendly label for a record kind, for the current app language. */
export declare function unknownKindLabel(kind: string): string;
/** Settings-page name for one reading skin. */
export declare function skinName(id: SkinId): string;
/** One-line description for one reading skin. */
export declare function skinHint(id: SkinId): string;
/** Settings-page name for one work-details level. */
export declare function workDetailName(id: WorkDetailId): string;
/** One-line description for one work-details level. */
export declare function workDetailHint(id: WorkDetailId): string;
//# sourceMappingURL=locale.d.ts.map
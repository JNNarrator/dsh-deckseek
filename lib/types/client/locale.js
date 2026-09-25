/**
 * Plugin UI language support. The DSH app marks its current language on
 * <html lang="…">; dictionaries live in this package (the app's own locale
 * packs are build-time static and cannot be extended by plugins). Strings use
 * the same copy as the native chat where the feature exists, so switching the
 * app language switches the reading view too. `currentLocale()` falls back to
 * zh when no browser context exists (unit tests, SSR), matching the plugin's
 * default authoring language.
 */
export const zh = {
    // Reading tab / chrome
    'reader.tab': 'DeckSeek',
    'reader.sessionClosed': '阅读页对应的会话已关闭。',
    'reader.toolbarTitle': '阅读 · 原始记录完整保留',
    'reader.toolbarHint': '基于真实消息类型和轮次边界整理。当前协议没有独立的正文阶段标记，无法确认的内容会继续保留。',
    'reader.toolbarAria': '阅读工具',
    'reader.motionFollowOff': '动效 · 跟随系统关闭',
    'reader.motionOn': '动效开',
    'reader.motionOff': '动效关',
    'reader.search': '查找',
    'reader.searchClose': '关闭查找',
    'reader.searchPlaceholder': '在阅读页中查找…',
    'reader.searchNoMatches': '无匹配',
    'reader.searchPrevTitle': '上一个（Shift+Enter）',
    'reader.searchNextTitle': '下一个（Enter）',
    'reader.loadEarlier': '加载更早记录',
    'reader.loadingEarlier': '正在加载更早记录',
    'reader.historyFailed': '历史记录加载失败，可再次尝试；现有内容未改变。',
    'reader.openFailed': '会话暂时无法读取：',
    'reader.loading': '正在读取会话…',
    'reader.needQuestion': '需要你回答一个问题',
    'reader.needConfirm': '需要你的确认',
    'reader.pendingHint': '请在下方原生操作区处理。此提示不会收进执行过程。',
    'reader.positionRestored': '已回到上次阅读位置。',
    'reader.jumpLatest': '回到最新',
    'reader.showEarlierTurns': '展开更早的 {count} 轮',
    'reader.export': '导出',
    'reader.exportTitle': '将本轮会话导出为 Markdown 文件',
    'export.heading': 'DeckSeek 会话导出',
    'export.user': '用户',
    'export.steering': '用户 · 补充消息',
    'export.assistant': '求索',
    'empty.title': '在下方发送消息，开始一场对话',
    'empty.hint': '阅读视图会自动折叠执行过程、保留最终回答；页内查找与消息导航随时可用。',
    // The terminal skin labels the idle hint like a manual section, the way the
    // reference TUIs label their own idle blocks.
    'empty.hintLabel': '[提示]',
    // Window-title bar readout (terminal skin). Counts only what the reader
    // already holds: turns grouped from the live session and their steps.
    'meter.turns': '{count} 轮',
    // Chinese does not inflect: these repeat the plural string so both
    // dictionaries keep the same key set (same shape as the fold counts).
    'meter.turnsOne': '{count} 轮',
    'meter.turnsMore': '{count}+ 轮',
    'meter.steps': '最新一轮 {count} 步',
    'meter.stepsOne': '最新一轮 {count} 步',
    // Collapsed-process summary (terminal skin), counted off the turn's own flow.
    'frame.tools': '{count} 次工具调用',
    'frame.files': '{count} 个文件',
    'frame.toolsOne': '{count} 次工具调用',
    'frame.filesOne': '{count} 个文件',
    'frame.failed': '{count} 次失败',
    'frame.activity.terminal': '运行了命令',
    'frame.activity.write': '修改了文件',
    'frame.activity.read': '读取了文件',
    'frame.activity.search': '搜索了代码',
    'frame.activity.web': '查询了网络',
    'frame.activity.other': '调用了工具',
    'frame.activity.join': '{first}并{second}',
    // Joining three or more families. `comma` is the full-width list comma and
    // `more` is the host's own `{title}等` — one character standing for "and the
    // rest", where a fourth family would name more than the reader can use.
    // `more` is the host's own `{title}等` — one character standing for "and the
    // rest", where a fourth family would name more than the reader can use.
    'frame.activity.comma': '，',
    'frame.activity.more': '{title}等',
    // The live phase of a group, in the same 6-family vocabulary as the settled
    // phrase above. The harness splits a live group three ways — preparing for a
    // call whose arguments have not arrived, running it, and done — and only the
    // last matches `frame.activity.*`. Preparing is the state a reader most needs
    // named: nothing on screen has changed yet, so without it the label claims
    // work that has not started.
    'frame.prepare.terminal': '准备运行命令',
    'frame.prepare.write': '准备修改文件',
    'frame.prepare.read': '准备读取文件',
    'frame.prepare.search': '准备搜索代码',
    'frame.prepare.web': '准备查询网络',
    'frame.prepare.other': '准备调用工具',
    'frame.prepare.tools': '准备调用工具',
    'frame.running.terminal': '正在运行命令',
    'frame.running.write': '正在修改文件',
    'frame.running.read': '正在读取文件',
    'frame.running.search': '正在搜索代码',
    'frame.running.web': '正在查询网络',
    'frame.running.other': '正在调用工具',
    'frame.running.tools': '正在调用工具',
    'rail.label': '消息导航',
    'rail.jump': '跳到第 {turn} 轮',
    'rail.turn': '第 {turn} 轮',
    'rail.message': '消息',
    // Turn / process status
    'turn.stopped': '已停止',
    'turn.errorTitle': '本轮出现错误',
    'retry.scheduled': '等待重试',
    'retry.started': '已开始重试',
    'retry.cancelled': '重试已取消',
    'retry.status': '{label}：第 {retry}/{max} 次，约 {seconds} 秒后',
    'retry.delay': '等待',
    'retry.failure': '失败原因',
    'retry.provider': '供应方',
    'retry.auth': '凭据无效或已过期，重试不会成功。',
    'turn.maxTokens': '已到达输出长度限制，回答尚未完整。',
    'turn.retryWaiting': '模型请求未成功，正在等待重试。',
    'turn.you': '你',
    // Header for records the projection could not tie to a turn: the session
    // preamble (system prompt, injected context, command records). Deliberately
    // not a phase sentence — nothing is running on this line.
    'turn.preamble': '会话起始记录',
    'turn.steering': '补充消息',
    'turn.references': '引用：{labels}',
    'turn.referenceSeparator': '、',
    'turn.process': '思考与过程',
    'turn.foldAriaCollapse': '收起思考与过程',
    'turn.foldAriaExpand': '展开思考与过程',
    'status.process': '执行过程',
    'status.timeSeconds': '用时 {seconds} 秒',
    'status.timeMinutes': '用时 {minutes} 分 {seconds} 秒',
    'status.waiting': '等待你的操作',
    'status.usingTool': '正在使用工具',
    'status.thinkingName': '大肥鱼正在思考中… {time}',
    'status.delving': '深度求索中… {time}',
    'status.clockSeconds': '{seconds} 秒',
    'status.clockMinutes': '{minutes} 分 {seconds} 秒',
    'status.outputting': '正在输出',
    'status.preparingReply': '正在准备回复',
    'status.processing': '正在处理',
    'status.steps': '{count} 个步骤',
    // Working verbs for the terminal skin's status line — see status-verb.ts.
    // They replace the working label only, never `status.thinkingName`.
    'status.verb.reviewing': '梳理中',
    'status.verb.analyzing': '推演中',
    'status.verb.considering': '权衡中',
    'status.verb.planning': '规划中',
    'status.verb.checking': '核对中',
    'status.verb.searching': '检索中',
    'status.verb.building': '构建中',
    'status.verb.summarizing': '归纳中',
    'terminal.stopped': '本轮已停止，已生成的内容仍保留。',
    'terminal.blocked': '本轮需要处理阻塞事项；请查看原对话与下方操作区。',
    'terminal.maxTokens': '输出达到本轮长度限制，内容可能尚未完整。',
    'terminal.error': '本轮未完成；错误信息保留在下方。',
    'terminal.unknown': '本轮结束状态：{reason}。请在原对话中核对完整记录。',
    // Command / compaction
    'command.failedTitle': '命令执行失败',
    'command.fallback': '查看原对话中的命令记录',
    'compaction.failedTitle': '上下文压缩失败',
    'compaction.running': '正在整理上下文…',
    // The divider a reader meets where their conversation was compacted. It
    // states what the compaction cost and can show the memo it left behind.
    'compaction.divider': '历史上下文已精简优化',
    'compaction.dividerItems': '已精简 {count} 条历史消息',
    'compaction.dividerTokens': '历史记忆已整理 · 释放约 {tokens} tokens',
    'compaction.dividerItemsTokens': '已精简 {count} 条历史消息 · 释放约 {tokens} tokens',
    'compaction.memoShow': '查看备忘',
    'compaction.memoHide': '收起备忘',
    'compaction.memoHeader': '前期对话要点备忘',
    // System prompt / turn process / turn tail
    'systemPrompt': '系统提示词',
    'turnProcess.prefix': '执行过程 · ',
    'turnProcess.thought': '已思考',
    'turnProcess.toolCalls.one': '{count} 次工具调用',
    'turnProcess.toolCalls.other': '{count} 次工具调用',
    'turnProcess.messages.one': '{count} 条消息',
    'turnProcess.messages.other': '{count} 条消息',
    'turnProcess.subagents.one': '{count} 个 subagent',
    'turnProcess.subagents.other': '{count} 个 subagent',
    'turnProcess.separator': ' · ',
    'turnTail.tokens': '约 {tokens} tokens',
    'turnTail.cacheHit': '缓存命中 {percent}%',
    'turnTail.total': '总量 {tokens} tok',
    'trigger.request': '收到执行请求',
    'trigger.goal': '继续执行目标',
    'trigger.agent': '收到任务消息',
    'trigger.team': '收到团队消息',
    'trigger.subagent': '子任务状态更新',
    'trigger.github': '收到 GitHub 事件',
    'trigger.webhook': '收到外部事件',
    'trigger.schedule': '定时任务',
    'trigger.job': '后台任务状态更新',
    'trigger.plugin': '插件状态更新',
    'trigger.explanation': '这条通知触发了本轮回复。',
    'trigger.source': '来源',
    'turnTail.uncachedInput': '未缓存输入 {tokens} tok',
    'turnTail.cacheRead': '缓存读取 {tokens} tok',
    'turnTail.cacheWrite': '缓存写入 {tokens} tok',
    'turnTail.output': '输出 {tokens} tok',
    'turnTail.reasoningDetail': '其中推理 {tokens} tok',
    'turnTail.routes': '路由 {routes}',
    'turnTail.reasoning': '其中推理 {tokens} tok',
    'branch.action': '在新对话中分支',
    'branch.unavailable': '仅可从已完成轮次的最后一条消息分支',
    'clock.md': '{m}月{d}日',
    'clock.ymd': '{y}年{m}月{d}日',
    // Failure card
    'failure.note': '详情保留在执行记录中。',
    'failure.toolTitle': '工具执行失败',
    'failure.exitCode': '退出码 {code}',
    'failure.signal': '信号 {signal}',
    'tool.failureShown': '失败详情见上方失败卡片；原始输出可在「原始数据」查看。',
    // Unknown record
    'viewRawRecord': '查看原始记录',
    'unknown.copy': '复制记录',
    'unknown.copied': '已复制',
    'unknown.arrayItems': '数组 · {count} 项',
    'unknown.arrayOf': '数组 · ',
    'unknown.itemsCount': '{count} 项',
    'unknown.emptyObject': '空对象',
    'unknown.kind.turnProcess': '执行过程记录',
    // Blocks / images / copy
    'block.unavailable': '此内容暂时无法在阅读页显示；原对话中的记录未受影响。',
    'image.zoom': '放大图片',
    'image.zoomWithName': '放大图片：{name}',
    'image.alt': '会话图片',
    'image.loading': '正在加载图片',
    'image.failed': '图片未能加载',
    'image.retry': '重试',
    'image.preview': '图片预览',
    'image.closePreview': '关闭图片预览',
    'copy.answer': '复制回答',
    'copy.done': '已复制',
    'copy.failed': '未能复制，请手动选择文字',
    'tool.argsLabel': '工具参数 · {name}',
    'block.unsupported': '此内容类型尚未接入阅读页，原始内容已保留。',
    'viewRawContent': '查看原始内容',
    // Code / table
    'code.copy': '复制',
    'code.copied': '已复制',
    'code.copyCode': '复制代码',
    'code.block': '代码块',
    'code.wrap': '自动换行',
    'code.unwrap': '取消自动换行',
    'table.copyCsv': '复制为 CSV',
    'footnotes': '脚注',
    // Tool activity
    'tool.prepareWrite': '正在生成文件内容',
    'tool.prepareTerminal': '正在准备命令',
    'tool.prepareInput': '正在准备工具输入',
    'tool.detailReturned': '文件工具已返回。以下为提交的内容；完整返回记录可在「原始数据」查看。',
    'tool.detailMedia': '图片或扩展内容已在对话中单独展示。',
    'tool.detailEmpty': '工具没有返回可展示的内容。',
    'tool.rawNotice': '完整记录 · 只读 · 不执行其中的代码',
    'tool.rawInput': '工具输入',
    'tool.rawResult': '工具结果',
    'tool.inputPending': '输入尚未到达',
    'tool.subcalls': '子调用',
    'tool.others': '工具调用',
    // Primitive block labels
    'read.window': '显示 {shown} / {total} 行',
    'read.collapseAria': '收起文件内容',
    'read.expandAria': '展开其余 {hidden} 行',
    'read.collapse': '收起',
    'read.expand': '展开其余 {hidden} 行',
    'terminal.signal': '信号 {signal}',
    'terminal.exitCode': '退出码 {code}',
    'terminal.noExitCode': '未正常退出',
    'terminal.running': '执行中',
    'terminal.failed': '失败',
    'terminal.done': '已完成',
    'terminal.noOutput': '没有输出',
    'terminal.collapseAria': '收起命令输出',
    'diff.collapseAria': '收起差异',
    'search.pathsSummary': '{shown} / {total} 个路径{truncated}',
    'search.matchesSummary': '{shown} / {total} 处匹配 · {files} 个文件{truncated}',
    'search.truncated': '（结果已截断）',
    'search.noResults': '没有结果',
    'search.collapseAria': '收起搜索结果',
    'web.noResults': '没有结果',
    'web.sourcesTruncated': '来源已截断',
    'web.http': 'HTTP',
    'web.contentTruncated': '内容已截断',
    'json.copyValue': '复制值',
    'json.copyJson': '复制 JSON',
    'json.copyPath': '复制路径',
    'json.copyPrettyJson': '复制格式化 JSON',
    'json.copyCompactJson': '复制紧凑 JSON',
    'json.copyFailed': '复制失败',
    'json.collapseNode': '收起节点',
    'json.expandNode': '展开节点',
    'truncate.label': '内容过长，已截断（共 {count} 个字符）',
    'block.unknown': '未知内容块',
    // Reasoning card
    'reasoning.label': '思考',
    'reasoning.step': '步骤 {step}',
    'reasoning.regionAria': '步骤 {step} 的思考',
    'reasoning.scrollAria': '步骤 {step} 的思考，可滚动阅读',
    'reasoning.pauseFollowAria': '暂停自动跟随思考',
    'reasoning.resumeFollowAria': '继续跟随最新思考',
    'reasoning.pauseFollow': '暂停跟随',
    'reasoning.resumeFollow': '跟随最新',
    'reasoning.manual': '手动阅读',
    'reasoning.followHint': '取消文字选择后可继续跟随',
    // MCP app
    'mcp.title': '交互式 MCP App',
    'mcp.summaryChoice': '选择: {choice}',
    'mcp.summaryAction': '操作: {action}',
    'mcp.summaryVariant': '方案: {variant}',
    'mcp.reset': '重置组件状态',
    'mcp.ready': '已就绪：{receipt}',
    'mcp.focusSend': '聚焦输入框并回车发送',
    'mcp.sendDirectly': '回车直接发送',
    'mcp.streaming': '正在生成交互组件{title}',
    'mcp.titleSuffixZh': '（{title}）',
    'mcp.titleSuffixEn': ' ({title})',
    'mcp.component': '组件',
    'mcp.choicePrompt': '我在{name}中选择了：{choice}{desc}。请根据我的选择继续。',
    'mcp.choicePromptScore': '我在方案评测中选择了：{variant}{score}。请根据该方案继续分析。',
    'mcp.actionPrompt': '[{name}] 已完成 {action}{payload}',
    'mcp.receiptPrompt': '[{name}] {key}: {value}',
    'mcp.descSuffix': '（{desc}）',
    'mcp.quoteTitle': '「{title}」',
    'mcp.actionFallback': '组件操作',
    'mcp.receiptFallback': '组件回执',
    'mcp.scoreSuffix': '，得分：{score}',
    // Reasoning card controls
    'reasoning.collapseFullAria': '收起完整思考',
    'reasoning.expandFullAria': '展开阅读完整思考',
    'reasoning.collapse': '收起',
    'reasoning.expandRead': '展开阅读',
    // Tool activity
    'tool.tabPreview': '生成预览',
    'tool.tabResult': '结果',
    'tool.tabInput': '输入',
    'tool.tabRaw': '原始数据',
    'tool.nestedHint': '更深的嵌套调用可在原对话查看。',
    'tool.ledgerTitle': '工具 · ',
    'tool.receivedChars': '已接收 {count} 字符输入',
    'tool.submittedWaiting': '已提交 · 等待工具返回',
    'tool.stoppedInputKept': '已停止 · 输入记录保留',
    'tool.ranFor': '执行 {duration}',
    'tool.resultRecorded': '结果已记录',
    'tool.tabsAria': '{title}的执行数据',
    'tool.selectionPaused': '为保留选区，预览暂停更新；当前状态见卡片标题。',
    'tool.allInputFields': '全部输入字段',
    'tool.inputFieldsLabel': '输入字段',
    'tool.phasePreparing': '输入生成中',
    'tool.phaseRunning': '执行中',
    'tool.phaseReturned': '已返回',
    'tool.phaseSucceeded': '已完成',
    'tool.phaseFailed': '失败',
    'tool.phaseInterrupted': '已中断',
    'tool.state.writeRunning': '正在写入',
    'tool.state.writeDone': '已写入',
    'tool.state.readRunning': '正在阅读',
    'tool.state.readDone': '已阅读',
    'tool.state.terminalRunning': '正在执行',
    'tool.state.terminalDone': '已执行',
    'tool.state.searchRunning': '正在搜索',
    'tool.state.searchDone': '已找到',
    'tool.state.webRunning': '正在获取',
    'tool.state.webDone': '已获取',
    'tool.state.otherRunning': '正在执行',
    'tool.state.otherDone': '已完成',
    'tool.durationMs': '{count} 毫秒',
    'tool.durationSeconds': '{count} 秒',
    'tool.inputGenerating': '正在生成的输入 · 尚未执行 · 末尾 12 行',
    'tool.fileContent': '工具输入中的文件内容',
    'tool.previewSuffix': ' · 预览前 1,600 行，完整内容在原始数据中',
    'tool.fileContentLabel': '文件内容',
    'tool.commandGenerating': '正在生成命令 · 尚未执行',
    'tool.commandSubmitted': '提交的命令',
    'tool.inputFieldsReceived': '已收到的输入字段',
    'tool.interruptedNoResult': '已中断，没有工具结果。已生成的输入仍可查看。',
    'tool.generatingInputNotStarted': '模型正在生成工具输入，工具还未开始执行。',
    'tool.startedWaitingResult': '工具已开始执行，正在等待结果。',
    'tool.retryRecord': '模型重试记录',
    'tool.commandRecord': '命令记录',
    // Tool row titles
    'tool.write': '写入',
    'tool.edit': '修改',
    'tool.patch': '代码补丁',
    'tool.file': '文件',
    'tool.read': '读取',
    'tool.runCommand': '运行命令',
    'tool.findFiles': '查找文件',
    'tool.searchContent': '搜索内容',
    'tool.searchWeb': '搜索网页',
    'tool.readWeb': '读取网页',
    // Settings
    'settings.nav': 'DeckSeek',
    'settings.title': 'DeckSeek',
    'settings.subtitle': '阅读视图的外观与行为。切换即时生效，不用重启。',
    'settings.appearance': '阅读区外观',
    'settings.readonly': '当前部署不支持持久化设置，外观保持默认。',
    'settings.skin.paper': '纸面',
    'settings.skin.paper.hint': '排版流：留白分组，字号落差大，不用卡片。',
    'settings.skin.soft': '软卡',
    'settings.skin.soft.hint': '卡片承载，留白多、字号大，适合久读。',
    'settings.skin.terminal': '终端',
    'settings.skin.terminal.hint': '行列对齐，等宽高密度，适合盯执行过程。',
    'settings.workDetail': '过程细节',
    'settings.workDetail.hint': '决定一轮的过程默认折起多少。与宿主对话视图同名同义。',
    'settings.workDetail.compact': '精简',
    'settings.workDetail.compact.hint': '折起整轮过程，折叠标题不显示实时命令，思考只留标题。',
    'settings.workDetail.standard': '标准',
    'settings.workDetail.standard.hint': '折起整轮过程，运行中标题显示命令，思考带首行预览。',
    'settings.workDetail.detailed': '详细',
    'settings.workDetail.detailed.hint': '当前轮过程展开，历史轮才折起。',
    'settings.workDetail.verbose': '全部展开',
    'settings.workDetail.verbose.hint': '不折起任何一轮，过程与正文一样直接铺开。',
};
export const en = {
    'reader.tab': 'DeckSeek',
    'reader.sessionClosed': 'The reading page\'s session is closed.',
    'reader.toolbarTitle': 'Reading · original record fully preserved',
    'reader.toolbarHint': 'Reconstructed from real message types and turn boundaries. The current protocol has no separate body-phase marker; unverifiable content stays as-is.',
    'reader.toolbarAria': 'Reading tools',
    'reader.motionFollowOff': 'Motion · follows system (off)',
    'reader.motionOn': 'Motion on',
    'reader.motionOff': 'Motion off',
    'reader.search': 'Search',
    'reader.searchClose': 'Close search',
    'reader.searchPlaceholder': 'Search in the reading view…',
    'reader.searchNoMatches': 'No matches',
    'reader.searchPrevTitle': 'Previous (Shift+Enter)',
    'reader.searchNextTitle': 'Next (Enter)',
    'reader.loadEarlier': 'Load earlier records',
    'reader.loadingEarlier': 'Loading earlier records',
    'reader.historyFailed': 'Failed to load history; try again — the current content is unchanged.',
    'reader.openFailed': 'Could not read this session: ',
    'reader.loading': 'Reading session…',
    'reader.needQuestion': 'A question needs your answer',
    'reader.needConfirm': 'Confirmation needed',
    'reader.pendingHint': 'Handle it in the native actions below. This notice is not part of the execution record.',
    'reader.positionRestored': 'Back to your previous reading position.',
    'reader.jumpLatest': 'Back to latest',
    'reader.showEarlierTurns': 'Show {count} earlier turns',
    'reader.export': 'Export',
    'reader.exportTitle': 'Download this conversation as a Markdown file',
    'export.heading': 'DeckSeek conversation export',
    'export.user': 'User',
    'export.steering': 'User · supplementary message',
    'export.assistant': 'DeepSeek',
    'empty.title': 'Send a message below to start a conversation',
    'empty.hint': 'The reading view folds the process and keeps the final answer; in-view search and the message rail are always available.',
    'empty.hintLabel': '[hint]',
    'meter.turns': '{count} turns',
    'meter.turnsOne': '{count} turn',
    'meter.turnsMore': '{count}+ turns',
    'meter.steps': 'last turn {count} steps',
    'meter.stepsOne': 'last turn {count} step',
    'frame.tools': '{count} tool calls',
    'frame.files': '{count} files',
    'frame.toolsOne': '{count} tool call',
    'frame.filesOne': '{count} file',
    'frame.failed': '{count} failed',
    'frame.activity.terminal': 'ran commands',
    'frame.activity.write': 'edited files',
    'frame.activity.read': 'read files',
    'frame.activity.search': 'searched code',
    'frame.activity.web': 'searched the web',
    'frame.activity.other': 'called tools',
    'frame.activity.join': '{first} and {second}',
    // English list punctuation and the host's `{title}, etc.`.
    'frame.activity.comma': ', ',
    'frame.activity.more': '{title}, etc.',
    'frame.prepare.terminal': 'preparing to run commands',
    'frame.prepare.write': 'preparing to edit files',
    'frame.prepare.read': 'preparing to read files',
    'frame.prepare.search': 'preparing to search code',
    'frame.prepare.web': 'preparing to search the web',
    'frame.prepare.other': 'preparing tool calls',
    'frame.prepare.tools': 'preparing tool calls',
    'frame.running.terminal': 'running commands',
    'frame.running.write': 'editing files',
    'frame.running.read': 'reading files',
    'frame.running.search': 'searching code',
    'frame.running.web': 'searching the web',
    'frame.running.other': 'calling tools',
    'frame.running.tools': 'calling tools',
    'rail.label': 'Message navigation',
    'rail.jump': 'Jump to turn {turn}',
    'rail.turn': 'Turn {turn}',
    'rail.message': 'Message',
    'turn.stopped': 'Stopped',
    'turn.errorTitle': 'Error in this turn',
    'retry.scheduled': 'Retry scheduled',
    'retry.started': 'Retry started',
    'retry.cancelled': 'Retry cancelled',
    'retry.status': '{label}: attempt {retry}/{max}, about {seconds}s',
    'retry.delay': 'Delay',
    'retry.failure': 'Failure',
    'retry.provider': 'Provider',
    'retry.auth': 'Credentials are invalid or expired; retrying will not succeed.',
    'turn.maxTokens': 'Output length limit reached; the answer may be incomplete.',
    'turn.retryWaiting': 'Model request failed; waiting to retry.',
    'turn.you': 'You',
    'turn.preamble': 'Session preamble',
    'turn.steering': 'Supplementary message',
    'turn.references': 'References: {labels}',
    'turn.referenceSeparator': ', ',
    'turn.process': 'Thinking & process',
    'turn.foldAriaCollapse': 'Collapse thinking & process',
    'turn.foldAriaExpand': 'Expand thinking & process',
    'status.process': 'In progress',
    'status.timeSeconds': 'Took {seconds}s',
    'status.timeMinutes': 'Took {minutes}m {seconds}s',
    'status.waiting': 'Waiting for your input',
    'status.usingTool': 'Using a tool',
    'status.thinkingName': 'BigFatFish is thinking… {time}',
    'status.clockSeconds': '{seconds}s',
    'status.delving': 'DeepSeeking… {time}',
    'status.clockMinutes': '{minutes}m {seconds}s',
    'status.outputting': 'Outputting',
    'status.preparingReply': 'Preparing reply',
    'status.processing': 'Processing',
    'status.steps': '{count} steps',
    // Working verbs for the terminal skin's status line — see status-verb.ts.
    // They replace the working label only, never `status.thinkingName`.
    'status.verb.reviewing': 'Reviewing',
    'status.verb.analyzing': 'Analyzing',
    'status.verb.considering': 'Considering',
    'status.verb.planning': 'Planning',
    'status.verb.checking': 'Checking',
    'status.verb.searching': 'Searching',
    'status.verb.building': 'Building',
    'status.verb.summarizing': 'Summarizing',
    'terminal.stopped': 'This turn stopped; the generated content is preserved.',
    'terminal.blocked': 'This turn has blocked items; see the original chat and the actions below.',
    'terminal.maxTokens': 'Output reached this turn\'s length limit; content may be incomplete.',
    'terminal.error': 'This turn is incomplete; the error is kept below.',
    'terminal.unknown': 'This turn ended with state: {reason}. Verify the full record in the original chat.',
    'command.failedTitle': 'Command failed',
    'command.fallback': 'see the command record in the original chat',
    'compaction.failedTitle': 'Context compaction failed',
    'compaction.running': 'Compacting context…',
    'compaction.divider': 'Earlier context was compacted',
    'compaction.dividerItems': 'Compacted {count} earlier messages',
    'compaction.dividerTokens': 'Earlier memory reorganised · about {tokens} tokens freed',
    'compaction.dividerItemsTokens': 'Compacted {count} earlier messages · about {tokens} tokens freed',
    'compaction.memoShow': 'Show memo',
    'compaction.memoHide': 'Hide memo',
    'compaction.memoHeader': 'Memo of the earlier conversation',
    'systemPrompt': 'System prompt',
    'turnProcess.prefix': 'Process · ',
    'turnProcess.thought': 'Thought for a while',
    'turnProcess.toolCalls.one': '{count} tool call',
    'turnProcess.toolCalls.other': '{count} tool calls',
    'turnProcess.messages.one': '{count} message',
    'turnProcess.messages.other': '{count} messages',
    'turnProcess.subagents.one': '{count} subagent',
    'turnProcess.subagents.other': '{count} subagents',
    'turnProcess.separator': ' · ',
    'turnTail.tokens': '~{tokens} tokens',
    'turnTail.cacheHit': '{percent}% cached',
    'turnTail.total': '{tokens} tok total',
    'trigger.request': 'Execution requested',
    'trigger.goal': 'Continuing goal',
    'trigger.agent': 'Task message received',
    'trigger.team': 'Team message received',
    'trigger.subagent': 'Subtask status updated',
    'trigger.github': 'GitHub event received',
    'trigger.webhook': 'External event received',
    'trigger.schedule': 'Scheduled task',
    'trigger.job': 'Background task updated',
    'trigger.plugin': 'Plugin status updated',
    'trigger.explanation': 'This notification started the reply below.',
    'trigger.source': 'source',
    'turnTail.uncachedInput': '{tokens} tok uncached input',
    'turnTail.cacheRead': '{tokens} tok cache read',
    'turnTail.cacheWrite': '{tokens} tok cache write',
    'turnTail.output': '{tokens} tok output',
    'turnTail.reasoningDetail': '{tokens} tok of it reasoning',
    'turnTail.routes': 'routes {routes}',
    'turnTail.reasoning': '{tokens} tok reasoning',
    'branch.action': 'Branch into a new conversation',
    'branch.unavailable': 'Available only on the last message of a completed turn',
    'clock.md': '{m}/{d}',
    'clock.ymd': '{y}-{m}-{d}',
    'failure.note': 'Details are kept in the execution record.',
    'tool.failureShown': 'Failure details are in the card above; raw output is under "Raw data".',
    'failure.toolTitle': 'Tool failed',
    'failure.exitCode': 'exit code {code}',
    'failure.signal': 'signal {signal}',
    'viewRawRecord': 'View raw record',
    'unknown.copy': 'Copy record',
    'unknown.copied': 'Copied',
    'unknown.arrayItems': 'Array · {count} items',
    'unknown.arrayOf': 'Array · ',
    'unknown.itemsCount': '{count} items',
    'unknown.emptyObject': 'empty object',
    'unknown.kind.turnProcess': 'Turn process record',
    'block.unavailable': 'This content can\'t be shown in the reading view yet; the original record is unaffected.',
    'image.zoom': 'Enlarge image',
    'image.zoomWithName': 'Enlarge image: {name}',
    'image.alt': 'Session image',
    'image.loading': 'Loading image',
    'image.failed': 'Failed to load image',
    'image.retry': 'Retry',
    'image.preview': 'Image preview',
    'image.closePreview': 'Close image preview',
    'copy.answer': 'Copy answer',
    'copy.done': 'Copied',
    'copy.failed': 'Copy failed — select the text manually',
    'tool.argsLabel': 'Tool arguments · {name}',
    'block.unsupported': 'This content kind is not wired into the reading view yet; the original content is preserved.',
    'viewRawContent': 'View raw content',
    'code.copy': 'Copy',
    'code.copied': 'Copied',
    'code.copyCode': 'Copy code',
    'code.block': 'Code block',
    'code.wrap': 'Wrap lines',
    'code.unwrap': 'Do not wrap lines',
    'table.copyCsv': 'Copy as CSV',
    'footnotes': 'Footnotes',
    'tool.prepareWrite': 'Generating file content',
    'tool.prepareTerminal': 'Preparing command',
    'tool.prepareInput': 'Preparing tool input',
    'tool.detailReturned': 'The file tool returned. Below is the submitted content; the full response is in "Raw data".',
    'tool.detailMedia': 'Images and extended content are shown separately in the chat.',
    'tool.detailEmpty': 'The tool returned no displayable content.',
    'tool.rawNotice': 'Full record · read-only · code inside is not executed',
    'tool.rawInput': 'Tool input',
    'tool.rawResult': 'Tool result',
    'tool.inputPending': 'Input not yet available',
    'tool.subcalls': 'Sub-calls',
    'tool.others': 'Tool call',
    'read.window': 'Showing {shown} / {total} lines',
    'read.collapseAria': 'Collapse file content',
    'read.expandAria': 'Expand remaining {hidden} lines',
    'read.collapse': 'Collapse',
    'read.expand': 'Expand remaining {hidden} lines',
    'terminal.signal': 'signal {signal}',
    'terminal.exitCode': 'exit code {code}',
    'terminal.noExitCode': 'no exit code',
    'terminal.running': 'Running',
    'terminal.failed': 'Failed',
    'terminal.done': 'Done',
    'terminal.noOutput': 'No output',
    'terminal.collapseAria': 'Collapse command output',
    'diff.collapseAria': 'Collapse diff',
    'search.pathsSummary': '{shown} / {total} paths{truncated}',
    'search.matchesSummary': '{shown} / {total} matches · {files} files{truncated}',
    'search.truncated': ' (truncated)',
    'search.noResults': 'No results',
    'search.collapseAria': 'Collapse search results',
    'web.noResults': 'No results',
    'web.sourcesTruncated': 'Sources truncated',
    'web.http': 'HTTP',
    'web.contentTruncated': 'Content truncated',
    'json.copyValue': 'Copy value',
    'json.copyJson': 'Copy JSON',
    'json.copyPath': 'Copy path',
    'json.copyPrettyJson': 'Copy pretty JSON',
    'json.copyCompactJson': 'Copy compact JSON',
    'json.copyFailed': 'Copy failed',
    'json.collapseNode': 'Collapse node',
    'json.expandNode': 'Expand node',
    'truncate.label': 'Content too long — truncated ({count} characters)',
    'block.unknown': 'Unknown content block',
    'reasoning.label': 'Thinking',
    'reasoning.step': 'Step {step}',
    'reasoning.regionAria': 'Thinking for step {step}',
    'reasoning.scrollAria': 'Step {step} thinking — scrollable',
    'reasoning.pauseFollowAria': 'Pause auto-follow of thinking',
    'reasoning.resumeFollowAria': 'Resume following the latest thinking',
    'reasoning.pauseFollow': 'Pause follow',
    'reasoning.resumeFollow': 'Follow latest',
    'reasoning.manual': 'Reading manually',
    'reasoning.followHint': 'Deselect text to resume following',
    'mcp.title': 'Interactive MCP App',
    'mcp.summaryChoice': 'Choice: {choice}',
    'mcp.summaryAction': 'Action: {action}',
    'mcp.summaryVariant': 'Option: {variant}',
    'mcp.reset': 'Reset component state',
    'mcp.ready': 'Ready: {receipt}',
    'mcp.focusSend': 'Focus the input and press Enter to send',
    'mcp.sendDirectly': 'Press Enter to send',
    'mcp.streaming': 'Generating interactive component{title}',
    'mcp.titleSuffixZh': '（{title}）',
    'mcp.titleSuffixEn': ' ({title})',
    'mcp.component': 'component',
    'mcp.choicePrompt': 'In {name} I chose: {choice}{desc}. Please continue accordingly.',
    'mcp.choicePromptScore': 'In the evaluation I chose option {variant}{score}. Please continue analyzing that option.',
    'mcp.actionPrompt': '[{name}] completed {action}{payload}',
    'mcp.receiptPrompt': '[{name}] {key}: {value}',
    'mcp.descSuffix': ' ({desc})',
    'mcp.quoteTitle': '"{title}"',
    'mcp.actionFallback': 'component action',
    'mcp.receiptFallback': 'component receipt',
    'mcp.scoreSuffix': ', score: {score}',
    'reasoning.collapseFullAria': 'Collapse full thinking',
    'reasoning.expandFullAria': 'Expand and read full thinking',
    'reasoning.collapse': 'Collapse',
    'reasoning.expandRead': 'Expand',
    'tool.tabPreview': 'Preview',
    'tool.tabResult': 'Result',
    'tool.tabInput': 'Input',
    'tool.tabRaw': 'Raw data',
    'tool.nestedHint': 'Deeper nested calls can be viewed in the original chat.',
    'tool.ledgerTitle': 'Tool · ',
    'tool.receivedChars': 'Received {count} chars of input',
    'tool.submittedWaiting': 'Submitted · waiting for the tool',
    'tool.stoppedInputKept': 'Stopped · input record kept',
    'tool.ranFor': 'Ran {duration}',
    'tool.resultRecorded': 'Result recorded',
    'tool.tabsAria': 'Execution data for {title}',
    'tool.selectionPaused': 'Selection held — preview paused; the current state is in the card title.',
    'tool.allInputFields': 'All input fields',
    'tool.inputFieldsLabel': 'Input fields',
    'tool.phasePreparing': 'Generating input',
    'tool.phaseRunning': 'Running',
    'tool.phaseReturned': 'Returned',
    'tool.phaseSucceeded': 'Done',
    'tool.phaseFailed': 'Failed',
    'tool.phaseInterrupted': 'Interrupted',
    'tool.state.writeRunning': 'Writing…',
    'tool.state.writeDone': 'Written',
    'tool.state.readRunning': 'Reading…',
    'tool.state.readDone': 'Read',
    'tool.state.terminalRunning': 'Running…',
    'tool.state.terminalDone': 'Ran',
    'tool.state.searchRunning': 'Searching…',
    'tool.state.searchDone': 'Found',
    'tool.state.webRunning': 'Fetching…',
    'tool.state.webDone': 'Fetched',
    'tool.state.otherRunning': 'Executing…',
    'tool.state.otherDone': 'Done',
    'tool.durationMs': '{count} ms',
    'tool.durationSeconds': '{count} s',
    'tool.inputGenerating': 'Generating input · not yet executed · last 12 lines',
    'tool.fileContent': 'File content from tool input',
    'tool.previewSuffix': ' · previewing first 1,600 lines; full content in raw data',
    'tool.fileContentLabel': 'File content',
    'tool.commandGenerating': 'Generating command · not yet executed',
    'tool.commandSubmitted': 'Submitted command',
    'tool.inputFieldsReceived': 'Received input fields',
    'tool.interruptedNoResult': 'Interrupted — no tool result. The generated input is still viewable.',
    'tool.generatingInputNotStarted': 'The model is generating tool input; the tool has not started yet.',
    'tool.startedWaitingResult': 'The tool started and is waiting for its result.',
    'tool.retryRecord': 'Model retry record',
    'tool.commandRecord': 'Command record',
    'tool.write': 'Write',
    'tool.edit': 'Edit',
    'tool.patch': 'Patch',
    'tool.file': 'file',
    'tool.read': 'Read',
    'tool.runCommand': 'Run command',
    'tool.findFiles': 'Find files',
    'tool.searchContent': 'Search content',
    'tool.searchWeb': 'Search the web',
    'tool.readWeb': 'Read web page',
    // Settings
    'settings.nav': 'DeckSeek',
    'settings.title': 'DeckSeek',
    'settings.subtitle': 'Appearance and behaviour of the reading view. Changes apply immediately.',
    'settings.appearance': 'Reading appearance',
    'settings.readonly': 'This deployment does not persist settings; the default appearance is used.',
    'settings.skin.paper': 'Paper',
    'settings.skin.paper.hint': 'Typographic flow: whitespace grouping, strong size contrast, no cards.',
    'settings.skin.soft': 'Soft',
    'settings.skin.soft.hint': 'Cards, generous whitespace and larger type for long reading.',
    'settings.skin.terminal': 'Terminal',
    'settings.skin.terminal.hint': 'Aligned rows, monospace and dense, for watching execution.',
    'settings.workDetail': 'Process detail',
    'settings.workDetail.hint': 'How much of a turn\u2019s process starts folded. Same names and meaning as the host transcript view.',
    'settings.workDetail.compact': 'Compact',
    'settings.workDetail.compact.hint': 'Folds the whole turn, group titles omit the live command, thinking keeps only its title.',
    'settings.workDetail.standard': 'Standard',
    'settings.workDetail.standard.hint': 'Folds the whole turn, running titles name the command, thinking previews its first line.',
    'settings.workDetail.detailed': 'Detailed',
    'settings.workDetail.detailed.hint': 'The current turn stays open; only historical turns fold.',
    'settings.workDetail.verbose': 'Everything open',
    'settings.workDetail.verbose.hint': 'No turn is folded; process rows sit in the flow beside the body.',
};
/** The DSH app marks its language on <html lang="…">; browser fallback otherwise. */
export function currentLocale() {
    if (typeof document !== 'undefined') {
        const lang = (document.documentElement.getAttribute('lang') || (typeof navigator !== 'undefined' ? navigator.language : '') || '').toLowerCase();
        if (lang.startsWith('zh'))
            return 'zh';
        if (lang)
            return 'en';
    }
    return 'zh';
}
/** Translate one key for an explicit language, substituting {placeholders}. */
export function uiIn(lang, key, params) {
    const template = lang === 'zh' ? zh[key] : en[key];
    if (!params)
        return template;
    return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}
/** Translate one key for the current app language. */
export function ui(key, params) {
    return uiIn(currentLocale(), key, params);
}
/** One-line turn-process summary mirroring the native labels, for one language. */
export function turnProcessLabelIn(lang, data) {
    const labels = [];
    const one = (count) => count === 1;
    if (data.toolCallCount > 0)
        labels.push(uiIn(lang, one(data.toolCallCount) ? 'turnProcess.toolCalls.one' : 'turnProcess.toolCalls.other', { count: data.toolCallCount }));
    if (data.messageCount > 0)
        labels.push(uiIn(lang, one(data.messageCount) ? 'turnProcess.messages.one' : 'turnProcess.messages.other', { count: data.messageCount }));
    if (data.subagentCount > 0)
        labels.push(uiIn(lang, one(data.subagentCount) ? 'turnProcess.subagents.one' : 'turnProcess.subagents.other', { count: data.subagentCount }));
    return labels.length === 0 ? uiIn(lang, 'turnProcess.thought') : labels.join(uiIn(lang, 'turnProcess.separator'));
}
/** One-line turn-process summary for the current app language. */
export function turnProcessLabel(data) {
    return turnProcessLabelIn(currentLocale(), data);
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
export function formatTokens(value) {
    if (value >= 1000) {
        const k = value / 1000;
        return `${k >= 100 ? Math.round(k) : Math.round(k * 10) / 10}k`;
    }
    return String(value);
}
/**
 * The turn's cache hit rate, as a whole percent, or null when the turn reported
 * no cache buckets.
 *
 * `uncachedInputTokens` is the provider's own uncached prompt count, so the
 * denominator is the prompt the provider saw: cached plus uncached. A turn that
 * reported cached reads but no uncached input still has a rate — 100%.
 */
export function cacheHitRate(usage) {
    const cached = usage.cacheReadTokens;
    if (cached === undefined)
        return null;
    const prompt = cached + usage.uncachedInputTokens;
    return prompt > 0 ? Math.round((cached / prompt) * 100) : null;
}
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
export function messageClock(time, lang, now = Date.now()) {
    const at = new Date(time);
    const today = new Date(now);
    const clock = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
    if (at.getFullYear() === today.getFullYear() && at.getMonth() === today.getMonth() && at.getDate() === today.getDate()) {
        return clock;
    }
    const params = { y: at.getFullYear(), m: at.getMonth() + 1, d: at.getDate() };
    const day = at.getFullYear() === today.getFullYear() ? uiIn(lang, 'clock.md', params) : uiIn(lang, 'clock.ymd', params);
    return `${day} ${clock}`;
}
/** Compact one-line turn stats for one language; null when nothing measurable. */
export function turnTailStatsIn(lang, data) {
    const usage = data.tokenUsage;
    if (!usage)
        return null;
    const parts = [uiIn(lang, 'turnTail.tokens', { tokens: formatTokens(usage.totalTokens) })];
    const hit = cacheHitRate(usage);
    if (hit !== null)
        parts.push(uiIn(lang, 'turnTail.cacheHit', { percent: hit }));
    if (usage.reasoningTokens !== undefined && usage.reasoningTokens > 0) {
        parts.push(uiIn(lang, 'turnTail.reasoning', { tokens: formatTokens(usage.reasoningTokens) }));
    }
    return parts.join(uiIn(lang, 'turnProcess.separator'));
}
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
export function turnTailDetailIn(lang, data) {
    const usage = data.tokenUsage;
    if (!usage)
        return null;
    const rows = [
        uiIn(lang, 'turnTail.total', { tokens: usage.totalTokens }),
        uiIn(lang, 'turnTail.uncachedInput', { tokens: usage.uncachedInputTokens }),
    ];
    if (usage.cacheReadTokens !== undefined)
        rows.push(uiIn(lang, 'turnTail.cacheRead', { tokens: usage.cacheReadTokens }));
    if (usage.cacheWriteTokens !== undefined)
        rows.push(uiIn(lang, 'turnTail.cacheWrite', { tokens: usage.cacheWriteTokens }));
    rows.push(uiIn(lang, 'turnTail.output', { tokens: usage.outputTokens }));
    if (usage.reasoningTokens !== undefined)
        rows.push(uiIn(lang, 'turnTail.reasoningDetail', { tokens: usage.reasoningTokens }));
    if (usage.routes !== undefined && usage.routes.length > 0) {
        rows.push(uiIn(lang, 'turnTail.routes', { routes: usage.routes.map(route => `${route.provider}/${route.model}`).join(' · ') }));
    }
    return rows.join('\n');
}
/** Compact one-line turn stats for the current app language. */
export function turnTailStats(data) {
    return turnTailStatsIn(currentLocale(), data);
}
/** Full accounting behind the footer, for the current app language. */
export function turnTailDetail(data) {
    return turnTailDetailIn(currentLocale(), data);
}
/** Friendly label for a record kind, for one language. */
export function unknownKindLabelIn(lang, kind) {
    if (kind === 'system-prompt')
        return uiIn(lang, 'systemPrompt');
    if (kind === 'turn-process')
        return uiIn(lang, 'unknown.kind.turnProcess');
    return kind;
}
/** Friendly label for a record kind, for the current app language. */
export function unknownKindLabel(kind) {
    return unknownKindLabelIn(currentLocale(), kind);
}
/** Settings-page name for one reading skin. */
export function skinName(id) {
    if (id === 'paper')
        return ui('settings.skin.paper');
    if (id === 'terminal')
        return ui('settings.skin.terminal');
    return ui('settings.skin.soft');
}
/** One-line description for one reading skin. */
export function skinHint(id) {
    if (id === 'paper')
        return ui('settings.skin.paper.hint');
    if (id === 'terminal')
        return ui('settings.skin.terminal.hint');
    return ui('settings.skin.soft.hint');
}
/** Settings-page name for one work-details level. */
export function workDetailName(id) {
    return ui(`settings.workDetail.${id}`);
}
/** One-line description for one work-details level. */
export function workDetailHint(id) {
    return ui(`settings.workDetail.${id}.hint`);
}
//# sourceMappingURL=locale.js.map
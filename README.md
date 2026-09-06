# dsh-deckseek

[English](./README.en.md) | [中文](./README.md)

> 🙏 鸣谢原仓库 [aa2246740/dsh-better-display](https://github.com/aa2246740/dsh-better-display)（MIT）及其作者与贡献者。

dsh-deckseek 是 [aa2246740/dsh-better-display](https://github.com/aa2246740/dsh-better-display) 的 fork，由 [JNNarrator](https://github.com/JNNarrator) 独立维护的 DeepSeek Harness 展示与交互增强插件（MIT）。

## 功能特性

- **阅读视图**：执行中实时呈现原生步骤、思考与进度；任务成功后自动收起过程，保留最终回答与交互卡片。独立的 **DeckSeek** 页签，原「对话 / 轨迹」、输入框、模型选择、工具与审批均完整保留。全部已知记录类型（系统提示词、执行过程、轮次统计等）均已适配，未知类型自动回退为可复制的原始记录卡片——DSH 尚未稳定，兜底始终保留。工具 / 命令失败以统一错误卡片呈现：失败原因、退出码与可展开的原始记录。
- **轮次导航导轨**：右侧导轨列出一轮轮记录，阅读位置随动高亮，点击直达对应轮次（恢复原对话的导航体验）。
- **阅读页查找**：在阅读页内实时查找关键词，覆盖你的问题与模型回答；匹配计数、上 / 下跳转，命中块闪烁高亮。
- **会话阅读位置记忆**：再次打开会话自动回到上次阅读位置，附短暂提示；「回到最新」随时可跳回底部。
- **复制增强**：代码块一键复制；回答中的表格悬停即见「复制为 CSV」（RFC 4180，自动处理引号与换行）。
- **双语 UI（i18n）**：全部阅读页文案随 DSH 应用语言切换（中文 / English），无需重启。
- **长思考跟随**：思考过程折叠为淡出卡片并两行跟随，展开即暂停滚动，可手动恢复。
- **生成式 MCP Apps（SEP-1865）**：模型在回答中输出 ````mcp-app```` 代码块即自动挂载为活体交互卡片，在 `sandbox="allow-scripts allow-forms"` 沙箱 iframe 中运行，通过 JSON-RPC `postMessage` 双向通信（`ui/initialize`、`ui/resize`、`ui/submit` 等）。
- **自适应主题与高度**：深浅色实时同步、零闪烁；容器高度 60–2400px 随内容平滑伸缩。
- **无损保真**：原生 Markdown、代码高亮、数学公式、表格、图片与工具事实 100% 忠实呈现。
- **68 项单元测试**：覆盖消息投影、Markdown 管道、SEP-1865 解析、自适应高度预算与两行流式跟随等。

## 其他

- 功能与使用说明亦可参考原仓库：[aa2246740/dsh-better-display](https://github.com/aa2246740/dsh-better-display)
- 第三方声明：[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) · 变更记录：[CHANGELOG.md](CHANGELOG.md) · 设计契约：[DESIGN.md](DESIGN.md)

**v0.3.0 · 非官方 DSH 展示与交互增强插件。只改展示与交互视图，不改 Agent 核心执行逻辑、SDK 或模型凭据。**

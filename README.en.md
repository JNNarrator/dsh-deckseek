# dsh-deckseek

[English](./README.en.md) | [中文](./README.md)

> 🙏 Thanks to the original repository [aa2246740/dsh-better-display](https://github.com/aa2246740/dsh-better-display) (MIT) and its authors and contributors.

dsh-deckseek is a fork of [aa2246740/dsh-better-display](https://github.com/aa2246740/dsh-better-display), independently maintained by [JNNarrator](https://github.com/JNNarrator) as a DeepSeek Harness display & interaction enhancement plugin (MIT).

## Features

- **Reading view**: live native steps, thinking, and progress during execution; the process folds away on successful completion, leaving the final answer and interactive cards. An independent Reading tab keeps the original Chat / Trajectory views, input box, model selector, tools, and approvals intact.
- **Long-thinking follow**: thinking folds into a fading card that follows two lines; expanding pauses scrolling; resume anytime.
- **Generative MCP Apps (SEP-1865)**: any ````mcp-app```` code block in the final answer is auto-mounted as a live interactive card inside a `sandbox="allow-scripts allow-forms"` iframe, communicating with the host via JSON-RPC `postMessage` (`ui/initialize`, `ui/resize`, `ui/submit`, ...).
- **Adaptive theme & height**: live dark/light sync with zero first-frame flash; container height smoothly follows content (60–2400px).
- **Lossless fidelity**: native Markdown, syntax-highlighted code, math, tables, images, and tool facts render faithfully.
- **49 unit tests** covering message projection, the Markdown pipeline, SEP-1865 parsing, adaptive height budgeting, and two-line streaming follow.

## Other

- Features and usage are also described in the upstream repository: [aa2246740/dsh-better-display](https://github.com/aa2246740/dsh-better-display)
- Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) · Changelog: [CHANGELOG.md](CHANGELOG.md) · Design contract: [DESIGN.md](DESIGN.md)

**v0.3.0 · An unofficial DSH display & interaction enhancement plugin. It only changes presentation and interaction views — never the Agent's core execution, SDK, or model credentials.**

# dsh-deckseek

[English](./README.en.md) | [中文](./README.md)

> 🙏 Thanks to the original repository [aa2246740/dsh-better-display](https://github.com/aa2246740/dsh-better-display) (MIT) and its authors and contributors.

dsh-deckseek is a fork of [aa2246740/dsh-better-display](https://github.com/aa2246740/dsh-better-display), independently maintained by [JNNarrator](https://github.com/JNNarrator) as a DeepSeek Harness display & interaction enhancement plugin (MIT).

## Features

- **Reading view**: live native steps, thinking, and progress during execution; the process folds away on successful completion, leaving the final answer and interactive cards. An independent **DeckSeek** tab keeps the original Chat / Trajectory views, input box, model selector, tools, and approvals intact. Every known record kind (system prompts, turn processes, turn stats, …) is adapted; unknown kinds fall back to a copyable raw-record card — DSH is not stable yet, so the fallback stays. Failed tools / commands render as unified error cards: reason, exit code, and an expandable raw record.
- **Turn navigation rail**: a right-side rail lists every turn; the active mark follows your reading position and a click jumps straight to that turn (restoring the native chat's navigation).
- **In-view search**: search keywords live inside the reading view across your questions and the model's answers — match counts, previous / next navigation, and a flash highlight on the hit block.
- **Reading position memory**: reopening a session returns to your previous reading position with a brief notice; "Back to latest" jumps to the bottom anytime.
- **Copy enhancements**: one-click code-block copy; every table shows a hover "Copy as CSV" action (RFC 4180 — quotes and newlines handled).
- **Bilingual UI (i18n)**: all reading-view copy follows the DSH app language (Chinese / English) with no restart.
- **Long-thinking follow**: thinking folds into a fading card that follows two lines; expanding pauses scrolling; resume anytime.
- **Generative MCP Apps (SEP-1865)**: any ````mcp-app```` code block in the final answer is auto-mounted as a live interactive card inside a `sandbox="allow-scripts allow-forms"` iframe, communicating with the host via JSON-RPC `postMessage` (`ui/initialize`, `ui/resize`, `ui/submit`, ...).
- **Adaptive theme & height**: live dark/light sync with zero first-frame flash; container height smoothly follows content (60–2400px).
- **Lossless fidelity**: native Markdown, syntax-highlighted code, math, tables, images, and tool facts render faithfully.
- **68 unit tests** covering message projection, the Markdown pipeline, SEP-1865 parsing, adaptive height budgeting, and two-line streaming follow.

## Other

- Features and usage are also described in the upstream repository: [aa2246740/dsh-better-display](https://github.com/aa2246740/dsh-better-display)
- Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) · Changelog: [CHANGELOG.md](CHANGELOG.md) · Design contract: [DESIGN.md](DESIGN.md)

**v0.3.0 · An unofficial DSH display & interaction enhancement plugin. It only changes presentation and interaction views — never the Agent's core execution, SDK, or model credentials.**

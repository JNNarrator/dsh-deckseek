# dsh-deckseek

[English](./README.en.md) | [中文](./README.md)

[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

> 🙏 Thanks to the original repository [aa2246740/dsh-better-display](https://github.com/aa2246740/dsh-better-display) (MIT) and its authors and contributors.

dsh-deckseek is a fork of [aa2246740/dsh-better-display](https://github.com/aa2246740/dsh-better-display), independently maintained by [JNNarrator](https://github.com/JNNarrator) as a DeepSeek Harness display & interaction enhancement plugin (MIT).

## Screenshots

![DeckSeek reading view](docs/screenshots/reading-view.png)

**The DeckSeek reading view**: the execution record folds away and the final answer renders in full; the message rail hugs the right edge; spacing above the task bar and composer stays compact — no hollow gaps under long task lists.

| Message navigation rail | In-view search |
|---|---|
| ![Message navigation rail](docs/screenshots/message-rail.png) | ![In-view search](docs/screenshots/search.png) |
| Hovering a mark shows a "Turn N · title" info bubble; clicking scrolls the message into view with a landing flash | Live match counts with previous / next navigation; hits scroll precisely into view with a flash |
| **Execution process & tool rows** | **Unified failure cards** |
| ![Execution process & tool rows](docs/screenshots/process-and-tools.png) | ![Unified failure cards](docs/screenshots/failure-cards.png) |
| Write/edit rows show +N -M change stats and per-family state labels (Written / Found…); thinking cards scroll and expand | Failure reason, exit code, and an expandable raw record |

## Features

- **Reading view**: live native steps, thinking, and progress during execution; the process folds away on successful completion, leaving the final answer and interactive cards. An independent **DeckSeek** tab keeps the original Chat / Trajectory views, input box, model selector, tools, and approvals intact. Every known record kind (system prompts, turn processes, turn stats, …) is adapted; unknown kinds fall back to a copyable raw-record card — DSH is not stable yet, so the fallback stays. Failed tools / commands render as unified error cards: reason, exit code, and an expandable raw record.
- **Reading view**: live native steps, thinking, and progress during execution; the process folds away on successful completion, leaving the final answer and interactive cards. An independent **DeckSeek** tab keeps the original Chat / Trajectory views, input box, model selector, tools, and approvals intact. Every known record kind (system prompts, turn processes, turn stats, …) is adapted; unknown kinds fall back to a copyable raw-record card — DSH is not stable yet, so the fallback stays. Failed tools / commands render as unified error cards: reason, exit code, and an expandable raw record.
- **Answer cards**: the reply and its copy action sit in a card matching the reasoning/tool surfaces; the copy chip floats over the card's top-right corner on hover, keeping the answer at full density.
- **Message navigation rail**: a minimal right-edge rail of tiny pill marks — one per message you sent, editor-minimap style. It takes no layout space and the reading column stays truly centered; the mark at your reading position widens and highlights, hovering shows a styled "Turn N · title" info bubble, and clicking scrolls that message into view with a landing flash (at the document end the newest message owns the highlight; hidden on narrow widths). Marks compress to fit when turns pile up, so every mark stays visible.
- **Status & follow**: the thinking card follows the latest lines and settles at the end; the open-turn status shows "BigFatFish is thinking… {time}" with a live clock, and tools show per-family start/done labels (Reading…/Read, Searching…/Found, Writing…/Written); scrolling up reveals a centered ⬇ back-to-latest button floating above the composer. Sending or steering a message returns the reader to the bottom (pinned follow takes over).
- **In-view search**: live search across your questions and the model's answers; Cmd/Ctrl+F opens the panel; every match keeps a quiet tint with character-exact highlighting (CSS Custom Highlight API) and the active hit inverts; match counts, previous / next navigation, and jumps that scroll the exact hit into view with a flash highlight.
- **Reading position memory**: reopening a session returns to your previous reading position with a brief notice; "Back to latest" jumps to the bottom anytime.
- **Copy enhancements**: one-click code-block copy; every table shows a hover "Copy as CSV" action (RFC 4180 — quotes and newlines handled).
- **Bilingual UI (i18n)**: all reading-view copy follows the DSH app language (Chinese / English) with no restart.
- **Long-thinking follow**: thinking folds into a fading card that follows two lines; expanding pauses scrolling; resume anytime.
- **Generative MCP Apps (SEP-1865)**: any ````mcp-app```` code block in the final answer is auto-mounted as a live interactive card inside a `sandbox="allow-scripts allow-forms"` iframe, communicating with the host via JSON-RPC `postMessage` (`ui/initialize`, `ui/resize`, `ui/submit`, ...).
- **Adaptive theme & height**: live dark/light sync with zero first-frame flash; container height smoothly follows content (60–2400px).
- **Lossless fidelity**: native Markdown, syntax-highlighted code, math, tables, images, and tool facts render faithfully.
- **94 unit and component tests** covering message projection, the Markdown pipeline, SEP-1865 parsing, adaptive height budgeting, two-line streaming follow, and the search / copy / reading-position interactions (happy-dom).

## Installation & listings

Published on npm: [dsh-deckseek](https://www.npmjs.com/package/dsh-deckseek)

```sh
dsh plugin add dsh-deckseek
```

Listed in:

- [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) (PR [#4528](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/4528) merged)
- [awesome-deepseek-harness-plugins](https://github.com/imsai-sh/awesome-deepseek-harness-plugins) / [deepseek1024.com](https://deepseek1024.com/) (PR [#367](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/pull/367) merged; the entry upgrades to one-click install once the published npm package is detected)

## Other

- Features and usage are also described in the upstream repository: [aa2246740/dsh-better-display](https://github.com/aa2246740/dsh-better-display)
- Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) · Changelog: [CHANGELOG.md](CHANGELOG.md) · Design contract: [DESIGN.md](DESIGN.md)

**v0.6.0 · An unofficial DSH display & interaction enhancement plugin. It only changes presentation and interaction views — never the Agent's core execution, SDK, or model credentials.**

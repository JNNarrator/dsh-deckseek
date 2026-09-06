# Changelog

## 0.4.2 - 2026-09-06

- **Tall overlays no longer hollow out the page**: the bottom clearance is capped at 45vh, so pending questions, plan task lists and other states that grow the native composer keep their extra height without leaving a huge empty gap under the reading content.
- **"深度求索中… {time}" running status**: every busy state of an open turn (tools running, preparing, streaming output) mirrors the native umbrella label with a live elapsed clock in both languages — 深度求索中… {time} / DeepSeeking… {time}; the thinking brand label keeps its own wording.
- **"+N -M" diff stats on write/edit rows**: write and edit tool rows now show the line change counts from the settled diff record, matching the native rows.

## 0.4.1 - 2026-09-06

- **New sessions open on DeckSeek by default**: the reading view is the default tab for any session whose user never made an explicit tab choice — previously only the very first session observed after app start got the entry decision. The policy re-arms per session, explicit tab choices are persisted per session (`dsh.conversation.{sessionId}`) and always respected, and the `?reader=1` entry links keep working.

## 0.4.0 - 2026-09-06

- **Message navigation rail redesigned**: a minimal right-edge rail of tiny pill marks (one per user message) in the editor-minimap style — the reading column stays truly centered, the active mark widens and highlights, hovering shows a styled info bubble ("第 N 轮 · title"), and clicking scrolls that message into view (hidden on narrow widths).
- **Reliable message jumps**: a jump lock keeps the reading-scroll anchor compensation from fighting the smooth scroll, so rail / back-to-latest jumps no longer land short, get canceled, or freeze the highlight; the clicked mark keeps the highlight until you scroll on your own, a blue flash marks the landing message even for very short jumps, and at the document end the newest message owns the highlight.
- **No duplicated tool output**: successful tool text results stay inside the folded execution record only — they used to render again in the answer flow, collapsing newlines into giant paragraph walls.
- **Search polish**: the find panel always opens fully in view (scroll-anchoring no longer clips it under the app chrome), and matches scroll the conversation port to the exact hit element with a visible flash instead of doing nothing when the owning message was huge.
- **Back-to-bottom button visible**: the centered ⬇ button now floats above the composer (it used to be pinned behind it by the sticky offset) — auto-follow still never detaches permanently on ordinary button focus.
- **Accessible streaming text**: the reasoning transcript reaches assistive tech as one plain text node instead of hundreds of per-word animation spans.
- **Copy answer chip**: the copy-answer action got a bordered chip style instead of a bare floating icon.
- **All known chat record kinds adapted**: the reading view now renders `system-prompt` (collapsed disclosure with the model-facing text), `turn-process` (one-line process summary mirroring the native labels: tool calls / messages / subagents) and `turn-tail` (compact usage/time stats) natively.
- **Improved unknown-record fallback**: unknown kinds render as a card with a friendly title, content preview or field summary, a copy action and the full raw record — kept because DSH is pre-stable and may add new record kinds.
- **Unified failure cards**: failed tools, commands, compactions and turn errors render as consistent error cards with the reason, exit code / signal / error code, a "details kept in the execution record" hint and an expandable raw record; retry notices share the same wording.
- **In-view search**: live keyword search over user questions and assistant answers — match counts, previous / next navigation, and a flash highlight on the hit block (Enter / Shift+Enter / Esc).
- **Reading position memory**: the reading view remembers the scroll position per session (sessionStorage) and restores it with a short notice.
- **Copy enhancements**: code blocks copy in one click; settled tables reveal a "Copy as CSV" button (RFC 4180 with quoting of commas, quotes and newlines).
- **Bilingual UI (i18n)**: every reading-view string follows the DSH app language via the `<html lang>` marker — the reading tab, toolbar, turn/process status, failure cards, unknown-record cards, tool activity, reasoning controls, MCP app chrome and copy/export labels (Chinese / English dictionaries kept in parity by unit tests).
- **Thinking follow settled**: following cadence tightened to two lines every 360ms, and the card settles at the very end when the reasoning finishes; the bottom clearance above the composer is smaller while still clearing goals/plans.
- **Busy label with elapsed time**: the open-turn status shows "大肥鱼正在思考中… {time}" / "BigFatFish is thinking… {time}" with a live clock, in both languages.
- **No duplicated failure text**: failed tools no longer render the error text twice (failure card + raw text block); the result panel points to the failure card instead.
- **Category tool states**: running/done labels per tool family — 正在阅读/已阅读 Reading…/Read, 正在搜索/已找到 Searching…/Found, 正在写入/已写入 Writing…/Written, etc., in both languages.
- **Reading tab renamed "DeckSeek"**: the independent view tab now carries the plugin brand in both languages.
- **Thinking follow pins above the composer**: the reading column reserves the native composer height at the bottom, so the followed card sits cleanly above the input region instead of leaving a blank band below it.
- **Thinking card shows card chrome from the first line**: removed the borderless "plain text" phase that made early/short thinking look like a raw string before the card frame appeared.

## 0.3.0

Renamed fork release (formerly `dsh-better-display`, now **`dsh-deckseek`**).

- **Rename**: plugin id, manifests (`package.json`, `package-lock.json`, `dshx.yml`, `cordis.yml`, `cordis.patch.yml`), entry module (`src/dsh-deckseek.ts`), loading marker, client name, extension slot and docs now use `dsh-deckseek`.
- **Repository metadata**: `repository` / `homepage` / `bugs` and install instructions point to `JNNarrator/dsh-deckseek`.
- **Fork declaration**: bilingual README and `THIRD_PARTY_NOTICES.md` record the fork of `aa2246740/dsh-better-display` (MIT) and independent maintenance by JNNarrator.
- **Extension slot renamed** `dsh-better-display.block` → `dsh-deckseek.block` (breaking change for third-party slot consumers; documented in DESIGN.md).
- Baseline features unchanged from 0.2.0 (generative MCP Apps / SEP-1865, adaptive theming, reading view).

## 0.2.0

Adds native generative MCP Apps (SEP-1865) support and rich interactive rendering.

- **Generative MCP Apps**: auto-detect ````mcp-app` code blocks (or `mcp-app` custom blocks / `render_ui`/`show_widget` tool results) and mount them as live, interactive cards.
- **Sandboxed iframe**: `sandbox="allow-scripts allow-forms"` without `allow-same-origin`, `referrerPolicy="no-referrer"` — full isolation from host cookies/tokens/DOM.
- **SEP-1865 JSON-RPC bridge**: `ui/initialize`, `ui/resize`, `ui/submit` / `ui/update-model-context`, plus live `host-context-changed` theme broadcasts.
- **Bidirectional feedback**: user interactions produce a natural-language prompt written straight into the composer via React 18 native setter (instant, no stale-DOM whitespace).
- **Live dark/light sync**: MutationObserver + matchMedia drive instant re-theming with zero first-frame flash.
- **Pixel-perfect auto height**: content-bottom bounding-box measurement + ResizeObserver; 60px–2400px smooth grow/shrink, no double scrollbars or wasted whitespace.
- **Redesigned minimal container**: removed protocol/status chrome, 14px-radius subtle card, icon-only reset.
- **Skill pack**: `skills/generative-mcpapps/` with SKILL.md, protocol reference, HTML boilerplate template, and interactive quiz example.
- **Docs**: bilingual `README.md` / `README.en.md`; DESIGN.md contract updated.
- 49 regression tests.

## 0.1.0

First public release of the accepted reading-view plugin, published as `dsh-better-display`.

- Native context and tool details with source-ordered, unmodified reasoning.
- Bounded long-reasoning cards with two-line following, expanded follow and manual pause/resume.
- Successful-turn process folding with a separate final answer.
- Source-ordered text reveal and quiet busy-state shimmer.
- Stable status typography and compact disclosure spacing.
- Native content fallbacks and a trusted-plugin block extension slot.
- 42 regression tests; no changes to DSH Agent, SDK, providers or core.

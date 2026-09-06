# Changelog

## Unreleased

- **All known chat record kinds adapted**: the reading view now renders `system-prompt` (collapsed disclosure with the model-facing text), `turn-process` (one-line process summary mirroring the native labels: tool calls / messages / subagents) and `turn-tail` (compact usage/time stats) natively.
- **Improved unknown-record fallback**: unknown kinds render as a card with a friendly title, content preview or field summary, a copy action and the full raw record — kept because DSH is pre-stable and may add new record kinds.
- **Unified failure cards**: failed tools, commands, compactions and turn errors render as consistent error cards with the reason, exit code / signal / error code, a "details kept in the execution record" hint and an expandable raw record; retry notices share the same wording.
- **In-view search**: live keyword search over user questions and assistant answers — match counts, previous / next navigation, and a flash highlight on the hit block (Enter / Shift+Enter / Esc).
- **Reading position memory**: the reading view remembers the scroll position per session (sessionStorage) and restores it with a short notice.
- **Copy enhancements**: code blocks copy in one click; settled tables reveal a "Copy as CSV" button (RFC 4180 with quoting of commas, quotes and newlines).
- **Bilingual UI (i18n)**: every reading-view string follows the DSH app language via the `<html lang>` marker — the reading tab, toolbar, turn/process status, failure cards, unknown-record cards, tool activity, reasoning controls, MCP app chrome and copy/export labels (Chinese / English dictionaries kept in parity by unit tests).
- **Turn rail restored**: a right-side turn navigation rail mirrors the native chat — one mark per turn, the active mark follows the reading position, and a click scrolls that turn into view (hidden on narrow widths).
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

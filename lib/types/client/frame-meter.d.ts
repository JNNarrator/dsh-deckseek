/**
 * Readouts for the terminal skin's window bar and collapsed process header.
 *
 * Everything here is counted off data the reading view already holds — the turns
 * it grouped from the live session, their steps, and the tool calls inside a
 * turn's own flow. The reference TUIs all print tokens, cost and context
 * occupancy in those slots; those slots belong to the host, and the host still
 * fills them — its `StatsPills` and `ContextMeter` live in the composer dock,
 * which this view does not replace (docs/design/compat-0.1.7.md §11.3) — so this
 * module measures volume: what the fold hides, not what the session cost. See
 * docs/design/terminal-skin-v3.md.
 */
import { type ReaderFlowEntry, type ToolCategory } from './tool-activity.js';
import { type UiLang } from './locale.js';
export interface TurnCounts {
    tools: number;
    files: number;
    failed: number;
}
/** Tool, file and failure counts for one turn's flow. */
export declare function turnCounts(flow: readonly ReaderFlowEntry[], lang?: UiLang): TurnCounts;
/**
 * The one line a folded turn leaves behind: what the process cost, in calls
 * rather than in prose. Fails closed to `null` so a turn with no tool calls
 * carries no extra line. English needs the singular forms; Chinese does not, and
 * repeats its own string under `frame.toolsOne` / `frame.filesOne` so the two
 * dictionaries keep the same key set.
 */
export declare function collapsedSummary(counts: TurnCounts, lang?: UiLang): string | null;
/**
 * The turns the rail can anchor, and the newest of them.
 *
 * The rail draws one mark per loaded user/steering message, so a turn whose
 * message sits outside the loaded window has no mark to click. Counting turn
 * groups instead would print a number with nothing beside it on screen —
 * measured on a session where the host's paging had dropped the first user
 * message: the bar read 4 turns while the rail drew 3 marks. The bar sits next
 * to the rail, so it counts what the rail holds; `hasMore` still marks the
 * total as a floor.
 */
export declare function railTurns(items: readonly {
    readonly turn: number | null;
}[]): {
    count: number;
    latest: number | null;
};
/**
 * Window-bar readout: how much the reading view is holding, and how long the
 * newest turn ran. `more` marks history the session has not loaded yet, so the
 * count reads as a floor rather than a total. English inflects, and the meter
 * is read by a single-turn session's author as often as by a long one's — a
 * real session measured `1 turns · last turn 2 steps` before the singular
 * strings existed.
 */
export declare function frameMeterLabel(turns: number, steps: number, more: boolean, lang?: UiLang): string | null;
/** One activity family's share of a folded turn, in the order the header prints them. */
export interface ActivityRank {
    category: ToolCategory;
    count: number;
}
/**
 * Which families of work a turn did, most-used first.
 *
 * The native chat heads a folded group with an action phrase ranked by family
 * ("read files and searched code"), not with raw counts. Ranking reads the same
 * `activitySummary` the rows use, so a call that renders as a read also counts
 * as a read here. `other` is kept: an unrecognised call is still work the reader
 * would otherwise not know the fold is hiding. Ties keep `CATEGORY_ORDER`, so
 * the phrase is stable across re-renders rather than following hash order.
 */
export declare function activityRanks(flow: readonly ReaderFlowEntry[], lang?: UiLang): ActivityRank[];
/** The family that did the most of a turn's work, for the header's own glyph. */
export declare function dominantCategory(ranks: readonly ActivityRank[]): ToolCategory | null;
/**
 * The phrase a folded turn is summarised by: "read files and searched code".
 *
 * The top three families joined the way each language joins a list. Past three
 * the header appends `{title}等` rather than naming a fourth — three is where a
 * summary stops being a summary. A single family stands alone, and a turn with
 * no tool calls returns `null` so a body-only turn carries no header line.
 *
 * The host's `processTitle` carries two further refinements that are deliberately
 * **not** copied here, because neither can fire against this plugin's own
 * vocabulary (verified, not assumed — see the comment on the label keys):
 *
 * - its Chinese labels are `已X`, so it elides a shared `已` from later items;
 *   this plugin's are `X了Y` (`运行了命令`) and share no leading word;
 * - its English labels are sentence-cased, so it lowercases later items; this
 *   plugin's are already lowercase phrases (`ran commands`).
 *
 * Copying them would add two branches that no input can reach — the same shape
 * of dead code as a guard whose condition its own caller has already excluded.
 */
export declare function activityPhrase(flow: readonly ReaderFlowEntry[], lang?: UiLang): string | null;
/**
 * Which of the three live phases a group is in, and for which family.
 *
 * The harness names a live group three ways and only the last is a settled
 * phrase: `preparing` while a call's arguments have not arrived, the bare
 * present tense while it runs, and `done.*` once it returns. The plugin's
 * `frame.activity.*` keys are the settled tense, so a group that has only
 * emitted a call header — the model is still writing its arguments — needs its
 * own copy. Without it the label would name work that has not started, which is
 * the one thing a reader watching a stalled group must be able to tell apart
 * from a running one.
 */
export type LivePhase = 'prepare' | 'running';
/**
 * The phase and family of the call a live group is currently on.
 *
 * Reads the newest unfinished call, the same one the header's detail line names,
 * so the verb and the detail beside it describe one call rather than two. The
 * phase comes from `activityPhase` rather than from a second reading of the
 * entry, because the two live states are told apart by the block's own shape: a
 * call whose arguments have not arrived carries no block at all, while one that
 * has started carries a block with no `kind` — its own streamed head — where a
 * settled result carries the frozen call. A flow with nothing unfinished returns
 * `null`, and the caller falls back to its phase sentence.
 */
export declare function liveFramePhase(flow: readonly ReaderFlowEntry[], lang?: UiLang): {
    phase: LivePhase;
    category: ToolCategory;
} | null;
/**
 * The live label for a group's header, or `null` when nothing is in flight.
 *
 * `tools` is the fallback family: a call in flight whose summary cannot be read
 * as any known family is still a tool call, and saying so beats staying silent
 * while the reader waits.
 */
export declare function liveFrameLabel(flow: readonly ReaderFlowEntry[], lang?: UiLang): string | null;
//# sourceMappingURL=frame-meter.d.ts.map
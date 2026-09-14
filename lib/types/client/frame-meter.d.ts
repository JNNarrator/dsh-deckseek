/**
 * Readouts for the terminal skin's window bar and collapsed process header.
 *
 * Everything here is counted off data the reading view already holds — the turns
 * it grouped from the live session, their steps, and the tool calls inside a
 * turn's own flow. The reference TUIs all print tokens, cost and context
 * occupancy in those slots; this plugin has no such projection and does not add
 * one, so the bar reports volume instead of spend. See
 * docs/design/terminal-skin-v3.md.
 */
import { type ReaderFlowEntry } from './tool-activity.js';
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
//# sourceMappingURL=frame-meter.d.ts.map
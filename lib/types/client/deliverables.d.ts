/**
 * The files one turn produced, and which authored tokens in its prose name one
 * of them.
 *
 * Two sources, in that order: the official deliverables the turn carries, and —
 * only when that is empty — a walk of the turn's own successful write calls.
 * The second is a fallback, not a second opinion: a turn that reports its
 * artifacts is believed, because the flow walk can only see calls it recognises.
 *
 * Pure, so the rules are testable without a mount. Ported from upstream
 * `62dbae1`/`66c8cc4` (`src/client/deliverables.ts`), with the copy moved into
 * `locale.ts` and the tool-name set aligned with this repository's own write
 * category (`tool-activity.ts`, `activitySummary`).
 */
import type { TurnLocation } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { MarkdownFileMentions } from './markdown/render.js';
import type { ReaderFlowEntry } from './tool-activity.js';
/** The file name of a path, with any trailing separator ignored. */
export declare function basename(path: string): string;
/** The directory of a path, or `.` when it has none. */
export declare function dirname(path: string): string;
/**
 * The produced-files row waits for the turn to close: live writes still
 * accumulate, but a row that appeared mid-turn would claim the work is done
 * while it is still being written.
 */
export declare function showDeliverablesRow(status: 'open' | 'closed' | 'unknown', paths: readonly string[]): boolean;
/** Every unique file path this turn produced, in the order it produced them. */
export declare function getTurnDeliverables(turn: TurnLocation | undefined, flow?: readonly ReaderFlowEntry[]): readonly string[];
/**
 * File-mention resolver: an inline code token that names a produced file becomes
 * a control that opens it. A token resolves only when it names one file — an
 * exact path wins, and a bare file name resolves only when exactly one produced
 * path ends in it. An ambiguous or unknown token stays inert code, because
 * opening the wrong file is worse than opening nothing.
 */
export declare function createProducedFileMentions(paths: readonly string[], openFile: (path: string) => void): MarkdownFileMentions;
//# sourceMappingURL=deliverables.d.ts.map
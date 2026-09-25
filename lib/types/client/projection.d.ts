import type { AssistantBlock, ToolCallBlock, TurnLocation } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { AssistantChatData, ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';
import { type UiLang } from './locale.js';
import type { WorkDetailPolicy } from '../skin.js';
export interface ReaderGroup {
    key: string;
    turn: number | null;
    keys: readonly string[];
}
export interface TurnBoundary {
    status: 'open' | 'closed' | 'unknown';
    reason: string | null;
    latestStep: number;
    closingStep: number | null;
}
export declare function groupNodes(order: readonly string[], get: (key: string) => ChatConversationViewNode | undefined): ReaderGroup[];
export declare function boundaryOf(turn: TurnLocation | undefined): TurnBoundary;
export declare function isEarlierNarration(data: AssistantChatData, boundary: TurnBoundary): boolean;
/** Reading while running must not pin the process open after completion. */
export declare function processChoiceKey(groupKey: string, boundary: TurnBoundary): string;
/**
 * How one group presents its process rows under the level in force. The level's
 * two independent dimensions meet here — {@link WorkDetailPolicy.foldCompletedTurns}
 * decides whether a completed turn folds, {@link WorkDetailPolicy.groupProcess}
 * whether it folds behind a header at all — so the pixels can be reasoned about
 * without either dimension knowing about the other.
 */
export type TurnStructure = 
/** Rows sit directly in the flow: no fold, no header. */
'flat'
/** A header folds the rows; a completed turn starts closed. */
 | 'folded'
/** A header folds the rows, but they start open. */
 | 'open-header';
/**
 * @param policy - the work-details level in force.
 * @returns whether a group is flat, folded, or open behind a header.
 */
export declare function turnStructure(policy: WorkDetailPolicy): TurnStructure;
/**
 * Whether a later visible human input sits inside this turn's process.
 *
 * A reader's own words are not process detail. When the human speaks again while
 * a turn is still producing — a steering correction, a queued instruction, or a
 * scheduled event that wakes the turn again — that input belongs to the turn and
 * must stay readable. Folding it behind the very disclosure it interrupts would
 * hide the reader's words inside their own collapsed work, which is worse than
 * not folding at all.
 *
 * The opening input is excluded: the first input is the turn's premise, already
 * rendered above the fold, so counting it would make every ordinary turn look
 * interleaved and nothing would ever fold.
 *
 * A `turn-trigger` counts as input, matching the harness's own rule — it is the
 * reason the turn (re)started and reads as a message rather than as work.
 *
 * @param keys - the group's node keys, in order.
 * @param get - node lookup by key.
 * @returns whether a visible input other than the opening one is present.
 */
export declare function hasInterleavedInput(keys: readonly string[], get: (key: string) => ChatConversationViewNode | undefined): boolean;
/**
 * Whether a group's process starts open. An explicit reader choice always wins.
 * A flat group has no fold to be closed, and an open-header group starts open
 * regardless of the turn's state; only a folded group closes on completion.
 *
 * A group with interleaved input never starts closed, whatever the level asks
 * for: the fold would swallow the input that interrupted it. That is a
 * correctness floor rather than a presentation policy, so it is not subject to
 * the reader's level (an explicit toggle still wins).
 * @param choice - the reader's stored toggle, when they have touched it.
 * @param boundary - the turn's terminal state.
 * @param policy - the work-details level in force.
 * @param interleaved - whether a later input sits inside this turn's process.
 * @returns whether the process rows are shown.
 */
export declare function processExpanded(choice: boolean | undefined, boundary: TurnBoundary, policy: WorkDetailPolicy, interleaved?: boolean): boolean;
/** A body-only assistant step is not a thinking/process disclosure. */
export declare function hasProcessContent(node: ChatConversationViewNode | undefined, boundary: TurnBoundary): boolean;
export declare function hasVisibleBody(blocks: readonly AssistantBlock[]): boolean;
/** Keep native block order. In particular, never lift a later Think above text. */
export declare function assistantSegments(blocks: readonly AssistantBlock[]): {
    kind: 'reasoning' | 'body';
    start: number;
    blocks: AssistantBlock[];
}[];
export declare function toolFailed(block: ToolCallBlock): boolean;
export declare function toolName(block: ToolCallBlock): string;
export declare function terminalLabel(reason: string | null, lang?: UiLang): string | null;
//# sourceMappingURL=projection.d.ts.map
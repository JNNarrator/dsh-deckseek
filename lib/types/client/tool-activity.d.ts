import type { AssistantBlock, ToolCallBlock, TurnLocation } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';
import type { ReaderGroup } from './projection.js';
import { type UiLang } from './locale.js';
export type ToolDraft = Extract<AssistantBlock, {
    kind: 'tool-call';
}>;
export type ToolPhase = 'preparing' | 'running' | 'returned' | 'succeeded' | 'failed' | 'interrupted';
export type ToolCategory = 'write' | 'read' | 'terminal' | 'search' | 'web' | 'other';
export interface ToolActivityEntry {
    kind: 'tool';
    key: string;
    callId: string;
    step: number;
    order: number;
    draft?: ToolDraft;
    block?: ToolCallBlock;
}
export type ReaderFlowEntry = ToolActivityEntry | {
    kind: 'node';
    key: string;
    nodeKey: string;
    order: number;
};
/** Public Step data includes tool-only model output before a chat node exists. */
export declare function readerFlow(group: ReaderGroup, turn: TurnLocation | undefined, get: (key: string) => ChatConversationViewNode | undefined): ReaderFlowEntry[];
export declare function objectValue(value: unknown): Record<string, unknown> | null;
export declare function stringValue(record: Record<string, unknown> | null, ...keys: string[]): string | undefined;
/** Read only top-level JSON string values, including an unfinished final string.
 * This never executes input or mistakes escaped/nested content for a path field. */
export declare function inputFields(raw: string): Record<string, unknown>;
export declare function toolIdentity(entry: Pick<ToolActivityEntry, 'block' | 'draft'>): {
    name: string;
    raw: string;
};
export declare function executionFacts(block: ToolCallBlock | undefined): {
    exitCode?: number;
    signal?: string;
};
export declare function activityPhase(entry: Pick<ToolActivityEntry, 'block' | 'draft'>, turnClosed?: boolean): ToolPhase;
export declare function activitySummary(entry: Pick<ToolActivityEntry, 'block' | 'draft'>, lang?: UiLang): {
    name: string;
    raw: string;
    args: Record<string, unknown>;
    category: ToolCategory;
    title: string;
    target: string | undefined;
    command: string | undefined;
    cwd: string | undefined;
    content: string | undefined;
};
export declare function preparingLabel(name: string, lang?: UiLang): string;
/** First non-empty text payload of a failed tool result, clamped for inline preview. */
export declare function toolFailureText(block: ToolCallBlock): string | null;
/** Exit-code and signal line for a failed tool, or null when the result carries neither. */
export declare function toolFailureFacts(block: ToolCallBlock, lang?: UiLang): string | null;
/**
 * Title for a failed tool's card: the generic failure title plus the tool name
 * when the call declared one, so the name never needs a line of its own.
 */
export declare function toolFailureTitle(block: ToolCallBlock, lang?: UiLang): string;
/** Category-aware tool state label: start (preparing/running) and end (succeeded/returned) per tool family. */
export declare function toolStateLabel(category: ToolCategory, phase: ToolPhase, lang?: UiLang): string;
/**
 * Line-level +added/-removed counts over diff hunks (per-hunk multiset line
 * difference) — the numbers the native write/edit rows show as "+N -M".
 * @returns null when the hunks carry no line changes.
 */
export declare function diffStat(hunks: readonly {
    oldText: string | null;
    newText: string;
}[]): {
    added: number;
    removed: number;
} | null;
/**
 * The tool call a live group is working on right now: the last unfinished call
 * in the flow, so the phase label can name the command, path, or query instead
 * of leaving the reader to open the fold.
 *
 * "Unfinished" covers both live stages, because 0.1.7 splits a live call in two:
 * a preparing call carries no block at all, while a started one carries a block
 * with no `kind` — its own streamed head. Only a block that has a `kind` is the
 * frozen result, and only that is settled. Reading the head as settled would
 * hide every call that has actually started, which is most of them.
 * @param flow - the group's ordered flow entries.
 * @returns the newest unfinished call, or undefined when every call has settled.
 */
export declare function liveToolEntry(flow: readonly ReaderFlowEntry[]): ToolActivityEntry | undefined;
//# sourceMappingURL=tool-activity.d.ts.map
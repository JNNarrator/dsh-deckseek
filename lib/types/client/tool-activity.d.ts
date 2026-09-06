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
/** One-line failure summary for a failed tool row: name, exit code, signal. */
export declare function toolFailureLine(block: ToolCallBlock, lang?: UiLang): string;
/** Category-aware tool state label: start (preparing/running) and end (succeeded/returned) per tool family. */
export declare function toolStateLabel(category: ToolCategory, phase: ToolPhase, lang?: UiLang): string;
//# sourceMappingURL=tool-activity.d.ts.map
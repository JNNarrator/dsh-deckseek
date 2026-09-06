import type { ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';
/** One searchable text entry for the reading view, in display order. */
export interface SearchEntry {
    readonly key: string;
    readonly kind: 'user' | 'assistant';
    readonly text: string;
    readonly turn: number | undefined;
}
/** Collect searchable user/assistant text from a chat snapshot, in display order. */
export declare function buildSearchIndex(order: readonly string[], get: (key: string) => ChatConversationViewNode | undefined): SearchEntry[];
/** One match: the owning node key, hit count, and a snippet around the first hit. */
export interface SearchMatch {
    readonly key: string;
    readonly count: number;
    readonly snippet: string;
}
/** Case-insensitive substring matches with a snippet around the first hit. */
export declare function searchMatches(entries: readonly SearchEntry[], query: string): SearchMatch[];
//# sourceMappingURL=search-index.d.ts.map
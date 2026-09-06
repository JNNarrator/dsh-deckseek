import type { ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';
/** One right-rail row: a user message to jump to and its short title. */
export interface RailItem {
    readonly key: string;
    readonly turn: number | null;
    readonly label: string;
}
/**
 * Right-rail rows for every user/steering message in display order: one row
 * per message with the message text as its title. Long titles are trimmed;
 * the row itself ellipsizes within the rail.
 */
export declare function buildRailItems(order: readonly string[], get: (key: string) => ChatConversationViewNode | undefined): RailItem[];
//# sourceMappingURL=turn-rail.d.ts.map
import type { ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';
export declare function buildExportMarkdown(order: readonly string[], get: (key: string) => ChatConversationViewNode | undefined, now?: Date): string;
/** Download filename for the export, safe across filesystems (no separators). */
export declare function exportFileName(now?: Date): string;
//# sourceMappingURL=export.d.ts.map
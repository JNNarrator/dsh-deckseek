import type { Context } from '@deepseek-ai/cordis';
/**
 * Reuse the native store handle; its framework-owned instance preserves
 * drafts. Our apply runs before the host declares its session body, so the
 * first registration attempt finds no conversation.session entry — wait for
 * its declaration reactively, then register against the now-live store.
 */
export declare function installReaderEntry(ctx: Context): void;
//# sourceMappingURL=entry.d.ts.map
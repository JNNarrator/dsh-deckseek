/**
 * The memory divider a reader meets where their earlier context was compacted.
 *
 * Copy and arithmetic only, so both can be pinned by tests: the component in
 * `Reader.tsx` is a pill and a memo box. Ported from upstream `7049304`, whose
 * strings were hard-coded in Chinese.
 */
import { type UiLang } from './locale.js';
/** Tokens as a reader counts them: 1240 → `1.2k`, 640 → `640`. */
export declare function compactTokens(count: number): string;
/** The compaction record, as far as this plugin reads it. */
export interface CompactionRecord {
    readonly summary?: unknown;
    readonly shadowedItemCount?: unknown;
    readonly shadowedTokenCount?: unknown;
}
export interface CompactionFacts {
    /** The divider's own sentence: what the compaction cost. */
    readonly label: string;
    /** The memo it left behind, or `null` when there is nothing to show. */
    readonly summary: string | null;
}
/**
 * Everything the divider renders, read off one compaction record. Counts are
 * optional in the record and are dropped rather than printed as `0`; a blank
 * summary is no summary, and the pill then has nothing to expand.
 */
export declare function compactionFacts(data: unknown, lang?: UiLang): CompactionFacts;
//# sourceMappingURL=compaction.d.ts.map
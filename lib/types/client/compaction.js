/**
 * The memory divider a reader meets where their earlier context was compacted.
 *
 * Copy and arithmetic only, so both can be pinned by tests: the component in
 * `Reader.tsx` is a pill and a memo box. Ported from upstream `7049304`, whose
 * strings were hard-coded in Chinese.
 */
import { currentLocale, uiIn } from './locale.js';
/** Tokens as a reader counts them: 1240 → `1.2k`, 640 → `640`. */
export function compactTokens(count) {
    return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
}
function positive(value) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}
/**
 * Everything the divider renders, read off one compaction record. Counts are
 * optional in the record and are dropped rather than printed as `0`; a blank
 * summary is no summary, and the pill then has nothing to expand.
 */
export function compactionFacts(data, lang = currentLocale()) {
    const record = (data ?? {});
    const items = positive(record.shadowedItemCount);
    const tokens = positive(record.shadowedTokenCount);
    const label = items !== null && tokens !== null ? uiIn(lang, 'compaction.dividerItemsTokens', { count: items, tokens: compactTokens(tokens) })
        : items !== null ? uiIn(lang, 'compaction.dividerItems', { count: items })
            : tokens !== null ? uiIn(lang, 'compaction.dividerTokens', { tokens: compactTokens(tokens) })
                : uiIn(lang, 'compaction.divider');
    const summary = typeof record.summary === 'string' && record.summary.trim() !== '' ? record.summary : null;
    return { label, summary };
}
//# sourceMappingURL=compaction.js.map
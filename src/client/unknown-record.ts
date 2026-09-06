/**
 * Helpers for the reading-view fallback shown for record kinds that are not
 * rendered natively (system-prompt, turn-process, …). Pure functions so the
 * behavior stays unit-testable without a React environment. The friendly
 * kind label lives in locale.ts (language-aware); these helpers are
 * language-independent.
 */

/** True when the payload is non-empty plain text. */
export function isTextLike(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** Picks a previewable text from a record payload: the payload itself if it is
 * a string, otherwise a common text field of an object payload. */
export function pickPreviewText(data: unknown): string | null {
  if (isTextLike(data)) return data;
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    for (const key of ['content', 'text', 'prompt', 'value']) {
      const value = record[key];
      if (isTextLike(value)) return value;
    }
  }
  return null;
}

const PREVIEW_FIELDS = 4;
const FIELD_VALUE_LIMIT = 28;

function fieldValue(value: unknown, arrayItems: (count: number) => string): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[…]${arrayItems(value.length)}`;
  return '{…}';
}

/** Compact one-line summary of an object payload's top-level fields.
 * @param arrayItems - localized "N 项" suffix for array field values. */
export function summarizeFields(data: unknown, arrayItems: (count: number) => string = count => `${count} 项`): string {
  if (typeof data === 'string' || data === null || data === undefined) return '';
  if (typeof data !== 'object') return '';
  if (Array.isArray(data)) return `数组 · ${arrayItems(data.length)}`;
  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.length === 0) return '空对象';
  return entries.slice(0, PREVIEW_FIELDS).map(([key, value]) => {
    const text = fieldValue(value, arrayItems);
    const shown = text.length <= FIELD_VALUE_LIMIT ? text : text.slice(0, FIELD_VALUE_LIMIT - 1) + '…';
    return `${key}: ${shown}`;
  }).join(' · ');
}

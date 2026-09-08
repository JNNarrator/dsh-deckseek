/**
 * Helpers for the reading-view fallback shown for record kinds that are not
 * rendered natively (system-prompt, turn-process, …). Pure functions so the
 * behavior stays unit-testable without a React environment. The friendly
 * kind label and the two summary labels (array prefix, empty object) resolve
 * through locale.ts and follow the app language; everything else here is
 * language-independent.
 */
/** True when the payload is non-empty plain text. */
export declare function isTextLike(value: unknown): value is string;
/** Picks a previewable text from a record payload: the payload itself if it is
 * a string, otherwise a common text field of an object payload. */
export declare function pickPreviewText(data: unknown): string | null;
/** Compact one-line summary of an object payload's top-level fields.
 * @param arrayItems - localized "N 项" suffix for array field values. */
export declare function summarizeFields(data: unknown, arrayItems?: (count: number) => string): string;
//# sourceMappingURL=unknown-record.d.ts.map
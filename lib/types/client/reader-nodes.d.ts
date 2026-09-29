/**
 * The chat node kinds this reading view draws itself.
 *
 * One list, in one place, because two very different pieces of code depend on it
 * and they fail in opposite directions when it is wrong:
 *
 *  - `Reader.tsx` dispatches on these kinds to its own renderers;
 *  - the official-rendering bridge (`official-slots.tsx`) must NOT mirror an
 *    official renderer for any of them, or the kind is rendered twice.
 *
 * Upstream keeps this list inside the bridge as six literals, which is a subset
 * of what this fork draws. A kind added to the view and missed here does not
 * fail anything — it double-renders — so `tests/reader-nodes.test.ts` checks
 * this list against the dispatch in both directions.
 */
export declare const READER_NODES: readonly string[];
/** Whether this view already draws that kind, and so must not borrow a renderer for it. */
export declare function isReaderNode(kind: string | undefined): boolean;
//# sourceMappingURL=reader-nodes.d.ts.map
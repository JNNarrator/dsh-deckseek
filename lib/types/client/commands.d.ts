/**
 * The reading view's command palette model.
 *
 * Like the keyboard layer, the decisions live here as pure functions so the
 * palette component only renders and dispatches: which command a query keeps,
 * in what order, and how a query is matched at all.
 */
/** One runnable command offered by the palette. */
export interface ReaderCommand {
    /** Stable identity, also the React key. */
    id: string;
    /** Primary text, in the current UI language. */
    label: string;
    /** Group heading the command is listed under, in the current UI language. */
    group: string;
    /** Right-hand hint: usually the keystroke that runs it directly. */
    hint?: string;
    /**
     * Extra words the query may match. Skin and work-details commands carry the
     * untranslated identifier here, so `paper` finds 「纸面」 too.
     */
    keywords?: string;
    /** Runs the command. The palette closes first, then calls this. */
    run: () => void;
}
/**
 * Score one candidate against a query, as an ordered subsequence match.
 *
 * Subsequence rather than substring because a palette is used by typing a
 * handful of letters in order — `sk` should find 「切换皮肤」 and `exp` should
 * find `导出`. Contiguous matches score higher, and a match that starts at the
 * beginning scores higher still, so the obvious command wins ties.
 *
 * @param text - candidate text, any case.
 * @param query - what was typed, any case.
 * @returns a score, higher is better, or `null` when the query does not match.
 */
export declare function fuzzyScore(text: string, query: string): number | null;
/**
 * Order the commands a query keeps, best first.
 *
 * @param commands - every command the palette offers.
 * @param query - what was typed; empty keeps the list in its declared order.
 * @param limit - most entries to return.
 * @returns the matching commands.
 */
export declare function filterCommands(commands: readonly ReaderCommand[], query: string, limit?: number): ReaderCommand[];
/**
 * Gather commands under their group heading, in the order each group is first
 * seen. Filtering reorders commands by score, so the same group can appear
 * more than once in the list; this is what folds those runs back together, and
 * a group's commands keep their relative order.
 *
 * @param commands - the already-filtered command list.
 * @returns one entry per group, in first-appearance order.
 */
export declare function groupCommands(commands: readonly ReaderCommand[]): Array<{
    group: string;
    commands: ReaderCommand[];
}>;
//# sourceMappingURL=commands.d.ts.map
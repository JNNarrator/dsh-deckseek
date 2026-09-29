/** Motion parameters from the public transitions.dev streaming-text recipe.
 *
 *  Tightened from the recipe's own numbers (gap 60, maxDelay 240, duration 350),
 *  because the recipe assumes space-separated words: at 60ms per item a CJK
 *  answer, where the segmenter emits roughly one item per character, spent the
 *  whole `maxDelay` queue and then took a further `duration` to fade the last
 *  character in. The text was arriving faster than it could be shown, so the
 *  reveal — not the transport — was what the reader waited on.
 *
 *  The shape is unchanged: one clock, evenly spaced births, a bounded queue.
 *  Only the constants moved, and the latency they add up to is now asserted at
 *  the very end of the pipeline rather than pinned word by word. */
export declare const WORD_MOTION: {
    readonly duration: 240;
    readonly gap: 32;
    readonly blur: 1;
    readonly easing: "cubic-bezier(0.22, 1, 0.36, 1)";
    readonly maxDelay: 110;
};
export interface RevealingWord {
    key: number;
    text: string;
    born: number | null;
}
/** Source-offset identity survives reparsing, frozen blocks, and final formatting. */
export declare class WordTimeline {
    generation: number;
    hasLiveText: boolean;
    private source;
    private enabled;
    private revision;
    private floor;
    private lastBirth;
    private readonly births;
    begin(source: string, enabled: boolean, revision: number, now: number): void;
    bornAt(offset: number): number | null;
    words(value: string, offset: number): RevealingWord[];
}
//# sourceMappingURL=word-timeline.d.ts.map
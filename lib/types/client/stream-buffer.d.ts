/** Presentation only. The original session string remains the source of truth.
 *
 *  These are latency budgets, not aesthetics: `catchUpMs` is how long the
 *  visible text may trail the received text, `maxQueuedMs` is the ceiling on
 *  any one batch that arrives while more is still coming, and `finishMs` is the
 *  grace given to the last bytes when the model stops. They were 180/240/96 and
 *  are now 110/150/56: at 180ms a reader watching a fast model still saw the
 *  prose resolve visibly after the turn had moved on.
 *
 *  `revealMs` mirrors the word-reveal duration so the two halves of the same
 *  effect stay legible in one place; `minimumRate` is the floor that keeps a
 *  nearly-drained buffer from crawling the last few characters in. */
export declare const STREAM_TIMING: {
    readonly catchUpMs: 110;
    readonly maxQueuedMs: 150;
    readonly finishMs: 56;
    readonly revealMs: 240;
    readonly minimumRate: 220;
};
export declare class StreamBuffer {
    target: string;
    visible: string;
    revision: number;
    private boundaries;
    private arrivals;
    private lastAt;
    private credit;
    private finishAt;
    constructor(initial?: string);
    get pending(): boolean;
    private segment;
    /** Non-append updates, cancellations and hidden/reduced views never replay. */
    update(text: string, now: number, options?: {
        immediate?: boolean;
        finished?: boolean;
    }): void;
    flush(): void;
    advance(now: number): boolean;
}
//# sourceMappingURL=stream-buffer.d.ts.map
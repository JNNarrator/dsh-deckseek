/** Presentation only. The original session string remains the source of truth. */
export declare const STREAM_TIMING: {
    readonly catchUpMs: 180;
    readonly maxQueuedMs: 240;
    readonly finishMs: 96;
    readonly revealMs: 350;
    readonly minimumRate: 100;
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
/**
 * True while a programmatic jump (rail mark, back-to-latest) is animating.
 * The reading-scroll anchor compensation must yield during that window, or it
 * fights the smooth scroll and the jump lands short or gets canceled.
 */
export declare const jumpLock: {
    active: boolean;
};
//# sourceMappingURL=jump-lock.d.ts.map
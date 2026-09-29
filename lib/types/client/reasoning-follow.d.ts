/** Transitions.dev Reasoning stream, adapted to appended content, never a loop.
 *
 *  `REASON_HOLD` is the pause between steps and `REASON_STEP` the step's own
 *  travel; together they are how far the thinking transcript may trail the
 *  thinking. 360 + 500 meant the last line of a long reasoning burst was still
 *  moving half a second after the model had moved on to the next stage, which
 *  is exactly the handoff a reader notices. `REASON_LINES` is unchanged: two
 *  lines per step is the reference's readable unit, and it is the step SIZE
 *  that is pinned by tests rather than the step RATE. */
export declare const REASON_HOLD = 110;
export declare const REASON_STEP = 240;
export declare const REASON_LINES = 2;
export declare function reasoningTarget(top: number, contentHeight: number, viewportHeight: number, lineHeight: number): number;
//# sourceMappingURL=reasoning-follow.d.ts.map
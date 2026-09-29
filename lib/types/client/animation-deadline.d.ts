/**
 * The liveness guarantee behind every animated disclosure in the reading view.
 *
 * A disclosure that commits its end state only in `onfinish` is committed only
 * while the animation actually advances. `fill: 'both'` pins whichever keyframe
 * the animation is sitting on for as long as that animation drives the element,
 * so an animation that never advances — cancelled by a re-run, dropped by an
 * unmount, or skipped because the compositor never ran its subtree — leaves the
 * element pinned on the opening keyframe (`height: 0`, `opacity: 0`). The row is
 * in the DOM and clicking it looks like nothing happened. The same shape strands
 * a collapse mid-flight, and leaves a card's inline styles overridden.
 *
 * A wall clock is the one guarantee that depends on none of those, so every
 * animated disclosure commits through here as well. Ported from upstream
 * `8e07d34` ("give every animated disclosure a deadline so rows always open");
 * the slack matches the watchdog the fold choreography already carries.
 *
 * Pure, with the timer pair injected, so the rule is testable without a browser
 * and without a real animation.
 */
/**
 * Slack added on top of the animation's own duration before the deadline fires.
 *
 * The deadline is a fallback, not a second clock: it must never win a race it
 * would win spuriously, so it fires late enough that a merely slow frame cannot
 * reach it. It is not "the animation plus nothing", because a backgrounded tab
 * stops delivering frames while the wall clock keeps running.
 */
export declare const WATCHDOG_SLACK_MS = 240;
export interface DeadlineClock {
    schedule: (run: () => void, delayMs: number) => unknown;
    cancel: (handle: unknown) => void;
}
export declare const systemClock: DeadlineClock;
/**
 * The part of an `Animation` this module drives. Narrow enough that a test can
 * hand it a double, exact enough that a real animation needs no cast.
 */
export type Finishable = Pick<Animation, 'onfinish'>;
/**
 * Commit `settle` at most once: when the animation finishes, or
 * `durationMs + WATCHDOG_SLACK_MS` later, whichever happens first.
 *
 * Returns the cleanup that stops watching. Wire it into the effect's cleanup —
 * an animation this effect has already superseded must not commit after the
 * fact, and the deadline would otherwise outlive the subtree it commits into.
 */
export declare function settleByDeadline(animation: Finishable, settle: () => void, durationMs: number, clock?: DeadlineClock): () => void;
//# sourceMappingURL=animation-deadline.d.ts.map
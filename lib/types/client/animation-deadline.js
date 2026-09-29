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
export const WATCHDOG_SLACK_MS = 240;
export const systemClock = {
    schedule: (run, delayMs) => window.setTimeout(run, delayMs),
    cancel: handle => window.clearTimeout(handle),
};
/**
 * Commit `settle` at most once: when the animation finishes, or
 * `durationMs + WATCHDOG_SLACK_MS` later, whichever happens first.
 *
 * Returns the cleanup that stops watching. Wire it into the effect's cleanup —
 * an animation this effect has already superseded must not commit after the
 * fact, and the deadline would otherwise outlive the subtree it commits into.
 */
export function settleByDeadline(animation, settle, durationMs, clock = systemClock) {
    let settled = false;
    let handle;
    const commit = () => {
        if (settled)
            return;
        settled = true;
        clock.cancel(handle);
        settle();
    };
    handle = clock.schedule(commit, durationMs + WATCHDOG_SLACK_MS);
    animation.onfinish = commit;
    return () => { settled = true; clock.cancel(handle); };
}
//# sourceMappingURL=animation-deadline.js.map
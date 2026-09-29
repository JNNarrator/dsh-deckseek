/**
 * The terminal skin's busy spinner.
 *
 * Braille frames rather than the reference TUIs' rotation of `·•●•`: braille
 * (U+2800–U+28FF) is one narrow cell in every frame, so a frame can be swapped
 * in place without a fixed-width clipping window. The clip is exactly what
 * killed the earlier `●` rotation — in CJK-metric monospace fonts `●` is a
 * wide glyph and the 1ch window cut it in half (see the terminal v3 record),
 * and the skin's own contract test still rejects a two-cell `content:` value.
 */
/**
 * Frames of the busy spinner, in the order they are drawn. All ten are
 * single-cell braille patterns; `tests/spinner.test.ts` holds that property.
 */
export const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
/** Milliseconds each frame is shown. The reference TUIs run 80–200ms. */
export const SPINNER_INTERVAL_MS = 110;
/**
 * Static frame for a spinner that must not move: the reduced-motion and
 * `data-motion=off` cases, where the glyph still has to say "something is
 * running" without animating.
 */
export const SPINNER_STILL_FRAME = SPINNER_FRAMES[0];
/**
 * @param tick - a monotonically increasing frame counter.
 * @returns the frame to draw for that tick.
 */
export function spinnerFrame(tick) {
    const index = ((tick % SPINNER_FRAMES.length) + SPINNER_FRAMES.length) % SPINNER_FRAMES.length;
    return SPINNER_FRAMES[index];
}
//# sourceMappingURL=spinner.js.map
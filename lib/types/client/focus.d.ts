/**
 * Bring focus somewhere without asking the browser to reveal it.
 *
 * `element.focus()` scrolls every scrollable ancestor until the element is in
 * view, and "scrollable" includes boxes that merely declare `overflow: hidden` —
 * which is how the host lays out the conversation: its root clips, and our
 * reading view is mounted inside it. So a plain `.focus()` on something deep in
 * a long log scrolls *the host's own root*, and because that box is not supposed
 * to move, the whole pane slides out of the window.
 *
 * Measured in the running app before this module existed: an image-heavy session
 * has one `<dialog>` per image, each close button focused on mount by `autoFocus`;
 * the host's root had `scrollTop` 3815 and the reading view sat 6373px above the
 * viewport — the pane was simply black, and every re-mount re-broke it.
 *
 * Every focus this plugin performs goes through here, and the test that holds
 * the rule reads the source rather than trusting this comment: an `autoFocus`
 * attribute or a bare `.focus(` call anywhere in the view fails it.
 *
 * `preventScroll` is safe in all of these places because each one is a control
 * the reader just acted on (a dialog they opened, a panel they invoked, the fold
 * they collapsed) — none of them is a navigation, and none of them should move
 * the page.
 *
 * @param element - What to focus, when it is there.
 */
export declare function focusWithoutScroll(element: HTMLElement | null | undefined): void;
//# sourceMappingURL=focus.d.ts.map
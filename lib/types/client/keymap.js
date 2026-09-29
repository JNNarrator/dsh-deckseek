/**
 * Keyboard layer of the reading view.
 *
 * The reading view owns a handful of keys of its own and must not eat the
 * ones the composer, the host's own navigation or the browser need. So the
 * decision is a pure function of the keystroke plus two facts the caller
 * already knows: whether focus sits in a text field, and which plugin panel is
 * open. Keeping it pure is what makes the guard rails testable — the actual
 * listener in `Reader.tsx` only maps an action onto behaviour.
 */
/**
 * @param input - the keystroke.
 * @param context - focus and panel state.
 * @returns the action that keystroke means, or `null` to leave it alone.
 */
export function readerKeyAction(input, context) {
    const command = input.ctrlKey || input.metaKey;
    // Only Ctrl/Cmd combos reach past a text field: `j` in the composer is the
    // letter j, and `?` is a question mark the reader is typing.
    // Shift is refused with a command key: Ctrl+Shift+F and Ctrl+Shift+K belong
    // to the browser and the host's own devtools, and this layer bound the plain
    // forms long before it grew a palette.
    if (command && !input.altKey && !input.shiftKey) {
        const key = input.key.toLowerCase();
        if (key === 'k')
            return { kind: 'palette' };
        if (key === 'f')
            return { kind: 'search' };
        return null;
    }
    // Escape unwinds the topmost panel whatever holds focus — a panel that
    // cannot be escaped from the keyboard is a trap.
    if (input.key === 'Escape')
        return context.panel === 'none' ? null : { kind: 'dismiss' };
    if (context.typing || command)
        return null;
    if (context.panel !== 'none') {
        // Inside a panel only the dismiss letter is read; everything else is the
        // panel's own business (its input, its arrow keys).
        return input.key === 'q' ? { kind: 'dismiss' } : null;
    }
    switch (input.key) {
        case '?': return { kind: 'help' };
        case '/': return { kind: 'search' };
        case 'j': return { kind: 'scroll', by: 1 };
        case 'k': return { kind: 'scroll', by: -1 };
        case 'g': return { kind: 'edge', to: 'top' };
        case 'G': return { kind: 'edge', to: 'bottom' };
        default: return null;
    }
}
/**
 * Whether focus currently sits somewhere a letter key is text.
 *
 * @param target - the event target, if it is an element.
 * @returns whether the reading view must keep its hands off bare keys.
 */
export function isTypingTarget(target) {
    const element = target;
    if (!element || typeof element.tagName !== 'string')
        return false;
    const tag = element.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select')
        return true;
    return element.isContentEditable === true;
}
/**
 * How far one `j` or `k` moves the reading area.
 *
 * A fixed number of pixels reads as a different amount of text on a tall and
 * a short window, so the step follows the viewport and is clamped at both ends:
 * never smaller than a comfortable line group, never so large that the reader
 * loses the thread.
 *
 * @param viewportHeight - the scrolling element's client height, in pixels.
 * @returns the distance to scroll, in pixels.
 */
export function blockScrollDelta(viewportHeight) {
    return Math.round(Math.min(240, Math.max(80, viewportHeight * 0.25)));
}
//# sourceMappingURL=keymap.js.map
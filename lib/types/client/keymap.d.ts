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
/** The plugin's own panels, topmost-last. */
export type ReaderPanel = 'none' | 'search' | 'palette' | 'help';
/** A keystroke, reduced to what the layer reads. */
export interface KeyInput {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
}
/** What a keystroke means to the reading view. */
export type ReaderKeyAction = 
/** Toggle the command palette. */
{
    kind: 'palette';
}
/** Toggle the shortcut sheet. */
 | {
    kind: 'help';
}
/** Open (or focus) the in-view search. */
 | {
    kind: 'search';
}
/** Close the topmost panel. */
 | {
    kind: 'dismiss';
}
/** Scroll one block down (`1`) or up (`-1`). */
 | {
    kind: 'scroll';
    by: 1 | -1;
}
/** Jump to the reading area's top or bottom. */
 | {
    kind: 'edge';
    to: 'top' | 'bottom';
};
/** Facts about the page the layer cannot read off the keystroke itself. */
export interface KeyContext {
    /** Focus sits in a text field, where a bare letter is text, not a command. */
    typing: boolean;
    /** Which plugin panel is currently open. */
    panel: ReaderPanel;
}
/**
 * @param input - the keystroke.
 * @param context - focus and panel state.
 * @returns the action that keystroke means, or `null` to leave it alone.
 */
export declare function readerKeyAction(input: KeyInput, context: KeyContext): ReaderKeyAction | null;
/**
 * Whether focus currently sits somewhere a letter key is text.
 *
 * @param target - the event target, if it is an element.
 * @returns whether the reading view must keep its hands off bare keys.
 */
export declare function isTypingTarget(target: EventTarget | null): boolean;
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
export declare function blockScrollDelta(viewportHeight: number): number;
//# sourceMappingURL=keymap.d.ts.map
/** The three states the reading view can report about the session on screen. */
export type SessionMode = 'run' | 'wait' | 'idle';
/**
 * The reading view's own status line: the session state on the left, the
 * counts the reader already holds in the middle, and the two panel keys on the
 * right, each also clickable for mouse users.
 *
 * It is not a live region. The reading view already announces the live phase
 * once, in the status text beside the streaming answer; a second polite region
 * that changes with every tool call would make a screen reader unusable. This
 * line is a readout, so it is read where it sits, on navigation.
 */
export declare function StatusBar({ mode, meter, onPalette, onHelp }: {
    mode: SessionMode;
    meter: string | null;
    onPalette: () => void;
    onHelp: () => void;
}): import("react").JSX.Element;
//# sourceMappingURL=StatusBar.d.ts.map
import type { ReactNode } from 'react';
/** The three states the reading view can report about the session on screen. */
export type SessionMode = 'run' | 'wait' | 'idle';
/**
 * The reading view's one strip of persistent chrome: the session state on the
 * left, what the reader already holds in the middle — the turn readout, and
 * where the session runs — and the view's own controls on the right, handed in
 * by the reader so each button stays beside the handler it calls.
 *
 * It is pinned to the bottom, which is where the newest work is. The row that
 * used to head the column is gone, and every control it carried moved down here
 * instead of into a floating cluster: a row that already exists costs no
 * reading height, and the row that no longer exists gives some back.
 *
 * Every skin draws it — the terminal reads its mono vocabulary and hangs the
 * frame's bottom corners off it, the card skins take the same row in the page's
 * own type. The mode word is terminal vocabulary, so the card skins hide that
 * one span and keep the rest.
 *
 * It is not a live region. The reading view already announces the live phase
 * once, in the status text beside the streaming answer; a second polite region
 * that changes with every tool call would make a screen reader unusable. This
 * line is a readout, so it is read where it sits, on navigation.
 */
export declare function StatusBar({ mode, meter, path, pathTitle, children }: {
    mode: SessionMode;
    /** The turn readout: how many turns, and what the newest one cost. */
    meter: string | null;
    /** Where the session runs, shortened to fit one line. */
    path: string | null;
    /** The full path for the hover title; the visible text is abbreviated. */
    pathTitle?: string;
    /** The view's controls, in the order the reader reads them. */
    children: ReactNode;
}): import("react").JSX.Element;
//# sourceMappingURL=StatusBar.d.ts.map
import type { ReactNode } from 'react';
import { ui } from './locale.js';
import css from './Reader.module.css';

/** The three states the reading view can report about the session on screen. */
export type SessionMode = 'run' | 'wait' | 'idle';

/**
 * Words the status line prints for each state. They stay untranslated on
 * purpose: they are the skin's vocabulary, in the same class as `✓` and `✗`,
 * and a Chinese build of a terminal still prints `RUN`.
 */
const MODE_WORDS: Record<SessionMode, string> = { run: 'RUN', wait: 'WAIT', idle: 'IDLE' };

/**
 * The reading view's one strip of persistent chrome, and the only line that
 * reports what the session is doing.
 *
 * Everything that used to say "work is happening" in a second place now says it
 * here: the session state, what the reader already holds (the turn readout and
 * the workspace), the live working line — the phase, the elapsed clock and the
 * tool actually in flight, handed in by the reader — and the view's own
 * control, which is the door to every command rather than a row of buttons.
 *
 * It is pinned to the bottom, which is where the newest work is. The row that
 * used to head the column is gone, the working line that used to sit above this
 * one has been folded into it, and the fold header no longer repeats the counts
 * this row already prints: what is left is one line of chrome, wide enough to
 * breathe and no taller than the text on it.
 *
 * Every skin draws it — the terminal reads its mono vocabulary and hangs the
 * frame's bottom corners off it, the card skins take the same row in the page's
 * own type. The mode word is terminal vocabulary, so the card skins hide that
 * one span and keep the rest.
 *
 * It is not a live region. The reading view announces the live phase once, in
 * the status text below; a polite region that changed with every tool call
 * would make a screen reader unusable. This line is a readout, so it is read
 * where it sits, on navigation.
 */
export function StatusBar({ mode, meter, path, pathTitle, live, children }: {
  mode: SessionMode;
  /** The turn readout: how many turns, and what the newest one cost. */
  meter: string | null;
  /** Where the session runs, shortened to fit one line. */
  path: string | null;
  /** The full path for the hover title; the visible text is abbreviated. */
  pathTitle?: string;
  /**
   * The live working line, when a turn is running. It sits after the readout
   * and before the workspace: the two stable facts of the session first, then
   * what is happening right now, and the context it is happening in last.
   */
  live?: ReactNode;
  /** The view's control — one key, opening the command palette. */
  children: ReactNode;
}) {
  return <div className={css.statusBar} data-reader-status-bar data-mode={mode}>
    <span className={css.statusBarMode}>{MODE_WORDS[mode]}</span>
    {meter !== null && <span className={css.statusBarMeter} data-reader-frame-meter>{meter}</span>}
    {live}
    {path !== null && <span className={css.statusBarPath} data-reader-frame-path title={pathTitle}>{path}</span>}
    <span className={css.statusBarSpacer} aria-hidden="true" />
    {/* One labelled group rather than a `toolbar`: a toolbar promises arrow-key
        movement between its items, and the palette key is reached by its own
        shortcut as well as by Tab. */}
    <span className={css.statusBarKeys} role="group" aria-label={ui('reader.toolbarAria')} data-ud-check="reader-toolbar">{children}</span>
  </div>;
}

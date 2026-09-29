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
 * The reading view's own status line: the session state on the left, the
 * counts the reader already holds in the middle, and the two panel keys on the
 * right, each also clickable for mouse users.
 *
 * It is not a live region. The reading view already announces the live phase
 * once, in the status text beside the streaming answer; a second polite region
 * that changes with every tool call would make a screen reader unusable. This
 * line is a readout, so it is read where it sits, on navigation.
 */
export function StatusBar({ mode, meter, onPalette, onHelp }: {
  mode: SessionMode;
  meter: string | null;
  onPalette: () => void;
  onHelp: () => void;
}) {
  return <div className={css.statusBar} data-reader-status-bar data-mode={mode}>
    <span className={css.statusBarMode}>{MODE_WORDS[mode]}</span>
    {meter !== null && <span className={css.statusBarMeter} data-reader-frame-meter>{meter}</span>}
    <span className={css.statusBarSpacer} aria-hidden="true" />
    <button type="button" className={css.statusBarKey} onClick={onPalette} title={ui('help.key.palette')}>{ui('status.hint.palette')}</button>
    <button type="button" className={css.statusBarKey} onClick={onHelp} title={ui('help.key.help')}>{ui('status.hint.help')}</button>
  </div>;
}

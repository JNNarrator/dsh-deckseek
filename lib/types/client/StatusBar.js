import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ui } from './locale.js';
import css from './Reader.module.css';
/**
 * Words the status line prints for each state. They stay untranslated on
 * purpose: they are the skin's vocabulary, in the same class as `✓` and `✗`,
 * and a Chinese build of a terminal still prints `RUN`.
 */
const MODE_WORDS = { run: 'RUN', wait: 'WAIT', idle: 'IDLE' };
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
export function StatusBar({ mode, meter, path, pathTitle, live, children }) {
    return _jsxs("div", { className: css.statusBar, "data-reader-status-bar": true, "data-mode": mode, children: [_jsx("span", { className: css.statusBarMode, children: MODE_WORDS[mode] }), meter !== null && _jsx("span", { className: css.statusBarMeter, "data-reader-frame-meter": true, children: meter }), live, path !== null && _jsx("span", { className: css.statusBarPath, "data-reader-frame-path": true, title: pathTitle, children: path }), _jsx("span", { className: css.statusBarSpacer, "aria-hidden": "true" }), _jsx("span", { className: css.statusBarKeys, role: "group", "aria-label": ui('reader.toolbarAria'), "data-ud-check": "reader-toolbar", children: children })] });
}
//# sourceMappingURL=StatusBar.js.map
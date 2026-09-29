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
export function StatusBar({ mode, meter, path, pathTitle, children }) {
    return _jsxs("div", { className: css.statusBar, "data-reader-status-bar": true, "data-mode": mode, children: [_jsx("span", { className: css.statusBarMode, children: MODE_WORDS[mode] }), meter !== null && _jsx("span", { className: css.statusBarMeter, "data-reader-frame-meter": true, children: meter }), path !== null && _jsx("span", { className: css.statusBarPath, "data-reader-frame-path": true, title: pathTitle, children: path }), _jsx("span", { className: css.statusBarSpacer, "aria-hidden": "true" }), _jsx("span", { className: css.statusBarKeys, role: "group", "aria-label": ui('reader.toolbarAria'), "data-ud-check": "reader-toolbar", children: children })] });
}
//# sourceMappingURL=StatusBar.js.map
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
 * The reading view's own status line: the session state on the left, the
 * counts the reader already holds in the middle, and the two panel keys on the
 * right, each also clickable for mouse users.
 *
 * It is not a live region. The reading view already announces the live phase
 * once, in the status text beside the streaming answer; a second polite region
 * that changes with every tool call would make a screen reader unusable. This
 * line is a readout, so it is read where it sits, on navigation.
 */
export function StatusBar({ mode, meter, onPalette, onHelp }) {
    return _jsxs("div", { className: css.statusBar, "data-reader-status-bar": true, "data-mode": mode, children: [_jsx("span", { className: css.statusBarMode, children: MODE_WORDS[mode] }), meter !== null && _jsx("span", { className: css.statusBarMeter, "data-reader-frame-meter": true, children: meter }), _jsx("span", { className: css.statusBarSpacer, "aria-hidden": "true" }), _jsx("button", { type: "button", className: css.statusBarKey, onClick: onPalette, title: ui('help.key.palette'), children: ui('status.hint.palette') }), _jsx("button", { type: "button", className: css.statusBarKey, onClick: onHelp, title: ui('help.key.help'), children: ui('status.hint.help') })] });
}
//# sourceMappingURL=StatusBar.js.map
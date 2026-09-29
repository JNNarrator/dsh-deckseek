import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment, useEffect } from 'react';
import { ui } from './locale.js';
import css from './Reader.module.css';
/**
 * The reading view's shortcut sheet, opened with `?`.
 *
 * It lists only keys this view owns. The composer, sending a message and the
 * host's risky-action confirmation are host surfaces with their own bindings,
 * so the sheet says so instead of silently omitting them — a shortcut sheet
 * that looks complete but is not is worse than one that draws its own border.
 */
const ROWS = [
    { group: 'panels', keys: '^K', label: 'help.key.palette' },
    { group: 'panels', keys: '?', label: 'help.key.help' },
    { group: 'reading', keys: '/', label: 'help.key.search' },
    { group: 'reading', keys: 'Enter', label: 'help.key.next' },
    { group: 'reading', keys: 'Shift+Enter', label: 'help.key.prev' },
    { group: 'reading', keys: 'j', label: 'help.key.scrollDown' },
    { group: 'reading', keys: 'k', label: 'help.key.scrollUp' },
    { group: 'reading', keys: 'g', label: 'help.key.top' },
    { group: 'reading', keys: 'G', label: 'help.key.bottom' },
    { group: 'panels', keys: 'Esc / q', label: 'help.key.dismiss' },
];
export function ShortcutHelp({ onClose }) {
    // Focus the close control so the sheet is reachable by keyboard: it is a
    // dialog, and a dialog that opens with focus still on the page behind it
    // cannot be left with the keyboard.
    useEffect(() => { document.querySelector('[data-reader-help] [data-autofocus]')?.focus(); }, []);
    return _jsx("div", { className: css.paletteScrim, onMouseDown: event => { if (event.target === event.currentTarget)
            onClose(); }, children: _jsxs("div", { className: css.palette, "data-reader-help": true, role: "dialog", "aria-modal": "true", "aria-label": ui('help.title'), children: [_jsx("p", { className: css.helpTitle, children: ui('help.title') }), _jsx("dl", { className: css.helpList, children: ['reading', 'panels'].map(group => _jsxs(Fragment, { children: [_jsx("dt", { className: css.helpGroup, children: ui(group === 'reading' ? 'help.group.reading' : 'help.group.panels') }), ROWS.filter(row => row.group === group).map(row => _jsxs("dd", { className: css.helpRow, children: [_jsx("kbd", { className: css.helpKeys, children: row.keys }), _jsx("span", { className: css.helpLabel, children: ui(row.label) })] }, row.keys))] }, group)) }), _jsx("p", { className: css.paletteNote, children: ui('help.note.hosts') }), _jsx("button", { type: "button", "data-autofocus": true, className: css.helpClose, onClick: onClose, children: ui('help.close') })] }) });
}
//# sourceMappingURL=ShortcutHelp.js.map
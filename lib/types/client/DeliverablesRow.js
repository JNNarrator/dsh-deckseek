import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import css from './Reader.module.css';
import { basename, visibleDeliverables } from './deliverables.js';
import { ui } from './locale.js';
/**
 * The files one closed turn produced.
 *
 * A row rather than part of the answer, because the artifacts belong to the stop
 * the turn made: the answer is what the model said, the row is what it left on
 * disk. It waits for the turn to close (see `showDeliverablesRow`) — a row that
 * appeared on the first write would claim the work is finished while it is still
 * being written.
 *
 * Each chip is one control. Upstream also hangs "show in folder" and "copy path"
 * off the chip; the reveal action arrives with the host route for it (W3d), and
 * the path is already the chip's title, so the second control is not here yet
 * rather than absent by oversight.
 */
export const Deliverables = memo(function Deliverables({ paths, openFile }) {
    const { shown, hidden } = visibleDeliverables(paths);
    return _jsxs("div", { className: css.deliverablesRoot, "data-reader-deliverables": true, children: [_jsx("span", { className: css.deliverablesLabel, children: ui('deliverables.label') }), _jsx("div", { className: css.deliverablesLane, children: _jsxs("div", { className: css.deliverablesChips, children: [shown.map(path => _jsx("button", { type: "button", className: css.deliverableChip, title: path, "aria-label": ui('deliverable.open', { path }), onClick: () => openFile(path), children: _jsx("span", { className: css.deliverableName, children: basename(path) }) }, path)), hidden > 0 && _jsx("span", { className: css.deliverablesMore, children: ui('deliverables.more', { count: hidden }) })] }) })] });
});
//# sourceMappingURL=DeliverablesRow.js.map
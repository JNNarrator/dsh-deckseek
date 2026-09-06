import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import { ui } from './locale.js';
import css from './Reader.module.css';
/**
 * Consistent failure card for record rows that end in an error
 * (failed tools, failed commands, turn errors). Shows a title, the
 * failure reason, an optional short code, a hint line telling the user
 * where the full details live, and an expandable raw record.
 */
export const FailureCard = memo(function FailureCard({ title, message, detail, code, note = ui('failure.note'), raw, }) {
    return (_jsxs("div", { className: css.failure, role: "alert", "data-reader-anchor": true, children: [_jsx("strong", { children: title }), message !== undefined && _jsx("p", { children: message }), detail !== undefined && _jsx("p", { className: css.failureDetail, children: detail }), code !== undefined && _jsx("code", { children: code }), _jsx("p", { className: css.failureNote, children: note }), raw !== undefined && _jsxs("details", { className: css.detail, children: [_jsx("summary", { children: ui('viewRawRecord') }), _jsx("pre", { className: css.rawJson, children: JSON.stringify(raw, null, 2) })] })] }));
});
//# sourceMappingURL=FailureCard.js.map
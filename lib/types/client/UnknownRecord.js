import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import { JsonBlock } from '@deepseek-ai/dsh-client-ui-primitives';
import { pickPreviewText, summarizeFields } from './unknown-record.js';
import { ui, unknownKindLabel } from './locale.js';
import { truncatedJsonLabel } from './primitive-labels.js';
import { useCopyReceipt } from './copy-receipt.js';
import css from './Reader.module.css';
/**
 * Fallback for record kinds the reading view does not render natively
 * (unknown surface events, future kinds). Shows a friendly title, a content
 * preview when the payload is text-like, a compact field summary otherwise,
 * a copy action, and the full raw record on demand.
 */
export const UnknownRecord = memo(function UnknownRecord({ kind, data }) {
    const { receipt, copy } = useCopyReceipt();
    const preview = pickPreviewText(data);
    const summary = summarizeFields(data, count => ui('unknown.itemsCount', { count }));
    const raw = JSON.stringify(data, null, 2);
    return (_jsxs("div", { className: css.unknown, "data-reader-anchor": true, "data-unknown-kind": kind, children: [_jsxs("p", { children: [_jsx("strong", { children: unknownKindLabel(kind) }), _jsx("span", { className: css.unknownKind, children: kind })] }), preview !== null && _jsx("pre", { className: css.unknownPreview, children: preview }), preview === null && summary !== '' && _jsx("p", { className: css.unknownSummary, children: summary }), _jsxs("div", { className: css.unknownActions, children: [_jsx(JsonBlock, { label: ui('viewRawRecord'), payload: data, truncatedLabel: truncatedJsonLabel }), _jsx("button", { type: "button", className: css.textButton, onClick: () => void copy(raw), children: receipt || ui('unknown.copy') })] })] }));
});
//# sourceMappingURL=UnknownRecord.js.map
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useCallback, useState } from 'react';
import { JsonBlock, writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives';
import { pickPreviewText, summarizeFields } from './unknown-record.js';
import { ui, unknownKindLabel } from './locale.js';
import { truncatedJsonLabel } from './primitive-labels.js';
import css from './Reader.module.css';
/**
 * Fallback for record kinds the reading view does not render natively
 * (unknown surface events, future kinds). Shows a friendly title, a content
 * preview when the payload is text-like, a compact field summary otherwise,
 * a copy action, and the full raw record on demand.
 */
export const UnknownRecord = memo(function UnknownRecord({ kind, data }) {
    const [copied, setCopied] = useState(false);
    const preview = pickPreviewText(data);
    const summary = summarizeFields(data, count => ui('unknown.arrayItems', { count }));
    const raw = JSON.stringify(data, null, 2);
    const copy = useCallback(async () => {
        try {
            await writeClipboard(raw);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        }
        catch {
            // Clipboard unavailable — the record stays reachable via JsonBlock.
        }
    }, [raw]);
    return (_jsxs("div", { className: css.unknown, "data-reader-anchor": true, "data-unknown-kind": kind, children: [_jsxs("p", { children: [_jsx("strong", { children: unknownKindLabel(kind) }), _jsx("span", { className: css.unknownKind, children: kind })] }), preview !== null && _jsx("pre", { className: css.unknownPreview, children: preview }), preview === null && summary !== '' && _jsx("p", { className: css.unknownSummary, children: summary }), _jsxs("div", { className: css.unknownActions, children: [_jsx(JsonBlock, { label: ui('viewRawRecord'), payload: data, truncatedLabel: truncatedJsonLabel }), _jsx("button", { type: "button", className: css.textButton, onClick: copy, children: copied ? ui('unknown.copied') : ui('unknown.copy') })] })] }));
});
//# sourceMappingURL=UnknownRecord.js.map
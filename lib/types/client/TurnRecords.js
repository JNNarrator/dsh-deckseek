import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import { turnProcessLabel, turnTailStats, ui } from './locale.js';
import css from './Reader.module.css';
/**
 * Reading-view adapters for record kinds the native chat renders with its own
 * components. Each stays deliberately compact: the reading view folds process
 * detail away and keeps the final answer, so these rows summarize rather than
 * replicate the native chrome.
 */
/** System-prompt record: collapsed disclosure with the model-facing text. */
export const SystemPromptRow = memo(function SystemPromptRow({ text }) {
    return (_jsxs("details", { className: css.systemPrompt, "data-reader-anchor": true, children: [_jsx("summary", { children: ui('systemPrompt') }), _jsx("pre", { className: css.systemPromptBody, children: text })] }));
});
/** Turn-process record: one-line summary of the folded process evidence. */
export const TurnProcessMeta = memo(function TurnProcessMeta({ data }) {
    const label = turnProcessLabel(data);
    const hasCounts = data.messageCount > 0 || data.toolCallCount > 0 || data.subagentCount > 0;
    return _jsx("p", { className: css.turnProcess, "data-reader-anchor": true, children: hasCounts ? `${ui('turnProcess.prefix')}${label}` : label });
});
/** Turn-tail record: compact usage/time stats footer; null when nothing to show. */
export const TurnTailStats = memo(function TurnTailStats({ data }) {
    const stats = turnTailStats(data);
    if (stats === null)
        return null;
    return _jsx("p", { className: css.turnTail, "data-reader-anchor": true, children: stats });
});
//# sourceMappingURL=TurnRecords.js.map
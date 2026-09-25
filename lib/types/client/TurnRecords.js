import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useId } from 'react';
import { BranchGlyph } from './icons.js';
import { currentLocale, messageClock, turnProcessLabel, turnTailDetail, turnTailStats, ui } from './locale.js';
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
/**
 * Turn-tail record: the turn's end time and its usage footer; null when the
 * turn left neither.
 *
 * The clock is the tail's own, not the footer's decoration: the host puts the
 * end time here because this is the last row of the turn, and a reader scanning
 * a transcript wants to know when the answer landed without opening anything.
 * It is read from `closing.time` when there is a closing answer, because the
 * tail node's own `time` is when the tail arrived — which for a retried turn is
 * later than the answer it is closing.
 *
 * The usage numbers stay the numbers a reader scans for — total, cache hit
 * rate, reasoning share. Everything the provider reported is kept on the row's
 * title, which is where the routes that billed the turn live, so the accounting
 * is recoverable without printing seven numbers on the line.
 */
export const TurnTailStats = memo(function TurnTailStats({ data, forkAt }) {
    // The reason text is referenced by `aria-describedby`, never merely nested, so
    // the id has to be stable across renders and unique per tail. Calling the hook
    // before the early return below is required: a conditional hook would change
    // the hook order the moment a turn lost its stats.
    const branchReasonId = useId();
    const stats = turnTailStats(data);
    const ended = data.closing?.time ?? data.time;
    // Three independent reasons to exist, so the row survives if any one of them
    // holds. Gating on the stats alone would drop the branch action on exactly the
    // turns that report nothing else — a bare tail is the turn a reader is most
    // likely to want to branch away from.
    const branchable = data.turn !== undefined && data.seq !== undefined;
    if (stats === null && ended === undefined && !branchable)
        return null;
    const detail = turnTailDetail(data);
    // Branching mirrors the host's own tail: the action belongs to the last node
    // of the turn, and the host disables rather than hides it when this tail is
    // not the end of a completed turn (`branchUnavailable`), so a reader is told
    // why the control is there instead of finding it missing. The sequence must be
    // the tail node's own `seq`, which the host uses verbatim; forking at the
    // closing answer's sequence truncates the turn, because the tail arrives after
    // the answer it closes.
    const unavailable = data.branchUnavailable === true;
    // A paragraph may only contain phrasing content, and a `<button>` is not
    // phrasing content, so the row is a `<div>`. The host's tail is a `<div>` too.
    return _jsxs("div", { className: css.turnTail, "data-reader-anchor": true, "data-reader-turn-tail": data.turn ?? '', title: detail ?? undefined, children: [stats !== null && _jsx("span", { "data-reader-turn-usage": true, children: stats }), stats !== null && ended !== undefined && _jsx("span", { "aria-hidden": "true", children: ui('turnProcess.separator') }), ended !== undefined && _jsx("time", { dateTime: new Date(ended).toISOString(), "data-reader-turn-end": true, children: messageClock(ended, currentLocale()) }), branchable && _jsx("button", { type: "button", className: css.branch, "aria-label": ui('branch.action'), "aria-disabled": unavailable || undefined, "aria-describedby": unavailable ? branchReasonId : undefined, "data-reader-branch": true, "data-unavailable": unavailable || undefined, 
                // The host uses `aria-disabled` over `disabled` so the button still fires
                // hover and focus, which is what carries the reason. That only works if
                // the click is also ignored here, which is why the handler is conditional.
                onClick: unavailable ? undefined : () => { if (data.seq !== undefined)
                    forkAt?.(data.seq); }, children: _jsx(BranchGlyph, {}) }), branchable && unavailable && _jsx("span", { id: branchReasonId, className: css.branchReason, children: ui('branch.unavailable') })] });
});
//# sourceMappingURL=TurnRecords.js.map
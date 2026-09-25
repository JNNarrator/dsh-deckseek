import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { ui } from '../locale.js';
import css from './ModelRetryRow.module.css';
/**
 * The attempt count a retry's own mode allows.
 *
 * `always` retries indefinitely, so the cap is reported as unbounded rather
 * than as a number — printing the numeric field for it would claim a limit the
 * provider policy does not have.
 */
export function retryMaximum(node) {
    return node.mode === 'normal' ? String(node.maxRetries) : '∞';
}
/**
 * Whole seconds a scheduled wait still has to run.
 *
 * The deadline is anchored to this browser's first render of the node rather
 * than to the event's own timestamp: the durable `time` comes from the host's
 * clock and may be in a different epoch from `Date.now()`, so subtracting it
 * directly can produce a negative or wildly wrong wait.
 * @param node - the scheduled retry attempt.
 * @returns the recorded wait, in whole seconds, never below one.
 */
export function retrySeconds(node) {
    return Math.max(1, Math.ceil(node.delayMs / 1_000));
}
/** The lifecycle label for an attempt, localized. */
export function retryLabel(node, active) {
    if (active)
        return ui('retry.scheduled');
    if (node.retryState === 'cancelled')
        return ui('retry.cancelled');
    if (node.retryState === 'started')
        return ui('retry.started');
    return ui('retry.scheduled');
}
/**
 * The failure reason to show, with the non-actionable code replaced.
 *
 * `AUTH` is the one provider-neutral code a reader can act on directly: the
 * attempt will keep failing until credentials change, so the provider's own
 * message is replaced by that instruction instead of leaving the reader to
 * infer it from a status code.
 */
export function retryFailure(node) {
    return node.failure.code === 'AUTH' ? ui('retry.auth') : node.failure.message;
}
function secondsRemaining(deadline) {
    return Math.max(1, Math.ceil((deadline - Date.now()) / 1_000));
}
/**
 * Render one durable model-retry notice.
 *
 * A retry is the only visible evidence that a turn is stalled rather than
 * finished, so this row is always present — never folded away — and, while the
 * wait is still scheduled, it counts down live. Once the attempt starts or is
 * cancelled the countdown stops and the row shows the original wait length, so
 * a settled transcript does not keep ticking.
 * @param props - the correlated attempt chain.
 * @returns A collapsed retry summary with delay and failure details.
 */
export function ModelRetryRow({ data }) {
    const node = data.current;
    const active = node.retryState === 'scheduled';
    const scheduled = retrySeconds(node);
    // Anchor the countdown to this browser's first render; the host event time and
    // Date.now() may belong to different clocks.
    const deadline = useMemo(() => Date.now() + node.delayMs, [node.delayMs, node.seq]);
    const [remaining, setRemaining] = useState(() => secondsRemaining(deadline));
    useEffect(() => {
        if (!active)
            return;
        const tick = () => {
            const next = secondsRemaining(deadline);
            setRemaining(current => (current === next ? current : next));
            return next;
        };
        if (tick() === 1)
            return;
        const timer = window.setInterval(() => {
            if (tick() === 1)
                window.clearInterval(timer);
        }, 250);
        return () => { window.clearInterval(timer); };
    }, [active, deadline]);
    const seconds = active ? remaining : scheduled;
    const maximum = retryMaximum(node);
    const status = ui('retry.status', {
        label: retryLabel(node, active),
        retry: node.retry,
        max: maximum,
        seconds,
    });
    return (_jsxs("details", { className: css.root, "data-retry-state": node.retryState, "data-active": active || undefined, children: [_jsx("summary", { className: css.summary, children: _jsx("span", { className: css.status, role: "status", children: status }) }), _jsxs("div", { className: css.details, children: [_jsxs("div", { children: [_jsx("span", { className: css.label, children: ui('retry.delay') }), node.delayMs, " ms"] }), _jsxs("div", { children: [_jsx("span", { className: css.label, children: ui('retry.failure') }), retryFailure(node)] }), _jsxs("div", { children: [_jsx("span", { className: css.label, children: ui('retry.provider') }), node.provider] })] })] }));
}
//# sourceMappingURL=ModelRetryRow.js.map
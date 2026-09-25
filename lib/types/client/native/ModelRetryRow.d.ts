import type { ModelRetryNode } from '@deepseek-ai/dsh-client-ui-conversation/client';
/** Retry payload shared by the process seat and the reading view. */
export interface RetryData {
    readonly attempts: readonly ModelRetryNode[];
    readonly current: ModelRetryNode;
}
/**
 * The attempt count a retry's own mode allows.
 *
 * `always` retries indefinitely, so the cap is reported as unbounded rather
 * than as a number — printing the numeric field for it would claim a limit the
 * provider policy does not have.
 */
export declare function retryMaximum(node: ModelRetryNode): string;
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
export declare function retrySeconds(node: ModelRetryNode): number;
/** The lifecycle label for an attempt, localized. */
export declare function retryLabel(node: ModelRetryNode, active: boolean): string;
/**
 * The failure reason to show, with the non-actionable code replaced.
 *
 * `AUTH` is the one provider-neutral code a reader can act on directly: the
 * attempt will keep failing until credentials change, so the provider's own
 * message is replaced by that instruction instead of leaving the reader to
 * infer it from a status code.
 */
export declare function retryFailure(node: ModelRetryNode): string;
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
export declare function ModelRetryRow({ data }: {
    data: RetryData;
}): import("react").JSX.Element;
//# sourceMappingURL=ModelRetryRow.d.ts.map
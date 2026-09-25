import { type TurnProcessData, type TurnTailData } from './locale.js';
/**
 * Reading-view adapters for record kinds the native chat renders with its own
 * components. Each stays deliberately compact: the reading view folds process
 * detail away and keeps the final answer, so these rows summarize rather than
 * replicate the native chrome.
 */
/** System-prompt record: collapsed disclosure with the model-facing text. */
export declare const SystemPromptRow: import("react").MemoExoticComponent<({ text }: {
    text: string;
}) => import("react").JSX.Element>;
/** Turn-process record: one-line summary of the folded process evidence. */
export declare const TurnProcessMeta: import("react").MemoExoticComponent<({ data }: {
    data: TurnProcessData;
}) => import("react").JSX.Element>;
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
export declare const TurnTailStats: import("react").MemoExoticComponent<({ data, forkAt }: {
    data: TurnTailData;
    forkAt?: (seq: number) => void;
}) => import("react").JSX.Element | null>;
//# sourceMappingURL=TurnRecords.d.ts.map
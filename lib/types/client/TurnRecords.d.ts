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
/** Turn-tail record: compact usage/time stats footer; null when nothing to show. */
export declare const TurnTailStats: import("react").MemoExoticComponent<({ data }: {
    data: TurnTailData;
}) => import("react").JSX.Element | null>;
//# sourceMappingURL=TurnRecords.d.ts.map
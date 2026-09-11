import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { ToolActivityEntry } from './tool-activity.js';
import type { BlockRenderProps, TurnRowContext } from './types.js';
/** One occurrence, keyed by call id all the way from generation to result. */
export declare const ToolActivity: import("react").MemoExoticComponent<({ entry, motion, turnClosed, onRead, depth, cwd, ...render }: BlockRenderProps & TurnRowContext & {
    entry: ToolActivityEntry;
    motion: boolean;
    turnClosed: boolean;
    onRead: () => void;
    depth?: number;
}) => import("react").JSX.Element>;
/** Media and failures never disappear inside a folded execution record. */
export declare function ToolMedia({ block, depth, failureNote, ...render }: BlockRenderProps & TurnRowContext & {
    block: ToolCallBlock;
    depth?: number;
}): import("react").JSX.Element | null;
//# sourceMappingURL=ToolActivity.d.ts.map
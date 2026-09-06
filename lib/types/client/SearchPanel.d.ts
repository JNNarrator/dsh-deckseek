import type { RefObject } from 'react';
import { type SearchEntry } from './search-index.js';
/**
 * In-view search over user/assistant text. Matches navigate to the rendered
 * block (flashed briefly); the DSH session remains the source of truth.
 */
export declare const SearchPanel: import("react").MemoExoticComponent<({ root, index, onClose }: {
    root: RefObject<HTMLElement>;
    index: readonly SearchEntry[];
    onClose: () => void;
}) => import("react").JSX.Element>;
//# sourceMappingURL=SearchPanel.d.ts.map
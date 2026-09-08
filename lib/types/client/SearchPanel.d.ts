import type { RefObject } from 'react';
import { type SearchEntry } from './search-index.js';
/**
 * In-view search over user/assistant text. Occurrences are highlighted
 * character-exact through the CSS Custom Highlight API (with a block-level
 * tint as a second layer); the DSH session remains the source of truth.
 */
export declare const SearchPanel: import("react").MemoExoticComponent<({ root, index, onClose }: {
    root: RefObject<HTMLElement>;
    index: readonly SearchEntry[];
    onClose: () => void;
}) => import("react").JSX.Element>;
//# sourceMappingURL=SearchPanel.d.ts.map
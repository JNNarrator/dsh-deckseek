import type { RefObject } from 'react';
import type { RailItem } from './turn-rail.js';
/**
 * Right-edge message marks in the style of a minimal editor rail: one tiny
 * pill per user message, the active one highlighted, hovering shows a styled
 * info bubble, clicking scrolls that message into view. The rail lives inside
 * the reader's right padding gutter, so the reading column stays centered;
 * hidden on narrow widths.
 */
export declare const TurnRail: import("react").MemoExoticComponent<({ root, items }: {
    root: RefObject<HTMLElement>;
    items: readonly RailItem[];
}) => import("react").JSX.Element>;
//# sourceMappingURL=TurnRail.d.ts.map
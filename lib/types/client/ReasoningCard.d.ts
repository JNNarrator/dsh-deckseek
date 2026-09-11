import type { ReactNode } from 'react';
/** One real transcript: reference transform while following, native scroll while reading. */
export declare function ReasoningCard({ children, step, active, history, motion, selected, onRead }: {
    children: ReactNode;
    step: number;
    active: boolean; /** A closed turn's card rests as its heading line until expanded. */
    history?: boolean;
    motion: boolean;
    selected: boolean;
    onRead: () => void;
}): import("react").JSX.Element;
//# sourceMappingURL=ReasoningCard.d.ts.map
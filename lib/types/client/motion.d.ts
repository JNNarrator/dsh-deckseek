import type { ComponentType, ReactNode, RefObject } from 'react';
export declare function useMotionAllowed(enabled: boolean): boolean;
export declare function usePinnedSelection(root: RefObject<HTMLElement>, selector?: string): readonly string[];
/**
 * The busy status line. `text` is the semantic phase label every skin reads;
 * while a turn is open it also carries the elapsed clock inside it. The terminal
 * skin instead reads the reference TUI's idiom — a breathing glyph, a per-turn
 * working verb and a tabular clock in its own slot — so `verb` and `clock` are
 * supplied as separate parts and the CSS picks which of the two the skin shows.
 */
export declare function StatusText({ text, ariaText, motion, shimmer, verb, clock, swapKey, detail }: {
    text: string;
    ariaText?: string;
    motion: boolean;
    shimmer?: boolean;
    verb?: string;
    clock?: string;
    /**
     * What the live turn is doing right now — the running command, path, or
     * query — shown beside the phase label when the reader's work-details level
     * asks for live detail. Decoration only: the live region keeps the phase.
     */
    detail?: string;
    /**
     * Identity for the swap animation, when it is not the label itself. A label
     * that embeds a ticking clock changes every second, and swapping on the text
     * then slides and blurs the whole sentence once a second; passing the phase
     * instead keeps that animation on real phase changes and lets the digits
     * change in place.
     */
    swapKey?: string;
}): import("react").JSX.Element;
export declare function Disclosure({ open, onChange, label, activity, summary, status, controls, buttonRef }: {
    open: boolean;
    onChange: (value: boolean) => void;
    label: ReactNode;
    /** The ranked action phrase and its family glyph: what a fold hides, in words. */
    activity?: {
        phrase: string;
        glyph: ComponentType<{
            className?: string;
        }>;
    };
    summary?: string;
    status?: string;
    controls: string;
    buttonRef: RefObject<HTMLButtonElement>;
}): import("react").JSX.Element;
/** Supplemental details stay in source order beside their own narration. */
export declare function ProcessFragment({ open, motion, onRead, returnFocusTo, nodeKey, children, framed }: {
    open: boolean;
    motion: boolean;
    onRead: () => void;
    nodeKey: string;
    returnFocusTo: RefObject<HTMLElement>;
    children: ReactNode;
    framed?: boolean;
}): import("react").JSX.Element | null;
/** Retire only narration that was actually visible; historical rows stay folded. */
export declare function RetiringContent({ visible, children }: {
    visible: boolean;
    children: ReactNode;
}): import("react").JSX.Element | null;
export declare function useReadingScroll(root: RefObject<HTMLElement>, motion: boolean): {
    detached: boolean;
    jump: () => void;
};
/** Remember the reading position per session and restore it on return. */
export declare function useReadingPosition(root: RefObject<HTMLElement>, sessionId: string, ready: boolean): boolean;
//# sourceMappingURL=motion.d.ts.map
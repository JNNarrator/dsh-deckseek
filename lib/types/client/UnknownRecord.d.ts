/**
 * Fallback for record kinds the reading view does not render natively
 * (unknown surface events, future kinds). Shows a friendly title, a content
 * preview when the payload is text-like, a compact field summary otherwise,
 * a copy action, and the full raw record on demand.
 */
export declare const UnknownRecord: import("react").MemoExoticComponent<({ kind, data }: {
    kind: string;
    data: unknown;
}) => import("react").JSX.Element>;
//# sourceMappingURL=UnknownRecord.d.ts.map
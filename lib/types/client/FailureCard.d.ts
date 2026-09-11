/**
 * Consistent failure card for record rows that end in an error
 * (failed tools, failed commands, turn errors). Shows a title, the
 * failure reason, an optional short code, an optional hint line telling the
 * user where the full details live, and an expandable raw record.
 */
export declare const FailureCard: import("react").MemoExoticComponent<({ title, message, detail, code, note, raw, }: {
    title: string;
    message?: string;
    detail?: string;
    code?: string;
    note?: string;
    raw?: unknown;
}) => import("react").JSX.Element>;
//# sourceMappingURL=FailureCard.d.ts.map
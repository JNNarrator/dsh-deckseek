/**
 * Unified copy feedback: writes to the clipboard and shows a transient
 * `role="status"` receipt (success or failure) that clears itself. The timer
 * is cleaned up on unmount so a short-lived record card never leaves a
 * dangling timeout behind.
 */
export declare function useCopyReceipt(duration?: number): {
    receipt: string;
    copy: (text: string) => Promise<void>;
};
//# sourceMappingURL=copy-receipt.d.ts.map
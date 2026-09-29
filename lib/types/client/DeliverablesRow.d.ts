/**
 * The files one closed turn produced.
 *
 * A row rather than part of the answer, because the artifacts belong to the stop
 * the turn made: the answer is what the model said, the row is what it left on
 * disk. It waits for the turn to close (see `showDeliverablesRow`) — a row that
 * appeared on the first write would claim the work is finished while it is still
 * being written.
 *
 * Each chip is one control. Upstream also hangs "show in folder" and "copy path"
 * off the chip; the reveal action arrives with the host route for it (W3d), and
 * the path is already the chip's title, so the second control is not here yet
 * rather than absent by oversight.
 */
export declare const Deliverables: import("react").MemoExoticComponent<({ paths, openFile }: {
    paths: readonly string[];
    openFile: (path: string) => void;
}) => import("react").JSX.Element>;
//# sourceMappingURL=DeliverablesRow.d.ts.map
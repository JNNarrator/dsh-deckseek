/**
 * The files one closed turn produced.
 *
 * A row rather than part of the answer, because the artifacts belong to the stop
 * the turn made: the answer is what the model said, the row is what it left on
 * disk. It waits for the turn to close (see `showDeliverablesRow`) — a row that
 * appeared on the first write would claim the work is finished while it is still
 * being written.
 *
 * Each chip carries two controls: the file name opens the file, and the folder
 * control selects it in the OS file manager. The second one needs a server route
 * the plugin only registers where the host has a web server and a workspace
 * registry, so where that is missing it opens the containing folder instead — a
 * lesser affordance, and the only one available, rather than a dead control.
 */
export declare const Deliverables: import("react").MemoExoticComponent<({ paths, openFile, revealFile }: {
    paths: readonly string[];
    openFile: (path: string) => void;
    revealFile?: ((path: string) => void) | undefined;
}) => import("react").JSX.Element>;
//# sourceMappingURL=DeliverablesRow.d.ts.map
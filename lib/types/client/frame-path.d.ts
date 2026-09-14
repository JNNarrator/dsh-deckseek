/**
 * The terminal skin's window title carries the workspace, not the whole path.
 *
 * A terminal title bar shows where you are, and the reader's column is 748px at
 * most: a five-segment path would crowd out the controls sharing that row. The
 * last two segments are what a person actually reads, with a leading ellipsis
 * marking the cut so a shortened path is never mistaken for the whole one. Paths
 * of one or two segments are already short and are kept verbatim, which also
 * keeps an absolute path reading as absolute. The full path stays on the
 * element's `title`.
 */
export declare function shortCwd(cwd: string | undefined): string;
//# sourceMappingURL=frame-path.d.ts.map
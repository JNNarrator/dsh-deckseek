/**
 * "Show this file in the OS file manager", bounded to the session's own root.
 *
 * The one capability in this plugin that starts a process on the user's machine,
 * so the shape of the check matters more than the feature does. Two rules hold it
 * shut, and both are enforced by the SERVER, never by what the caller claims:
 *
 *  1. The root is derived from the session id through the host's own workspace
 *     registry. A request cannot name a root, only a session.
 *  2. The target is resolved with `realpath` and compared to the resolved root,
 *     so a symlink out of the tree is followed and then rejected. A lexical
 *     prefix check alone would accept it.
 *
 * Every failure is a refusal. Nothing here opens a path it cannot account for.
 *
 * Ported from upstream `2ac5471`, whose version spawned whatever path it was
 * given — the difference is the whole reason this module exists.
 */
/** The route this plugin owns. Namespaced by plugin, never by upstream's name. */
export declare const REVEAL_PATH = "/dsh-deckseek/reveal";
/** Request bodies are one path and one id; anything larger is not a request. */
export declare const MAX_REVEAL_BODY_BYTES = 4096;
/** The slice of the host's workspace registry this route needs. */
export interface WorkspaceRegistry {
    list(): readonly {
        path: string;
        sessionIds: readonly string[];
    }[];
}
export interface RevealRequestLike {
    method?: string;
}
export interface RevealResponseLike {
    statusCode: number;
    setHeader?(name: string, value: string): void;
    end(body?: string): void;
}
export interface RevealDeps {
    /** Resolved on every request: a deployment may install the registry later. */
    registry: () => WorkspaceRegistry | undefined;
    /** Canonical path, or undefined when the path does not resolve. */
    realpath: (path: string) => Promise<string | undefined>;
    exists: (path: string) => Promise<boolean>;
    /** Start the platform's opener. Array arguments only — nothing is parsed. */
    spawn: (command: string, args: readonly string[]) => void;
    readBody: (req: unknown) => Promise<string>;
    platform: string;
    warn: (message: string, detail?: unknown) => void;
}
/**
 * One comparable absolute form of a path, or undefined when it is not absolute.
 *
 * Lexical only: `.` and `..` are folded here so a traversal is visible to the
 * comparison, and a path that climbs past its own root returns undefined rather
 * than something that merely looks short. Case is NOT folded — callers compare
 * `realpath` output, and the filesystem has already decided the canonical case.
 */
export declare function normalizeAbsolute(value: unknown): string | undefined;
/**
 * The target when it is `root` itself or lives inside it, otherwise undefined.
 *
 * The boundary is a separator, not a string prefix: `/w/proj2` is not inside
 * `/w/proj`, and that is exactly the bug a naive `startsWith` invites.
 */
export declare function withinRoot(root: unknown, target: unknown): string | undefined;
/**
 * How the OS is asked to reveal a file, per platform. `open -R` selects the file
 * in Finder rather than opening it; Explorer has `/select,` for the same.
 *
 * `xdg-open` has no "select" and would OPEN the file, so Linux is deliberately
 * not claimed as supported: revealing is not the same as launching, and this
 * plugin does not get to decide to run a file.
 */
export declare function systemOpener(platform: string): {
    command: string;
    args: (path: string) => readonly string[];
} | undefined;
/**
 * The route object the host registers. Every dependency is injected so the whole
 * decision can be driven in a test with a fake registry and a recorded spawn —
 * this is the only place in the plugin that runs something, so it is the last
 * place that should be testable only through a running harness.
 */
export declare function createRevealRoute(deps: RevealDeps): {
    kind: 'exact';
    path: string;
    handler: (req: RevealRequestLike, res: RevealResponseLike) => Promise<void>;
};
//# sourceMappingURL=reveal-path.d.ts.map
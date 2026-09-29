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
export const REVEAL_PATH = '/dsh-deckseek/reveal';

/** Request bodies are one path and one id; anything larger is not a request. */
export const MAX_REVEAL_BODY_BYTES = 4096;

/** The slice of the host's workspace registry this route needs. */
export interface WorkspaceRegistry {
  list(): readonly { path: string; sessionIds: readonly string[] }[];
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

const WINDOWS_DRIVE = /^[A-Za-z]:[\\/]/;

/**
 * One comparable absolute form of a path, or undefined when it is not absolute.
 *
 * Lexical only: `.` and `..` are folded here so a traversal is visible to the
 * comparison, and a path that climbs past its own root returns undefined rather
 * than something that merely looks short. Case is NOT folded — callers compare
 * `realpath` output, and the filesystem has already decided the canonical case.
 */
export function normalizeAbsolute(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  const drive = WINDOWS_DRIVE.test(value);
  const unc = value.startsWith('\\\\');
  if (!drive && !unc && !value.startsWith('/')) return undefined;
  const parts: string[] = [];
  for (const part of (drive ? value.slice(2) : value).split(/[\\/]+/)) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (parts.length === 0) return undefined;
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  // A drive keeps its identity; POSIX paths and UNC both reduce to one rooted
  // form, which is enough to compare two paths that came from the same host.
  return `${drive ? `${value.slice(0, 1).toUpperCase()}:` : ''}/${parts.join('/')}`;
}

/**
 * The target when it is `root` itself or lives inside it, otherwise undefined.
 *
 * The boundary is a separator, not a string prefix: `/w/proj2` is not inside
 * `/w/proj`, and that is exactly the bug a naive `startsWith` invites.
 */
export function withinRoot(root: unknown, target: unknown): string | undefined {
  const base = normalizeAbsolute(root);
  const wanted = normalizeAbsolute(target);
  if (base === undefined || wanted === undefined) return undefined;
  if (wanted === base) return wanted;
  return wanted.startsWith(base.endsWith('/') ? base : `${base}/`) ? wanted : undefined;
}

/**
 * How the OS is asked to reveal a file, per platform. `open -R` selects the file
 * in Finder rather than opening it; Explorer has `/select,` for the same.
 *
 * `xdg-open` has no "select" and would OPEN the file, so Linux is deliberately
 * not claimed as supported: revealing is not the same as launching, and this
 * plugin does not get to decide to run a file.
 */
export function systemOpener(platform: string): { command: string; args: (path: string) => readonly string[] } | undefined {
  if (platform === 'darwin') return { command: 'open', args: path => ['-R', path] };
  if (platform === 'win32') return { command: 'explorer.exe', args: path => [`/select,${path}`] };
  return undefined;
}

function respond(res: RevealResponseLike, status: number, body: Record<string, unknown>): void {
  res.statusCode = status;
  res.setHeader?.('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function refusal(res: RevealResponseLike, warn: RevealDeps['warn'], status: number, reason: string): void {
  warn('[dsh-deckseek] reveal refused:', reason);
  respond(res, status, { ok: false, error: reason });
}

/**
 * The route object the host registers. Every dependency is injected so the whole
 * decision can be driven in a test with a fake registry and a recorded spawn —
 * this is the only place in the plugin that runs something, so it is the last
 * place that should be testable only through a running harness.
 */
export function createRevealRoute(deps: RevealDeps): {
  kind: 'exact';
  path: string;
  handler: (req: RevealRequestLike, res: RevealResponseLike) => Promise<void>;
} {
  const handler = async (req: RevealRequestLike, res: RevealResponseLike): Promise<void> => {
    if (req.method !== 'POST') {
      refusal(res, deps.warn, 405, 'the reveal route only accepts POST');
      return;
    }
    let requested: unknown;
    let sessionId: unknown;
    try {
      const body = await deps.readBody(req);
      const parsed = JSON.parse(body) as { sessionId?: unknown; path?: unknown };
      requested = parsed?.path;
      sessionId = parsed?.sessionId;
    } catch (error) {
      refusal(res, deps.warn, 400, `unreadable request body: ${String(error)}`);
      return;
    }
    if (typeof requested !== 'string' || typeof sessionId !== 'string' || requested.length === 0 || sessionId.length === 0) {
      refusal(res, deps.warn, 400, 'the request needs a sessionId and a path');
      return;
    }

    // The root comes from the host's own registry, keyed by the session the
    // caller named. A caller that names no session it owns is refused here, and
    // a caller cannot propose a root at all.
    const registry = deps.registry();
    if (registry === undefined) {
      refusal(res, deps.warn, 403, 'this deployment has no workspace registry to bound the request with');
      return;
    }
    const root = registry.list().find(workspace => workspace.sessionIds.includes(sessionId))?.path;
    if (typeof root !== 'string' || root.length === 0) {
      refusal(res, deps.warn, 403, `session ${sessionId} belongs to no known workspace`);
      return;
    }

    // Resolve both sides before comparing: a symlink inside the workspace that
    // points out of it resolves to the outside path and is then rejected.
    if (!await deps.exists(requested)) {
      refusal(res, deps.warn, 403, 'the requested path does not exist');
      return;
    }
    const realRoot = await deps.realpath(root);
    const realTarget = await deps.realpath(requested);
    const bounded = realRoot === undefined || realTarget === undefined ? undefined : withinRoot(realRoot, realTarget);
    if (bounded === undefined) {
      refusal(res, deps.warn, 403, `the requested path is outside ${root}`);
      return;
    }

    const opener = systemOpener(deps.platform);
    if (opener === undefined) {
      refusal(res, deps.warn, 501, `revealing a file is not supported on ${deps.platform}`);
      return;
    }
    try {
      deps.spawn(opener.command, opener.args(bounded));
    } catch (error) {
      refusal(res, deps.warn, 500, `the opener could not be started: ${String(error)}`);
      return;
    }
    respond(res, 200, { ok: true });
  };
  return { kind: 'exact', path: REVEAL_PATH, handler };
}

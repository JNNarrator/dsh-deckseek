/**
 * The files one turn produced, and which authored tokens in its prose name one
 * of them.
 *
 * Two sources, in that order: the official deliverables the turn carries, and —
 * only when that is empty — a walk of the turn's own successful write calls.
 * The second is a fallback, not a second opinion: a turn that reports its
 * artifacts is believed, because the flow walk can only see calls it recognises.
 *
 * Pure, so the rules are testable without a mount. Ported from upstream
 * `62dbae1`/`66c8cc4` (`src/client/deliverables.ts`), with the copy moved into
 * `locale.ts` and the tool-name set aligned with this repository's own write
 * category (`tool-activity.ts`, `activitySummary`).
 */
import type { TurnLocation } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { MarkdownFileMentions } from './markdown/render.js';
import { inputFields, stringValue, toolIdentity } from './tool-activity.js';
import type { ReaderFlowEntry } from './tool-activity.js';
import { ui } from './locale.js';

/** The file name of a path, with any trailing separator ignored. */
export function basename(path: string): string {
  const normalized = path.replace(/[/\\]+$/, '');
  const at = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
  return at === -1 ? normalized : normalized.slice(at + 1);
}

/** The directory of a path, or `.` when it has none. */
export function dirname(path: string): string {
  const normalized = path.replace(/[/\\]+$/, '');
  const at = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
  return at === -1 ? '.' : normalized.slice(0, at) || '.';
}

/**
 * The produced-files row waits for the turn to close: live writes still
 * accumulate, but a row that appeared mid-turn would claim the work is done
 * while it is still being written.
 */
export function showDeliverablesRow(status: 'open' | 'closed' | 'unknown', paths: readonly string[]): boolean {
  return status === 'closed' && paths.length > 0;
}

/** The tool names this repository classes as writing, plus the editor whose
 *  command decides (a `view` call through it writes nothing). */
const WRITE_TOOLS = /^(write|edit|apply_patch|patch)$/;
const EDITOR_TOOLS = /^(str_replace_editor|str_replace_based_edit_tool)$/;
const EDITOR_WRITES = /^(create|str_replace|insert)$/;
/** Argument names a write call has been seen to put its target under. */
const PATH_FIELDS = ['file_path', 'path', 'filename', 'filePath'] as const;

/** Every unique file path this turn produced, in the order it produced them. */
export function getTurnDeliverables(turn: TurnLocation | undefined, flow?: readonly ReaderFlowEntry[]): readonly string[] {
  const paths: string[] = [];
  const seen = new Set<string>();
  const add = (value: string | undefined): void => {
    const clean = value?.trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    paths.push(clean);
  };

  // The turn's own record first. `produced` is the official shape; anything else
  // is left alone rather than guessed at.
  const reported = (turn?.data as { get(key: string): unknown } | undefined)?.get('deliverables') as { produced?: unknown } | undefined;
  if (Array.isArray(reported?.produced)) {
    for (const item of reported.produced) {
      if (typeof (item as { path?: unknown })?.path === 'string') add((item as { path: string }).path);
    }
  }
  if (paths.length > 0) return paths;

  // Fallback: the write calls that actually succeeded. A failed call wrote
  // nothing, so it names no file.
  for (const item of flow ?? []) {
    if (item.kind !== 'tool' || !item.block) continue;
    if ('isError' in item.block && item.block.isError) continue;
    const { name, raw } = toolIdentity(item);
    const fields = inputFields(raw);
    if (WRITE_TOOLS.test(name)) add(stringValue(fields, ...PATH_FIELDS));
    else if (EDITOR_TOOLS.test(name) && EDITOR_WRITES.test(stringValue(fields, 'command') ?? '')) add(stringValue(fields, 'path'));
  }
  return paths;
}

/**
 * File-mention resolver: an inline code token that names a produced file becomes
 * a control that opens it. A token resolves only when it names one file — an
 * exact path wins, and a bare file name resolves only when exactly one produced
 * path ends in it. An ambiguous or unknown token stays inert code, because
 * opening the wrong file is worse than opening nothing.
 */
export function createProducedFileMentions(paths: readonly string[], openFile: (path: string) => void): MarkdownFileMentions {
  const byBasename = new Map<string, string[]>();
  for (const path of paths) {
    const name = basename(path);
    byBasename.set(name, [...(byBasename.get(name) ?? []), path]);
  }
  return {
    resolve(value: string) {
      if (!value || value.includes('\n')) return undefined;
      const clean = value.trim();
      const exact = paths.includes(clean) ? clean : undefined;
      const matches = exact === undefined ? byBasename.get(basename(clean)) ?? [] : [];
      const path = exact ?? (matches.length === 1 ? matches[0]! : undefined);
      if (path === undefined) return undefined;
      return { open: () => { openFile(path); }, label: ui('deliverable.open', { path }), title: path };
    },
  };
}

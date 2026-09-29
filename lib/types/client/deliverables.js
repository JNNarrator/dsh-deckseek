import { inputFields, stringValue, toolIdentity } from './tool-activity.js';
import { ui } from './locale.js';
/** The file name of a path, with any trailing separator ignored. */
export function basename(path) {
    const normalized = path.replace(/[/\\]+$/, '');
    const at = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
    return at === -1 ? normalized : normalized.slice(at + 1);
}
/** The directory of a path, or `.` when it has none. */
export function dirname(path) {
    const normalized = path.replace(/[/\\]+$/, '');
    const at = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
    return at === -1 ? '.' : normalized.slice(0, at) || '.';
}
/**
 * The produced-files row waits for the turn to close: live writes still
 * accumulate, but a row that appeared mid-turn would claim the work is done
 * while it is still being written.
 */
export function showDeliverablesRow(status, paths) {
    return status === 'closed' && paths.length > 0;
}
/** Chips shown before the rest collapse into a count. */
export const MAX_DELIVERABLE_CHIPS = 8;
/**
 * What the row shows, and how many it does not. The count is the whole point of
 * the cap: a turn that wrote thirty files should say so, not scroll sideways.
 */
export function visibleDeliverables(paths, max = MAX_DELIVERABLE_CHIPS) {
    return paths.length <= max
        ? { shown: paths, hidden: 0 }
        : { shown: paths.slice(0, max), hidden: paths.length - max };
}
/** The tool names this repository classes as writing, plus the editor whose
 *  command decides (a `view` call through it writes nothing). */
const WRITE_TOOLS = /^(write|edit|apply_patch|patch)$/;
const EDITOR_TOOLS = /^(str_replace_editor|str_replace_based_edit_tool)$/;
const EDITOR_WRITES = /^(create|str_replace|insert)$/;
/** Argument names a write call has been seen to put its target under. */
const PATH_FIELDS = ['file_path', 'path', 'filename', 'filePath'];
/** Every unique file path this turn produced, in the order it produced them. */
export function getTurnDeliverables(turn, flow) {
    const paths = [];
    const seen = new Set();
    const add = (value) => {
        const clean = value?.trim();
        if (!clean || seen.has(clean))
            return;
        seen.add(clean);
        paths.push(clean);
    };
    // The turn's own record first. `produced` is the official shape; anything else
    // is left alone rather than guessed at.
    const reported = turn?.data?.get('deliverables');
    if (Array.isArray(reported?.produced)) {
        for (const item of reported.produced) {
            if (typeof item?.path === 'string')
                add(item.path);
        }
    }
    if (paths.length > 0)
        return paths;
    // Fallback: the write calls that actually succeeded. A failed call wrote
    // nothing, so it names no file.
    for (const item of flow ?? []) {
        if (item.kind !== 'tool' || !item.block)
            continue;
        if ('isError' in item.block && item.block.isError)
            continue;
        const { name, raw } = toolIdentity(item);
        const fields = inputFields(raw);
        if (WRITE_TOOLS.test(name))
            add(stringValue(fields, ...PATH_FIELDS));
        else if (EDITOR_TOOLS.test(name) && EDITOR_WRITES.test(stringValue(fields, 'command') ?? ''))
            add(stringValue(fields, 'path'));
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
export function createProducedFileMentions(paths, openFile) {
    const byBasename = new Map();
    for (const path of paths) {
        const name = basename(path);
        byBasename.set(name, [...(byBasename.get(name) ?? []), path]);
    }
    return {
        resolve(value) {
            if (!value || value.includes('\n'))
                return undefined;
            const clean = value.trim();
            const exact = paths.includes(clean) ? clean : undefined;
            const matches = exact === undefined ? byBasename.get(basename(clean)) ?? [] : [];
            const path = exact ?? (matches.length === 1 ? matches[0] : undefined);
            if (path === undefined)
                return undefined;
            return { open: () => { openFile(path); }, label: ui('deliverable.open', { path }), title: path };
        },
    };
}
//# sourceMappingURL=deliverables.js.map
import { executionFacts } from './tool-activity.js';
import { currentLocale, ui, uiIn } from './locale.js';
// Run on structural publication, not on each text delta. Node seats subscribe by key.
export function groupNodes(order, get) {
    const groups = [];
    const seenTurns = new Set();
    for (const key of order) {
        const node = get(key);
        if (!node || node.visibility === 'hidden')
            continue;
        const turn = node.location.kind === 'step' || node.location.kind === 'turn' ? node.location.turn.turn : null;
        const previous = groups.at(-1);
        if (turn !== null && previous?.turn === turn) {
            previous.keys.push(key);
        }
        else {
            groups.push({ key: turn === null ? `node:${key}` : seenTurns.has(turn) ? `turn:${turn}:${key}` : `turn:${turn}`, turn, keys: [key] });
            if (turn !== null)
                seenTurns.add(turn);
        }
    }
    return groups;
}
export function boundaryOf(turn) {
    return {
        status: turn?.status ?? 'unknown',
        reason: turn?.end?.data.reason.kind ?? null,
        latestStep: turn?.steps.at(-1)?.step ?? -1,
        closingStep: turn?.data.get('turn-tail')?.closing?.step ?? null,
    };
}
export function isEarlierNarration(data, boundary) {
    // New body text, a tool call, or a settled step is not a completed turn.
    if (data.status !== 'settled' || boundary.status !== 'closed' || boundary.reason !== 'completed')
        return false;
    if (data.blocks.some(block => block.kind === 'image' || block.kind === 'other'))
        return false;
    return boundary.closingStep !== null && data.step < boundary.closingStep;
}
/** Reading while running must not pin the process open after completion. */
export function processChoiceKey(groupKey, boundary) {
    return `${groupKey}:${boundary.status}:${boundary.reason ?? 'pending'}`;
}
/**
 * @param policy - the work-details level in force.
 * @returns whether a group is flat, folded, or open behind a header.
 */
export function turnStructure(policy) {
    if (!policy.groupProcess)
        return 'flat';
    return policy.foldCompletedTurns ? 'folded' : 'open-header';
}
/** A node that reads as the human (or an external actor) speaking, not as work. */
function isInputNode(node) {
    return node.kind === 'user' || node.kind === 'steering' || node.kind === 'turn-trigger';
}
/**
 * Whether a later visible human input sits inside this turn's process.
 *
 * A reader's own words are not process detail. When the human speaks again while
 * a turn is still producing — a steering correction, a queued instruction, or a
 * scheduled event that wakes the turn again — that input belongs to the turn and
 * must stay readable. Folding it behind the very disclosure it interrupts would
 * hide the reader's words inside their own collapsed work, which is worse than
 * not folding at all.
 *
 * The opening input is excluded: the first input is the turn's premise, already
 * rendered above the fold, so counting it would make every ordinary turn look
 * interleaved and nothing would ever fold.
 *
 * A `turn-trigger` counts as input, matching the harness's own rule — it is the
 * reason the turn (re)started and reads as a message rather than as work.
 *
 * @param keys - the group's node keys, in order.
 * @param get - node lookup by key.
 * @returns whether a visible input other than the opening one is present.
 */
export function hasInterleavedInput(keys, get) {
    const nodes = [];
    for (const key of keys) {
        const node = get(key);
        if (node && node.visibility !== 'hidden')
            nodes.push(node);
    }
    // Scan forward for the first input rather than assuming the group starts with
    // one: a turn whose premise is a trigger does not, and the opening anchor is
    // whichever input comes first.
    const opening = nodes.findIndex(isInputNode);
    if (opening === -1)
        return false;
    return nodes.slice(opening + 1).some(isInputNode);
}
/**
 * Whether a group's process starts open. An explicit reader choice always wins.
 * A flat group has no fold to be closed, and an open-header group starts open
 * regardless of the turn's state; only a folded group closes on completion.
 *
 * A group with interleaved input never starts closed, whatever the level asks
 * for: the fold would swallow the input that interrupted it. That is a
 * correctness floor rather than a presentation policy, so it is not subject to
 * the reader's level (an explicit toggle still wins).
 * @param choice - the reader's stored toggle, when they have touched it.
 * @param boundary - the turn's terminal state.
 * @param policy - the work-details level in force.
 * @param interleaved - whether a later input sits inside this turn's process.
 * @returns whether the process rows are shown.
 */
export function processExpanded(choice, boundary, policy, interleaved = false) {
    if (choice !== undefined)
        return choice;
    const structure = turnStructure(policy);
    if (structure === 'flat' || structure === 'open-header')
        return true;
    if (interleaved)
        return true;
    return !(boundary.status === 'closed' && boundary.reason === 'completed');
}
/** A body-only assistant step is not a thinking/process disclosure. */
export function hasProcessContent(node, boundary) {
    if (!node || node.visibility === 'hidden')
        return false;
    if (node.kind === 'assistant-step') {
        const data = node.data;
        return data.blocks.some(block => block.kind === 'reasoning' && block.text.trim() !== '')
            || (isEarlierNarration(data, boundary) && hasVisibleBody(data.blocks));
    }
    // A turn-trigger is process content in the reading view's sense even though
    // the harness treats it as turn-independent: it is the evidence for why the
    // turn happened, and the reading view only folds process detail it can
    // summarize. A trigger cannot be summarized out of its own body, so it is
    // listed here rather than left to fall into the fold.
    return node.kind === 'context' || node.kind === 'model-retry'
        || node.kind === 'turn-trigger'
        || node.kind === 'command' || node.kind === 'manual-compaction';
}
export function hasVisibleBody(blocks) {
    return blocks.some(block => block.kind === 'image' || block.kind === 'other' || (block.kind === 'text' && block.text.trim() !== ''));
}
/** Keep native block order. In particular, never lift a later Think above text. */
export function assistantSegments(blocks) {
    const segments = [];
    let previous;
    blocks.forEach((block, index) => {
        if (block.kind === 'tool-call') {
            previous = undefined;
            return;
        }
        const kind = block.kind === 'reasoning' ? 'reasoning' : 'body';
        if (previous?.kind === kind)
            previous.blocks.push(block);
        else {
            previous = { kind, start: index, blocks: [block] };
            segments.push(previous);
        }
    });
    return segments;
}
export function toolFailed(block) {
    const { exitCode, signal } = executionFacts(block);
    return ('kind' in block && block.isError) || !!signal || (exitCode !== undefined && exitCode !== 0) || block.subCalls.some(toolFailed);
}
export function toolName(block) {
    return 'kind' in block ? block.call?.name ?? ui('tool.others') : block.name;
}
export function terminalLabel(reason, lang = currentLocale()) {
    switch (reason) {
        case 'completed': return null;
        case 'aborted':
        case 'interrupted': return uiIn(lang, 'terminal.stopped');
        case 'blocked': return uiIn(lang, 'terminal.blocked');
        case 'max-tokens': return uiIn(lang, 'terminal.maxTokens');
        case 'error': return uiIn(lang, 'terminal.error');
        case null: return null;
        default: return uiIn(lang, 'terminal.unknown', { reason });
    }
}
//# sourceMappingURL=projection.js.map
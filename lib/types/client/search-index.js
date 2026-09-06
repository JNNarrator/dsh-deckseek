function contentText(content) {
    return content
        .map(item => item.type === 'text' && typeof item.text === 'string'
        ? item.text
        : '')
        .filter(Boolean)
        .join('\n\n');
}
function blocksText(blocks) {
    return blocks
        .filter((block) => block.kind === 'text')
        .map(block => block.text)
        .join('\n\n');
}
function turnOf(node) {
    const location = node.location;
    if (location.kind === 'turn' || location.kind === 'step')
        return location.turn.turn;
    return undefined;
}
/** Collect searchable user/assistant text from a chat snapshot, in display order. */
export function buildSearchIndex(order, get) {
    const entries = [];
    for (const key of order) {
        const node = get(key);
        if (!node || node.visibility === 'hidden')
            continue;
        if (node.kind === 'user' || node.kind === 'steering') {
            const content = node.data.content ?? [];
            const text = contentText(content);
            if (text.trim())
                entries.push({ key, kind: 'user', text, turn: turnOf(node) });
        }
        else if (node.kind === 'assistant-step') {
            const blocks = node.data.blocks ?? [];
            const text = blocksText(blocks);
            if (text.trim())
                entries.push({ key, kind: 'assistant', text, turn: turnOf(node) });
        }
    }
    return entries;
}
const SNIPPET_RADIUS = 24;
/** Case-insensitive substring matches with a snippet around the first hit. */
export function searchMatches(entries, query) {
    const needle = query.trim().toLowerCase();
    if (!needle)
        return [];
    const matches = [];
    for (const entry of entries) {
        const haystack = entry.text.toLowerCase();
        let count = 0;
        let first = -1;
        let from = 0;
        for (;;) {
            const index = haystack.indexOf(needle, from);
            if (index === -1)
                break;
            if (first === -1)
                first = index;
            count += 1;
            from = index + needle.length;
        }
        if (count === 0)
            continue;
        const start = Math.max(0, first - SNIPPET_RADIUS);
        const end = Math.min(entry.text.length, first + needle.length + SNIPPET_RADIUS);
        const snippet = entry.text.slice(start, end).replace(/\s+/g, ' ').trim();
        matches.push({ key: entry.key, count, snippet });
    }
    return matches;
}
//# sourceMappingURL=search-index.js.map
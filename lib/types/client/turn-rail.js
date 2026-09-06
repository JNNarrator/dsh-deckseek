function promptOf(node) {
    if (!node || (node.kind !== 'user' && node.kind !== 'steering'))
        return '';
    const content = node.data.content ?? [];
    return content
        .map(item => item.type === 'text' && typeof item.text === 'string'
        ? item.text
        : '')
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Right-rail rows for every user/steering message in display order: one row
 * per message with the message text as its title. Long titles are trimmed;
 * the row itself ellipsizes within the rail.
 */
export function buildRailItems(order, get) {
    const items = [];
    for (const key of order) {
        const node = get(key);
        if (!node || node.visibility === 'hidden')
            continue;
        if (node.kind !== 'user' && node.kind !== 'steering')
            continue;
        const turn = node.location.kind === 'turn' || node.location.kind === 'step' ? node.location.turn.turn : null;
        const label = promptOf(node);
        items.push({ key, turn, label: label.length > 64 ? `${label.slice(0, 63)}…` : label });
    }
    return items;
}
//# sourceMappingURL=turn-rail.js.map
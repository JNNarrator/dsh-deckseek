import { ui } from './locale.js';
/**
 * Markdown export for the reading view: user prompts and assistant answers in
 * display order, extracted with the same walk the search index uses — so the
 * file mirrors what the reading view shows, with the folded process (tools,
 * reasoning, compactions) left out and only the answer text kept.
 */
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
export function buildExportMarkdown(order, get, now = new Date()) {
    const sections = [];
    // Assistant steps stream in pieces (narration, then the final answer): run
    // them together under one heading so a single turn exports as one answer.
    let lastLabel = null;
    const push = (label, text) => {
        const trimmed = text.trim();
        if (!trimmed)
            return;
        if (lastLabel === label && sections.length > 0)
            sections[sections.length - 1] += `\n\n${trimmed}`;
        else
            sections.push(`## ${label}\n\n${trimmed}`);
        lastLabel = label;
    };
    for (const key of order) {
        const node = get(key);
        if (!node || node.visibility === 'hidden')
            continue;
        if (node.kind === 'user' || node.kind === 'steering') {
            const content = node.data.content ?? [];
            push(node.kind === 'steering' ? ui('export.steering') : ui('export.user'), contentText(content));
        }
        else if (node.kind === 'assistant-step') {
            const blocks = node.data.blocks ?? [];
            push(ui('export.assistant'), blocksText(blocks));
        }
    }
    const pad = (value) => String(value).padStart(2, '0');
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    return [`# ${ui('export.heading')} · ${stamp}`, ...sections].join('\n\n');
}
/** Download filename for the export, safe across filesystems (no separators). */
export function exportFileName(now = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    return `deckseek-export-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.md`;
}
//# sourceMappingURL=export.js.map
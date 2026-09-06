import { currentLocale, uiIn } from './locale.js';
/** Public Step data includes tool-only model output before a chat node exists. */
export function readerFlow(group, turn, get) {
    const flow = [];
    const calls = new Map();
    const assistantOrder = new Map();
    for (const key of group.keys) {
        const node = get(key);
        if (!node || node.visibility === 'hidden')
            continue;
        const step = node.location.kind === 'step' ? node.location.step.step : 0;
        if (node.kind === 'tool-call') {
            const block = node.data.root;
            calls.set(block.callId, { kind: 'tool', key: `reader-tool:${block.callId}`, callId: block.callId, step, block, order: node.anchorSeq });
        }
        else {
            flow.push({ kind: 'node', key, nodeKey: key, order: node.anchorSeq });
            if (node.kind === 'assistant-step')
                assistantOrder.set(step, node.anchorSeq);
        }
    }
    for (const step of turn?.steps ?? []) {
        const data = step.data.get('assistant-step');
        let index = 0;
        for (const draft of data?.blocks ?? []) {
            if (draft.kind !== 'tool-call' || !draft.callId)
                continue;
            const previous = calls.get(draft.callId);
            calls.set(draft.callId, previous ? { ...previous, draft } : {
                kind: 'tool', key: `reader-tool:${draft.callId}`, callId: draft.callId, step: step.step, draft,
                order: (assistantOrder.get(step.step) ?? step.start?.seq ?? 0) + .01 + index++ / 10000,
            });
        }
    }
    flow.push(...calls.values());
    return flow.sort((left, right) => left.order - right.order);
}
export function objectValue(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : null;
}
export function stringValue(record, ...keys) {
    for (const key of keys)
        if (typeof record?.[key] === 'string' && record[key])
            return record[key];
    return undefined;
}
/** Read only top-level JSON string values, including an unfinished final string.
 * This never executes input or mistakes escaped/nested content for a path field. */
export function inputFields(raw) {
    try {
        return objectValue(JSON.parse(raw)) ?? {};
    }
    catch { /* an in-flight argument is normally incomplete */ }
    const fields = Object.create(null);
    const prefix = raw.slice(0, 262144);
    let depth = 0;
    let key;
    for (let index = 0; index < prefix.length; index++) {
        const char = prefix[index];
        if (char === '{' || char === '[') {
            depth++;
            continue;
        }
        if (char === '}' || char === ']') {
            depth--;
            continue;
        }
        if (char !== '"')
            continue;
        const start = index;
        let closed = false;
        for (index++; index < prefix.length; index++) {
            if (prefix[index] === '\\') {
                index++;
                continue;
            }
            if (prefix[index] === '"') {
                closed = true;
                break;
            }
        }
        if (depth !== 1)
            continue;
        const token = prefix.slice(start, closed ? index + 1 : prefix.length);
        let value;
        try {
            value = JSON.parse(token);
        }
        catch {
            if (closed)
                continue;
            // Strip only an unfinished trailing escape/unicode escape, not content.
            let body = token.slice(1);
            const unicode = /(?<!\\)(?:\\\\)*\\u[\da-f]{0,3}$/i.exec(body);
            if (unicode)
                body = body.slice(0, unicode.index) + unicode[0].replace(/\\u[\da-f]{0,3}$/i, '');
            let slashes = 0;
            for (let end = body.length - 1; end >= 0 && body[end] === '\\'; end--)
                slashes++;
            if (slashes % 2)
                body = body.slice(0, -1);
            try {
                value = JSON.parse(`"${body}"`);
            }
            catch {
                continue;
            }
        }
        if (closed && /^\s*:/.test(prefix.slice(index + 1)))
            key = value;
        else if (key !== undefined) {
            fields[key] = value;
            key = undefined;
        }
    }
    return fields;
}
export function toolIdentity(entry) {
    const block = entry.block;
    return {
        name: block ? 'kind' in block ? block.call?.name ?? entry.draft?.name ?? '工具调用' : block.name : entry.draft?.name ?? '工具调用',
        raw: block ? 'kind' in block ? block.call?.argsRaw ?? entry.draft?.argsRaw ?? '' : block.argsRaw : entry.draft?.argsRaw ?? '',
    };
}
export function executionFacts(block) {
    if (!block || !('kind' in block))
        return {};
    const meta = objectValue(block.meta);
    const code = meta?.exitCode ?? meta?.exit_code;
    const text = block.content.length === 1 && block.content[0]?.type === 'text' ? block.content[0].text : '';
    const exit = /\n\[exit code: (\d+)\]$/.exec(text);
    const signal = /\n\[killed by signal: ([^\]\n]+)\]$/.exec(text);
    const parsedCode = exit?.[1] === undefined ? undefined : Number(exit[1]);
    return {
        exitCode: typeof code === 'number' && Number.isFinite(code) ? code : parsedCode,
        signal: stringValue(meta, 'signal') ?? signal?.[1],
    };
}
export function activityPhase(entry, turnClosed = false) {
    if (!entry.block)
        return turnClosed ? 'interrupted' : 'preparing';
    if (!('kind' in entry.block))
        return turnClosed ? 'interrupted' : 'running';
    const facts = executionFacts(entry.block);
    if (entry.block.isError || facts.signal || (facts.exitCode !== undefined && facts.exitCode !== 0)
        || entry.block.subCalls.some(block => activityPhase({ block }, turnClosed) === 'failed'))
        return 'failed';
    if (facts.exitCode === 0)
        return 'succeeded';
    return 'returned';
}
export function activitySummary(entry, lang = currentLocale()) {
    const { name, raw } = toolIdentity(entry);
    const args = inputFields(raw);
    const target = stringValue(args, 'file_path', 'path', 'filename', 'filePath');
    const command = stringValue(args, 'command', 'cmd', 'script');
    const description = stringValue(args, 'description');
    const file = target?.split(/[/\\]/).at(-1);
    const category = /^(write|edit|apply_patch|patch|str_replace_editor)$/.test(name) ? 'write'
        : /^(read|read_file)$/.test(name) ? 'read'
            : /^(bash|shell|terminal|terminal_send|exec_command|pwsh)$/.test(name) ? 'terminal'
                : /^(grep|glob|find|search)$/.test(name) ? 'search'
                    : /^(web_search|web_fetch|web_open)$/.test(name) ? 'web' : 'other';
    const title = category === 'write' ? `${name === 'write' ? uiIn(lang, 'tool.write') : uiIn(lang, 'tool.edit')}${file ? ` ${file}` : name === 'apply_patch' ? uiIn(lang, 'tool.patch') : uiIn(lang, 'tool.file')}`
        : category === 'read' ? `${uiIn(lang, 'tool.read')}${file ? ` ${file}` : uiIn(lang, 'tool.file')}`
            : category === 'terminal' ? description || uiIn(lang, 'tool.runCommand')
                : category === 'search' ? name === 'glob' ? uiIn(lang, 'tool.findFiles') : uiIn(lang, 'tool.searchContent')
                    : category === 'web' ? name === 'web_search' ? uiIn(lang, 'tool.searchWeb') : uiIn(lang, 'tool.readWeb')
                        : name;
    return { name, raw, args, category, title, target: target ?? command ?? stringValue(args, 'query', 'pattern', 'url'), command,
        cwd: stringValue(args, 'workdir', 'cwd'), content: stringValue(args, 'content', 'new_string', 'newText', 'file_text') };
}
export function preparingLabel(name, lang = currentLocale()) {
    return /^(write|edit|apply_patch)$/.test(name) ? uiIn(lang, 'tool.prepareWrite') : /^(bash|shell|exec_command|pwsh)$/.test(name) ? uiIn(lang, 'tool.prepareTerminal') : uiIn(lang, 'tool.prepareInput');
}
/** First non-empty text payload of a failed tool result, clamped for inline preview. */
export function toolFailureText(block) {
    if (!('kind' in block) || !Array.isArray(block.content))
        return null;
    for (const item of block.content) {
        if (item.type !== 'text')
            continue;
        const text = item.text.trim().replace(/\n\[(?:exit code|killed by signal)[^\n]*\]$/, '').trim();
        if (text)
            return text.length > 240 ? `${text.slice(0, 239)}…` : text;
    }
    return null;
}
/** One-line failure summary for a failed tool row: name, exit code, signal. */
export function toolFailureLine(block, lang = currentLocale()) {
    const facts = executionFacts(block);
    const parts = [toolIdentity({ block }).name];
    if (facts.exitCode !== undefined)
        parts.push(uiIn(lang, 'failure.exitCode', { code: facts.exitCode }));
    if (facts.signal)
        parts.push(uiIn(lang, 'failure.signal', { signal: facts.signal }));
    return parts.join(' · ');
}
/** Category-aware tool state label: start (preparing/running) and end (succeeded/returned) per tool family. */
export function toolStateLabel(category, phase, lang = currentLocale()) {
    if (phase === 'preparing' || phase === 'running')
        return uiIn(lang, `tool.state.${category}Running`);
    if (phase === 'succeeded' || phase === 'returned')
        return uiIn(lang, `tool.state.${category}Done`);
    if (phase === 'failed')
        return uiIn(lang, 'tool.phaseFailed');
    if (phase === 'interrupted')
        return uiIn(lang, 'tool.phaseInterrupted');
    return uiIn(lang, 'tool.state.otherRunning');
}
//# sourceMappingURL=tool-activity.js.map
import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { DiffBlock, DisclosureRow, JsonTree, ReadBlock, SearchBlock, TerminalBlock, WebBlock, IconApiOutline14, IconBrowseOutline16, IconEditOutline16, IconSearchOutline16, IconSkillOutline16, IconSparkle16 } from '@deepseek-ai/dsh-client-ui-primitives';
import { Blocks, contentBlocks } from './Blocks.js';
import { ProcessFragment } from './motion.js';
import { activityPhase, activitySummary, diffStat, executionFacts, objectValue, toolFailureLine, toolFailureText, toolStateLabel } from './tool-activity.js';
import { classifyTool, toolRowModel, VARIANT_TITLES } from './native/tool-call-model.js';
import { McpAppFrame, StreamingMcpAppPlaceholder } from './McpAppFrame.js';
import { diffBlockLabels, jsonTreeLabels, readBlockLabels, searchBlockLabels, terminalBlockLabels, webBlockLabels } from './primitive-labels.js';
import { currentLocale, ui } from './locale.js';
import { FailureCard } from './FailureCard.js';
import css from './Reader.module.css';
const ICONS = { write: IconEditOutline16, read: IconBrowseOutline16, terminal: IconApiOutline14, search: IconSearchOutline16, web: IconSearchOutline16, other: IconSparkle16 };
const number = new Intl.NumberFormat(currentLocale() === 'zh' ? 'zh-CN' : 'en-US');
const language = (path) => path?.split('.').at(-1);
const duration = (ms) => ms < 1000 ? ui('tool.durationMs', { count: Math.round(ms) }) : ui('tool.durationSeconds', { count: (ms / 1000).toFixed(ms < 10000 ? 1 : 0) });
function generatedInput(content, target, preparing) {
    const lines = content.split('\n').map((text, index) => ({ number: index + 1, text }));
    const visible = preparing ? lines.slice(-12) : lines.slice(0, 1600);
    return _jsxs("div", { "data-reader-tool-file": true, children: [_jsxs("p", { className: css.toolDetailNote, children: [preparing ? ui('tool.inputGenerating') : ui('tool.fileContent'), !preparing && lines.length > visible.length ? ui('tool.previewSuffix') : ''] }), _jsx(ReadBlock, { label: target ?? ui('tool.fileContentLabel'), lang: language(target), lines: visible, totalLines: lines.length, maxLines: 16, labels: readBlockLabels })] });
}
function InputView({ model, preparing }) {
    if ((model.name === 'render_ui' || model.name === 'show_widget') && typeof model.args?.html === 'string') {
        return preparing
            ? _jsx(StreamingMcpAppPlaceholder, { title: typeof model.args.title === 'string' ? model.args.title : undefined })
            : _jsx(McpAppFrame, { html: model.args.html, title: typeof model.args.title === 'string' ? model.args.title : undefined });
    }
    if (model.content)
        return generatedInput(model.content, model.target, preparing);
    if (model.command)
        return _jsxs("div", { "data-reader-tool-terminal": true, children: [_jsx("p", { className: css.toolDetailNote, children: preparing ? ui('tool.commandGenerating') : ui('tool.commandSubmitted') }), _jsx(TerminalBlock, { command: model.command, cwd: model.cwd, labels: terminalBlockLabels })] });
    return _jsx(JsonTree, { data: model.args, label: preparing ? ui('tool.inputFieldsReceived') : ui('tool.rawInput'), labels: jsonTreeLabels });
}
function readLines(value) {
    if (!Array.isArray(value))
        return null;
    const lines = [];
    for (const item of value) {
        const row = objectValue(item);
        if (typeof row?.number !== 'number' || !Number.isInteger(row.number) || typeof row.text !== 'string')
            return null;
        lines.push({ number: row.number, text: row.text });
    }
    return lines;
}
function diffHunks(value) {
    if (!Array.isArray(value) || value.length === 0)
        return null;
    const diffs = [];
    for (const item of value) {
        const row = objectValue(item);
        if (typeof row?.path !== 'string' || (row.oldText !== null && typeof row.oldText !== 'string') || typeof row.newText !== 'string')
            return null;
        diffs.push({ path: row.path, oldText: row.oldText, newText: row.newText });
    }
    return diffs;
}
function searchFiles(value) {
    if (!Array.isArray(value))
        return null;
    const files = [];
    for (const item of value) {
        const row = objectValue(item);
        if (typeof row?.path !== 'string' || !Array.isArray(row.matches))
            return null;
        const matches = [];
        for (const itemMatch of row.matches) {
            const match = objectValue(itemMatch);
            if (typeof match?.lineNumber !== 'number' || !Number.isInteger(match.lineNumber) || typeof match.line !== 'string')
                return null;
            matches.push({ lineNumber: match.lineNumber, line: match.line });
        }
        files.push({ path: row.path, matches });
    }
    return files;
}
function ResultView({ entry, model, phase, ...render }) {
    if ((model.name === 'render_ui' || model.name === 'show_widget') && typeof model.args?.html === 'string') {
        return _jsx(McpAppFrame, { html: model.args.html, title: typeof model.args.title === 'string' ? model.args.title : undefined });
    }
    // The failure card above already carries the message and raw record; do not
    // render the same error text a second time inside the result panel.
    if (phase === 'failed')
        return _jsx("p", { className: css.toolDetailNote, children: ui('tool.failureShown') });
    const block = entry.block;
    if (!block || !('kind' in block))
        return _jsxs(_Fragment, { children: [_jsx("p", { className: css.toolDetailNote, children: phase === 'interrupted' ? ui('tool.interruptedNoResult') : phase === 'preparing' ? ui('tool.generatingInputNotStarted') : ui('tool.startedWaitingResult') }), _jsx(InputView, { model: model, preparing: phase === 'preparing' })] });
    const meta = objectValue(block.meta);
    const text = block.content.filter(item => item.type === 'text').map(item => item.text).join('\n');
    if (model.category === 'terminal') {
        const facts = executionFacts(block);
        const output = text.replace(/\n\[(?:exit code: \d+|killed by signal: [^\]\n]+)\]$/, '');
        return _jsx("div", { "data-reader-tool-terminal": true, children: _jsx(TerminalBlock, { command: model.command ?? model.name, cwd: model.cwd, output: output, exitCode: facts.exitCode, signal: facts.signal, maxLines: 18, labels: terminalBlockLabels }) });
    }
    const lines = readLines(meta?.lines);
    if (model.category === 'read' && typeof meta?.path === 'string' && typeof meta.totalLines === 'number' && lines)
        return _jsx("div", { "data-reader-tool-file": true, children: _jsx(ReadBlock, { label: meta.path, lang: typeof meta.lang === 'string' ? meta.lang : undefined, lines: lines, totalLines: meta.totalLines, maxLines: 18, labels: readBlockLabels }) });
    const diffs = diffHunks(meta?.diffs);
    if (model.category === 'write' && diffs)
        return _jsx("div", { "data-reader-tool-diff": true, children: _jsx(DiffBlock, { diffs: diffs, maxLines: 18, labels: diffBlockLabels }) });
    if (model.category === 'search' && typeof meta?.total === 'number' && typeof meta.truncated === 'boolean') {
        if (meta.shape === 'paths' && Array.isArray(meta.paths) && meta.paths.every((path) => typeof path === 'string'))
            return _jsx("div", { "data-reader-tool-search": true, children: _jsx(SearchBlock, { kind: "paths", paths: meta.paths, total: meta.total, truncated: meta.truncated, maxLines: 18, labels: searchBlockLabels }) });
        const files = searchFiles(meta.files);
        if (meta.shape === 'matches' && files)
            return _jsx("div", { "data-reader-tool-search": true, children: _jsx(SearchBlock, { kind: "matches", files: files, total: meta.total, truncated: meta.truncated, maxLines: 18, labels: searchBlockLabels }) });
    }
    if (model.category === 'web' && typeof meta?.truncated === 'boolean') {
        if (model.name === 'web_fetch' && typeof meta.url === 'string' && typeof meta.statusCode === 'number')
            return _jsx("div", { "data-reader-tool-web": true, children: _jsx(WebBlock, { kind: "fetch", url: meta.url, statusCode: meta.statusCode, truncated: meta.truncated, labels: webBlockLabels }) });
        if (model.name === 'web_search' && Array.isArray(meta.sources)) {
            const sources = meta.sources.flatMap(source => {
                const item = objectValue(source);
                return typeof item?.url === 'string' ? [{ url: item.url, ...(typeof item.title === 'string' ? { title: item.title } : {}), ...(typeof item.snippet === 'string' ? { snippet: item.snippet } : {}), ...(typeof item.publishedAt === 'string' ? { publishedAt: item.publishedAt } : {}) }] : [];
            });
            if (sources.length === meta.sources.length)
                return _jsx("div", { "data-reader-tool-web": true, children: _jsx(WebBlock, { kind: "search", sources: sources, answer: typeof meta.answer === 'string' ? meta.answer : undefined, truncated: meta.truncated, labels: webBlockLabels }) });
        }
    }
    // A trace/export may omit wire presentation. Keep the generated input clearly
    // labelled; it is not proof of an applied diff or a successful file mutation.
    if (model.category === 'write' && model.content && !block.isError)
        return _jsxs(_Fragment, { children: [_jsx("p", { className: css.toolDetailNote, children: ui('tool.detailReturned') }), generatedInput(model.content, model.target, false)] });
    const content = block.content;
    if (content.some(item => item.type === 'text'))
        return _jsx("div", { className: css.toolDocument, children: _jsx(Blocks, { ...render, blocks: contentBlocks(content).filter(item => item.kind === 'text'), source: "tool" }) });
    if (content.length)
        return _jsx("p", { className: css.toolDetailNote, children: ui('tool.detailMedia') });
    return _jsx("p", { className: css.toolDetailNote, children: ui('tool.detailEmpty') });
}
/** One occurrence, keyed by call id all the way from generation to result. */
export const ToolActivity = memo(function ToolActivityView({ entry, motion, turnClosed, onRead, depth = 0, ...render }) {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState('result');
    const control = useRef(null);
    const panel = useRef(null);
    const [selected, setSelected] = useState(false);
    const detailId = useId();
    const tabRefs = useRef([]);
    const model = useMemo(() => activitySummary(entry), [entry.block, entry.draft]);
    const phase = activityPhase(entry, turnClosed);
    const heldPreview = useRef({ entry, model, phase });
    if (!selected)
        heldPreview.current = { entry, model, phase };
    const preview = heldPreview.current;
    useEffect(() => {
        const track = () => {
            const selection = document.getSelection();
            setSelected(!!selection && !selection.isCollapsed && !!selection.anchorNode && !!panel.current?.contains(selection.anchorNode));
        };
        document.addEventListener('selectionchange', track);
        return () => document.removeEventListener('selectionchange', track);
    }, []);
    const facts = executionFacts(entry.block);
    const Icon = model.name === 'skill' ? IconSkillOutline16 : ICONS[model.category];
    const block = entry.block;
    const native = block ? toolRowModel(model.name, block) : null;
    // "+N -M" line changes for write/edit rows, from the settled diff record.
    const delta = useMemo(() => {
        const settled = entry.block;
        if (!settled || !('kind' in settled))
            return null;
        const hunks = diffHunks(objectValue(settled.meta)?.diffs);
        return hunks ? diffStat(hunks) : null;
    }, [entry.block]);
    const skillName = typeof model.args?.name === 'string' ? model.args.name.split('\n')[0] : model.raw.split('\n')[0];
    const rowTitle = model.name === 'skill' ? 'Skill' : native?.title ?? VARIANT_TITLES[classifyTool(model.name)];
    const rowSummary = model.name === 'skill' ? skillName : native?.errorSummary ?? native?.summary
        ?? (classifyTool(model.name) === 'others' ? `${model.name} · ${model.target ?? model.title}` : model.target ?? model.title);
    // Both start and end states are shown per tool family (阅读中/已阅读, 搜索中/已找到…).
    const showState = phase === 'preparing' || phase === 'running' || phase === 'succeeded' || phase === 'returned' || phase === 'failed' || phase === 'interrupted';
    const elapsed = block && 'kind' in block && block.callTime != null ? Math.max(0, block.time - block.callTime) : null;
    const rawResult = useMemo(() => {
        const value = preview.entry.block;
        return value && 'kind' in value ? JSON.stringify({ content: value.content, isError: value.isError, meta: value.meta }, null, 2) : '';
    }, [preview.entry.block]);
    const tabs = [['result', phase === 'preparing' ? ui('tool.tabPreview') : ui('tool.tabResult')], ['input', ui('tool.tabInput')], ['raw', ui('tool.tabRaw')]];
    const activate = (index) => { const item = tabs[(index + tabs.length) % tabs.length]; setTab(item[0]); tabRefs.current[(index + tabs.length) % tabs.length]?.focus(); };
    if (depth > 6)
        return _jsx("p", { className: css.meta, children: ui('tool.nestedHint') });
    return _jsxs("div", { ref: element => { control.current = element?.querySelector('[data-disclosure-row]') ?? null; }, className: css.toolActivity, "data-reader-tool-call": entry.callId, "data-tool-phase": phase, "data-tool-args-length": model.raw.length, "data-tool-category": model.category, "data-expanded": open, "data-ud-check": "reader-tool-activity", children: [_jsx(DisclosureRow, { icon: _jsx(Icon, { size: 14 }), title: rowTitle, open: open, expandable: true, expandOnRowClick: true, keepContentWhenOpen: true, onToggle: () => { onRead(); setOpen(value => !value); }, rowClassName: css.nativeToolRow, collapsedContent: _jsxs(_Fragment, { children: [_jsx("span", { className: css.rowSeparator, "aria-hidden": true }), _jsx("span", { className: css.nativeToolSummary, title: rowSummary, "data-reader-tool-summary": true, children: rowSummary }), delta && _jsxs("span", { className: css.toolDelta, "data-reader-tool-delta": true, children: ["+", delta.added, " -", delta.removed] }), showState && _jsx("span", { className: css.toolState, "data-phase": phase, children: toolStateLabel(model.category, phase) })] }) }), _jsx(ProcessFragment, { open: open, motion: motion, onRead: onRead, returnFocusTo: control, nodeKey: `${entry.key}:detail`, framed: true, children: _jsxs("div", { id: detailId, className: css.toolDetails, children: [_jsxs("div", { className: css.toolLedger, "aria-live": "off", children: [_jsxs("span", { children: [ui('tool.ledgerTitle'), _jsx("span", { className: css.toolEngine, children: model.name })] }), _jsx("span", { "data-reader-tool-progress": true, children: phase === 'preparing' ? ui('tool.receivedChars', { count: number.format(model.raw.length) }) : phase === 'running' ? ui('tool.submittedWaiting') : phase === 'interrupted' ? ui('tool.stoppedInputKept') : elapsed !== null ? ui('tool.ranFor', { duration: duration(elapsed) }) : ui('tool.resultRecorded') }), facts.exitCode !== undefined && _jsx("span", { children: ui('failure.exitCode', { code: facts.exitCode }) }), facts.signal && _jsx("span", { children: ui('failure.signal', { signal: facts.signal }) })] }), _jsx("div", { className: css.toolTabs, role: "tablist", "aria-label": ui('tool.tabsAria', { title: model.title }), onKeyDown: event => {
                                const index = tabs.findIndex(item => item[0] === tab);
                                if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                                    event.preventDefault();
                                    activate(index + (event.key === 'ArrowRight' ? 1 : -1));
                                }
                                else if (event.key === 'Home' || event.key === 'End') {
                                    event.preventDefault();
                                    activate(event.key === 'Home' ? 0 : tabs.length - 1);
                                }
                            }, children: tabs.map(([id, title], index) => _jsx("button", { ref: element => { tabRefs.current[index] = element; }, type: "button", role: "tab", id: `${detailId}-${id}`, "aria-selected": tab === id, "aria-controls": `${detailId}-panel`, tabIndex: tab === id ? 0 : -1, onClick: () => setTab(id), children: title }, id)) }), _jsxs("div", { ref: panel, id: `${detailId}-panel`, className: css.toolPanel, role: "tabpanel", "aria-labelledby": `${detailId}-${tab}`, tabIndex: 0, children: [selected && _jsx("p", { className: css.toolDetailNote, children: ui('tool.selectionPaused') }), tab === 'result' && _jsx(ResultView, { ...render, ...preview }), tab === 'input' && _jsxs(_Fragment, { children: [_jsx(InputView, { model: preview.model, preparing: preview.phase === 'preparing' }), _jsxs("details", { className: css.detail, children: [_jsx("summary", { children: ui('tool.allInputFields') }), _jsx(JsonTree, { data: preview.model.args, label: ui('tool.inputFieldsLabel'), labels: jsonTreeLabels })] })] }), tab === 'raw' && _jsxs(_Fragment, { children: [_jsx("p", { className: css.toolDetailNote, children: ui('tool.rawNotice') }), _jsx("h4", { className: css.toolRawLabel, children: ui('tool.rawInput') }), _jsx("pre", { className: css.toolRaw, children: preview.model.raw || ui('tool.inputPending') }), rawResult && _jsxs(_Fragment, { children: [_jsx("h4", { className: css.toolRawLabel, children: ui('tool.rawResult') }), _jsx("pre", { className: css.toolRaw, children: rawResult })] })] })] })] }) }), !!block?.subCalls.length && _jsx("div", { className: css.toolChildren, "aria-label": ui('tool.subcalls'), children: block.subCalls.map((child, index) => _jsx(ToolActivity, { ...render, entry: { kind: 'tool', key: `reader-tool:${child.callId}`, callId: child.callId, step: entry.step, order: index, block: child }, motion: motion, turnClosed: turnClosed, onRead: onRead, depth: depth + 1 }, child.callId)) })] });
}, (previous, next) => previous.entry.callId === next.entry.callId && previous.entry.block === next.entry.block
    && previous.entry.draft === next.entry.draft && previous.entry.step === next.entry.step
    && previous.motion === next.motion && previous.turnClosed === next.turnClosed && previous.depth === next.depth
    && previous.onRead === next.onRead && previous.renderSlotChain === next.renderSlotChain && previous.loadImage === next.loadImage);
/** Media and failures never disappear inside a folded execution record. */
export function ToolMedia({ block, depth = 0, ...render }) {
    if (depth > 6)
        return null;
    const settled = 'kind' in block;
    const failed = activityPhase({ block }) === 'failed';
    // Text results stay inside the folded record (terminal / document panel) and
    // the failure card; rendering them here collapsed newlines into paragraph
    // walls and duplicated the record. Only media repeats outside the fold.
    const visible = settled ? contentBlocks(block.content).filter(item => item.kind === 'image' || item.kind === 'other') : [];
    return _jsxs(_Fragment, { children: [failed && _jsx(FailureCard, { title: ui('failure.toolTitle'), message: toolFailureLine(block), detail: toolFailureText(block) ?? undefined, raw: 'kind' in block ? { content: block.content, isError: block.isError, meta: block.meta } : undefined }), visible.length > 0 && _jsx(Blocks, { ...render, blocks: visible, source: "tool" }), block.subCalls.map(child => _jsx(ToolMedia, { ...render, block: child, depth: depth + 1 }, child.callId))] });
}
//# sourceMappingURL=ToolActivity.js.map
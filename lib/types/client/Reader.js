import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Fragment, memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { JsonBlock, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives';
import { BlockBoundary, Blocks, contentBlocks, CopyAnswer } from './Blocks.js';
import { ReasoningCard } from './ReasoningCard.js';
import { ToolActivity, ToolMedia } from './ToolActivity.js';
import { UnknownRecord } from './UnknownRecord.js';
import { SystemPromptRow, TurnProcessMeta, TurnTailStats } from './TurnRecords.js';
import { FailureCard } from './FailureCard.js';
import { ui } from './locale.js';
import { readerFlow } from './tool-activity.js';
import { Disclosure, ProcessFragment, RetiringContent, StatusText, useMotionAllowed, usePinnedSelection, useReadingPosition, useReadingScroll } from './motion.js';
import { buildSearchIndex } from './search-index.js';
import { SearchPanel } from './SearchPanel.js';
import { buildRailItems } from './turn-rail.js';
import { TurnRail } from './TurnRail.js';
import { StreamMotionContext } from './streaming.js';
import { assistantSegments, boundaryOf, groupNodes, hasProcessContent, hasVisibleBody, isEarlierNarration, processChoiceKey, processExpanded, terminalLabel } from './projection.js';
import { ContextInjectionRow } from './native/ContextInjectionRow.js';
import css from './Reader.module.css';
import { markdownLabels, truncatedJsonLabel } from './primitive-labels.js';
function isNode(node, kind) {
    return node.kind === kind;
}
const ProcessNode = memo(function ProcessNode({ useChat, t, nodeKey, open, motion, onRead, returnFocusTo }) {
    const node = useChat(snapshot => snapshot.nodes.get(nodeKey));
    if (!node || node.visibility === 'hidden')
        return null;
    let content = null;
    if (isNode(node, 'context'))
        content = _jsx(ContextInjectionRow, { ...node.data, t: t });
    else if (isNode(node, 'model-retry'))
        content = _jsx(JsonBlock, { label: ui('tool.retryRecord'), payload: node.data.attempts, truncatedLabel: truncatedJsonLabel });
    else if (isNode(node, 'command') || isNode(node, 'manual-compaction'))
        content = _jsx(JsonBlock, { label: ui('tool.commandRecord'), payload: node.data, truncatedLabel: truncatedJsonLabel });
    return content && _jsx(ProcessFragment, { open: open, motion: motion, onRead: onRead, returnFocusTo: returnFocusTo, nodeKey: nodeKey, framed: true, children: content });
});
const AssistantNode = memo(function AssistantNode({ useChat, nodeKey, boundary, processOpen = false, pinned = false, motion, onRead, returnFocusTo, ...render }) {
    const node = useChat(snapshot => snapshot.nodes.get(nodeKey));
    if (!node || node.visibility === 'hidden' || !isNode(node, 'assistant-step'))
        return null;
    const data = node.data;
    const parts = assistantSegments(data.blocks);
    const earlier = isEarlierNarration(data, boundary);
    const body = data.blocks.filter(block => block.kind !== 'reasoning' && block.kind !== 'tool-call');
    return _jsx(_Fragment, { children: parts.map((part, index) => part.kind === 'reasoning'
            ? _jsx(ProcessFragment, { open: processOpen, motion: motion, onRead: onRead, returnFocusTo: returnFocusTo, nodeKey: nodeKey, framed: true, children: _jsx(ReasoningCard, { step: data.step, active: processOpen && boundary.status === 'open' && data.step === boundary.latestStep, motion: motion, selected: pinned, onRead: onRead, children: _jsx(Blocks, { ...render, blocks: part.blocks, streaming: data.status === 'running' && index === parts.length - 1 && data.blocks.at(-1)?.kind === 'reasoning', holdFormatting: pinned, startedAt: data.time, interrupted: data.status === 'interrupted', liveText: true }) }) }, part.start)
            : hasVisibleBody(part.blocks) && _jsx(RetiringContent, { visible: pinned || processOpen || !earlier, children: _jsxs("article", { className: css.answer, "data-reader-answer": true, "data-reader-anchor": true, "data-reader-key": nodeKey, "data-reader-source-start": part.start, "data-answer-status": data.status, "data-answer-phase": earlier ? 'process' : 'body', children: [_jsx(Blocks, { ...render, blocks: part.blocks, streaming: data.status === 'running', holdFormatting: pinned, startedAt: data.time, interrupted: data.status === 'interrupted', liveText: true }), index === parts.length - 1 && data.status === 'interrupted' && _jsx("span", { className: css.stopped, children: ui('turn.stopped') }), index === parts.length - 1 && !earlier && data.status !== 'running' && boundary.status === 'closed' && _jsx(CopyAnswer, { blocks: body })] }) }, part.start)) });
});
const MainNode = memo(function MainNode({ useChat, nodeKey, boundary, pinned, processOpen = false, ...render }) {
    const node = useChat(snapshot => snapshot.nodes.get(nodeKey));
    if (!node || node.visibility === 'hidden')
        return null;
    if (isNode(node, 'user') || isNode(node, 'steering'))
        return _jsxs("div", { className: css.user, "data-reader-anchor": true, "data-reader-key": nodeKey, children: [node.kind === 'steering' && _jsx("p", { className: css.meta, children: ui('turn.steering') }), _jsx(Blocks, { ...render, blocks: contentBlocks(node.data.content), source: "user" })] });
    if (isNode(node, 'assistant-step'))
        return null;
    if (isNode(node, 'tool-call'))
        return _jsx(ToolMedia, { ...render, block: node.data.root });
    if (isNode(node, 'turn-error'))
        return _jsx(FailureCard, { title: ui('turn.errorTitle'), message: node.data.message, code: node.data.code });
    if (isNode(node, 'turn-max-tokens'))
        return _jsx("div", { className: css.notice, children: ui('turn.maxTokens') });
    if (isNode(node, 'model-retry'))
        return node.data.current.retryState === 'scheduled'
            ? _jsx("div", { className: css.notice, role: "status", children: ui('turn.retryWaiting') }) : null;
    if (isNode(node, 'command')) {
        if (node.data.outcome?.kind === 'error')
            return _jsx(FailureCard, { title: ui('command.failedTitle'), message: node.data.outcome.text ?? node.data.name ?? ui('command.fallback') });
        return node.data.outcome?.text ? _jsx(MarkdownText, { text: node.data.outcome.text, labels: markdownLabels }) : null;
    }
    if (isNode(node, 'manual-compaction')) {
        if (node.data.command.outcome?.kind === 'error')
            return _jsx(FailureCard, { title: ui('compaction.failedTitle'), message: node.data.command.outcome.text });
        return node.data.compaction ? _jsx("p", { className: css.meta, children: ui('compaction.done') }) : _jsx("p", { className: css.meta, children: ui('compaction.running') });
    }
    if (node.kind === 'compaction')
        return _jsxs("details", { className: css.detail, children: [_jsx("summary", { children: ui('compaction.summary') }), _jsx("pre", { className: css.rawJson, children: JSON.stringify(node.data, null, 2) })] });
    if (node.kind === 'context')
        return null;
    if (node.kind === 'system-prompt')
        return _jsx(SystemPromptRow, { text: String(node.data.text ?? '') });
    if (node.kind === 'turn-process')
        return _jsx(TurnProcessMeta, { data: node.data });
    if (node.kind === 'turn-tail')
        return _jsx(TurnTailStats, { data: node.data });
    return _jsx(UnknownRecord, { kind: node.kind === 'unknown' ? String(node.data.type ?? 'unknown') : node.kind, data: node.data });
});
function elapsedClock(start, now) {
    if (start === undefined)
        return '';
    const elapsed = Math.max(0, Math.round((now - start) / 1000));
    return elapsed < 60 ? ui('status.clockSeconds', { seconds: elapsed }) : ui('status.clockMinutes', { minutes: Math.floor(elapsed / 60), seconds: elapsed % 60 });
}
function GroupStatus({ group, sessionId, useChat, useSessionPendingInteraction, motion }) {
    const pending = useSessionPendingInteraction(snapshot => snapshot.get(sessionId));
    const open = useChat(snapshot => group.turn !== null && snapshot.timeline.turns.get(group.turn)?.status === 'open');
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!open)
            return;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [open]);
    const text = useChat(snapshot => {
        const turn = group.turn === null ? undefined : snapshot.timeline.turns.get(group.turn);
        if (turn?.status === 'closed') {
            if (turn.end?.data.reason.kind !== 'completed')
                return ui('status.process');
            const elapsed = turn.start && turn.end ? Math.max(0, Math.round((turn.end.time - turn.start.time) / 1000)) : null;
            return elapsed === null ? ui('status.process') : elapsed < 60 ? ui('status.timeSeconds', { seconds: elapsed }) : ui('status.timeMinutes', { minutes: Math.floor(elapsed / 60), seconds: elapsed % 60 });
        }
        if (turn?.status !== 'open')
            return ui('status.process');
        if (pending !== undefined)
            return ui('status.waiting');
        // Every busy state mirrors the native umbrella label with a live clock;
        // the thinking brand label keeps its own wording.
        const time = elapsedClock(turn.start?.time, now);
        if (turn.steps.at(-1)?.data.get('assistant-step')?.blocks.at(-1)?.kind === 'reasoning') {
            return ui('status.thinkingName', { time });
        }
        return ui('status.delving', { time });
    });
    const busy = open && pending === undefined;
    return _jsx(StatusText, { text: text, motion: motion, shimmer: busy });
}
const TurnGroup = memo(function TurnGroup({ group, motion, pinnedKeys, selectedProcessKeys, ...props }) {
    const chat = props.useChat(snapshot => snapshot);
    const turn = props.useChat(snapshot => group.turn === null ? undefined : snapshot.timeline.turns.get(group.turn));
    const boundary = useMemo(() => boundaryOf(turn), [turn]);
    const choiceKey = processChoiceKey(group.key, boundary);
    const expansionChoice = props.useStore(state => state.expanded[choiceKey]);
    const flowId = useId();
    const processButton = useRef(null);
    const setExpanded = useCallback((value) => props.actions.setExpanded(choiceKey, value), [props.actions, choiceKey]);
    const pinProcess = useCallback(() => setExpanded(true), [setExpanded]);
    const firstKind = props.useChat(snapshot => snapshot.nodes.get(group.keys[0])?.kind);
    const startsWithUser = firstKind === 'user';
    const mainKeys = startsWithUser ? group.keys.slice(1) : group.keys;
    const flow = useMemo(() => readerFlow({ ...group, keys: mainKeys }, turn, key => chat.nodes.get(key)), [chat, group, mainKeys, turn]);
    const hasProcess = flow.some(item => item.kind === 'tool' || hasProcessContent(chat.nodes.get(item.nodeKey), boundary));
    // Only a real, still-active text selection delays folding. Merely clicking,
    // focusing or scrolling the live card does not create a permanent override.
    const holdingSelection = flow.some(item => selectedProcessKeys.includes(item.key));
    const expanded = holdingSelection || processExpanded(expansionChoice, boundary);
    const shared = { useChat: props.useChat, renderSlotChain: props.renderSlotChain, loadImage: props.loadImage };
    const terminal = terminalLabel(boundary.reason);
    return _jsxs("section", { className: css.turn, "data-reader-turn": group.turn ?? 'unresolved', "data-reader-turn-state": boundary.status, "data-reader-turn-result": boundary.reason ?? undefined, children: [startsWithUser && _jsx(BlockBoundary, { children: _jsx(MainNode, { ...shared, boundary: boundary, nodeKey: group.keys[0] }) }), hasProcess && _jsx(Disclosure, { open: expanded, onChange: setExpanded, controls: flowId, buttonRef: processButton, label: _jsx(GroupStatus, { group: group, sessionId: props.sessionId, useChat: props.useChat, useSessionPendingInteraction: props.useSessionPendingInteraction, motion: motion }), status: turn?.steps.length ? ui('status.steps', { count: turn.steps.length }) : undefined }), !hasProcess && boundary.status === 'open' && _jsx("div", { className: css.disclosure, "data-reader-status-only": true, children: _jsx(GroupStatus, { group: group, sessionId: props.sessionId, useChat: props.useChat, useSessionPendingInteraction: props.useSessionPendingInteraction, motion: motion }) }), _jsx("div", { id: flowId, className: css.mainFlow, "data-reader-flow": true, children: flow.map(item => item.kind === 'node' ? _jsxs(Fragment, { children: [_jsx(BlockBoundary, { children: _jsx(ProcessNode, { useChat: props.useChat, t: props.t, nodeKey: item.nodeKey, open: expanded, motion: motion, onRead: pinProcess, returnFocusTo: processButton }) }), _jsx(BlockBoundary, { children: _jsx(AssistantNode, { ...shared, boundary: boundary, nodeKey: item.nodeKey, pinned: pinnedKeys.includes(item.nodeKey), processOpen: expanded, motion: motion, onRead: pinProcess, returnFocusTo: processButton }) }), _jsx(BlockBoundary, { children: _jsx(MainNode, { ...shared, boundary: boundary, nodeKey: item.nodeKey, pinned: pinnedKeys.includes(item.nodeKey), processOpen: expanded }) })] }, item.key) : _jsxs(Fragment, { children: [_jsx(BlockBoundary, { children: _jsx(ProcessFragment, { open: expanded, motion: motion, onRead: pinProcess, returnFocusTo: processButton, nodeKey: item.key, framed: true, children: _jsx(ToolActivity, { ...shared, entry: item, motion: motion, turnClosed: boundary.status === 'closed', onRead: pinProcess }) }) }), item.block && _jsx(BlockBoundary, { children: _jsx(ToolMedia, { ...shared, block: item.block }) })] }, item.key)) }), terminal && _jsx("div", { className: css.notice, "data-reader-terminal": true, children: terminal })] });
});
export function Reader(props) {
    const root = useRef(null);
    const activatedAt = useRef(Date.now());
    const order = props.useChat(snapshot => snapshot.order);
    const nodes = props.useChat(snapshot => snapshot.nodes);
    const timeline = props.useChat(snapshot => snapshot.timeline);
    const pending = props.useSessionPendingInteraction(snapshot => snapshot.get(props.sessionId));
    const openError = props.useSession(snapshot => snapshot.openError);
    const loading = props.useSession(snapshot => snapshot.openState === 'loading');
    const hasMore = props.useSession(snapshot => snapshot.hasMore);
    const loadingOlder = props.useSession(snapshot => snapshot.loadingOlder);
    const motionPreference = props.useStore(state => state.motion);
    const motion = useMotionAllowed(motionPreference);
    const streamMotion = useMemo(() => ({ enabled: motion, activatedAt: activatedAt.current }), [motion]);
    const groups = useMemo(() => groupNodes(order, key => nodes.get(key)), [order, nodes, timeline]);
    const scroll = useReadingScroll(root, motion);
    const pinnedKeys = usePinnedSelection(root);
    const selectedProcessKeys = usePinnedSelection(root, '[data-reader-process]');
    const [historyError, setHistoryError] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const searchIndex = useMemo(() => buildSearchIndex(order, key => nodes.get(key)), [order, nodes]);
    const railItems = useMemo(() => buildRailItems(order, key => nodes.get(key)), [order, nodes]);
    const restoredPosition = useReadingPosition(root, props.sessionId, groups.length > 0);
    const [positionNotice, setPositionNotice] = useState(false);
    useEffect(() => {
        if (!restoredPosition)
            return;
        setPositionNotice(true);
        const timer = setTimeout(() => setPositionNotice(false), 3200);
        return () => clearTimeout(timer);
    }, [restoredPosition]);
    return _jsx(StreamMotionContext.Provider, { value: streamMotion, children: _jsxs("div", { ref: root, className: css.root, "data-dsh-deckseek": "0.4.4", "data-motion": motion ? 'on' : 'off', children: [_jsxs("div", { className: css.column, children: [_jsxs("div", { className: css.toolbar, "data-ud-check": "reader-toolbar", children: [_jsx("span", { title: ui('reader.toolbarHint'), children: ui('reader.toolbarTitle') }), _jsx("button", { type: "button", className: css.textButton, "aria-pressed": searchOpen, onClick: () => setSearchOpen(value => !value), title: searchOpen ? ui('reader.searchClose') : ui('reader.search'), children: searchOpen ? ui('reader.searchClose') : ui('reader.search') }), _jsx("button", { type: "button", className: css.textButton, "aria-pressed": motionPreference, onClick: () => props.actions.setMotion(!motionPreference), title: ui(motionPreference ? 'reader.motionOn' : 'reader.motionOff'), children: motionPreference && !motion ? ui('reader.motionFollowOff') : ui(motionPreference ? 'reader.motionOn' : 'reader.motionOff') })] }), searchOpen && _jsx(SearchPanel, { root: root, index: searchIndex, onClose: () => setSearchOpen(false) }), positionNotice && _jsx("div", { className: css.notice, "data-reader-position-restored": true, children: ui('reader.positionRestored') }), hasMore && _jsx("button", { type: "button", className: css.historyButton, disabled: loadingOlder, onClick: async () => {
                                setHistoryError(false);
                                try {
                                    await props.loadOlder();
                                }
                                catch {
                                    setHistoryError(true);
                                }
                            }, children: loadingOlder ? ui('reader.loadingEarlier') : ui('reader.loadEarlier') }), historyError && _jsx("div", { className: css.notice, children: ui('reader.historyFailed') }), openError && _jsxs("div", { className: css.error, role: "alert", children: [ui('reader.openFailed'), openError.message] }), loading && groups.length === 0 && _jsx("p", { className: css.empty, role: "status", children: ui('reader.loading') }), groups.map(group => _jsx(TurnGroup, { ...props, group: group, motion: motion, pinnedKeys: pinnedKeys, selectedProcessKeys: selectedProcessKeys }, group.key)), pending !== undefined && _jsxs("div", { className: css.attention, role: "alert", "data-reader-attention": true, children: [_jsx("strong", { children: pending.kind === 'question' ? ui('reader.needQuestion') : ui('reader.needConfirm') }), _jsx("span", { children: ui('reader.pendingHint') })] }), scroll.detached && _jsx("div", { className: css.jumpDock, children: _jsx("button", { type: "button", className: css.jump, "aria-label": ui('reader.jumpLatest'), title: ui('reader.jumpLatest'), onClick: scroll.jump, children: _jsx("svg", { width: "18", height: "18", viewBox: "0 0 16 16", "aria-hidden": "true", children: _jsx("path", { d: "M8 3v10m-4-4 4 4 4-4" }) }) }) })] }), _jsx(TurnRail, { root: root, items: railItems })] }) });
}
//# sourceMappingURL=Reader.js.map
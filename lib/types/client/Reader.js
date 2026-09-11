import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Fragment, memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { IconUserOutline16, JsonBlock, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives';
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
            ? _jsx(ProcessFragment, { open: processOpen, motion: motion, onRead: onRead, returnFocusTo: returnFocusTo, nodeKey: nodeKey, framed: true, children: _jsx(ReasoningCard, { step: data.step, active: processOpen && boundary.status === 'open' && data.step === boundary.latestStep, history: boundary.status === 'closed', motion: motion, selected: pinned, onRead: onRead, children: _jsx(Blocks, { ...render, blocks: part.blocks, streaming: data.status === 'running' && index === parts.length - 1 && data.blocks.at(-1)?.kind === 'reasoning', holdFormatting: pinned, startedAt: data.time, interrupted: data.status === 'interrupted', liveText: true }) }) }, part.start)
            : hasVisibleBody(part.blocks) && _jsx(RetiringContent, { visible: pinned || processOpen || !earlier, children: _jsxs("article", { className: css.answer, "data-reader-answer": true, "data-reader-anchor": true, "data-reader-key": nodeKey, "data-reader-source-start": part.start, "data-answer-status": data.status, "data-answer-phase": earlier ? 'process' : 'body', children: [_jsx(Blocks, { ...render, blocks: part.blocks, streaming: data.status === 'running', holdFormatting: pinned, startedAt: data.time, interrupted: data.status === 'interrupted', liveText: true }), index === parts.length - 1 && data.status === 'interrupted' && _jsx("span", { className: css.stopped, children: ui('turn.stopped') }), index === parts.length - 1 && !earlier && data.status !== 'running' && boundary.status === 'closed' && _jsx(CopyAnswer, { blocks: body })] }) }, part.start)) });
});
const MainNode = memo(function MainNode({ useChat, nodeKey, boundary, pinned, processOpen = false, failureNote, ...render }) {
    const node = useChat(snapshot => snapshot.nodes.get(nodeKey));
    if (!node || node.visibility === 'hidden')
        return null;
    if (isNode(node, 'user') || isNode(node, 'steering'))
        return _jsxs("div", { className: css.user, "data-reader-anchor": true, "data-reader-key": nodeKey, children: [_jsx("span", { className: css.userGlyph, "aria-hidden": "true", children: _jsx(IconUserOutline16, {}) }), _jsxs("div", { className: css.userBody, children: [node.kind === 'steering' && _jsx("p", { className: css.meta, children: ui('turn.steering') }), _jsx(Blocks, { ...render, blocks: contentBlocks(node.data.content), source: "user" })] })] });
    if (isNode(node, 'assistant-step'))
        return null;
    if (isNode(node, 'tool-call'))
        return _jsx(ToolMedia, { ...render, failureNote: failureNote, block: node.data.root });
    if (isNode(node, 'turn-error'))
        return _jsx(FailureCard, { title: ui('turn.errorTitle'), message: node.data.message, code: node.data.code, note: failureNote });
    if (isNode(node, 'turn-max-tokens'))
        return _jsx("div", { className: css.notice, children: ui('turn.maxTokens') });
    if (isNode(node, 'model-retry'))
        return node.data.current.retryState === 'scheduled'
            ? _jsx("div", { className: css.notice, role: "status", children: ui('turn.retryWaiting') }) : null;
    if (isNode(node, 'command')) {
        if (node.data.outcome?.kind === 'error')
            return _jsx(FailureCard, { title: ui('command.failedTitle'), message: node.data.outcome.text ?? node.data.name ?? ui('command.fallback'), note: failureNote });
        return node.data.outcome?.text ? _jsx(MarkdownText, { text: node.data.outcome.text, labels: markdownLabels }) : null;
    }
    if (isNode(node, 'manual-compaction')) {
        if (node.data.command.outcome?.kind === 'error')
            return _jsx(FailureCard, { title: ui('compaction.failedTitle'), message: node.data.command.outcome.text, note: failureNote });
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
function GroupStatus({ group, sessionId, useChat, useSessionPendingInteraction, motion, variant }) {
    const pending = useSessionPendingInteraction(snapshot => snapshot.get(sessionId));
    const open = useChat(snapshot => group.turn !== null && snapshot.timeline.turns.get(group.turn)?.status === 'open');
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!open)
            return;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [open]);
    // Mirror the native chat: the umbrella busy label lives pinned at the
    // bottom-left of the reading area (the dock variant), not in the turn
    // header; thinking keeps its own brand label in the header.
    const kind = useChat(snapshot => {
        const turn = group.turn === null ? undefined : snapshot.timeline.turns.get(group.turn);
        if (turn === undefined)
            return 'none';
        if (turn.status === 'closed')
            return 'done';
        if (pending !== undefined)
            return 'waiting';
        const step = turn.steps.at(-1)?.data.get('assistant-step');
        return step?.blocks.at(-1)?.kind === 'reasoning' ? 'thinking' : 'delving';
    });
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
        const time = elapsedClock(turn.start?.time, now);
        if (turn.steps.at(-1)?.data.get('assistant-step')?.blocks.at(-1)?.kind === 'reasoning')
            return ui('status.thinkingName', { time });
        return ui('status.delving', { time });
    });
    const busy = open && pending === undefined;
    // The visible label ticks with a live clock every second; keep the
    // announcement on the static phase label so screen readers are not
    // re-reading the elapsed timer on every tick.
    const ariaText = busy && (kind === 'thinking' || kind === 'delving')
        ? (kind === 'thinking' ? ui('status.thinkingName', { time: '' }) : ui('status.delving', { time: '' }))
        : text;
    if (variant === 'dock') {
        if (kind !== 'delving')
            return null;
        return _jsx("div", { className: css.statusDock, "data-reader-status-dock": true, children: _jsx(StatusText, { text: text, ariaText: ariaText, motion: motion, shimmer: true }) });
    }
    if (kind === 'delving')
        return null;
    return _jsx(StatusText, { text: text, ariaText: ariaText, motion: motion, shimmer: busy });
}
// Element-wise identity comparison for the per-node subscription: unrelated
// chunks keep node identities, so equal arrays let the subscriber bail out.
function eqNodeValues(a, b) {
    return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
}
const TurnGroup = memo(function TurnGroup({ group, motion, pinnedKeys, selectedProcessKeys, ...props }) {
    // Dev probe: enable with localStorage.setItem('deckseek-probe', '1'), then
    // read the window title — it carries the live TurnGroup render counter.
    if (localStorage.getItem('deckseek-probe') === '1') {
        const w = window;
        w.__dsTG = (w.__dsTG ?? 0) + 1;
        if (!w.__dsTGEl || !w.__dsTGEl.isConnected) {
            const el = document.createElement('div');
            el.style.cssText = 'position:fixed;right:6px;bottom:34px;z-index:9999;background:#000c;color:#4f8;font:11px/16px monospace;padding:2px 6px;border-radius:4px;pointer-events:none';
            document.body.appendChild(el);
            w.__dsTGEl = el;
        }
        w.__dsTGEl.textContent = `TG renders: ${w.__dsTG}`;
        document.title = `TG ${w.__dsTG} · DeckSeek`;
    }
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
    // Per-node identity subscription: unrelated chunks keep node identities, so
    // this group re-renders only when one of its own nodes changes.
    const nodeValues = props.useChat(snapshot => mainKeys.map(key => snapshot.nodes.get(key)), eqNodeValues);
    const nodeMap = useMemo(() => new Map(mainKeys.map((key, index) => [key, nodeValues[index]])), [mainKeys, nodeValues]);
    const flow = useMemo(() => readerFlow({ ...group, keys: mainKeys }, turn, key => nodeMap.get(key)), [group, mainKeys, turn, nodeMap]);
    const hasProcess = flow.some(item => item.kind === 'tool' || hasProcessContent(nodeMap.get(item.nodeKey), boundary));
    // Only a real, still-active text selection delays folding. Merely clicking,
    // focusing or scrolling the live card does not create a permanent override.
    const holdingSelection = flow.some(item => selectedProcessKeys.includes(item.key));
    const expanded = holdingSelection || processExpanded(expansionChoice, boundary);
    const terminal = terminalLabel(boundary.reason);
    // A failure card and the terminal line both point at the full record, so the
    // card carries that note only while no terminal line says it below.
    const failureNote = terminal === null ? ui('failure.note') : undefined;
    const cwd = props.useSessions(snapshot => snapshot.byId[props.sessionId]?.cwd);
    const shared = { useChat: props.useChat, renderSlotChain: props.renderSlotChain, loadImage: props.loadImage, cwd, failureNote };
    return _jsxs("section", { className: css.turn, "data-reader-turn": group.turn ?? 'unresolved', "data-reader-turn-state": boundary.status, "data-reader-turn-result": boundary.reason ?? undefined, children: [startsWithUser && _jsx(BlockBoundary, { children: _jsx(MainNode, { ...shared, boundary: boundary, nodeKey: group.keys[0] }) }), hasProcess && _jsx(Disclosure, { open: expanded, onChange: setExpanded, controls: flowId, buttonRef: processButton, label: _jsx(GroupStatus, { group: group, sessionId: props.sessionId, useChat: props.useChat, useSessionPendingInteraction: props.useSessionPendingInteraction, motion: motion, variant: "header" }), status: turn?.steps.length ? ui('status.steps', { count: turn.steps.length }) : undefined }), !hasProcess && boundary.status === 'open' && _jsx("div", { className: css.disclosure, "data-reader-status-only": true, children: _jsx(GroupStatus, { group: group, sessionId: props.sessionId, useChat: props.useChat, useSessionPendingInteraction: props.useSessionPendingInteraction, motion: motion, variant: "header" }) }), _jsx("div", { id: flowId, className: css.mainFlow, "data-reader-flow": true, children: flow.map(item => item.kind === 'node' ? _jsxs(Fragment, { children: [_jsx(BlockBoundary, { children: _jsx(ProcessNode, { useChat: props.useChat, t: props.t, nodeKey: item.nodeKey, open: expanded, motion: motion, onRead: pinProcess, returnFocusTo: processButton }) }), _jsx(BlockBoundary, { children: _jsx(AssistantNode, { ...shared, boundary: boundary, nodeKey: item.nodeKey, pinned: pinnedKeys.includes(item.nodeKey), processOpen: expanded, motion: motion, onRead: pinProcess, returnFocusTo: processButton }) }), _jsx(BlockBoundary, { children: _jsx(MainNode, { ...shared, boundary: boundary, nodeKey: item.nodeKey, pinned: pinnedKeys.includes(item.nodeKey), processOpen: expanded }) })] }, item.key) : _jsxs(Fragment, { children: [_jsx(BlockBoundary, { children: _jsx(ProcessFragment, { open: expanded, motion: motion, onRead: pinProcess, returnFocusTo: processButton, nodeKey: item.key, framed: true, children: _jsx(ToolActivity, { ...shared, entry: item, motion: motion, turnClosed: boundary.status === 'closed', onRead: pinProcess }) }) }), item.block && _jsx(BlockBoundary, { children: _jsx(ToolMedia, { ...shared, block: item.block }) })] }, item.key)) }), boundary.status === 'open' && _jsx(GroupStatus, { group: group, sessionId: props.sessionId, useChat: props.useChat, useSessionPendingInteraction: props.useSessionPendingInteraction, motion: motion, variant: "dock" }), terminal && _jsx("div", { className: css.notice, "data-reader-terminal": true, children: terminal })] });
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
    // A freshly sent message always returns the reader to the bottom: the
    // composer sits below the fold, so the reply would stream out of frame.
    // History prepends and the initial mount never change the tail node, so
    // neither triggers this.
    const lastTail = useRef(null);
    useEffect(() => {
        const tail = order.at(-1) ?? null;
        const previous = lastTail.current;
        lastTail.current = tail;
        if (previous !== null && tail !== null && tail !== previous && nodes.get(tail)?.kind === 'user')
            scroll.jump();
    }, [order, nodes, scroll]);
    const pinnedKeys = usePinnedSelection(root);
    const selectedProcessKeys = usePinnedSelection(root, '[data-reader-process]');
    const [historyError, setHistoryError] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    // Cmd/Ctrl+F opens the in-view search while the reading view is mounted;
    // preventDefault keeps the host webview's own find bar out of the way.
    useEffect(() => {
        const onKey = (event) => {
            if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'f') {
                event.preventDefault();
                setSearchOpen(true);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
    // The index is only consumed by the search panel: skip the O(session)
    // rebuild while the panel is closed.
    const searchIndex = useMemo(() => (searchOpen ? buildSearchIndex(order, key => nodes.get(key)) : []), [order, nodes, searchOpen]);
    const railItems = useMemo(() => buildRailItems(order, key => nodes.get(key)), [order, nodes]);
    // Long histories render a trailing window: older turns collapse into a
    // one-line placeholder that expands — automatically when scrolled near, or
    // on click — with the scroll position compensated for the inserted height.
    // The newest turns always render, so streaming and auto-follow are intact.
    const [turnWindow, setTurnWindow] = useState(15);
    useEffect(() => { setTurnWindow(15); }, [props.sessionId]);
    const visibleGroups = groups.length > turnWindow ? groups.slice(groups.length - turnWindow) : groups;
    const hiddenCount = groups.length - visibleGroups.length;
    const olderRef = useRef(null);
    const expandBase = useRef(null);
    const pendingExpand = useRef(false);
    const expandTurns = useCallback((count) => {
        const scroller = root.current?.closest('[data-conversation-scroll]');
        expandBase.current = scroller ? scroller.scrollHeight : null;
        pendingExpand.current = true;
        setTurnWindow(size => Math.min(groups.length, size + count));
    }, [groups.length, root]);
    useEffect(() => {
        const placeholder = olderRef.current;
        const scroller = root.current?.closest('[data-conversation-scroll]');
        if (!placeholder || !scroller || hiddenCount === 0)
            return;
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting))
                expandTurns(10);
        }, { root: scroller, rootMargin: '120% 0px' });
        observer.observe(placeholder);
        return () => observer.disconnect();
    }, [hiddenCount, root, expandTurns]);
    useLayoutEffect(() => {
        const scroller = root.current?.closest('[data-conversation-scroll]');
        if (!scroller)
            return;
        if (pendingExpand.current && expandBase.current !== null) {
            // Content was inserted above the viewport: keep the reading position
            // stable by shifting the scroll by the inserted height.
            const delta = scroller.scrollHeight - expandBase.current;
            if (delta > 0 && scroller.scrollTop > 0)
                scroller.scrollTop += delta;
            pendingExpand.current = false;
        }
    });
    const restoredPosition = useReadingPosition(root, props.sessionId, groups.length > 0);
    const [positionNotice, setPositionNotice] = useState(false);
    useEffect(() => {
        if (!restoredPosition)
            return;
        setPositionNotice(true);
        const timer = setTimeout(() => setPositionNotice(false), 3200);
        return () => clearTimeout(timer);
    }, [restoredPosition]);
    return _jsx(StreamMotionContext.Provider, { value: streamMotion, children: _jsxs("div", { ref: root, className: css.root, "data-dsh-deckseek": "0.5.0", "data-motion": motion ? 'on' : 'off', children: [_jsx("div", { className: css.railSpacer, "aria-hidden": "true" }), _jsxs("div", { className: css.column, children: [_jsxs("div", { className: css.toolbar, role: "toolbar", "aria-label": ui('reader.toolbarAria'), "data-ud-check": "reader-toolbar", children: [_jsx("span", { title: ui('reader.toolbarHint'), children: ui('reader.toolbarTitle') }), _jsx("button", { type: "button", className: css.textButton, "aria-pressed": searchOpen, onClick: () => setSearchOpen(value => !value), title: searchOpen ? ui('reader.searchClose') : ui('reader.search'), children: searchOpen ? ui('reader.searchClose') : ui('reader.search') }), _jsx("button", { type: "button", className: css.textButton, "aria-pressed": motionPreference, onClick: () => props.actions.setMotion(!motionPreference), title: ui(motionPreference ? 'reader.motionOn' : 'reader.motionOff'), children: motionPreference && !motion ? ui('reader.motionFollowOff') : ui(motionPreference ? 'reader.motionOn' : 'reader.motionOff') })] }), searchOpen && _jsx(SearchPanel, { root: root, index: searchIndex, onClose: () => setSearchOpen(false) }), positionNotice && _jsx("div", { className: css.notice, role: "status", "data-reader-position-restored": true, children: ui('reader.positionRestored') }), hasMore && _jsx("button", { type: "button", className: css.historyButton, disabled: loadingOlder, onClick: async () => {
                                setHistoryError(false);
                                try {
                                    await props.loadOlder();
                                }
                                catch {
                                    setHistoryError(true);
                                }
                            }, children: loadingOlder ? ui('reader.loadingEarlier') : ui('reader.loadEarlier') }), loadingOlder && _jsxs("div", { className: css.historySkeleton, "aria-hidden": "true", children: [_jsx("span", {}), _jsx("span", {})] }), historyError && _jsx("div", { className: css.notice, role: "status", children: ui('reader.historyFailed') }), openError && _jsxs("div", { className: css.error, role: "alert", children: [ui('reader.openFailed'), openError.message] }), loading && groups.length === 0 && _jsx("p", { className: css.empty, role: "status", children: ui('reader.loading') }), !loading && !openError && groups.length === 0 && _jsxs("div", { className: css.emptyState, role: "status", "data-reader-empty": true, children: [_jsx("p", { className: css.emptyBrand, children: "DeckSeek" }), _jsx("p", { className: css.emptyTitle, children: ui('empty.title') }), _jsx("p", { className: css.emptyHint, children: ui('empty.hint') })] }), hiddenCount > 0 && _jsx("div", { ref: olderRef, className: css.olderTurns, "data-reader-older": true, children: _jsx("button", { type: "button", className: css.textButton, onClick: () => expandTurns(groups.length), children: ui('reader.showEarlierTurns', { count: hiddenCount }) }) }), visibleGroups.map(group => _jsx(TurnGroup, { ...props, group: group, motion: motion, pinnedKeys: pinnedKeys, selectedProcessKeys: selectedProcessKeys }, group.key)), pending !== undefined && _jsxs("div", { className: css.attention, role: "alert", "data-reader-attention": true, children: [_jsx("strong", { children: pending.kind === 'question' ? ui('reader.needQuestion') : ui('reader.needConfirm') }), _jsx("span", { children: ui('reader.pendingHint') })] }), scroll.detached && _jsx("div", { className: css.jumpDock, children: _jsx("button", { type: "button", className: css.jump, "aria-label": ui('reader.jumpLatest'), title: ui('reader.jumpLatest'), onClick: scroll.jump, children: _jsx("svg", { width: "18", height: "18", viewBox: "0 0 16 16", "aria-hidden": "true", children: _jsx("path", { d: "M8 3v10m-4-4 4 4 4-4" }) }) }) })] }), _jsx(TurnRail, { root: root, items: railItems })] }) });
}
//# sourceMappingURL=Reader.js.map
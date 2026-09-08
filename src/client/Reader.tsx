import { Fragment, memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import type { ChatConversationViewNode, ChatNode, ChatNodeKind } from '@deepseek-ai/dsh-client-ui-chat/client';
import { JsonBlock, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives';
import { BlockBoundary, Blocks, contentBlocks, CopyAnswer } from './Blocks.js';
import { ReasoningCard } from './ReasoningCard.js';
import { ToolActivity, ToolMedia } from './ToolActivity.js';
import { UnknownRecord } from './UnknownRecord.js';
import { SystemPromptRow, TurnProcessMeta, TurnTailStats } from './TurnRecords.js';
import { FailureCard } from './FailureCard.js';
import type { TurnProcessData, TurnTailData } from './locale.js';
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
import type { ReaderGroup, TurnBoundary } from './projection.js';
import type { BlockRenderProps, ReaderProps } from './types.js';
import css from './Reader.module.css';
import { markdownLabels, truncatedJsonLabel } from './primitive-labels.js';

function isNode<K extends ChatNodeKind>(node: ChatConversationViewNode, kind: K): node is ChatNode<K> {
  return node.kind === kind;
}

type SeatProps = BlockRenderProps & Pick<ReaderProps, 'useChat'> & {
  nodeKey: string; boundary: TurnBoundary; pinned?: boolean; processOpen?: boolean;
};

const ProcessNode = memo(function ProcessNode({ useChat, t, nodeKey, open, motion, onRead, returnFocusTo }: Pick<ReaderProps, 'useChat' | 't'> & {
  nodeKey: string; open: boolean; motion: boolean; onRead: () => void; returnFocusTo: RefObject<HTMLButtonElement>;
}) {
  const node = useChat(snapshot => snapshot.nodes.get(nodeKey));
  if (!node || node.visibility === 'hidden') return null;
  let content: ReactNode = null;
  if (isNode(node, 'context')) content = <ContextInjectionRow {...node.data} t={t} />;
  else if (isNode(node, 'model-retry')) content = <JsonBlock label={ui('tool.retryRecord')} payload={node.data.attempts} truncatedLabel={truncatedJsonLabel} />;
  else if (isNode(node, 'command') || isNode(node, 'manual-compaction')) content = <JsonBlock label={ui('tool.commandRecord')} payload={node.data} truncatedLabel={truncatedJsonLabel} />;
  return content && <ProcessFragment open={open} motion={motion} onRead={onRead} returnFocusTo={returnFocusTo} nodeKey={nodeKey} framed>{content}</ProcessFragment>;
});

const AssistantNode = memo(function AssistantNode({ useChat, nodeKey, boundary, processOpen = false, pinned = false, motion, onRead, returnFocusTo, ...render }: SeatProps & {
  motion: boolean; onRead: () => void; returnFocusTo: RefObject<HTMLButtonElement>;
}) {
  const node = useChat(snapshot => snapshot.nodes.get(nodeKey));
  if (!node || node.visibility === 'hidden' || !isNode(node, 'assistant-step')) return null;
  const data = node.data;
  const parts = assistantSegments(data.blocks);
  const earlier = isEarlierNarration(data, boundary);
  const body = data.blocks.filter(block => block.kind !== 'reasoning' && block.kind !== 'tool-call');
  return <>{parts.map((part, index) => part.kind === 'reasoning'
    ? <ProcessFragment key={part.start} open={processOpen} motion={motion} onRead={onRead} returnFocusTo={returnFocusTo} nodeKey={nodeKey} framed>
      <ReasoningCard step={data.step} active={processOpen && boundary.status === 'open' && data.step === boundary.latestStep} motion={motion} selected={pinned} onRead={onRead}>
        <Blocks {...render} blocks={part.blocks} streaming={data.status === 'running' && index === parts.length - 1 && data.blocks.at(-1)?.kind === 'reasoning'}
          holdFormatting={pinned} startedAt={data.time} interrupted={data.status === 'interrupted'} liveText />
      </ReasoningCard>
    </ProcessFragment>
    : hasVisibleBody(part.blocks) && <RetiringContent key={part.start} visible={pinned || processOpen || !earlier}>
      <article className={css.answer} data-reader-answer data-reader-anchor data-reader-key={nodeKey} data-reader-source-start={part.start} data-answer-status={data.status} data-answer-phase={earlier ? 'process' : 'body'}>
        <Blocks {...render} blocks={part.blocks} streaming={data.status === 'running'} holdFormatting={pinned} startedAt={data.time} interrupted={data.status === 'interrupted'} liveText />
        {index === parts.length - 1 && data.status === 'interrupted' && <span className={css.stopped}>{ui('turn.stopped')}</span>}
        {index === parts.length - 1 && !earlier && data.status !== 'running' && boundary.status === 'closed' && <CopyAnswer blocks={body} />}
      </article>
    </RetiringContent>)}</>;
});

const MainNode = memo(function MainNode({ useChat, nodeKey, boundary, pinned, processOpen = false, ...render }: SeatProps) {
  const node = useChat(snapshot => snapshot.nodes.get(nodeKey));
  if (!node || node.visibility === 'hidden') return null;
  if (isNode(node, 'user') || isNode(node, 'steering')) return <div className={css.user} data-reader-anchor data-reader-key={nodeKey}>
    {node.kind === 'steering' && <p className={css.meta}>{ui('turn.steering')}</p>}
    <Blocks {...render} blocks={contentBlocks(node.data.content)} source="user" />
  </div>;
  if (isNode(node, 'assistant-step')) return null;
  if (isNode(node, 'tool-call')) return <ToolMedia {...render} block={node.data.root} />;
  if (isNode(node, 'turn-error')) return <FailureCard title={ui('turn.errorTitle')} message={node.data.message} code={node.data.code} />;
  if (isNode(node, 'turn-max-tokens')) return <div className={css.notice}>{ui('turn.maxTokens')}</div>;
  if (isNode(node, 'model-retry')) return node.data.current.retryState === 'scheduled'
    ? <div className={css.notice} role="status">{ui('turn.retryWaiting')}</div> : null;
  if (isNode(node, 'command')) {
    if (node.data.outcome?.kind === 'error') return <FailureCard title={ui('command.failedTitle')} message={node.data.outcome.text ?? node.data.name ?? ui('command.fallback')} />;
    return node.data.outcome?.text ? <MarkdownText text={node.data.outcome.text} labels={markdownLabels} /> : null;
  }
  if (isNode(node, 'manual-compaction')) {
    if (node.data.command.outcome?.kind === 'error') return <FailureCard title={ui('compaction.failedTitle')} message={node.data.command.outcome.text} />;
    return node.data.compaction ? <p className={css.meta}>{ui('compaction.done')}</p> : <p className={css.meta}>{ui('compaction.running')}</p>;
  }
  if (node.kind === 'compaction') return <details className={css.detail}><summary>{ui('compaction.summary')}</summary><pre className={css.rawJson}>{JSON.stringify(node.data, null, 2)}</pre></details>;
  if (node.kind === 'context') return null;
  if (node.kind === 'system-prompt') return <SystemPromptRow text={String((node.data as { text?: unknown }).text ?? '')} />;
  if (node.kind === 'turn-process') return <TurnProcessMeta data={node.data as TurnProcessData} />;
  if (node.kind === 'turn-tail') return <TurnTailStats data={node.data as TurnTailData} />;
  return <UnknownRecord kind={node.kind === 'unknown' ? String((node.data as { type?: unknown }).type ?? 'unknown') : node.kind} data={node.data} />;
});

function elapsedClock(start: number | undefined, now: number): string {
  if (start === undefined) return '';
  const elapsed = Math.max(0, Math.round((now - start) / 1000));
  return elapsed < 60 ? ui('status.clockSeconds', { seconds: elapsed }) : ui('status.clockMinutes', { minutes: Math.floor(elapsed / 60), seconds: elapsed % 60 });
}

function GroupStatus({ group, sessionId, useChat, useSessionPendingInteraction, motion, variant }: Pick<ReaderProps, 'sessionId' | 'useChat' | 'useSessionPendingInteraction'> & { group: ReaderGroup; motion: boolean; variant: 'header' | 'dock' }) {
  const pending = useSessionPendingInteraction(snapshot => snapshot.get(sessionId));
  const open = useChat(snapshot => group.turn !== null && snapshot.timeline.turns.get(group.turn)?.status === 'open');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);
  // Mirror the native chat: the umbrella busy label lives pinned at the
  // bottom-left of the reading area (the dock variant), not in the turn
  // header; thinking keeps its own brand label in the header.
  const kind = useChat(snapshot => {
    const turn = group.turn === null ? undefined : snapshot.timeline.turns.get(group.turn);
    if (turn === undefined) return 'none';
    if (turn.status === 'closed') return 'done';
    if (pending !== undefined) return 'waiting';
    const step = turn.steps.at(-1)?.data.get('assistant-step');
    return step?.blocks.at(-1)?.kind === 'reasoning' ? 'thinking' : 'delving';
  });
  const text = useChat(snapshot => {
    const turn = group.turn === null ? undefined : snapshot.timeline.turns.get(group.turn);
    if (turn?.status === 'closed') {
      if (turn.end?.data.reason.kind !== 'completed') return ui('status.process');
      const elapsed = turn.start && turn.end ? Math.max(0, Math.round((turn.end.time - turn.start.time) / 1000)) : null;
      return elapsed === null ? ui('status.process') : elapsed < 60 ? ui('status.timeSeconds', { seconds: elapsed }) : ui('status.timeMinutes', { minutes: Math.floor(elapsed / 60), seconds: elapsed % 60 });
    }
    if (turn?.status !== 'open') return ui('status.process');
    if (pending !== undefined) return ui('status.waiting');
    const time = elapsedClock(turn.start?.time, now);
    if (turn.steps.at(-1)?.data.get('assistant-step')?.blocks.at(-1)?.kind === 'reasoning') return ui('status.thinkingName', { time });
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
    if (kind !== 'delving') return null;
    return <div className={css.statusDock} data-reader-status-dock><StatusText text={text} ariaText={ariaText} motion={motion} shimmer /></div>;
  }
  if (kind === 'delving') return null;
  return <StatusText text={text} ariaText={ariaText} motion={motion} shimmer={busy} />;
}

const TurnGroup = memo(function TurnGroup({ group, motion, pinnedKeys, selectedProcessKeys, ...props }: ReaderProps & { group: ReaderGroup; motion: boolean; pinnedKeys: readonly string[]; selectedProcessKeys: readonly string[] }) {
  const chat = props.useChat(snapshot => snapshot);
  const turn = props.useChat(snapshot => group.turn === null ? undefined : snapshot.timeline.turns.get(group.turn));
  const boundary = useMemo(() => boundaryOf(turn), [turn]);
  const choiceKey = processChoiceKey(group.key, boundary);
  const expansionChoice = props.useStore(state => state.expanded[choiceKey]);
  const flowId = useId();
  const processButton = useRef<HTMLButtonElement>(null);
  const setExpanded = useCallback((value: boolean) => props.actions.setExpanded(choiceKey, value), [props.actions, choiceKey]);
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
  return <section className={css.turn} data-reader-turn={group.turn ?? 'unresolved'} data-reader-turn-state={boundary.status} data-reader-turn-result={boundary.reason ?? undefined}>
    {startsWithUser && <BlockBoundary><MainNode {...shared} boundary={boundary} nodeKey={group.keys[0]} /></BlockBoundary>}
    {hasProcess && <Disclosure open={expanded} onChange={setExpanded} controls={flowId} buttonRef={processButton}
      label={<GroupStatus group={group} sessionId={props.sessionId} useChat={props.useChat} useSessionPendingInteraction={props.useSessionPendingInteraction} motion={motion} variant="header" />} status={turn?.steps.length ? ui('status.steps', { count: turn.steps.length }) : undefined} />}
    {!hasProcess && boundary.status === 'open' && <div className={css.disclosure} data-reader-status-only>
      <GroupStatus group={group} sessionId={props.sessionId} useChat={props.useChat} useSessionPendingInteraction={props.useSessionPendingInteraction} motion={motion} variant="header" />
    </div>}
    <div id={flowId} className={css.mainFlow} data-reader-flow>
      {flow.map(item => item.kind === 'node' ? <Fragment key={item.key}>
        <BlockBoundary><ProcessNode useChat={props.useChat} t={props.t} nodeKey={item.nodeKey} open={expanded} motion={motion} onRead={pinProcess} returnFocusTo={processButton} /></BlockBoundary>
        <BlockBoundary><AssistantNode {...shared} boundary={boundary} nodeKey={item.nodeKey} pinned={pinnedKeys.includes(item.nodeKey)} processOpen={expanded} motion={motion} onRead={pinProcess} returnFocusTo={processButton} /></BlockBoundary>
        <BlockBoundary><MainNode {...shared} boundary={boundary} nodeKey={item.nodeKey} pinned={pinnedKeys.includes(item.nodeKey)} processOpen={expanded} /></BlockBoundary>
      </Fragment> : <Fragment key={item.key}>
        <BlockBoundary><ProcessFragment open={expanded} motion={motion} onRead={pinProcess} returnFocusTo={processButton} nodeKey={item.key} framed>
          <ToolActivity {...shared} entry={item} motion={motion} turnClosed={boundary.status === 'closed'} onRead={pinProcess} />
        </ProcessFragment></BlockBoundary>
        {item.block && <BlockBoundary><ToolMedia {...shared} block={item.block} /></BlockBoundary>}
      </Fragment>)}
    </div>
    {boundary.status === 'open' && <GroupStatus group={group} sessionId={props.sessionId} useChat={props.useChat} useSessionPendingInteraction={props.useSessionPendingInteraction} motion={motion} variant="dock" />}
{terminal && <div className={css.notice} data-reader-terminal>{terminal}</div>}
  </section>;
});

export function Reader(props: ReaderProps) {
  const root = useRef<HTMLDivElement>(null);
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
  const lastTail = useRef<string | null>(null);
  useEffect(() => {
    const tail = order.at(-1) ?? null;
    const previous = lastTail.current;
    lastTail.current = tail;
    if (previous !== null && tail !== null && tail !== previous && nodes.get(tail)?.kind === 'user') scroll.jump();
  }, [order, nodes, scroll]);
  const pinnedKeys = usePinnedSelection(root);
  const selectedProcessKeys = usePinnedSelection(root, '[data-reader-process]');
  const [historyError, setHistoryError] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Cmd/Ctrl+F opens the in-view search while the reading view is mounted;
  // preventDefault keeps the host webview's own find bar out of the way.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const searchIndex = useMemo(() => buildSearchIndex(order, key => nodes.get(key)), [order, nodes]);
  const railItems = useMemo(() => buildRailItems(order, key => nodes.get(key)), [order, nodes]);
  const restoredPosition = useReadingPosition(root, props.sessionId, groups.length > 0);
  const [positionNotice, setPositionNotice] = useState(false);
  useEffect(() => {
    if (!restoredPosition) return;
    setPositionNotice(true);
    const timer = setTimeout(() => setPositionNotice(false), 3200);
    return () => clearTimeout(timer);
  }, [restoredPosition]);
  return <StreamMotionContext.Provider value={streamMotion}><div ref={root} className={css.root} data-dsh-deckseek="0.4.8" data-motion={motion ? 'on' : 'off'}>
    {/* Real element (not ::before): the container query hiding the rail cannot target the container's own pseudo-element. */}
    <div className={css.railSpacer} aria-hidden="true" />
    <div className={css.column}>
      <div className={css.toolbar} role="toolbar" aria-label={ui('reader.toolbarAria')} data-ud-check="reader-toolbar">
        <span title={ui('reader.toolbarHint')}>{ui('reader.toolbarTitle')}</span>
        <button type="button" className={css.textButton} aria-pressed={searchOpen} onClick={() => setSearchOpen(value => !value)} title={searchOpen ? ui('reader.searchClose') : ui('reader.search')}>{searchOpen ? ui('reader.searchClose') : ui('reader.search')}</button>
        <button type="button" className={css.textButton} aria-pressed={motionPreference} onClick={() => props.actions.setMotion(!motionPreference)} title={ui(motionPreference ? 'reader.motionOn' : 'reader.motionOff')}>{motionPreference && !motion ? ui('reader.motionFollowOff') : ui(motionPreference ? 'reader.motionOn' : 'reader.motionOff')}</button>
      </div>
      {searchOpen && <SearchPanel root={root} index={searchIndex} onClose={() => setSearchOpen(false)} />}
      {positionNotice && <div className={css.notice} role="status" data-reader-position-restored>{ui('reader.positionRestored')}</div>}
      {hasMore && <button type="button" className={css.historyButton} disabled={loadingOlder} onClick={async () => {
        setHistoryError(false);
        try { await props.loadOlder(); } catch { setHistoryError(true); }
      }}>{loadingOlder ? ui('reader.loadingEarlier') : ui('reader.loadEarlier')}</button>}
      {loadingOlder && <div className={css.historySkeleton} aria-hidden="true"><span /><span /></div>}
      {historyError && <div className={css.notice} role="status">{ui('reader.historyFailed')}</div>}
      {openError && <div className={css.error} role="alert">{ui('reader.openFailed')}{openError.message}</div>}
      {loading && groups.length === 0 && <p className={css.empty} role="status">{ui('reader.loading')}</p>}
      {!loading && !openError && groups.length === 0 && <div className={css.emptyState} role="status" data-reader-empty>
        <p className={css.emptyBrand}>DeckSeek</p>
        <p className={css.emptyTitle}>{ui('empty.title')}</p>
        <p className={css.emptyHint}>{ui('empty.hint')}</p>
      </div>}
      {groups.map(group => <TurnGroup key={group.key} {...props} group={group} motion={motion} pinnedKeys={pinnedKeys} selectedProcessKeys={selectedProcessKeys} />)}
      {pending !== undefined && <div className={css.attention} role="alert" data-reader-attention>
        <strong>{pending.kind === 'question' ? ui('reader.needQuestion') : ui('reader.needConfirm')}</strong>
        <span>{ui('reader.pendingHint')}</span>
      </div>}
      {scroll.detached && <div className={css.jumpDock}>
        <button type="button" className={css.jump} aria-label={ui('reader.jumpLatest')} title={ui('reader.jumpLatest')} onClick={scroll.jump}>
          <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10m-4-4 4 4 4-4" /></svg>
        </button>
      </div>}
    </div>
    <TurnRail root={root} items={railItems} />
  </div></StreamMotionContext.Provider>;
}

import { Fragment, memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import type { ChatConversationViewNode, ChatNode, ChatNodeKind } from '@deepseek-ai/dsh-client-ui-chat/client';
import { IconUserOutline16, JsonBlock, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives';
import { BlockBoundary, Blocks, contentBlocks, CopyAnswer } from './Blocks.js';
import { ReasoningCard } from './ReasoningCard.js';
import { ToolActivity, ToolMedia } from './ToolActivity.js';
import { UnknownRecord } from './UnknownRecord.js';
import { SystemPromptRow, TurnProcessMeta, TurnTailStats } from './TurnRecords.js';
import { FailureCard } from './FailureCard.js';
import type { TurnProcessData, TurnTailData } from './locale.js';
import { ui } from './locale.js';
import { compactionFacts } from './compaction.js';
import { readerFlow } from './tool-activity.js';
import { Disclosure, ProcessFragment, RetiringContent, StatusText, useMotionAllowed, usePinnedSelection, useReadingPosition, useReadingScroll } from './motion.js';
import { buildSearchIndex } from './search-index.js';
import { buildExportMarkdown, exportFileName } from './export.js';
import { SearchPanel } from './SearchPanel.js';
import { buildRailItems } from './turn-rail.js';
import { TurnRail } from './TurnRail.js';
import { StreamMotionContext } from './streaming.js';
import { shortCwd } from './frame-path.js';
import { collapsedSummary, frameMeterLabel, railTurns, turnCounts } from './frame-meter.js';
import { EMPTY_MARK } from './empty-mark.js';
import { pickStatusVerb, preambleLabel } from './status-verb.js';
import { assistantSegments, boundaryOf, groupNodes, hasProcessContent, hasVisibleBody, isEarlierNarration, processChoiceKey, processExpanded, terminalLabel } from './projection.js';
import { ContextInjectionRow } from './native/ContextInjectionRow.js';
import type { ReaderGroup, TurnBoundary } from './projection.js';
import type { BlockRenderProps, ReaderProps, TurnRowContext } from './types.js';
import css from './Reader.module.css';
import { markdownLabels, truncatedJsonLabel } from './primitive-labels.js';

function isNode<K extends ChatNodeKind>(node: ChatConversationViewNode, kind: K): node is ChatNode<K> {
  return node.kind === kind;
}

type SeatProps = BlockRenderProps & Pick<ReaderProps, 'useChat'> & TurnRowContext & {
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
  // A step's own words — the sentence written between two tool calls — belong to
  // the process, not to the answer. Rendered as an answer card they read as if
  // the turn had already concluded, and in the terminal skin they took the
  // answer's 14px monospace weight. Text from a step that called tools, or from
  // any step before the turn's last one, is commentary.
  const hasToolCalls = data.blocks.some(block => block.kind === 'tool-call');
  const isProcessStep = earlier || hasToolCalls || (boundary.latestStep > 0 && data.step < boundary.latestStep);
  const body = data.blocks.filter(block => block.kind !== 'reasoning' && block.kind !== 'tool-call');
  return <>{parts.map((part, index) => part.kind === 'reasoning'
    ? <ProcessFragment key={part.start} open={processOpen} motion={motion} onRead={onRead} returnFocusTo={returnFocusTo} nodeKey={nodeKey} framed>
      <ReasoningCard step={data.step} active={processOpen && boundary.status === 'open' && data.step === boundary.latestStep} history={boundary.status === 'closed'} motion={motion} selected={pinned} onRead={onRead}>
        <Blocks {...render} blocks={part.blocks} streaming={data.status === 'running' && index === parts.length - 1 && data.blocks.at(-1)?.kind === 'reasoning'}
          holdFormatting={pinned} startedAt={data.time} interrupted={data.status === 'interrupted'} liveText />
      </ReasoningCard>
    </ProcessFragment>
    : isProcessStep && hasVisibleBody(part.blocks) ? <ProcessFragment key={part.start} open={processOpen} motion={motion} onRead={onRead} returnFocusTo={returnFocusTo} nodeKey={nodeKey}>
      <article className={css.processCommentary}>
        <Blocks {...render} blocks={part.blocks} streaming={data.status === 'running'} holdFormatting={pinned} startedAt={data.time} interrupted={data.status === 'interrupted'} liveText />
      </article>
    </ProcessFragment>
    : hasVisibleBody(part.blocks) && <RetiringContent key={part.start} visible={pinned || processOpen || !earlier}>
      <article className={css.answer} data-reader-answer data-reader-anchor data-reader-key={nodeKey} data-reader-source-start={part.start} data-answer-status={data.status} data-answer-phase="body">
        <Blocks {...render} blocks={part.blocks} streaming={data.status === 'running'} holdFormatting={pinned} startedAt={data.time} interrupted={data.status === 'interrupted'} liveText />
        {index === parts.length - 1 && data.status === 'interrupted' && <span className={css.stopped}>{ui('turn.stopped')}</span>}
        {index === parts.length - 1 && !earlier && data.status !== 'running' && boundary.status === 'closed' && <CopyAnswer blocks={body} />}
      </article>
    </RetiringContent>)}</>;
});

/**
 * Where the session's earlier context was compacted: a memory divider across the
 * column, stating what the compaction cost, with the memo it left behind one
 * click away. The raw record used to render as a JSON dump — the one record a
 * reader is most likely to meet mid-conversation was also the least readable.
 * Ported from upstream `7049304`, with its copy moved into the dictionaries.
 */
const CompactionDivider = memo(function CompactionDivider({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false);
  const { label, summary } = compactionFacts(data);
  const pill = <>
    <svg className={css.compactionIcon} viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2z" strokeWidth="1.2" />
      <path d="M8 5v3.2l2 1.8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span>{label}</span>
  </>;
  return <div className={css.compactionRow} data-reader-compaction>
    <div className={css.compactionLine}>
      {summary === null ? <span className={css.compactionPill}>{pill}</span>
        : <button type="button" className={`${css.compactionPill} ${css.compactionButton}`} aria-expanded={open} data-ud-check="compaction-memo"
          title={ui(open ? 'compaction.memoHide' : 'compaction.memoShow')} onClick={() => setOpen(value => !value)}>
          {pill}
          <span className={css.compactionToggle}>{ui(open ? 'compaction.memoHide' : 'compaction.memoShow')}</span>
          <span className={css.compactionChevron} aria-hidden="true" data-open={open}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="m4 6 4 4 4-4" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </button>}
    </div>
    {open && summary !== null && <div className={css.compactionSummaryBox} data-reader-anchor>
      <div className={css.compactionSummaryHeader}>{ui('compaction.memoHeader')}</div>
      <MarkdownText text={summary} labels={markdownLabels} />
    </div>}
  </div>;
});

const MainNode = memo(function MainNode({ useChat, nodeKey, boundary, pinned, processOpen = false, failureNote, ...render }: SeatProps) {
  const node = useChat(snapshot => snapshot.nodes.get(nodeKey));
  if (!node || node.visibility === 'hidden') return null;
  if (isNode(node, 'user') || isNode(node, 'steering')) return <div className={css.user} data-reader-anchor data-reader-key={nodeKey}>
    <span className={css.userRole} aria-hidden="true">{ui('turn.you')}</span>
    <span className={css.userGlyph} aria-hidden="true"><IconUserOutline16 /></span>
    <div className={css.userBody}>
      {node.kind === 'steering' && <p className={css.meta}>{ui('turn.steering')}</p>}
      <Blocks {...render} blocks={contentBlocks(node.data.content)} source="user" />
    </div>
  </div>;
  if (isNode(node, 'assistant-step')) return null;
  if (isNode(node, 'tool-call')) return <ToolMedia {...render} failureNote={failureNote} block={node.data.root} />;
  if (isNode(node, 'turn-error')) return <FailureCard title={ui('turn.errorTitle')} message={node.data.message} code={node.data.code} note={failureNote} />;
  if (isNode(node, 'turn-max-tokens')) return <div className={css.notice}>{ui('turn.maxTokens')}</div>;
  if (isNode(node, 'model-retry')) return node.data.current.retryState === 'scheduled'
    ? <div className={css.notice} role="status">{ui('turn.retryWaiting')}</div> : null;
  if (isNode(node, 'command')) {
    if (node.data.outcome?.kind === 'error') return <FailureCard title={ui('command.failedTitle')} message={node.data.outcome.text ?? node.data.name ?? ui('command.fallback')} note={failureNote} />;
    return node.data.outcome?.text ? <MarkdownText text={node.data.outcome.text} labels={markdownLabels} /> : null;
  }
  if (isNode(node, 'manual-compaction')) {
    if (node.data.command.outcome?.kind === 'error') return <FailureCard title={ui('compaction.failedTitle')} message={node.data.command.outcome.text} note={failureNote} />;
    return node.data.compaction ? <CompactionDivider data={node.data.compaction} /> : <p className={css.meta}>{ui('compaction.running')}</p>;
  }
  if (node.kind === 'compaction') return <CompactionDivider data={node.data} />;
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
  // The terminal skin reads a working verb and the elapsed clock in their own
  // slots instead of the phase sentence, so the dock hands both over and CSS
  // decides which the skin shows (see StatusText and status-verb.ts).
  const turnStart = useChat(snapshot => group.turn === null ? undefined : snapshot.timeline.turns.get(group.turn)?.start?.time);
  // A group with no turn behind it is the session preamble: it has no phase to
  // report, so it takes the neutral label instead of a phase sentence. Placed
  // before every phase branch, and the same string the live region reads.
  const preamble = preambleLabel(group.turn);
  if (preamble !== null) {
    return variant === 'dock' ? null : <span className={css.statusText} data-reader-status-preamble>{preamble}</span>;
  }
  if (variant === 'dock') {
    if (kind !== 'delving') return null;
    return <div className={css.statusDock} data-reader-status-dock>
      <StatusText text={text} ariaText={ariaText} motion={motion} shimmer verb={pickStatusVerb(group.key)} clock={elapsedClock(turnStart, now)} swapKey={kind} />
    </div>;
  }
  if (kind === 'delving') return null;
  return <StatusText text={text} ariaText={ariaText} motion={motion} shimmer={busy} swapKey={kind} />;
}

// Element-wise identity comparison for the per-node subscription: unrelated
// chunks keep node identities, so equal arrays let the subscriber bail out.
function eqNodeValues(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
}

const TurnGroup = memo(function TurnGroup({ group, motion, pinnedKeys, selectedProcessKeys, ...props }: ReaderProps & { group: ReaderGroup; motion: boolean; pinnedKeys: readonly string[]; selectedProcessKeys: readonly string[] }) {
  // Dev probe: enable with localStorage.setItem('deckseek-probe', '1'), then
  // read the window title — it carries the live TurnGroup render counter.
  if (localStorage.getItem('deckseek-probe') === '1') {
    const w = window as unknown as { __dsTG?: number; __dsTGEl?: HTMLDivElement };
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
  const processButton = useRef<HTMLButtonElement>(null);
  const setExpanded = useCallback((value: boolean) => props.actions.setExpanded(choiceKey, value), [props.actions, choiceKey]);
  const pinProcess = useCallback(() => setExpanded(true), [setExpanded]);
  const firstKind = props.useChat(snapshot => snapshot.nodes.get(group.keys[0])?.kind);
  const startsWithUser = firstKind === 'user';
  const mainKeys = startsWithUser ? group.keys.slice(1) : group.keys;
  // Per-node identity subscription: unrelated chunks keep node identities, so
  // this group re-renders only when one of its own nodes changes.
  const nodeValues = props.useChat(snapshot => mainKeys.map(key => snapshot.nodes.get(key)), eqNodeValues);
  const nodeMap = useMemo(() => new Map(mainKeys.map((key, index) => [key, nodeValues[index]!])), [mainKeys, nodeValues]);
  const flow = useMemo(() => readerFlow({ ...group, keys: mainKeys }, turn, key => nodeMap.get(key)), [group, mainKeys, turn, nodeMap]);
  const hasProcess = flow.some(item => item.kind === 'tool' || hasProcessContent(nodeMap.get(item.nodeKey), boundary));
  // Only a real, still-active text selection delays folding. Merely clicking,
  // focusing or scrolling the live card does not create a permanent override.
  const holdingSelection = flow.some(item => selectedProcessKeys.includes(item.key));
  const expanded = holdingSelection || processExpanded(expansionChoice, boundary);
  // What the fold is hiding, in calls rather than in prose: the reference TUIs
  // put a count on a collapsed block so a reader can tell a one-call turn from a
  // twenty-call one without opening either. Counted only while folded — an open
  // turn already lists its calls, and the walk re-reads every call's arguments.
  const summary = useMemo(() => expanded ? null : collapsedSummary(turnCounts(flow)), [expanded, flow]);
  const headerStatus = <GroupStatus group={group} sessionId={props.sessionId} useChat={props.useChat} useSessionPendingInteraction={props.useSessionPendingInteraction} motion={motion} variant="header" />;
  const terminal = terminalLabel(boundary.reason);
  // A failure card and the terminal line both point at the full record, so the
  // card carries that note only while no terminal line says it below.
  const failureNote = terminal === null ? ui('failure.note') : undefined;
  const cwd = props.useSessions(snapshot => snapshot.byId[props.sessionId]?.cwd);
  const shared = { useChat: props.useChat, renderSlotChain: props.renderSlotChain, loadImage: props.loadImage, cwd, failureNote };
  return <section className={css.turn} data-reader-turn={group.turn ?? 'unresolved'} data-reader-turn-state={boundary.status} data-reader-turn-result={boundary.reason ?? undefined}>
    {startsWithUser && <BlockBoundary><MainNode {...shared} boundary={boundary} nodeKey={group.keys[0]} /></BlockBoundary>}
    {hasProcess && <Disclosure open={expanded} onChange={setExpanded} controls={flowId} buttonRef={processButton} summary={summary ?? undefined}
      label={headerStatus} status={turn?.steps.length ? ui('status.steps', { count: turn.steps.length }) : undefined} />}
    {!hasProcess && boundary.status === 'open' && <div className={css.disclosure} data-reader-status-only>
      {headerStatus}
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

/** Render every turn the host has loaded, dropping the trailing render window.
 *  Set by an explicit history load: the fetched page is older than every turn
 *  the window keeps, so a window that stays put would mount none of it. */
const TURN_WINDOW_ALL = Number.MAX_SAFE_INTEGER;

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
  // Window title for the terminal skin: the workspace the session runs in.
  // Always read (all skins render the node; CSS decides whether to show it).
  const cwd = props.useSessions(snapshot => snapshot.byId[props.sessionId]?.cwd);
  const framePath = shortCwd(cwd);
  const skin = props.useSkin();
  const motionPreference = props.useStore(state => state.motion);
  const motion = useMotionAllowed(motionPreference);
  const streamMotion = useMemo(() => ({ enabled: motion, activatedAt: activatedAt.current }), [motion]);
  const groups = useMemo(() => groupNodes(order, key => nodes.get(key)), [order, nodes, timeline]);
  const railItems = useMemo(() => buildRailItems(order, key => nodes.get(key)), [order, nodes]);
  // Window-bar readout. Both numbers come off state the reader already holds —
  // the turns the rail anchors and the newest of their step counts — so nothing
  // here needs a projection the plugin does not have. `hasMore` marks the turn
  // count as a floor, because the session's older history is not loaded yet.
  //
  // The turn count is taken from the rail's own items rather than from the
  // groups: the two are read side by side, and a turn whose user message the
  // loaded window does not hold has no mark beside the number. Measured on a
  // real session, the records that precede the first message form a turn-less
  // group of their own — `railTurns` ignores those by construction.
  const rail = useMemo(() => railTurns(railItems), [railItems]);
  const latestSteps = rail.latest === null ? 0 : timeline.turns.get(rail.latest)?.steps.length ?? 0;
  const frameMeter = frameMeterLabel(rail.count, latestSteps, hasMore);
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
  // The index is only consumed by the search panel: skip the O(session)
  // rebuild while the panel is closed.
  const searchIndex = useMemo(
    () => (searchOpen ? buildSearchIndex(order, key => nodes.get(key)) : []),
    [order, nodes, searchOpen],
  );
  // Export builds on demand (click) rather than eagerly: like the search
  // index, it walks the whole session and streaming would redo it per chunk.
  const downloadExport = useCallback(() => {
    const markdown = buildExportMarkdown(order, key => nodes.get(key));
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFileName();
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, [order, nodes]);
  // Long histories render a trailing window: older turns collapse into a
  // one-line placeholder that expands — automatically when scrolled near, or
  // on click — with the scroll position compensated for the inserted height.
  // The newest turns always render, so streaming and auto-follow are intact.
  const [turnWindow, setTurnWindow] = useState(15);
  useEffect(() => { setTurnWindow(15); }, [props.sessionId]);
  const visibleGroups = groups.length > turnWindow ? groups.slice(groups.length - turnWindow) : groups;
  const hiddenCount = groups.length - visibleGroups.length;
  const olderRef = useRef<HTMLDivElement>(null);
  const expandBase = useRef<number | null>(null);
  const pendingExpand = useRef(false);
  const expandTurns = useCallback((count: number) => {
    const scroller = root.current?.closest<HTMLElement>('[data-conversation-scroll]');
    expandBase.current = scroller ? scroller.scrollHeight : null;
    pendingExpand.current = true;
    setTurnWindow(size => Math.min(groups.length, size + count));
  }, [groups.length, root]);
  useEffect(() => {
    const placeholder = olderRef.current;
    const scroller = root.current?.closest<HTMLElement>('[data-conversation-scroll]');
    if (!placeholder || !scroller || hiddenCount === 0) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) expandTurns(10);
    }, { root: scroller, rootMargin: '120% 0px' });
    observer.observe(placeholder);
    return () => observer.disconnect();
  }, [hiddenCount, root, expandTurns]);
  useLayoutEffect(() => {
    const scroller = root.current?.closest<HTMLElement>('[data-conversation-scroll]');
    if (!scroller) return;
    if (pendingExpand.current && expandBase.current !== null) {
      // Content was inserted above the viewport: keep the reading position
      // stable by shifting the scroll by the inserted height.
      const delta = scroller.scrollHeight - expandBase.current;
      if (delta > 0 && scroller.scrollTop > 0) scroller.scrollTop += delta;
      pendingExpand.current = false;
    }
  });
  const restoredPosition = useReadingPosition(root, props.sessionId, groups.length > 0);
  const [positionNotice, setPositionNotice] = useState(false);
  useEffect(() => {
    if (!restoredPosition) return;
    setPositionNotice(true);
    const timer = setTimeout(() => setPositionNotice(false), 3200);
    return () => clearTimeout(timer);
  }, [restoredPosition]);
  return <StreamMotionContext.Provider value={streamMotion}><div ref={root} className={css.root} data-deckseek-skin={skin} data-motion={motion ? 'on' : 'off'}>
    {/* Real element (not ::before): the container query hiding the rail cannot target the container's own pseudo-element. */}
    <div className={css.railSpacer} aria-hidden="true" />
    <div className={css.column}>
      {/* The window bar and the search panel stick as one unit. A reader who
          scrolls into a long answer still needs the readout and the controls,
          and the panel opens under the bar it was invoked from. */}
      <div className={css.topBar}>
      <div className={css.toolbar} role="toolbar" aria-label={ui('reader.toolbarAria')} data-ud-check="reader-toolbar">
        <span className={css.toolbarTitle} title={ui('reader.toolbarHint')}>{ui('reader.toolbarTitle')}</span>
        {/* The terminal skin's title bar. Decoration, so it never reaches the
            accessibility tree in any skin; the full path stays on hover. */}
        <span className={css.framePath} aria-hidden="true" title={cwd ?? undefined}>{ui('reader.tab')}
          {framePath && <span className={css.frameCwd}>{framePath}</span>}
        </span>
        {/* The window bar's readout, in the slot the reference TUIs give their
            status segments. Decoration like the path beside it: the same counts
            are reachable through the rail and the search panel. */}
        {frameMeter && <span className={css.frameMeter} aria-hidden="true" data-reader-frame-meter>{frameMeter}</span>}
        <button type="button" className={css.textButton} aria-pressed={searchOpen} onClick={() => setSearchOpen(value => !value)} title={searchOpen ? ui('reader.searchClose') : ui('reader.search')}>{searchOpen ? ui('reader.searchClose') : ui('reader.search')}</button>
        <button type="button" className={css.textButton} aria-pressed={motionPreference} onClick={() => props.actions.setMotion(!motionPreference)} title={ui(motionPreference ? 'reader.motionOn' : 'reader.motionOff')}>{motionPreference && !motion ? ui('reader.motionFollowOff') : ui(motionPreference ? 'reader.motionOn' : 'reader.motionOff')}</button>
        <button type="button" className={css.textButton} disabled={groups.length === 0} onClick={downloadExport} title={ui('reader.exportTitle')}>{ui('reader.export')}</button>
      </div>
      {searchOpen && <SearchPanel root={root} index={searchIndex} onClose={() => setSearchOpen(false)} />}
      </div>
      {positionNotice && <div className={css.notice} role="status" data-reader-position-restored>{ui('reader.positionRestored')}</div>}
      {hasMore && <button type="button" className={css.historyButton} disabled={loadingOlder} onClick={async () => {
        setHistoryError(false);
        try {
          await props.loadOlder();
          // An explicit load is a request to read that page, but a fetched page
          // is older than everything the trailing window keeps — without this
          // the turns mount nowhere and the button reads as dead.
          setTurnWindow(TURN_WINDOW_ALL);
        } catch { setHistoryError(true); }
      }}>{loadingOlder ? ui('reader.loadingEarlier') : ui('reader.loadEarlier')}</button>}
      {loadingOlder && <div className={css.historySkeleton} aria-hidden="true"><span /><span /></div>}
      {historyError && <div className={css.notice} role="status">{ui('reader.historyFailed')}</div>}
      {openError && <div className={css.error} role="alert">{ui('reader.openFailed')}{openError.message}</div>}
      {loading && groups.length === 0 && <p className={css.empty} role="status">{ui('reader.loading')}</p>}
      {!loading && !openError && groups.length === 0 && <div className={css.emptyState} role="status" data-reader-empty>
        {/* The idle screen's mark. Drawn for every skin: the terminal skin shows
            it, the card skins keep their typographic opening. Decoration, so it
            never reaches the accessibility tree. */}
        <pre className={css.emptyMark} aria-hidden="true">{EMPTY_MARK}</pre>
        <p className={css.emptyBrand}>DeckSeek</p>
        <p className={css.emptyTitle}>{ui('empty.title')}</p>
        <p className={css.emptyHint}><span className={css.emptyHintLabel}>{ui('empty.hintLabel')}</span>{ui('empty.hint')}</p>
      </div>}
      {hiddenCount > 0 && <div ref={olderRef} className={css.olderTurns} data-reader-older>
        <button type="button" className={css.textButton} onClick={() => expandTurns(groups.length)}>
          {ui('reader.showEarlierTurns', { count: hiddenCount })}
        </button>
      </div>}
      {visibleGroups.map(group => <TurnGroup key={group.key} {...props} group={group} motion={motion} pinnedKeys={pinnedKeys} selectedProcessKeys={selectedProcessKeys} />)}
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

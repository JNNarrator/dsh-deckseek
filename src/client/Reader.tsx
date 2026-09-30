import { Fragment, memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import type { ChatConversationViewNode, ChatNode, ChatNodeKind } from '@deepseek-ai/dsh-client-ui-chat/client';
import { JsonBlock, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives';
import { UserGlyph } from './icons.js';
import { BlockBoundary, Blocks, contentBlocks, CopyAnswer } from './Blocks.js';
import { ReasoningCard } from './ReasoningCard.js';
import { ToolActivity, ToolMedia } from './ToolActivity.js';
import { UnknownRecord } from './UnknownRecord.js';
import { SystemPromptRow, TurnProcessMeta, TurnTailStats } from './TurnRecords.js';
import { FailureCard } from './FailureCard.js';
import type { TurnProcessData, TurnTailData } from './locale.js';
import { skinName, textureName, ui, workDetailName } from './locale.js';
import { compactionFacts } from './compaction.js';
import { readerFlow } from './tool-activity.js';
import { Disclosure, ProcessFragment, RetiringContent, StatusText, useMotionAllowed, usePinnedSelection, useReadingPosition, useReadingScroll } from './motion.js';
import { buildSearchIndex } from './search-index.js';
import { buildExportMarkdown, exportFileName } from './export.js';
import { SearchPanel } from './SearchPanel.js';
import { CommandPalette } from './CommandPalette.js';
import { ShortcutHelp } from './ShortcutHelp.js';
import { StatusBar, type SessionMode } from './StatusBar.js';
import type { ReaderCommand } from './commands.js';
import { blockScrollDelta, isTypingTarget, readerKeyAction, type ReaderPanel } from './keymap.js';
import { buildRailItems } from './turn-rail.js';
import { TurnRail } from './TurnRail.js';
import { StreamMotionContext } from './streaming.js';
import { shortCwd } from './frame-path.js';
import { activityPhrase, activityRanks, collapsedSummary, dominantCategory, frameMeterLabel, railTurns, turnCounts } from './frame-meter.js';
import { EMPTY_MARK } from './empty-mark.js';
import { pickStatusVerb, preambleLabel } from './status-verb.js';
import { ACTIVITY_GLYPHS } from './icons.js';
import { liveToolEntry, toolIdentity } from './tool-activity.js';
import { useProcessScroll } from './process-scroll.js';
import { toolRowModel } from './native/tool-call-model.js';
import { assistantSegments, boundaryOf, groupNodes, hasInterleavedInput, hasProcessContent, hasVisibleBody, isEarlierNarration, processChoiceKey, processExpanded, terminalLabel, turnStructure } from './projection.js';
import { ContextInjectionRow } from './native/ContextInjectionRow.js';
import { TurnTriggerRow, triggerFamily, triggerTitleKey } from './native/TurnTriggerRow.js';
import { ModelRetryRow } from './native/ModelRetryRow.js';
import type { ReaderGroup, TurnBoundary } from './projection.js';
import { SCREEN_TEXTURE_IDS, SKIN_IDS, WORK_DETAIL_IDS, workDetailPolicy, type WorkDetailPolicy } from '../skin.js';
import type { BlockRenderProps, ReaderInjected, ReaderProps, TurnRowContext } from './types.js';
import css from './Reader.module.css';
import { markdownLabels, truncatedJsonLabel } from './primitive-labels.js';
import { createProducedFileMentions, getTurnDeliverables, showDeliverablesRow } from './deliverables.js';
import { Deliverables } from './DeliverablesRow.js';
import { ProducedFilesContext } from './produced-files.js';
import { officialSeat } from './official-slots.js';

function isNode<K extends ChatNodeKind>(node: ChatConversationViewNode, kind: K): node is ChatNode<K> {
  return node.kind === kind;
}

type SeatProps = BlockRenderProps & Pick<ReaderProps, 'useChat'> & TurnRowContext & {
  nodeKey: string; boundary: TurnBoundary; pinned?: boolean; processOpen?: boolean;
  /** Fork the session at an event seq; only the turn tail acts on it. */
  forkAt?: ReaderInjected['forkAt'];
};

const ProcessNode = memo(function ProcessNode({ useChat, t, nodeKey, open, motion, onRead, returnFocusTo }: Pick<ReaderProps, 'useChat' | 't'> & {
  nodeKey: string; open: boolean; motion: boolean; onRead: () => void; returnFocusTo: RefObject<HTMLButtonElement>;
}) {
  const node = useChat(snapshot => snapshot.nodes.get(nodeKey));
  if (!node || node.visibility === 'hidden') return null;
  let content: ReactNode = null;
  if (isNode(node, 'context')) content = <ContextInjectionRow {...node.data} t={t} />;
  else if (isNode(node, 'command') || isNode(node, 'manual-compaction')) content = <JsonBlock label={ui('tool.commandRecord')} payload={node.data} truncatedLabel={truncatedJsonLabel} />;
  return content && <ProcessFragment open={open} motion={motion} onRead={onRead} returnFocusTo={returnFocusTo} nodeKey={nodeKey} framed>{content}</ProcessFragment>;
});

const AssistantNode = memo(function AssistantNode({ useChat, nodeKey, boundary, processOpen = false, pinned = false, settledReasoningPreview = true, motion, onRead, returnFocusTo, ...render }: SeatProps & {
  motion: boolean; onRead: () => void; returnFocusTo: RefObject<HTMLButtonElement>;
  /** Whether settled reasoning keeps a preview; the work-details level decides. */
  settledReasoningPreview?: boolean;
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
      <ReasoningCard step={data.step} active={processOpen && boundary.status === 'open' && data.step === boundary.latestStep} history={boundary.status === 'closed'} preview={settledReasoningPreview} motion={motion} selected={pinned} onRead={onRead}>
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

const MainNode = memo(function MainNode({ useChat, nodeKey, boundary, pinned, processOpen = false, failureNote, forkAt, ...render }: SeatProps) {
  const node = useChat(snapshot => snapshot.nodes.get(nodeKey));
  if (!node || node.visibility === 'hidden') return null;
  if (isNode(node, 'user') || isNode(node, 'steering')) {
    // `referenceLabels` carries the `@` session mentions the engine resolved
    // onto this message. Ignoring it drops them silently: the text still
    // renders, it just no longer says what was referenced.
    const references = node.data.referenceLabels ?? [];
    return <div className={css.user} data-reader-anchor data-reader-key={nodeKey}>
    <span className={css.userRole} aria-hidden="true">{ui('turn.you')}</span>
    <span className={css.userGlyph} aria-hidden="true"><UserGlyph /></span>
    <div className={css.userBody}>
      {node.kind === 'steering' && <p className={css.meta}>{ui('turn.steering')}</p>}
      <Blocks {...render} blocks={contentBlocks(node.data.content)} source="user" />
      {/* The engine resolves `@` session mentions onto the message and the host
          prints them as a summary line beneath the bubble. The plugin renders
          the body as Markdown, so it cannot reuse the host's inline chips
          without giving that up — the labels are surfaced as a line instead. */}
      {references.length > 0 && <p className={css.userReferences} data-user-references>{ui('turn.references', { labels: references.join(ui('turn.referenceSeparator')) })}</p>}
    </div>
  </div>;
  }
  if (isNode(node, 'assistant-step')) return null;
  if (isNode(node, 'tool-call')) return <ToolMedia {...render} failureNote={failureNote} block={node.data.root} />;
  if (isNode(node, 'turn-error')) return <FailureCard title={ui('turn.errorTitle')} message={node.data.message} code={node.data.code} note={failureNote} />;
  if (isNode(node, 'turn-max-tokens')) return <div className={css.notice}>{ui('turn.maxTokens')}</div>;
  if (isNode(node, 'model-retry')) return <ModelRetryRow data={node.data} />;
  // A trigger is the first node of the turn it woke, and the only durable record
  // of why that turn exists, so it renders here alongside the user message
  // rather than inside the foldable process list.
  if (isNode(node, 'turn-trigger')) return <BlockBoundary><TurnTriggerRow
    node={node.data}
    title={ui(triggerTitleKey(triggerFamily(node.data)))}
    explanation={ui('trigger.explanation')}
  /></BlockBoundary>;
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
  if (node.kind === 'turn-tail') return <TurnTailStats data={node.data as TurnTailData} forkAt={forkAt} />;
  return <UnknownRecord kind={node.kind === 'unknown' ? String((node.data as { type?: unknown }).type ?? 'unknown') : node.kind} data={node.data} />;
});

function elapsedClock(start: number | undefined, now: number): string {
  if (start === undefined) return '';
  const elapsed = Math.max(0, Math.round((now - start) / 1000));
  return elapsed < 60 ? ui('status.clockSeconds', { seconds: elapsed }) : ui('status.clockMinutes', { minutes: Math.floor(elapsed / 60), seconds: elapsed % 60 });
}

function GroupStatus({ group, sessionId, useChat, useSessionStatus, motion, variant, policy, liveDetail }: Pick<ReaderProps, 'sessionId' | 'useChat' | 'useSessionStatus'> & { group: ReaderGroup; motion: boolean; variant: 'header' | 'dock'; policy: WorkDetailPolicy; liveDetail?: string }) {
  // 0.1.7 removed the per-Session pending-interaction hook; the unified Session
  // status snapshot carries it, keyed by identity, alongside the running state.
  const pending = useSessionStatus(snapshot => snapshot.get(sessionId)?.pendingInteraction);
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
    // The one working line of the reading view. It used to have a twin in the
    // turn header — the live tool frame ("正在运行命令 · <command>") — and the
    // two named the same moment in two places: one said work is happening, the
    // other said what it is. The work is now carried here instead, so the
    // reader gets one status row and the header keeps only what it is for (the
    // thinking label, and the call to action when the turn is waiting).
    return <div className={css.statusDock} data-reader-status-dock>
      <StatusText text={text} ariaText={ariaText} motion={motion} shimmer verb={pickStatusVerb(group.key)}
        clock={elapsedClock(turnStart, now)} swapKey={kind} detail={liveDetail} />
    </div>;
  }
  if (kind === 'delving') return null;
  return <StatusText text={text} ariaText={ariaText} motion={motion} shimmer={busy} swapKey={kind} detail={liveDetail} />;
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
  // The work-details level decides how much of a turn starts folded. It is read
  // once here and its booleans are handed down, so no row compares the enum.
  const policy = workDetailPolicy(props.useWorkDetail());
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
  // Read against the group's own keys, not `mainKeys`: the opening input is what
  // the interleaved check measures the others against, and it lives in the slot
  // `mainKeys` drops.
  const interleaved = props.useChat(
    snapshot => hasInterleavedInput(group.keys, key => snapshot.nodes.get(key)),
  );
  const flow = useMemo(() => readerFlow({ ...group, keys: mainKeys }, turn, key => nodeMap.get(key)), [group, mainKeys, turn, nodeMap]);
  const hasProcess = flow.some(item => item.kind === 'tool' || hasProcessContent(nodeMap.get(item.nodeKey), boundary));
  // Only a real, still-active text selection delays folding. Merely clicking,
  // focusing or scrolling the live card does not create a permanent override.
  const holdingSelection = flow.some(item => selectedProcessKeys.includes(item.key));
  // Interleaved input forces the fold open: the disclosure must not swallow the
  // reader's own later message. Applied through `processExpanded` rather than
  // here so the stored toggle still wins over it.
  const expanded = holdingSelection || processExpanded(expansionChoice, boundary, policy, interleaved);
  // Whether this turn folds at all. Read from the policy once, beside `expanded`,
  // because every fold decision below — the header, its phrase, the summary — reads it.
  const structure = turnStructure(policy);
  // The body is capped and faded only where the level actually folds. A flat or
  // open-header level shows every call inline, so capping it would hide work the
  // reader was never offered a fold for — and there would be no header to
  // un-hide it with.
  const capped = structure === 'folded';
  const flowBody = useRef<HTMLDivElement>(null);
  const flowContent = useRef<HTMLDivElement>(null);
  // A running turn's body keeps its own newest rows in view: the transcript's
  // follower cannot do it, because a body at its cap does not grow the
  // transcript. A settled turn is the opposite case — the reader opens it to
  // read from the top — so the follow is gated on the turn still being open.
  const scroll = useProcessScroll(flowBody, flowContent, expanded, boundary.status === 'open');
  // What the fold is hiding, in calls rather than in prose: the reference TUIs
  // put a count on a collapsed block so a reader can tell a one-call turn from a
  // twenty-call one without opening either. Counted only while folded — an open
  // turn already lists its calls, and the walk re-reads every call's arguments.
  const summary = useMemo(() => expanded ? null : collapsedSummary(turnCounts(flow)), [expanded, flow]);
  // The ranked action phrase heads the fold. Same gate as the counts: the walk
  // re-reads every call's arguments, and an open turn already lists its calls.
  const activity = useMemo(() => {
    if (expanded || structure === 'flat') return undefined;
    const phrase = activityPhrase(flow);
    const category = dominantCategory(activityRanks(flow));
    return phrase === null || category === null ? undefined : { phrase, glyph: ACTIVITY_GLYPHS[category] };
  }, [expanded, structure, flow]);
  const cwd = props.useSessions(snapshot => snapshot.byId[props.sessionId]?.cwd);
  // What the running turn is on, for the working line. Only the level that asks
  // for live detail pays for walking the flow, and only while the turn is open:
  // a settled group has nothing live to name. This used to ride in the turn
  // header; the header's copy is gone (it named the same moment as the working
  // line below it), so the detail rides with the working line instead.
  const liveDetail = useMemo(() => {
    if (!policy.liveProcessDetail || boundary.status !== 'open') return undefined;
    const entry = liveToolEntry(flow);
    if (!entry || entry.block === undefined) return undefined;
    const title = toolRowModel(toolIdentity(entry).name, entry.block, cwd).title;
    return title.trim() === '' ? undefined : title;
  }, [policy.liveProcessDetail, boundary.status, flow, cwd]);
  const headerStatus = <GroupStatus group={group} sessionId={props.sessionId} useChat={props.useChat} useSessionStatus={props.useSessionStatus} motion={motion} variant="header" policy={policy} liveDetail={liveDetail} />;
  const terminal = terminalLabel(boundary.reason);
  // A failure card and the terminal line both point at the full record, so the
  // card carries that note only while no terminal line says it below.
  const failureNote = terminal === null ? ui('failure.note') : undefined;
  const shared = { useChat: props.useChat, renderSlotChain: props.renderSlotChain, loadImage: props.loadImage, forkAt: props.forkAt, cwd, failureNote };
  // What this turn produced, and the resolver that turns an authored token in
  // its prose into a control that opens one file. Computed here, where both the
  // turn and its flow are in hand, and handed down by context: the markdown that
  // consumes it sits six components deep behind memos, and a prop would have to
  // be threaded through every one of them.
  const deliverables = useMemo(() => getTurnDeliverables(turn, flow), [turn, flow]);
  // Widened on purpose: the injected face declares this opener, but a caller that
  // renders `Reader` directly (a preview, a test) may not supply one. With none,
  // inline code stays inert — the same degradation the entry itself applies when
  // the deployment has no opener — rather than throwing on the first click.
  const openFile: ((path: string) => void) | undefined = props.openFile;
  const mentions = useMemo(
    () => deliverables.length > 0 && openFile ? createProducedFileMentions(deliverables, openFile) : undefined,
    [deliverables, openFile],
  );
  // The host's own turn-tail cards — its changed-files card with the counts,
  // expandable list and diff review, and its delivery cards with the
  // deployment's open controls — are drawn through the seat this view borrowed
  // (see `official-slots.tsx`). They are the richer file surface, so where they
  // are on screen this view's own produced-files row steps aside; CSS decides
  // that from the host's own card markers, because the alternative — deciding it
  // from the turn's record — hides the files of every turn whose card the host
  // can no longer draw (a summary does not survive a host restart), and losing a
  // file list is worse than a repeated one. The row is still mounted while it is
  // hidden: its resolver is what makes an inline mention of a produced file
  // clickable in the prose.
  const tailCount = props.useTailSeats();
  // The sequence the host's own row is addressed by, read the same way its node
  // view reads it: the closing assistant message when there is one, else the
  // turn's own tail sequence.
  const tailSeq = useMemo(() => {
    for (const key of mainKeys) {
      const node = nodeMap.get(key);
      if (node === undefined) continue;
      if (isNode(node, 'turn-tail')) return node.data.closing?.finalNode?.seq ?? node.data.seq;
    }
    return undefined;
  }, [mainKeys, nodeMap]);
  const tail = tailCount > 0 && tailSeq !== undefined && turn !== undefined && openFile !== undefined
    ? <div className={css.officialTail} data-reader-official-tail>
      {props.renderSlot(officialSeat('tail'), { turn, seq: tailSeq, openFile })}
    </div>
    : null;
  return <ProducedFilesContext.Provider value={mentions}><section className={css.turn} data-reader-turn={group.turn ?? 'unresolved'} data-reader-turn-state={boundary.status} data-reader-turn-result={boundary.reason ?? undefined}>
    {startsWithUser && <BlockBoundary><MainNode {...shared} boundary={boundary} nodeKey={group.keys[0]} /></BlockBoundary>}
    {hasProcess && <Disclosure open={expanded} onChange={setExpanded} controls={flowId} buttonRef={processButton} summary={summary ?? undefined}
      label={headerStatus} activity={activity} status={turn?.steps.length ? ui('status.steps', { count: turn.steps.length }) : undefined} />}
    {!hasProcess && boundary.status === 'open' && <div className={css.disclosure} data-reader-status-only>
      {headerStatus}
    </div>}
    <div ref={flowBody} id={flowId} className={[
      css.mainFlow,
      capped ? css.cappedBody : '',
      capped && scroll.edges.canScrollUp ? css.fadeTop : '',
      capped && scroll.edges.canScrollDown ? css.fadeBottom : '',
    ].filter(Boolean).join(' ')} data-reader-flow
      data-reader-flow-capped={capped || undefined}
      data-reader-flow-scroll-up={capped && scroll.edges.canScrollUp || undefined}
      data-reader-flow-scroll-down={capped && scroll.edges.canScrollDown || undefined}
      {...scroll.events}>
      <div ref={flowContent} className={css.flowContent} data-reader-flow-content>
      {flow.map(item => item.kind === 'node' ? <Fragment key={item.key}>
        <BlockBoundary><ProcessNode useChat={props.useChat} t={props.t} nodeKey={item.nodeKey} open={expanded} motion={motion} onRead={pinProcess} returnFocusTo={processButton} /></BlockBoundary>
        <BlockBoundary><AssistantNode {...shared} boundary={boundary} nodeKey={item.nodeKey} pinned={pinnedKeys.includes(item.nodeKey)} processOpen={expanded} settledReasoningPreview={policy.settledReasoningPreview} motion={motion} onRead={pinProcess} returnFocusTo={processButton} /></BlockBoundary>
        <BlockBoundary><MainNode {...shared} boundary={boundary} nodeKey={item.nodeKey} pinned={pinnedKeys.includes(item.nodeKey)} processOpen={expanded} /></BlockBoundary>
      </Fragment> : <Fragment key={item.key}>
        <BlockBoundary><ProcessFragment open={expanded} motion={motion} onRead={pinProcess} returnFocusTo={processButton} nodeKey={item.key} framed>
          <ToolActivity {...shared} entry={item} motion={motion} turnClosed={boundary.status === 'closed'} onRead={pinProcess} />
        </ProcessFragment></BlockBoundary>
        {item.block && <BlockBoundary><ToolMedia {...shared} block={item.block} /></BlockBoundary>}
      </Fragment>)}
      </div>
    </div>
    {tail}
    {showDeliverablesRow(boundary.status, deliverables) && openFile && <Deliverables paths={deliverables} openFile={openFile} revealFile={props.revealFile} />}
    {boundary.status === 'open' && <GroupStatus group={group} sessionId={props.sessionId} useChat={props.useChat} useSessionStatus={props.useSessionStatus} motion={motion} variant="dock" policy={policy} liveDetail={liveDetail} />}
    {terminal && <div className={css.notice} data-reader-terminal>{terminal}</div>}
  </section></ProducedFilesContext.Provider>;
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
  const pending = props.useSessionStatus(snapshot => snapshot.get(props.sessionId)?.pendingInteraction);
  const openError = props.useSession(snapshot => snapshot.openError);
  const loading = props.useSession(snapshot => snapshot.openState === 'loading');
  const hasMore = props.useSession(snapshot => snapshot.hasMore);
  const loadingOlder = props.useSession(snapshot => snapshot.loadingOlder);
  // Window title for the terminal skin: the workspace the session runs in.
  // Always read (all skins render the node; CSS decides whether to show it).
  const cwd = props.useSessions(snapshot => snapshot.byId[props.sessionId]?.cwd);
  const framePath = shortCwd(cwd);
  const skin = props.useSkin();
  const texture = props.useTexture();
  const motionPreference = props.useStore(state => state.motion);
  const motion = useMotionAllowed(motionPreference);
  const streamMotion = useMemo(() => ({ enabled: motion, activatedAt: activatedAt.current }), [motion]);
  // `timeline` is deliberately NOT a dependency: `groupNodes` reads only the
  // order and the node lookup, and a turn's boundary is resolved by `TurnGroup`
  // from its own subscription. Listing it here re-grouped the whole session on
  // every timeline tick — which during streaming is every frame — for an output
  // that never changed.
  const groups = useMemo(() => groupNodes(order, key => nodes.get(key)), [order, nodes]);
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
  // The reading view's own panels. One value rather than three booleans,
  // because only one may be open: the keyboard layer and the scrim both key
  // off which one that is, and a second open panel would leave the reader with
  // two places to press Escape.
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const panel: ReaderPanel = helpOpen ? 'help' : paletteOpen ? 'palette' : searchOpen ? 'search' : 'none';
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
  // Dismissing is one act, however the panel was opened: the close button, the
  // scrim, the shortcut or Escape all land here, so no path can leave a panel
  // open behind another one.
  const closePanels = useCallback(() => { setSearchOpen(false); setPaletteOpen(false); setHelpOpen(false); }, []);
  const openOnly = useCallback((which: 'search' | 'palette' | 'help') => {
    setSearchOpen(which === 'search');
    setPaletteOpen(which === 'palette');
    setHelpOpen(which === 'help');
  }, []);
  // The reading view scrolls inside the host's own conversation scroller, and
  // that element is the only thing that can move: scrolling `root` itself would
  // do nothing, since the column inside it is taller than its box.
  const scroller = useCallback(
    () => root.current?.closest<HTMLElement>('[data-conversation-scroll]') ?? null,
    [],
  );
  const scrollBlock = useCallback((by: 1 | -1) => {
    const port = scroller();
    if (port) port.scrollTop += by * blockScrollDelta(port.clientHeight);
  }, [scroller]);
  const scrollEdge = useCallback((to: 'top' | 'bottom') => {
    if (to === 'bottom') { scroll.jump(); return; }
    const port = scroller();
    if (port) port.scrollTop = 0;
  }, [scroll, scroller]);
  // One expansion key per group, derived the same way the group itself derives
  // it. Recomputing here is what lets the palette fold or unfold every process
  // without reaching into the DOM for the disclosure buttons.
  const choiceKeys = useMemo(() => groups.map(group => {
    const turn = group.turn === null ? undefined : timeline.turns.get(group.turn);
    return processChoiceKey(group.key, boundaryOf(turn));
  }), [groups, timeline]);
  const setAllProcess = useCallback((open: boolean) => {
    for (const key of choiceKeys) props.actions.setExpanded(key, open);
  }, [choiceKeys, props.actions]);
  // Every entry is also reachable without the palette where a keystroke exists,
  // so the sheet is an index rather than the only door. Skin and work-details
  // commands carry their untranslated identifier as a keyword: `soft` and
  // `verbose` are what the settings document calls them, and typing the English
  // word should find the Chinese tile.
  const commands = useMemo<ReaderCommand[]>(() => [
    { id: 'search', group: ui('palette.group.nav'), label: ui('cmd.search'), hint: '^F', run: () => openOnly('search') },
    { id: 'latest', group: ui('palette.group.nav'), label: ui('cmd.jumpLatest'), run: () => scrollEdge('bottom') },
    { id: 'top', group: ui('palette.group.nav'), label: ui('cmd.jumpTop'), keywords: 'g home', run: () => scrollEdge('top') },
    { id: 'expand', group: ui('palette.group.view'), label: ui('cmd.expandAll'), run: () => setAllProcess(true) },
    { id: 'collapse', group: ui('palette.group.view'), label: ui('cmd.collapseAll'), run: () => setAllProcess(false) },
    { id: 'export', group: ui('palette.group.view'), label: ui('cmd.export'), keywords: 'markdown', run: downloadExport },
    { id: 'motion', group: ui('palette.group.view'), label: ui(motionPreference ? 'cmd.motionOff' : 'cmd.motionOn'), keywords: 'animation', run: () => props.actions.setMotion(!motionPreference) },
    ...SKIN_IDS.map(id => ({ id: `skin-${id}`, group: ui('palette.group.skin'), label: ui('cmd.skin', { name: skinName(id) }), keywords: `skin ${id}`, run: () => props.setSkin(id) })),
    ...WORK_DETAIL_IDS.map(id => ({ id: `detail-${id}`, group: ui('palette.group.detail'), label: ui('cmd.detail', { name: workDetailName(id) }), keywords: `detail ${id}`, run: () => props.setWorkDetail(id) })),
    ...SCREEN_TEXTURE_IDS.map(id => ({ id: `texture-${id}`, group: ui('palette.group.view'), label: ui('cmd.texture', { name: textureName(id) }), keywords: `texture scanline crt ${id}`, run: () => props.setTexture(id) })),
  ], [downloadExport, motionPreference, openOnly, props, scrollEdge, setAllProcess]);
  // One listener for every key this view owns. The layer decides, so the
  // composer's letters, the host's Alt+arrow navigation and the browser's own
  // shortcuts pass through untouched; `preventDefault` is applied only to the
  // keys the view actually consumed.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const action = readerKeyAction(event, { typing: isTypingTarget(event.target), panel });
      if (action === null) return;
      switch (action.kind) {
        case 'palette':
          event.preventDefault();
          setPaletteOpen(open => !open);
          setHelpOpen(false);
          setSearchOpen(false);
          break;
        case 'help':
          event.preventDefault();
          setHelpOpen(open => !open);
          setPaletteOpen(false);
          setSearchOpen(false);
          break;
        // Ctrl/Cmd+F keeps the webview's own find bar out of the way, which is
        // the reason this key was bound here in the first place.
        case 'search':
          event.preventDefault();
          openOnly('search');
          break;
        case 'dismiss':
          event.preventDefault();
          closePanels();
          break;
        case 'scroll':
          event.preventDefault();
          scrollBlock(action.by);
          break;
        case 'edge':
          event.preventDefault();
          scrollEdge(action.to);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePanels, openOnly, panel, scrollBlock, scrollEdge]);
  // What the status line reports. Both facts are already subscribed here for
  // other reasons; the line only names them.
  const openTurns = useMemo(() => {
    let count = 0;
    for (const turn of timeline.turns.values()) if (turn.status === 'open') count += 1;
    return count;
  }, [timeline]);
  const mode: SessionMode = pending !== undefined ? 'wait' : openTurns > 0 ? 'run' : 'idle';
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
  return <StreamMotionContext.Provider value={streamMotion}><div ref={root} className={css.root} data-deckseek-skin={skin} data-deckseek-texture={texture} data-motion={motion ? 'on' : 'off'}>
    {/* Real element (not ::before): the container query hiding the rail cannot target the container's own pseudo-element. */}
    <div className={css.railSpacer} aria-hidden="true" />
    <div className={css.column}>
      {/* The window frame's corners. Four box-character glyphs drawn over the
          hairline border the column already has: the edges stay hairlines, so
          the frame costs no layout, and the corners are what make the reading
          area read as a window instead of as a bordered column. Decoration in
          every skin, drawn in one. */}
      {/* The screen texture. Rendered for every skin and every level and
          hidden by CSS, like the rest of the chrome: one element, so a skin or
          document that turns it off costs a `display: none` rather than a
          remount. Static by construction — nothing here animates. */}
      <span className={css.screenTexture} aria-hidden="true" />
      {/* The top of the column carries no row. Two things still hang here, and
          neither takes any height from the log: the anchor the terminal frame's
          top corners are drawn from, and the search row when it is open. The
          row the toolbar used to be is gone — its readout and its controls live
          in the strip pinned at the bottom, which is a row that already
          existed. */}
      <div className={css.topBar}>
      {searchOpen && <div className={css.searchHost}><SearchPanel root={root} index={searchIndex} onClose={() => setSearchOpen(false)} /></div>}
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
        <button type="button" className={css.jump} data-reader-jump
          aria-label={scroll.unread > 0 ? ui('reader.jumpLatestCount', { count: scroll.unread }) : ui('reader.jumpLatest')}
          title={ui('reader.jumpLatest')} onClick={scroll.jump}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10m-4-4 4 4 4-4" /></svg>
          <span>{ui('reader.jumpLatest')}</span>
          {/* Decoration: the label above already announces the count. */}
          {scroll.unread > 0 && <span className={css.jumpCount} aria-hidden="true" data-reader-jump-count>{scroll.unread}</span>}
        </button>
      </div>}
      <StatusBar mode={mode} meter={frameMeter} path={framePath || null} pathTitle={cwd ?? undefined}>
        {/* The row the toolbar used to be. Every control it carried is here:
            the view keeps exactly one strip of chrome, and that strip is the
            one pinned where the newest work already is. */}
        <button type="button" className={css.statusBarKey} aria-pressed={searchOpen} onClick={() => setSearchOpen(value => !value)} title={searchOpen ? ui('reader.searchClose') : ui('reader.search')}>{searchOpen ? ui('reader.searchClose') : ui('reader.search')}</button>
        <button type="button" className={css.statusBarKey} aria-pressed={motionPreference} onClick={() => props.actions.setMotion(!motionPreference)} title={ui(motionPreference ? 'reader.motionOn' : 'reader.motionOff')}>{motionPreference && !motion ? ui('reader.motionFollowOff') : ui(motionPreference ? 'reader.motionOn' : 'reader.motionOff')}</button>
        <button type="button" className={css.statusBarKey} disabled={groups.length === 0} onClick={downloadExport} title={ui('reader.exportTitle')}>{ui('reader.export')}</button>
        <button type="button" className={css.statusBarKey} onClick={() => openOnly('palette')} title={ui('help.key.palette')}>{ui('status.hint.palette')}</button>
        <button type="button" className={css.statusBarKey} onClick={() => openOnly('help')} title={ui('help.key.help')}>{ui('status.hint.help')}</button>
      </StatusBar>
    </div>
    <TurnRail root={root} items={railItems} />
    {/* The panels sit outside the column: they are chrome about the reading
        view, so they must not inherit the window frame's inset box, and the
        scrim has to cover the whole view rather than the column. */}
    {paletteOpen && <CommandPalette commands={commands} onClose={closePanels} />}
    {helpOpen && <ShortcutHelp onClose={closePanels} />}
  </div></StreamMotionContext.Provider>;
}

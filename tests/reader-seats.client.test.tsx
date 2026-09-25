// The reader's node seats, mounted for real.
//
// This suite exists because of a bug it would have caught: `turn-trigger` and
// `model-retry` branches were once written into `ProcessNode` (the foldable
// process list) while those nodes actually route through `MainNode` (a group's
// first node, and every non-process node). The trigger row was therefore
// unreachable at runtime, and two contradictory retry renderings coexisted —
// all while tsc was clean and every pure-function suite passed, because nothing
// ever mounted `Reader`. Asserting a row's *presence in the rendered tree*, not
// just that its component works in isolation, is the only check that catches a
// branch on a path no node takes.

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { act, render, cleanup } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { Reader } from '../src/client/Reader.js';
import { createReaderStore } from '../src/client/store.js';
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { BlockRenderProps } from '../src/client/types.js';

afterEach(cleanup);

const renderSlotChain = ((_name: string, _props: unknown, options: { fallback: ReactNode }) => options.fallback) as unknown as BlockRenderProps['renderSlotChain'];
const loadImage = (() => Promise.reject(new Error('unused in this suite'))) as unknown as BlockRenderProps['loadImage'];

/** A Turn location as the engine builds one.
 *
 *  Two separate reads depend on this being complete, and both fail *silently*
 *  when it is not:
 *  - `groupNodes` reads `location.turn` to decide which messages share a turn.
 *  - `boundaryOf` reads the *timeline's* copy (`snapshot.timeline.turns.get(turn)`),
 *    not the node's. A fixture that omits it leaves `status: 'unknown'`, which
 *    reads as "not finished", so the turn never folds and the collapsed header
 *    — with its activity phrase — simply does not render. No error, no warning.
 */
function turnLocation(turn: number, closed = true) {
  return {
    kind: 'turn',
    turn: {
      turn,
      start: undefined,
      status: closed ? 'closed' : 'open',
      steps: [],
      end: closed
        ? { type: 'turn/end', seq: 9, time: 1_700_000_009_000, data: { reason: { kind: 'completed' } } }
        : undefined,
      data: {
        get: (kind: string) => kind === 'turn-tail'
          ? {
            closing: {
              step: 1,
              time: 1_700_000_008_000,
              blocks: [{ kind: 'text', text: 'all done' }],
              finalNode: { seq: 8, messageId: 'm1' },
            },
          }
          : undefined,
      },
    },
  };
}

/** A settled tool call, shaped as the engine records one. */
function settled(callId: string, name: string, args: Record<string, unknown>) {
  return {
    kind: 'tool-result', call: { name, argsRaw: JSON.stringify(args) }, callId,
    time: 1, callTime: 0, content: [], isError: false, subCalls: [],
  } as unknown as ToolCallBlock;
}

/** Two nodes whose seat was once wrong, plus the user message that opens the
 *  turn so the group has a first node to render. */
function triggerTurn(references: readonly string[] = ['notes.md', 'changelog.md']) {
  const nodes = new Map<string, unknown>([
    ['u1', {
      kind: 'user', key: 'u1', seq: 1, time: 1_700_000_000_000, visibility: 'visible',
      location: turnLocation(1),
      data: {
        content: [{ type: 'text', text: '继续' }],
        ...references.length > 0 ? { referenceLabels: references } : {},
      },
    }],
    ['t1', {
      kind: 'turn-trigger', key: 't1', seq: 2, time: 1_700_000_001_000, visibility: 'visible',
      location: turnLocation(1),
      data: {
        content: [{ type: 'text', text: 'Finished nightly index rebuild.' }],
        source: { kind: 'schedule', name: 'nightly-index' },
      },
    }],
    ['r1', {
      kind: 'model-retry', key: 'r1', seq: 3, time: 1_700_000_002_000, visibility: 'visible',
      location: turnLocation(1),
      data: {
        attempts: [],
        current: {
          kind: 'model-retry', seq: 3, time: 1_700_000_002_000, retryState: 'scheduled',
          retryId: 'retry-1', turn: 1, step: 1, provider: 'deepseek', mode: 'normal',
          policyKey: 'provider-5xx', retry: 2, maxRetries: 5, delayMs: 4_000,
          failure: { message: 'upstream 503', code: 'SERVER' },
        },
      },
    }],
  ]);
  return { order: ['u1', 't1', 'r1'], nodes, turns: new Map([[1, turnLocation(1).turn]]) };
}

/** Mount the real `Reader` over a fixture.
 *
 *  `Reader` takes its state through the store slot, which supplies *both* a
 *  `useStore` selector hook and the `actions` object that writes to it. A direct
 *  mount has to supply both: the hook is three lines over the instance, and
 *  `actions` is the instance's own. Omitting `actions` is invisible until a test
 *  actually clicks something — reading the snapshot needs only the hook.
 */
function mountReader(
  fixture: { order: readonly string[]; nodes: Map<string, unknown>; turns: Map<number, unknown> },
  scopeKey: string,
  workDetail: 'compact' | 'standard' | 'detailed' | 'verbose' = 'standard',
  // Recorded rather than stubbed away: the branch action is a capability the
  // reading view rebuilds from services, so the only thing worth asserting is
  // the sequence it asks for and whether it asks at all.
  forkAt: (seq: number) => void = () => {},
) {
  const { order, nodes, turns } = fixture;
  const store = createReaderStore().create(scopeKey);
  const useStore = (selector: (state: { expanded: Record<string, boolean>; motion: boolean }) => unknown) =>
    useSyncExternalStore(store.subscribe, () => selector(store.getSnapshot()));
  return render(<Reader
    sessionId={'s1' as never}
    useChat={(selector: (snapshot: unknown) => unknown) => selector({ order, nodes, timeline: { turnOrder: [...turns.keys()], turns } })}
    useSession={(selector: (snapshot: unknown) => unknown) => selector({ openError: undefined, openState: 'ready', hasMore: false, loadingOlder: false })}
    useSessionStatus={(selector: (snapshot: unknown) => unknown) => selector({ get: () => undefined })}
    useSessions={(selector: (snapshot: unknown) => unknown) => selector({ byId: { s1: { cwd: '/tmp/work' } } })}
    useStore={useStore as never}
    actions={store.actions as never}
    useSkin={() => 'soft'}
    useWorkDetail={() => workDetail}
    loadOlder={async () => {}}
    loadImage={loadImage}
    renderSlotChain={renderSlotChain}
    forkAt={forkAt}
    t={((key: string) => key) as never}
  />);
}

function mount({ references }: { references?: readonly string[] } = {}) {
  return mountReader(triggerTurn(references), 'reader-seats');
}

/** The trigger row rendered through its real seat, not in isolation. */
test('a turn trigger reaches the view through the reader', () => {
  const view = mount();
  const row = view.container.querySelector('[data-trigger-family]');
  assert.equal(row?.getAttribute('data-trigger-family'), 'schedule');
  assert.match(view.container.textContent ?? '', /nightly-index/);
});

/** The retry row's own seat. The old one-line placeholder is gone, so the row
 *  must now render the status sentence it replaced. */
test('a model retry reaches the view through the reader', () => {
  const view = mount();
  const row = view.container.querySelector('[data-retry-state]');
  assert.equal(row?.getAttribute('data-retry-state'), 'scheduled');
  assert.match(view.container.textContent ?? '', /第 2\/5 次/);
});

/** Both rows sit in one turn, and neither may be swallowed by the other's seat:
 *  this is the assertion that fails if either branch moves back onto a path the
 *  node does not take. */
test('both rows survive in the same turn', () => {
  const view = mount();
  assert.equal(view.container.querySelectorAll('[data-trigger-family]').length, 1);
  assert.equal(view.container.querySelectorAll('[data-retry-state]').length, 1);
});

/** A message's resolved `@` mentions are engine data, not text: they are absent
 *  from `content` and exist only on `referenceLabels`. Dropping them loses
 *  nothing visible — the body still renders — so only an explicit assertion
 *  keeps them. */
test('resolved references are shown on the message that carried them', () => {
  const view = mount();
  const row = view.container.querySelector('[data-user-references]');
  assert.match(row?.textContent ?? '', /notes\.md/);
  assert.match(row?.textContent ?? '', /changelog\.md/);
});

/** A message with no resolved mentions must not grow an empty summary line. */
test('a message without references shows no reference line', () => {
  const view = mount({ references: [] });
  assert.equal(view.container.querySelector('[data-user-references]') === null, true);
});
/** A closed turn whose work was two reads and a command. */
const DEFAULT_TAIL = {
  turn: 1, seq: 10, time: 1_700_000_600_000, branchUnavailable: false,
  closing: { time: 1_700_000_008_000 },
  tokenUsage: { uncachedInputTokens: 1_000, outputTokens: 200, totalTokens: 1_200 },
};

function workedTurn(closed = true, tail: Record<string, unknown> = DEFAULT_TAIL) {
  const loc = () => turnLocation(1, closed);
  const nodes = new Map<string, unknown>([
    ['u1', {
      kind: 'user', key: 'u1', seq: 1, time: 1, visibility: 'visible',
      location: loc(), anchorSeq: 1,
      data: { content: [{ type: 'text', text: 'do the thing' }] },
    }],
    ['a1', {
      kind: 'assistant-step', key: 'a1', seq: 2, time: 2, visibility: 'visible',
      location: loc(), anchorSeq: 2, data: { blocks: [{ kind: 'reasoning', text: 'thinking' }] },
    }],
    ['t1', {
      kind: 'tool-call', key: 't1', seq: 3, time: 3, visibility: 'visible',
      location: loc(), anchorSeq: 3, data: { root: settled('c1', 'read', { file_path: '/w/a.ts' }) },
    }],
    ['t2', {
      kind: 'tool-call', key: 't2', seq: 4, time: 4, visibility: 'visible',
      location: loc(), anchorSeq: 4, data: { root: settled('c2', 'read', { file_path: '/w/b.ts' }) },
    }],
    ['t3', {
      kind: 'tool-call', key: 't3', seq: 5, time: 5, visibility: 'visible',
      location: loc(), anchorSeq: 5, data: { root: settled('c3', 'exec', { command: 'ls -la' }) },
    }],
    ['a2', {
      kind: 'assistant-step', key: 'a2', seq: 8, time: 8, visibility: 'visible',
      location: loc(), anchorSeq: 8, data: { blocks: [{ kind: 'text', text: 'all done' }] },
    }],
    ['tt', {
      kind: 'turn-tail', key: 'tt', seq: 10, time: 1_700_000_010_000, visibility: 'visible',
      location: loc(), anchorSeq: 10,
      data: tail,
    }],
  ]);
  return { order: ['u1', 'a1', 't1', 't2', 't3', 'a2', 'tt'], nodes, turns: new Map([[1, turnLocation(1, closed).turn]]) };
}

function mountWorked(closed = true, workDetail: 'compact' | 'standard' | 'detailed' | 'verbose' = 'standard', tail = DEFAULT_TAIL) {
  return mountReader(workedTurn(closed, tail), `reader-worked-${closed}-${tail === DEFAULT_TAIL ? 'tail' : 'bare'}`, workDetail);
}

/** §11.6's collapsed header: the ranked action phrase must reach the view in the
 *  default level. It is easy to write and never see — the phrase is suppressed
 *  unless the turn actually folded, and a turn only folds when its *timeline*
 *  status resolves to closed. This asserts the phrase, not merely the row. */
test('a folded turn names what the fold hides', () => {
  const view = mountWorked();
  const phrase = view.container.querySelector('[data-reader-fold-activity]');
  assert.notEqual(phrase, null, 'the collapsed header carried no activity phrase');
  assert.match(phrase?.textContent ?? '', /读取/);
  assert.match(phrase?.getAttribute('data-activity') ?? '', /读取/);
});

/** The height cap is only safe where the reader was offered a fold header. A flat
 *  level lists every call inline, so capping it would hide calls with no header
 *  to un-hide them — lost output, not a collapsed detail. `verbose` is the flat
 *  level, so the two mounts below differ only in the work-detail setting. */
test('only a folding level caps the process body', () => {
  const folded = mountWorked(true, 'standard');
  assert.notEqual(
    folded.container.querySelector('[data-reader-flow-capped]'),
    null,
    'the folding level left the body uncapped, so a long turn pushes the answer away',
  );
  const flat = mountWorked(true, 'verbose');
  assert.equal(
    flat.container.querySelector('[data-reader-flow-capped]') === null,
    true,
    'the flat level capped its body, hiding calls that have no header to reveal them',
  );
});

/** The phrase summarizes work the reader cannot see, so it must vanish once that
 *  work is on screen: an open turn already lists the calls it would describe.
 *  Mounted open rather than clicked open — the invariant is about the state, and
 *  a click only reaches it through the store's action path. */
test('an open turn does not also summarize itself', () => {
  const view = mountWorked(false);
  assert.equal(view.container.querySelector('[data-reader-fold-activity]') === null, true);
});

/** The fold is a store write, not local state: clicking it must go through the
 *  store's action and come back as a re-render with the phrase gone. A fixture
 *  that supplies only the selector hook and not `actions` renders fine and dies
 *  the moment a reader clicks — which is exactly how this test was found. */
test('clicking the fold opens the turn and drops the phrase', () => {
  const view = mountWorked();
  const phrase = view.container.querySelector('[data-reader-fold-activity]');
  assert.notEqual(phrase, null);
  const button = view.container.querySelector('[data-reader-disclosure] button');
  assert.notEqual(button, null);
  act(() => { button?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  assert.equal(view.container.querySelector('[data-reader-fold-activity]') === null, true);
  assert.equal(view.container.querySelector('[data-reader-disclosure]')?.getAttribute('data-expanded'), 'true');
});

/** The turn tail carries the end time. `closing.time` is the answer's arrival,
 *  not the tail node's — the fixture puts them ten minutes apart so that reading
 *  the wrong one cannot pass by accident. */
test('the turn tail stamps when the turn ended', () => {
  const view = mountWorked();
  const end = view.container.querySelector('[data-reader-turn-end]');
  assert.notEqual(end, null, 'the tail carried no end stamp');
  assert.equal(end?.getAttribute('datetime'), '2023-11-14T22:13:28.000Z');
  assert.match(end?.textContent ?? '', /\d{2}:\d{2}/);
});

/** A tail with neither usage nor a time is a row with nothing in it. The host
 *  publishes a tail for every turn, so rendering it unconditionally would put an
 *  empty line under every answer in the transcript. */
test('a tail with nothing to report renders no row', () => {
  const view = mountWorked(true, 'standard', { turn: 1, seq: 10, closing: null });
  assert.equal(view.container.querySelector('[data-reader-turn-end]') === null, true);
  assert.equal(view.container.querySelector('[data-reader-turn-usage]') === null, true);
});

/** The end stamp survives without usage: the two are independent, and a turn
 *  that reported no token buckets still finished at a time. */
test('an end stamp renders even when the turn reported no usage', () => {
  const view = mountWorked(true, 'standard', { turn: 1, seq: 10, time: 1_700_000_600_000, closing: null });
  assert.equal(
    view.container.querySelector('[data-reader-turn-end]')?.getAttribute('datetime'),
    '2023-11-14T22:23:20.000Z',
  );
  assert.equal(view.container.querySelector('[data-reader-turn-usage]') === null, true);
});

/** A closed, completed turn whose process is interrupted by a later human
 *  message. The fold must not swallow it: a reader's own words are not process
 *  detail, and hiding them inside the disclosure they interrupt is worse than
 *  not folding at all. This is the section 11.6 interleaved-input floor. */
function interruptedTurn() {
  const fixture = workedTurn(true);
  (fixture.nodes as Map<string, unknown>).set('s1', {
    kind: 'steering', key: 's1', seq: 6, time: 6, visibility: 'visible',
    location: turnLocation(1, true), anchorSeq: 6,
    data: { content: [{ type: 'text', text: 'actually stop' }] },
  });
  return {
    order: ['u1', 'a1', 't1', 't2', 't3', 's1', 'a2', 'tt'],
    nodes: fixture.nodes,
    turns: fixture.turns,
  };
}

/** The baseline the floor is measured against: an uninterrupted completed turn
 *  folds in the default level, so no absent later input is keeping it open. */
test('an uninterrupted completed turn folds in the default level', () => {
  const view = mountReader(workedTurn(true), 'reader-fold-baseline', 'standard');
  assert.ok(view.container.querySelector('[data-reader-fold-activity]'), 'the folded header renders');
});

/** The floor itself. A closed, completed turn that a human interrupted must not
 *  start folded, because the disclosure would swallow the message that
 *  interrupted it. The fold header is suppressed exactly when the fold starts
 *  open, so its absence is the observable half of the rule -- but absence alone
 *  would also pass if the whole turn failed to render, so the interrupting
 *  message and the turn itself are asserted too. */
test('a later human message keeps the completed turn open', () => {
  const view = mountReader(interruptedTurn(), 'reader-interleaved', 'standard');
  assert.equal(view.container.querySelector('[data-reader-fold-activity]') === null, true, 'no collapsed header when the fold starts open');
  assert.match(view.container.textContent ?? '', /actually stop/, 'the interrupting message is on screen, not folded away');
  assert.ok(view.container.querySelector('[data-reader-turn-state]'), 'the turn itself still renders');
});

/** An open turn whose newest call is still in flight.
 *
 *  0.1.7 has two unfinished stages and the important one is the *second*: a
 *  started call carries a head block with no `kind` on it. A fixture that models
 *  "still running" as "no block at all" only exercises the preparing stage, which
 *  is why the header's live title read as wrong for a whole round while every
 *  test passed. The command is `bash` so the family is `terminal` and the
 *  expected title is unambiguous. */
function liveTurn() {
  const loc = () => turnLocation(1, false);
  const nodes = new Map<string, unknown>([
    ['u1', {
      kind: 'user', key: 'u1', seq: 1, time: 1, visibility: 'visible',
      location: loc(), anchorSeq: 1,
      data: { content: [{ type: 'text', text: 'deploy' }] },
    }],
    ['t1', {
      kind: 'tool-call', key: 't1', seq: 3, time: 3, visibility: 'visible',
      location: loc(), anchorSeq: 3,
      // A head block: no `kind`, so `activityPhase` reads it as running.
      data: { root: { name: 'bash', argsRaw: JSON.stringify({ command: 'pnpm deploy' }) } },
    }],
  ]);
  return { order: ['u1', 't1'], nodes, turns: new Map([[1, turnLocation(1, false).turn]]) };
}

/** §11.6's live title must reach the view. `GroupStatus` only prefers the live
 *  frame for the group's header, so the assertion is that the *header* copy is
 *  the running phrase rather than the generic status sentence. */
test('an open turn names the family it is working in right now', () => {
  const view = mountReader(liveTurn(), 'reader-live-title', 'standard');
  const copy = view.container.querySelector('[data-reader-status-copy="current"]');
  assert.notEqual(copy, null, 'the header rendered no status copy');
  assert.equal(copy?.textContent, '正在运行命令');
  // And it must have replaced the generic sentence, not been appended to it.
  assert.equal(view.container.textContent?.includes('正在分析请求'), false);
});

/** The detail line is the other half of the live title and carries a different
 *  fact: the *tool*, where the title names the *family*. The two are deliberately
 *  not the same string — "running commands" plus "Bash" tells a reader both the
 *  kind of work and which tool is doing it. It is gated on the work-detail
 *  policy, so compact must drop it while keeping the title. */
test('the live title carries its detail line, and compact drops only the detail', () => {
  const full = mountReader(liveTurn(), 'reader-live-detail-full', 'standard');
  const detail = full.container.querySelector('[data-reader-status-detail]');
  assert.notEqual(detail, null, 'the detail line is missing at the default level');
  assert.match(detail?.textContent ?? '', /Bash/);

  const compact = mountReader(liveTurn(), 'reader-live-detail-compact', 'compact');
  assert.equal(compact.container.querySelector('[data-reader-status-detail]') === null, true, 'compact must drop the detail');
  assert.equal(compact.container.querySelector('[data-reader-status-copy="current"]')?.textContent, '正在运行命令');
});

/** A settled call is not live work. The same fixture with the call finished must
 *  fall back to the turn's ordinary status sentence, otherwise the header would
 *  claim a finished tool is still running forever. */
test('a finished call is not reported as live work', () => {
  const fixture = liveTurn();
  (fixture.nodes as Map<string, unknown>).set('t1', {
    kind: 'tool-call', key: 't1', seq: 3, time: 3, visibility: 'visible',
    location: turnLocation(1, false), anchorSeq: 3,
    data: { root: settled('c1', 'bash', { command: 'pnpm deploy' }) },
  });
  const view = mountReader(fixture, 'reader-live-settled', 'standard');
  const copy = view.container.querySelector('[data-reader-status-copy="current"]');
  assert.notEqual(copy?.textContent, '正在运行命令');
});

/** The branch action is the one control on a finished turn, and it is the one
 *  capability the reading view cannot receive as a prop (the host ships it with
 *  `ChatNodeOwnerProps`). It is therefore easy to render a button that looks
 *  right and forks the wrong sequence, or forks nothing at all. These tests pin
 *  the sequence, not just the presence. */
test('the tail branches at its own sequence, not the answer it closes', () => {
  const asked: number[] = [];
  const view = mountReader(workedTurn(), 'reader-branch-seq', 'standard', seq => asked.push(seq));
  const button = view.container.querySelector('[data-reader-branch]');
  assert.notEqual(button, null, 'a finished turn offered no way to branch from it');
  button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  // `closing.time` and `seq` deliberately disagree in the fixture: forking at the
  // closing answer's sequence truncates the turn, because the tail arrives after
  // the answer it closes.
  assert.deepEqual(asked, [10], 'the branch asked to fork somewhere other than the tail node');
});

test('a turn that cannot be branched explains itself instead of hiding the control', () => {
  const asked: number[] = [];
  const view = mountReader(
    workedTurn(true, { ...DEFAULT_TAIL, branchUnavailable: true }),
    'reader-branch-unavailable',
    'standard',
    seq => asked.push(seq),
  );
  const button = view.container.querySelector('[data-reader-branch]');
  assert.notEqual(button, null, 'the unavailable state removed the control instead of disabling it');
  assert.equal(button!.getAttribute('aria-disabled'), 'true', 'the disabled state was not announced');
  assert.notEqual(button!.getAttribute('data-unavailable'), null, 'the disabled state was not observable');
  // The reason is referenced, not merely nested, so `aria-describedby` must point
  // at a real node carrying the text.
  const describedBy = button!.getAttribute('aria-describedby');
  assert.notEqual(describedBy, null, 'the disabled control gave no reason');
  assert.notEqual(view.container.querySelector(`#${CSS.escape(describedBy!)}`), null, 'the reason was promised but not rendered');

  button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  assert.deepEqual(asked, [], 'a disabled control forked anyway');
});

/** The reason the branch action is worth having at all: a tail with nothing else
 *  to report. The row had two other reasons to exist — usage and an end stamp —
 *  and both are optional, so a tail with neither is a real state, not a
 *  degenerate one. Gating the row on either would leave exactly the turns a
 *  reader most wants to branch away from with no way out.
 *
 *  The fixture deliberately carries no `time`, no `closing` and no `tokenUsage`:
 *  that empty tail is the only shape in which the branchability check in the
 *  early return is load-bearing. A tail that still reports a time renders for
 *  that reason alone and the check can be deleted without any test noticing. */
test('a bare tail still offers a branch even with nothing else to report', () => {
  const asked: number[] = [];
  const view = mountReader(
    workedTurn(true, { turn: 1, seq: 10, branchUnavailable: false }),
    'reader-branch-bare',
    'standard',
    seq => asked.push(seq),
  );
  assert.equal(view.container.querySelector('[data-reader-turn-usage]') === null, true, 'this fixture was meant to report no usage');
  assert.equal(view.container.querySelector('[data-reader-turn-end]') === null, true, 'this fixture was meant to report no end stamp');

  const button = view.container.querySelector('[data-reader-branch]');
  assert.notEqual(button, null, 'a tail with no stats was treated as a tail with nothing to offer');
  button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  assert.deepEqual(asked, [10]);
});

/** The end stamp is independent of usage, so a tail that reported buckets but
 *  no closing answer still says when it finished. */
test('a tail with usage but no closing answer still reports the end stamp', () => {
  const view = mountReader(
    workedTurn(true, { ...DEFAULT_TAIL, time: 1_700_000_010_000, closing: null }),
    'reader-branch-no-closing',
    'standard',
  );
  assert.equal(
    view.container.querySelector('[data-reader-turn-end]')?.getAttribute('datetime'),
    new Date(1_700_000_010_000).toISOString(),
  );
});

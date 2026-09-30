// The produced-files row, mounted for real.
//
// The row's rules are asserted pure in `deliverables.test.ts`; what is asserted
// here is that the row is REACHED — the gate that waits for the turn to close,
// the cap that turns the tail into a count, and the click that opens the file.
// A row that only renders in isolation is the failure this repository has
// already paid for once.

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { Reader } from '../src/client/Reader.js';
import { createReaderStore } from '../src/client/store.js';
import type { BlockRenderProps } from '../src/client/types.js';

afterEach(cleanup);

const renderSlotChain = ((_name: string, _props: unknown, options: { fallback: ReactNode }) => options.fallback) as unknown as BlockRenderProps['renderSlotChain'];
const loadImage = (() => Promise.reject(new Error('unused in this suite'))) as unknown as BlockRenderProps['loadImage'];

/** One turn, closed or open, reporting however many artifacts it is given.
 *
 *  `hostChanges` adds the record the host's own changed-files card is drawn from
 *  (the announcement it folded for the turn); without it the host has nothing to
 *  say about this turn's files, which is the case this view's own row exists for. */
function turnLocation(turn: number, status: 'closed' | 'open', paths: readonly string[], hostChanges = false) {
  return {
    kind: 'turn',
    turn: {
      turn,
      start: undefined,
      status,
      steps: [],
      end: status === 'closed' ? { type: 'turn/end', seq: 9, time: 1_700_000_009_000, data: { reason: { kind: 'completed' } } } : undefined,
      data: {
        get: (kind: string) => kind === 'deliverables'
          ? { produced: paths.map(path => ({ path })), ...(hostChanges ? { changes: { seq: 20 } } : {}) }
          : undefined,
      },
    },
  };
}

/** The turn's own closing row: the node the host's tail cards are addressed by. */
const TAIL = {
  turn: 1, seq: 10, time: 1_700_000_600_000, branchUnavailable: false,
  closing: { time: 1_700_000_008_000, finalNode: { seq: 8, messageId: 'm1' } },
  tokenUsage: { uncachedInputTokens: 1_000, outputTokens: 200, totalTokens: 1_200 },
};

function fixture(status: 'closed' | 'open', paths: readonly string[], hostChanges = false) {
  const location = turnLocation(1, status, paths, hostChanges);
  const nodes = new Map<string, unknown>([
    ['tt', {
      kind: 'turn-tail', key: 'tt', seq: 10, time: TAIL.time, visibility: 'visible', location, anchorSeq: 10,
      data: TAIL,
    }],
    ['u1', {
      kind: 'user', key: 'u1', seq: 1, time: 1_700_000_000_000, visibility: 'visible', location,
      data: { content: [{ type: 'text', text: '继续' }] },
    }],
    ['a1', {
      kind: 'assistant-step', key: 'a1', seq: 2, time: 1_700_000_001_000, visibility: 'visible', location,
      data: { step: 1, status: 'completed', time: 1_700_000_001_000, blocks: [{ kind: 'text', text: '改完了。' }] },
    }],
  ]);
  return { order: ['tt', 'u1', 'a1'], nodes, turns: new Map([[1, location.turn]]) };
}

/**
 * `opener` is a tagged choice, not an optional argument: passing an explicit
 * `undefined` for a defaulted parameter triggers the default, so "no opener"
 * would silently mount WITH one — which is exactly what the first draft of this
 * suite did, and the failure it produced was blamed on the product code for a
 * while.
 */
function mountReader(status: 'closed' | 'open', paths: readonly string[], opener: 'none' | ((path: string) => void) = () => {},
  reveal: 'none' | ((path: string) => void) = 'none',
  /** The host's own tail, as a deployment with the plugin installed presents it:
   *  a populated seat, and the renderer the platform hands the view. */
  host: { seats: number; changes?: boolean; render?: (key: string, owner: Record<string, unknown>) => ReactNode } = { seats: 0 }) {
  const openFile = opener === 'none' ? undefined : opener;
  const revealFile = reveal === 'none' ? undefined : reveal;
  const { order, nodes, turns } = fixture(status, paths, host.changes ?? false);
  const store = createReaderStore().create('s1');
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
    useWorkDetail={() => 'standard'}
    useTexture={() => 'off'}
    setSkin={() => {}}
    setWorkDetail={() => {}}
    setTexture={() => {}}
    loadOlder={async () => {}}
    loadImage={loadImage}
    renderSlotChain={renderSlotChain}
    renderSlot={(host.render ?? renderNothing) as never}
    forkAt={() => {}}
    useTailSeats={() => host.seats}
    openFile={openFile as never}
    revealFile={revealFile as never}
    t={((key: string) => key) as never}
  />);
}

/** A DOM-presence assertion as a boolean: `assert.equal(node, null)` walks the
 *  node's own fiber references when it fails, which stalls the runner for
 *  minutes instead of reporting. */
function isMounted(node: unknown): boolean {
  return node !== null && node !== undefined;
}

const renderNothing = ((): null => null) as unknown as (key: string, owner: Record<string, unknown>) => ReactNode;
const TAIL_SEAT = 'dsh-deckseek.official.tail/conversation.chat.turnTail';

const THREE = ['/tmp/work/src/a.ts', '/tmp/work/src/b.ts', '/tmp/work/notes.md'];

test('a closed turn offers the files it produced, each opening its own path', () => {
  const opened: string[] = [];
  const view = mountReader('closed', THREE, path => opened.push(path));
  const row = view.container.querySelector('[data-reader-deliverables]');
  assert.notEqual(row, null, 'the row belongs to the turn that produced the files');
  assert.match(row!.textContent ?? '', /本轮产出/);
  const chips = view.container.querySelectorAll('button.deliverableOpen');
  assert.equal(chips.length, 3);
  assert.deepEqual([...chips].map(chip => chip.getAttribute('title')), THREE);
  assert.deepEqual([...chips].map(chip => chip.textContent), ['a.ts', 'b.ts', 'notes.md'], 'the chip shows the file name, the title the path');
  fireEvent.click(chips[1]!);
  assert.deepEqual(opened, ['/tmp/work/src/b.ts']);
});

test('the row waits for the turn to close', () => {
  const view = mountReader('open', THREE);
  assert.equal(view.container.querySelector('[data-reader-deliverables]') === null, true,
    'a live write has not finished producing anything yet');
});

test('a turn with no artifacts draws no row at all', () => {
  const view = mountReader('closed', []);
  assert.equal(view.container.querySelector('[data-reader-deliverables]') === null, true);
});

test('a long list collapses its tail into a count', () => {
  const many = Array.from({ length: 12 }, (_, index) => `/tmp/work/src/f${index}.ts`);
  const view = mountReader('closed', many);
  const chips = view.container.querySelectorAll('button.deliverableOpen');
  assert.equal(chips.length, 8, 'the chip count is the cap, not the file count');
  assert.match(view.container.querySelector('[data-reader-deliverables]')!.textContent ?? '', /另有 4 个/,
    'the tail is counted, because a turn that wrote twelve files should say so');
});

test('the folder control reveals the file where the host can, and opens its folder where it cannot', () => {
  const opened: string[] = [];
  const revealed: string[] = [];
  const withReveal = mountReader('closed', THREE, path => opened.push(path), path => revealed.push(path));
  const controls = withReveal.container.querySelectorAll('button.deliverableReveal');
  assert.equal(controls.length, 3, 'every chip carries one');
  assert.match(controls[0]!.getAttribute('aria-label') ?? '', /a\.ts/, 'and it names the file it acts on');
  fireEvent.click(controls[0]!);
  assert.deepEqual(revealed, ['/tmp/work/src/a.ts']);
  assert.deepEqual(opened, [], 'revealing is not opening');

  // No reveal route on this deployment: the control still does the nearest thing
  // it can, which is showing the folder, rather than nothing at all.
  const openedInstead: string[] = [];
  const withoutReveal = mountReader('closed', THREE, path => openedInstead.push(path));
  fireEvent.click(withoutReveal.container.querySelectorAll('button.deliverableReveal')[1]!);
  assert.deepEqual(openedInstead, ['/tmp/work/src'], 'the containing folder, not the file');
});

test('with no opener the row is not drawn rather than drawn dead', () => {
  // Every chip would be a control that does nothing. The turn still renders.
  const view = mountReader('closed', THREE, 'none');
  assert.equal(view.container.querySelector('[data-reader-deliverables]') === null, true);
  assert.match(view.container.textContent ?? '', /改完了/);
});

/* One file surface per turn.
 *
 * The host's own turn-tail cards — the changed-files card with its counts and
 * expandable list, the delivery cards with the deployment's open controls — are
 * richer than this view's chips row and are what the native view shows. Which of
 * the two a turn shows is decided in CSS (`Reader.module.css`, and why it cannot
 * be decided from the turn's record is written there and pinned in
 * `tests/tail-cards.test.ts`); what a mount can assert is the plumbing: the seat
 * is asked for, with the props the host's own row is rendered with, and a
 * deployment that contributes no tail pays nothing for one. */

test('the host\'s tail is rendered through the seat this view declared', () => {
  const asked: { key: string; owner: Record<string, unknown> }[] = [];
  const view = mountReader('closed', THREE, () => {}, 'none', {
    seats: 1,
    render: (key, owner) => { asked.push({ key, owner }); return <div data-host-tail>已编辑 3 个文件</div>; },
  });
  assert.equal(isMounted(view.container.querySelector('[data-reader-official-tail]')), true);
  assert.equal(isMounted(view.container.querySelector('[data-host-tail]')), true);
  assert.equal(asked.length, 1, 'the view asks its seat exactly once per turn');
  assert.equal(asked[0]!.key, TAIL_SEAT);
  // The three things the host's own row is rendered with: the turn, the tail's
  // sequence (the closing message's, not the turn's own seq), and a file opener.
  assert.equal(asked[0]!.owner.seq, 8, 'the tail is addressed by the sequence the host\'s own row uses');
  assert.equal(typeof asked[0]!.owner.openFile, 'function', 'and carries a file opener');
  assert.equal((asked[0]!.owner.turn as { turn?: unknown })?.turn, 1, 'and the turn itself');
  // Both surfaces stay mounted: CSS, not mounting, separates them, because the
  // chip row\'s resolver is what makes an inline mention clickable.
  assert.equal(isMounted(view.container.querySelector('[data-reader-deliverables]')), true);
});

test('a deployment that contributes no tail pays no gap for an empty one', () => {
  const asked: string[] = [];
  const view = mountReader('closed', THREE, () => {}, 'none', {
    seats: 0,
    render: (key) => { asked.push(key); return <div data-host-tail>never</div>; },
  });
  assert.equal(isMounted(view.container.querySelector('[data-reader-official-tail]')), false,
    'an empty wrapper would still open a gap in the turn\'s flex column');
  assert.deepEqual(asked, [], 'and nothing is asked of a seat the host never filled');
  assert.equal(isMounted(view.container.querySelector('[data-reader-deliverables]')), true,
    'the files this turn wrote are listed by this view');
});

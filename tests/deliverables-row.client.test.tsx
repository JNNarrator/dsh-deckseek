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

/** One turn, closed or open, reporting however many artifacts it is given. */
function turnLocation(turn: number, status: 'closed' | 'open', paths: readonly string[]) {
  return {
    kind: 'turn',
    turn: {
      turn,
      start: undefined,
      status,
      steps: [],
      end: status === 'closed' ? { type: 'turn/end', seq: 9, time: 1_700_000_009_000, data: { reason: { kind: 'completed' } } } : undefined,
      data: { get: (kind: string) => kind === 'deliverables' ? { produced: paths.map(path => ({ path })) } : undefined },
    },
  };
}

function fixture(status: 'closed' | 'open', paths: readonly string[]) {
  const location = turnLocation(1, status, paths);
  const nodes = new Map<string, unknown>([
    ['u1', {
      kind: 'user', key: 'u1', seq: 1, time: 1_700_000_000_000, visibility: 'visible', location,
      data: { content: [{ type: 'text', text: '继续' }] },
    }],
    ['a1', {
      kind: 'assistant-step', key: 'a1', seq: 2, time: 1_700_000_001_000, visibility: 'visible', location,
      data: { step: 1, status: 'completed', time: 1_700_000_001_000, blocks: [{ kind: 'text', text: '改完了。' }] },
    }],
  ]);
  return { order: ['u1', 'a1'], nodes, turns: new Map([[1, location.turn]]) };
}

/**
 * `opener` is a tagged choice, not an optional argument: passing an explicit
 * `undefined` for a defaulted parameter triggers the default, so "no opener"
 * would silently mount WITH one — which is exactly what the first draft of this
 * suite did, and the failure it produced was blamed on the product code for a
 * while.
 */
function mountReader(status: 'closed' | 'open', paths: readonly string[], opener: 'none' | ((path: string) => void) = () => {}) {
  const openFile = opener === 'none' ? undefined : opener;
  const { order, nodes, turns } = fixture(status, paths);
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
    forkAt={() => {}}
    openFile={openFile as never}
    t={((key: string) => key) as never}
  />);
}

const THREE = ['/tmp/work/src/a.ts', '/tmp/work/src/b.ts', '/tmp/work/notes.md'];

test('a closed turn offers the files it produced, each opening its own path', () => {
  const opened: string[] = [];
  const view = mountReader('closed', THREE, path => opened.push(path));
  const row = view.container.querySelector('[data-reader-deliverables]');
  assert.notEqual(row, null, 'the row belongs to the turn that produced the files');
  assert.match(row!.textContent ?? '', /本轮产出/);
  const chips = view.container.querySelectorAll('button.deliverableChip');
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
  const chips = view.container.querySelectorAll('button.deliverableChip');
  assert.equal(chips.length, 8, 'the chip count is the cap, not the file count');
  assert.match(view.container.querySelector('[data-reader-deliverables]')!.textContent ?? '', /另有 4 个/,
    'the tail is counted, because a turn that wrote twelve files should say so');
});

test('with no opener the row is not drawn rather than drawn dead', () => {
  // Every chip would be a control that does nothing. The turn still renders.
  const view = mountReader('closed', THREE, 'none');
  assert.equal(view.container.querySelector('[data-reader-deliverables]') === null, true);
  assert.match(view.container.textContent ?? '', /改完了/);
});

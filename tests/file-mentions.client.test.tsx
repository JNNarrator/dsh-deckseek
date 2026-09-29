// Inline code that names a file this turn produced, mounted for real.
//
// This suite exists because of the state it was written in: the reading view has
// had a `MarkdownFileMentions` seam, and a `.fileMention` style, since before
// this change — and NOTHING fed it. Every assertion about the seam passed while
// the affordance could not appear, because the consumer was tested and the
// producer did not exist. So this mounts the real `Reader` over a turn that
// reports an artifact, and asserts the control is in the rendered tree.

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

const ANSWER = '改完了 `src/a.ts`，另外 `unknown.ts` 那个还没动。';

/** One closed turn that reports a produced artifact. */
function turnLocation(turn: number) {
  return {
    kind: 'turn',
    turn: {
      turn,
      start: undefined,
      status: 'closed',
      steps: [],
      end: { type: 'turn/end', seq: 9, time: 1_700_000_009_000, data: { reason: { kind: 'completed' } } },
      data: {
        get: (kind: string) => kind === 'deliverables' ? { produced: [{ path: '/tmp/work/src/a.ts' }] } : undefined,
      },
    },
  };
}

function fixture() {
  const location = turnLocation(1);
  const nodes = new Map<string, unknown>([
    ['u1', {
      kind: 'user', key: 'u1', seq: 1, time: 1_700_000_000_000, visibility: 'visible', location,
      data: { content: [{ type: 'text', text: '继续' }] },
    }],
    ['a1', {
      kind: 'assistant-step', key: 'a1', seq: 2, time: 1_700_000_001_000, visibility: 'visible', location,
      data: { step: 1, status: 'completed', time: 1_700_000_001_000, blocks: [{ kind: 'text', text: ANSWER }] },
    }],
  ]);
  return { order: ['u1', 'a1'], nodes, turns: new Map([[1, location.turn]]) };
}

/** Mount the real `Reader`; `openFile` is recorded so "did it open, and what"
 *  is assertable. `openFile: undefined` mounts the degraded case. */
function mountReader(openFile: ((path: string) => void) | undefined) {
  const { order, nodes, turns } = fixture();
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

test('a token naming a produced file becomes a control that opens it', () => {
  const opened: string[] = [];
  const view = mountReader(path => opened.push(path));
  const mentions = view.container.querySelectorAll('button.fileMention');
  assert.equal(mentions.length, 1, 'the file this turn produced is offered; the token naming nothing stays inert code');
  const mention = mentions[0]!;
  assert.equal(mention.getAttribute('title'), '/tmp/work/src/a.ts');
  assert.match(mention.getAttribute('aria-label') ?? '', /\/tmp\/work\/src\/a\.ts/, 'the label names the file it opens');
  fireEvent.click(mention);
  assert.deepEqual(opened, ['/tmp/work/src/a.ts']);
  assert.match(view.container.textContent ?? '', /unknown\.ts/, 'the unresolved token is still shown as the reader wrote it');
});

test('with no opener the token stays inert code rather than throwing', () => {
  // The injected face declares the opener, but a direct mount (a preview, a
  // test) may not supply one. Nothing about the answer should depend on it.
  const view = mountReader(undefined);
  assert.equal(view.container.querySelectorAll('button.fileMention').length, 0);
  assert.match(view.container.textContent ?? '', /src\/a\.ts/, 'the text is still there, just not clickable');
});

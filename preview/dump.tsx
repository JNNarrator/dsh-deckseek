// Dumps the *real* Reader DOM (happy-dom, real components) into a static page
// that a real browser can lay out. The hand-written fixture in index.html was
// guessing at the DOM shape and got the tool rows and the toolbar wrong; this
// path has no such gap — whatever `Reader` renders is what Chrome lays out.
//
// Run: node --import tsx/esm --import ./tests/setup-dom.mjs preview/dump.mts
//      (with DSH_TEST_APP_MODULES pointing at the app extraction)

import { writeFileSync } from 'node:fs';
import { render } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { Reader } from '../src/client/Reader.js';
import { createReaderStore } from '../src/client/store.js';
import type { BlockRenderProps } from '../src/client/types.js';

const renderSlotChain = ((_name: string, _props: unknown, options: { fallback: ReactNode }) => options.fallback) as unknown as BlockRenderProps['renderSlotChain'];
const loadImage = (async () => ({ data: new Uint8Array(), mediaType: 'image/png' })) as unknown as BlockRenderProps['loadImage'];

function turnLocation(turn: number, closed = true) {
  return {
    kind: 'turn',
    turn: {
      turn,
      start: { seq: 1, time: 1_700_000_000_000 },
      status: closed ? 'closed' : 'open',
      steps: [{ seq: 2, data: { get: () => undefined } }, { seq: 4, data: { get: () => undefined } }],
      end: closed ? { seq: 9, time: 1_700_000_012_000, data: { reason: { kind: 'completed' } } } : undefined,
      data: {
        get: (kind: string) => kind === 'turn-tail'
          ? {
            tokenUsage: { uncachedInputTokens: 2000, outputTokens: 345, totalTokens: 12_345, cacheReadTokens: 9000 },
            closing: { step: 2, time: 1_700_000_011_000, blocks: [{ kind: 'text', text: 'all done' }], finalNode: { seq: 8, messageId: 'm1' } },
          }
          : undefined,
      },
    },
  };
}

function settled(callId: string, name: string, args: Record<string, unknown>) {
  return {
    kind: 'tool-result', call: { name, argsRaw: JSON.stringify(args) }, callId,
    time: 1, callTime: 0, content: [], isError: false, subCalls: [],
  } as never;
}

/** A settled turn: a question, a call that wrote a file, and an answer. */
function workedTurn() {
  const loc = () => turnLocation(1);
  const nodes = new Map<string, unknown>([
    ['u1', {
      kind: 'user', key: 'u1', seq: 1, time: 1, visibility: 'visible', location: loc(), anchorSeq: 1,
      data: { content: [{ type: 'text', text: '帮我重构这个模块，把设置链路拆出去。' }] },
    }],
    ['a1', {
      kind: 'assistant-step', key: 'a1', seq: 2, time: 2, visibility: 'visible', location: loc(), anchorSeq: 2,
      data: { step: 1, status: 'completed', time: 2, blocks: [{ kind: 'reasoning', text: '先看调用点，再决定拆到哪一层。' }] },
    }],
    ['t1', {
      kind: 'tool-call', key: 't1', seq: 3, time: 3, visibility: 'visible', location: loc(), anchorSeq: 3,
      data: { root: settled('c1', 'edit', { file_path: '/Users/jiangnan/Documents/workspace/dsh-deckseek/src/client/Reader.tsx', old_string: 'a', new_string: 'b' }) },
    }],
    ['t2', {
      kind: 'tool-call', key: 't2', seq: 4, time: 4, visibility: 'visible', location: loc(), anchorSeq: 4,
      data: { root: settled('c2', 'exec', { command: 'pnpm test -- --reporter dot' }) },
    }],
    ['a2', {
      kind: 'assistant-step', key: 'a2', seq: 8, time: 8, visibility: 'visible', location: loc(), anchorSeq: 8,
      data: {
        step: 2, status: 'completed', time: 8,
        blocks: [{ kind: 'text', text: '拆完了。调用点只有两处，都在 reader 里，已经一起改掉；`--dx-frame` 那层也顺手换了来源，因为原来的 token 是发丝线，不是用来画窗框的。' }],
      },
    }],
    ['tt', {
      kind: 'turn-tail', key: 'tt', seq: 10, time: 1_700_000_010_000, visibility: 'visible', location: loc(), anchorSeq: 10,
      data: { tokenUsage: { uncachedInputTokens: 2000, outputTokens: 345, totalTokens: 12_345, cacheReadTokens: 9000 }, closing: { step: 2, time: 1_700_000_011_000, blocks: [{ kind: 'text', text: 'all done' }], finalNode: { seq: 8, messageId: 'm1' } } },
    }],
  ]);
  return { order: ['u1', 'a1', 't1', 't2', 'a2', 'tt'], nodes, turns: new Map([[1, turnLocation(1).turn]]) };
}

const fixture = workedTurn();
const store = createReaderStore().create('preview');
const useStore = (selector: (state: { expanded: Record<string, boolean>; motion: boolean }) => unknown) =>
  useSyncExternalStore(store.subscribe, () => selector(store.getSnapshot()));

const { container } = render(<Reader
  sessionId={'s1' as never}
  useChat={(selector: (snapshot: unknown) => unknown) => selector({ order: fixture.order, nodes: fixture.nodes, timeline: { turnOrder: [...fixture.turns.keys()], turns: fixture.turns } })}
  useSession={(selector: (snapshot: unknown) => unknown) => selector({ openError: undefined, openState: 'ready', hasMore: false, loadingOlder: false })}
  useSessionStatus={(selector: (snapshot: unknown) => unknown) => selector({ get: () => undefined })}
  useSessions={(selector: (snapshot: unknown) => unknown) => selector({ byId: { s1: { cwd: '/Users/jiangnan/Documents/workspace/dsh-deckseek' } } })}
  useStore={useStore as never}
  actions={store.actions as never}
  useSkin={() => 'terminal' as never}
  useWorkDetail={() => 'standard' as never}
  useTexture={() => 'off' as never}
  setSkin={() => {}}
  setWorkDetail={() => {}}
  setTexture={() => {}}
  loadOlder={async () => {}}
  loadImage={loadImage}
  renderSlotChain={renderSlotChain}
  forkAt={() => {}}
  t={((key: string) => key) as never}
/>);

const root = container.querySelector('.root');
if (!root) throw new Error('Reader rendered no .root');
writeFileSync('/tmp/preview/dom-fragment.html', root.outerHTML);
console.log('dumped', root.outerHTML.length, 'bytes of real DOM');
console.log('classes seen:', [...new Set([...root.querySelectorAll('*')].flatMap(el => [...el.classList]))].slice(0, 40).join(' '));

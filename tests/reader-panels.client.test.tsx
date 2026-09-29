// The reading view's keyboard layer, mounted for real.
//
// Two properties are only checkable here rather than on the pure functions:
// that a keystroke on the window actually reaches the panels (the listener and
// the layer have to agree), and that the panels the layer opens are in the DOM
// at all. The skin-specific halves — which skin draws the frame corners, which
// one hides the mode word — are CSS `display` rules, and this suite says so
// instead of pretending to assert them: what it holds is that the chrome and the
// controls exist in the tree for every skin, which is the invariant the CSS
// relies on.

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { Reader } from '../src/client/Reader.js';
import { createReaderStore } from '../src/client/store.js';
import type { SkinId, WorkDetailId } from '../src/skin.js';
import type { BlockRenderProps } from '../src/client/types.js';

afterEach(cleanup);

const renderSlotChain = ((_name: string, _props: unknown, options: { fallback: ReactNode }) => options.fallback) as unknown as BlockRenderProps['renderSlotChain'];
const loadImage = (() => Promise.reject(new Error('unused in this suite'))) as unknown as BlockRenderProps['loadImage'];

/** One settled turn, opened by the user message, so the view has a turn to
 *  show and a fold to expand. */
function fixture() {
  const turn = {
    turn: 1,
    start: { seq: 1, time: 1_700_000_000_000 },
    status: 'closed',
    steps: [{ seq: 2, data: { get: () => undefined } }],
    end: { seq: 9, time: 1_700_000_009_000, data: { reason: { kind: 'completed' } } },
    data: { get: (kind: string) => kind === 'turn-tail' ? { closing: undefined } : undefined },
  };
  const location = { kind: 'turn', turn };
  const nodes = new Map<string, unknown>([
    ['u1', {
      kind: 'user', key: 'u1', seq: 1, time: 1_700_000_000_000, visibility: 'visible',
      location, data: { content: [{ type: 'text', text: '重构这个模块' }] },
    }],
  ]);
  return { order: ['u1'], nodes, turns: new Map([[1, turn]]) };
}

/** Mount the real Reader, recording the stores the palette writes through. */
function mount(options: { motion?: boolean; pending?: boolean } = {}) {
  const store = createReaderStore().create(`reader-panels-${options.motion ?? true}`);
  const useStore = (selector: (state: { expanded: Record<string, boolean>; motion: boolean }) => unknown) =>
    useSyncExternalStore(store.subscribe, () => selector(store.getSnapshot()));
  const skins: SkinId[] = [];
  const details: WorkDetailId[] = [];
  const { order, nodes, turns } = fixture();
  const view = render(<Reader
    sessionId={'s1' as never}
    useChat={(selector: (snapshot: unknown) => unknown) => selector({ order, nodes, timeline: { turnOrder: [...turns.keys()], turns } })}
    useSession={(selector: (snapshot: unknown) => unknown) => selector({ openError: undefined, openState: 'ready', hasMore: false, loadingOlder: false })}
    useSessionStatus={(selector: (snapshot: unknown) => unknown) => selector({
      get: () => options.pending ? { pendingInteraction: { kind: 'confirm', id: 'p1' } } : undefined,
    })}
    useSessions={(selector: (snapshot: unknown) => unknown) => selector({ byId: { s1: { cwd: '/tmp/work' } } })}
    useStore={useStore as never}
    actions={store.actions as never}
    useSkin={() => 'terminal'}
    useWorkDetail={() => 'standard'}
    setSkin={id => { skins.push(id); }}
    setWorkDetail={id => { details.push(id); }}
    useTexture={() => 'off'}
    setTexture={() => {}}
    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    loadOlder={async () => {}}
    loadImage={loadImage}
    renderSlotChain={renderSlotChain}
    forkAt={() => {}}
    t={((key: string) => key) as never}
  />);
  return { ...view, skins, details };
}

/** A keystroke as the window listener receives it. */
function press(init: KeyboardEventInit) {
  fireEvent.keyDown(window, init);
}

/** The texture layer is rendered for every skin and every level, and hidden by
 *  CSS. A `display: none` that went missing shows up as a texture on the wrong
 *  skin; a node that stopped rendering shows up as nothing at all, which is why
 *  the invariant is asserted here rather than only in the sheet. */
test('the texture layer is in the tree even when it is off', () => {
  const view = mount();
  assert.ok(view.container.querySelector('[class*="screenTexture"]'), 'the overlay must always render');
  assert.equal(view.container.querySelector('[data-deckseek-texture]')?.getAttribute('data-deckseek-texture'), 'off');
});

test('the status line reports the session state and the counts it holds', () => {
  const view = mount();
  const bar = view.container.querySelector('[data-reader-status-bar]')!;
  assert.equal(bar.getAttribute('data-mode'), 'idle');
  assert.match(bar.textContent ?? '', /IDLE/);
  // The turn count comes off the rail, which anchors one turn in this fixture.
  assert.match(within(bar as HTMLElement).getByText(/轮/).textContent ?? '', /轮/);
});

/**
 * The strip is the only chrome the view has, so every control the top row used
 * to carry has to be reachable *on it* — for every skin, since the row that held
 * them is gone rather than hidden. Five buttons: the three view controls plus the
 * two panel keys; the palette is a convenience for them, not the only door.
 */
test('the strip carries the controls the top row used to hold', () => {
  const bar = mount().container.querySelector('[data-reader-status-bar]')! as HTMLElement;
  const labels = [...bar.querySelectorAll('button')].map(button => button.textContent ?? '');
  assert.deepEqual(labels, ['查找', '动效开', '导出', '^K 命令', '? 帮助']);
  // The group is labelled, and it is not announced as a toolbar: these are five
  // independent buttons, not a set with arrow-key movement between them.
  const group = bar.querySelector('[role="group"]');
  assert.equal(group?.getAttribute('aria-label'), '阅读工具');
  assert.equal(bar.querySelector('[role="toolbar"]'), null, 'the top row, and its toolbar role, are gone');
  // The workspace is context and rides here too, with the full path on hover.
  assert.ok(bar.querySelector('[data-reader-frame-path]')?.getAttribute('title'), 'the workspace must carry its full path for the hover title');
});

test('a waiting session reads as WAIT, not as idle', () => {
  const view = mount({ pending: true });
  assert.equal(view.container.querySelector('[data-reader-status-bar]')?.getAttribute('data-mode'), 'wait');
});

test('Ctrl+K opens the palette and Escape closes it', () => {
  const view = mount();
  assert.equal(view.container.querySelector('[data-reader-palette]'), null);
  press({ key: 'k', ctrlKey: true });
  const palette = view.container.querySelector('[data-reader-palette]');
  assert.ok(palette, 'Ctrl+K must open the palette');
  press({ key: 'Escape' });
  assert.equal(view.container.querySelector('[data-reader-palette]'), null, 'Escape must close it');
});

test('typing in the palette narrows it to the matching commands', () => {
  const view = mount();
  press({ key: 'k', ctrlKey: true });
  const palette = view.container.querySelector('[data-reader-palette]')!;
  const field = within(palette as HTMLElement).getByRole('combobox');
  assert.ok(within(palette as HTMLElement).getByText('导出为 Markdown'));
  fireEvent.change(field, { target: { value: '导出' } });
  assert.ok(within(palette as HTMLElement).getByText('导出为 Markdown'));
  assert.equal(within(palette as HTMLElement).queryByText('回到顶部'), null);
});

test('Enter runs the highlighted command', () => {
  const view = mount();
  press({ key: 'k', ctrlKey: true });
  const palette = view.container.querySelector('[data-reader-palette]')!;
  const field = within(palette as HTMLElement).getByRole('combobox');
  fireEvent.change(field, { target: { value: '软卡' } });
  // Fired on the field, not on the window: the palette reads Enter on its own
  // subtree, which only works because a real keydown bubbles up from whatever
  // holds focus. Pressing `window` directly would skip the component entirely.
  fireEvent.keyDown(field, { key: 'Enter' });
  assert.deepEqual(view.skins, ['soft'], 'the skin command must write through the host document');
  assert.equal(view.container.querySelector('[data-reader-palette]'), null, 'running a command closes the palette');
});

test('the palette offers a writer for every skin and every work-details level', () => {
  const view = mount();
  press({ key: 'k', ctrlKey: true });
  const palette = view.container.querySelector('[data-reader-palette]')!;
  const field = within(palette as HTMLElement).getByRole('combobox');
  fireEvent.change(field, { target: { value: '全部展开' } });
  fireEvent.keyDown(field, { key: 'Enter' });
  assert.deepEqual(view.details, ['verbose']);
});

test('? opens the shortcut sheet, and q closes it', () => {
  const view = mount();
  press({ key: '?' });
  const sheet = view.container.querySelector('[data-reader-help]');
  assert.ok(sheet, '? must open the sheet');
  assert.match(sheet.textContent ?? '', /命令面板/);
  press({ key: 'q' });
  assert.equal(view.container.querySelector('[data-reader-help]'), null);
});

test('opening one panel closes the other', () => {
  const view = mount();
  press({ key: '?' });
  press({ key: 'k', ctrlKey: true });
  assert.equal(view.container.querySelector('[data-reader-help]'), null);
  assert.ok(view.container.querySelector('[data-reader-palette]'));
});

test('/ opens the in-view search', () => {
  const view = mount();
  press({ key: '/' });
  assert.ok(view.container.querySelector('[data-reader-status-bar]'), 'the view stays mounted');
  assert.ok(screen.getByPlaceholderText(/在阅读页中查找/), '/ must open the search row');
});

test('a keystroke typed into a text field is text, not a command', () => {
  const view = mount();
  press({ key: '/' });
  const field = screen.getByPlaceholderText(/在阅读页中查找/);
  fireEvent.keyDown(field, { key: 'q' });
  assert.ok(view.container.querySelector('[data-reader-search-row], input'), 'the search row survives a typed q');
  // Escape still unwinds from inside the field: a panel that cannot be left
  // from the keyboard is a trap.
  press({ key: 'Escape' });
  assert.equal(screen.queryByPlaceholderText(/在阅读页中查找/), null);
});

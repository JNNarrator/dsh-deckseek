import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { useRef } from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { TurnRail } from '../src/client/TurnRail.js';
import css from '../src/client/Reader.module.css';

afterEach(cleanup);

// happy-dom reports every rect as zero; pin per-element tops through
// data-rect-top so the "which message is on screen" test is deterministic.
const originalRect = Element.prototype.getBoundingClientRect;
beforeEach(() => {
  Element.prototype.getBoundingClientRect = function (): DOMRect {
    const top = Number((this as HTMLElement).dataset?.rectTop ?? 0);
    return { top, bottom: top, height: 0, width: 0, left: 0, right: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  };
});
afterEach(() => { Element.prototype.getBoundingClientRect = originalRect; });

const ITEMS = [
  { key: 'a', turn: 1, label: 'first' },
  { key: 'b', turn: 2, label: 'second' },
  { key: 'c', turn: null, label: 'third' },
];

function Fixture({ anchors = ITEMS.map(item => item.key), tops = { a: '0', b: '100', c: '200' } }: {
  anchors?: readonly string[]; tops?: Record<string, string>;
}) {
  const root = useRef<HTMLDivElement>(null);
  return (
    <div data-conversation-scroll>
      <div ref={root}>
        {anchors.map(key => <div key={key} data-reader-key={key} data-rect-top={tops[key] ?? '0'} />)}
        <TurnRail root={root} items={ITEMS} />
      </div>
    </div>
  );
}

/** The rail row carrying the data-active highlight, as its item key. */
const activeKey = (): string | null => {
  const active = document.querySelector<HTMLElement>('[data-active]');
  if (!active) return null;
  const row = active.closest('li');
  return ITEMS[Array.from(document.querySelectorAll('li')).indexOf(row!)]?.key ?? null;
};

test('Alt+ArrowDown moves to the next message, Alt+ArrowUp back to the previous', () => {
  const { container } = render(<Fixture />);
  // Mount-time position tracking already highlights the first message.
  assert.equal(activeKey(), 'a');
  // Only the first anchor (top 0) sits above the viewport threshold line (24).
  fireEvent.keyDown(window, { key: 'ArrowDown', altKey: true });
  assert.equal(activeKey(), 'b');
  assert.ok(container.querySelector('[data-reader-key="b"]')?.classList.contains(css.markFlash), 'landing anchor flashes');
  // The scroll itself is a no-op in happy-dom; simulate the landing by moving
  // the anchor above the threshold line, then walk on.
  container.querySelector<HTMLElement>('[data-reader-key="b"]')!.dataset.rectTop = '0';
  fireEvent.keyDown(window, { key: 'ArrowDown', altKey: true });
  assert.equal(activeKey(), 'c');
  container.querySelector<HTMLElement>('[data-reader-key="c"]')!.dataset.rectTop = '0';
  fireEvent.keyDown(window, { key: 'ArrowUp', altKey: true });
  assert.equal(activeKey(), 'b');
});

test('plain arrows and chords without a bare Alt are ignored', () => {
  render(<Fixture />);
  fireEvent.keyDown(window, { key: 'ArrowDown' });
  fireEvent.keyDown(window, { key: 'ArrowDown', altKey: true, ctrlKey: true });
  fireEvent.keyDown(window, { key: 'ArrowDown', altKey: true, shiftKey: true });
  fireEvent.keyDown(window, { key: 'ArrowDown', altKey: true, metaKey: true });
  fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true });
  assert.equal(activeKey(), 'a');
});

test('keys are ignored while typing in an editable field', () => {
  const { container } = render(<Fixture />);
  const input = document.createElement('textarea');
  container.appendChild(input);
  fireEvent.keyDown(input, { key: 'ArrowDown', altKey: true });
  fireEvent.keyDown(input, { key: 'ArrowUp', altKey: true });
  assert.equal(activeKey(), 'a');
  assert.equal(container.querySelectorAll(`.${css.markFlash}`).length, 0);
});

test('rows folded behind the turn window (no anchor in DOM) are skipped in the pressed direction', () => {
  const { container } = render(<Fixture anchors={['a', 'c']} />);
  fireEvent.keyDown(window, { key: 'ArrowDown', altKey: true });
  assert.equal(activeKey(), 'c');
  assert.ok(container.querySelector('[data-reader-key="c"]')?.classList.contains(css.markFlash));
});

test('Alt+ArrowUp above the first message is a no-op', () => {
  render(<Fixture />);
  fireEvent.keyDown(window, { key: 'ArrowUp', altKey: true });
  assert.equal(activeKey(), 'a');
});

test('at the document end the last message is current, so Up reaches the previous one', () => {
  // All anchors below the threshold and scroll metrics read as "at bottom"
  // (happy-dom reports zero heights): the at-bottom rule makes the last item
  // current, so Alt+ArrowUp steps back to the second-to-last.
  render(<Fixture tops={{ a: '100', b: '100', c: '100' }} />);
  fireEvent.keyDown(window, { key: 'ArrowUp', altKey: true });
  assert.equal(activeKey(), 'b');
});

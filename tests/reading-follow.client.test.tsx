// The transcript's follower: who owns the scrollport, and when the view stops
// following the newest content.
//
// This is the reader-visible half of "keep the newest work at the bottom", and
// its failures are all of one shape — the view quietly stays where it was while
// content arrives below it. Three of them are pinned here:
//
//  1. a jump is not the reader leaving. The smooth scroll a jump starts fires
//     scroll events that belong to neither the follower's own write nor a hand;
//     read as "the reader scrolled away", they detached the view a moment after
//     the reader asked it to come back down.
//  2. a pause is not a decision. Auto-follow gives way while the reader selects
//     text or focuses a field inside a record, and nothing used to restart it
//     when that ended — `following` stayed true, so not even the "back to latest"
//     control appeared. A copy-and-click-away parked the view for the rest of the
//     session, which is exactly "it still sits on the messages above".
//  3. a hand still outranks the follow: a wheel upward detaches and the pill
//     appears, and scrolling back to the bottom hands it back.
//
// The environment has no layout and no real resizes, so the scrollport's numbers
// are supplied by the test and the growth signal is a fake observer the test
// fires by hand. That is not a workaround: growth is the input this hook runs on,
// and a test that assumed it arrived on its own would measure happy-dom.

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useReadingScroll } from '../src/client/motion.js';
import { jumpLock } from '../src/client/jump-lock.js';

afterEach(() => { jumpLock.active = false; });

interface Port {
  readonly element: HTMLElement;
  /** Where the viewport actually is. */
  top: () => number;
  /** Move it the way a hand or a smooth scroll would, without clamping. */
  at: (value: number) => void;
  /** Content arrived: the scroll range grew. */
  growTo: (scrollHeight: number) => void;
}

/** A scroll box happy-dom will not lay out, with the numbers the browser would. */
function measurePort(element: HTMLElement, { scrollHeight, clientHeight }: { scrollHeight: number; clientHeight: number }): Port {
  let top = 0;
  let range = scrollHeight;
  Object.defineProperty(element, 'scrollHeight', { configurable: true, get: () => range });
  Object.defineProperty(element, 'clientHeight', { configurable: true, value: clientHeight });
  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    get: () => top,
    // Clamped the way a browser clamps: `writeTop(scrollHeight)` is a legal way to
    // mean "the bottom", and the follower reads its own write back.
    set: (value: number) => { top = Math.max(0, Math.min(value, range - clientHeight)); },
  });
  return { element, top: () => top, at: value => { top = value; }, growTo: value => { range = value; } };
}

class FakeResizeObserver {
  static live: FakeResizeObserver[] = [];
  constructor(private readonly callback: () => void) { FakeResizeObserver.live.push(this); }
  observe(): void { /* the test decides when content grows */ }
  disconnect(): void { FakeResizeObserver.live = FakeResizeObserver.live.filter(entry => entry !== this); }
  /** Report one resize, as the browser would after layout. */
  grow(): void { act(() => { this.callback(); }); }
}

/** A frame of the follower's own chase, awaited for real: it schedules through rAF. */
const frame = (): Promise<void> => new Promise(resolve => { requestAnimationFrame(() => resolve()); });

/**
 * A clock the test owns.
 *
 * The follower decides whether a scroll event is its own write or the reader's
 * hand by comparing a timestamp, so a test about that decision has to move the
 * clock rather than sleep through it — a real wait would be a 200ms sleep per
 * case, and the margin is exactly what is being exercised.
 */
function fakeClock(): { at: (ms: number) => void; restore: () => void } {
  const original = Object.getOwnPropertyDescriptor(performance, 'now');
  let now = 0;
  Object.defineProperty(performance, 'now', { value: () => now, configurable: true });
  return {
    at: value => { now = value; },
    restore: () => {
      if (original) Object.defineProperty(performance, 'now', original);
      else delete (performance as unknown as { now?: unknown }).now;
    },
  };
}

interface Handle {
  readonly root: Root;
  readonly container: HTMLElement;
  readonly port: Port;
  state: () => { detached: boolean; unread: number };
  jump: () => void;
}

function Harness({ handle }: { handle: Handle }) {
  const root = useRef<HTMLDivElement>(null);
  const scroll = useReadingScroll(root, false);
  // The harness hands the hook's live values straight to the test: React renders
  // synchronously under `act`, so what the test reads is what just committed.
  handle.state = () => ({ detached: scroll.detached, unread: scroll.unread });
  handle.jump = scroll.jump;
  // The reading view inside the host's own scrollport. The records are what the
  // follower keeps its place by when it is detached, and the field is the pause
  // this suite is about.
  return <div ref={root} className="root">
    <article data-reader-anchor data-reader-key="a1">first</article>
    <article data-reader-anchor data-reader-key="a2">second</article>
    <input aria-label="记录里的字段" />
  </div>;
}

function mount(): Handle {
  const container = document.createElement('div');
  const portElement = document.createElement('div');
  portElement.setAttribute('data-conversation-scroll', '');
  container.appendChild(portElement);
  document.body.appendChild(container);
  const root = createRoot(portElement);
  const handle = { root, container, port: null as unknown as Port, state: () => ({ detached: false, unread: 0 }), jump: () => {} };
  act(() => { root.render(<Harness handle={handle} />); });
  handle.port = measurePort(portElement, { scrollHeight: 1600, clientHeight: 400 });
  return handle;
}

async function withFakeResize(run: () => Promise<void>): Promise<void> {
  const scope = globalThis as unknown as { ResizeObserver: unknown };
  const original = scope.ResizeObserver;
  scope.ResizeObserver = FakeResizeObserver;
  FakeResizeObserver.live = [];
  try {
    await run();
  } finally {
    scope.ResizeObserver = original;
    FakeResizeObserver.live = [];
  }
}

test('a jump is not the reader leaving the bottom', async () => {
  const clock = fakeClock();
  try {
    await withFakeResize(async () => {
      const handle = mount();
      await frame();
      assert.equal(handle.state().detached, false, 'a freshly mounted view follows');
      // The smooth scroll a jump starts: a stream of positions that are neither
      // the follower's own write nor a hand, arriving while the lock is held.
      // The clock moves first, so these cannot be waved away as the write from
      // the last frame — the lock is the only thing that explains them.
      act(() => { handle.jump(); });
      let clockAt = 1000;
      // Asserted at every step rather than only at the end: a jump in flight is
      // short of the bottom for most of its frames, and a check at the end alone
      // would pass even with the lock ignored — the last frame is the bottom
      // again, where every rule re-attaches.
      for (const top of [200, 600, 900, 1200]) {
        clock.at(clockAt += 50);
        handle.port.at(top);
        act(() => { handle.port.element.dispatchEvent(new Event('scroll')); });
        assert.equal(handle.state().detached, false, `the jump may not detach the view mid-flight (at ${top})`);
      }
      act(() => { handle.root.unmount(); });
      handle.container.remove();
    });
  } finally { clock.restore(); }
});

test('the follow resumes when the pause that suspended it ends', async () => {
  await withFakeResize(async () => {
    const handle = mount();
    await frame();
    const field = handle.container.querySelector('input')!;
    // The reader focuses a field inside a record: the chase gives way, which is
    // deliberate — they are working in the text, not reading past it.
    act(() => { field.focus(); });
    const before = handle.port.top();
    handle.port.growTo(2400);
    FakeResizeObserver.live.at(-1)!.grow();
    assert.equal(handle.port.top(), before, 'a paused follower does not move the viewport');

    // They leave the field. Nothing else happens — no new content, no keystroke —
    // and the view has to come back down on its own.
    act(() => { field.blur(); });
    await frame();
    assert.ok(handle.port.top() > before, 'the end of the pause resumes the chase');
    assert.equal(handle.state().detached, false);
    act(() => { handle.root.unmount(); });
    handle.container.remove();
  });
});

test('a hand on the wheel still outranks the follow', async () => {
  const clock = fakeClock();
  try {
    await withFakeResize(async () => {
      const handle = mount();
      await frame();
      act(() => { handle.port.element.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true })); });
      assert.equal(handle.state().detached, true, 'scrolling up is a decision, and the pill says so');

      // Coming back to the bottom hands it back, without needing the pill — and
      // it has to arrive late enough to be read as a hand rather than as the
      // follower's own write from the last frame.
      clock.at(1000);
      handle.port.at(1200);
      act(() => { handle.port.element.dispatchEvent(new Event('scroll')); });
      assert.equal(handle.state().detached, false);
      act(() => { handle.root.unmount(); });
      handle.container.remove();
    });
  } finally { clock.restore(); }
});

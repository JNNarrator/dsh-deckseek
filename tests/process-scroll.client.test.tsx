/**
 * The capped process body: which edges hide content, and when they are dropped.
 *
 * Two things are pinned here, and they fail in different ways. The edge maths is
 * pure and its failure mode is a fade that flickers at the scroll floor — a
 * sub-pixel bug no screenshot review catches. The drop conditions are wiring and
 * their failure mode is worse: fades painted over a body nobody can see, or a
 * body that loses its fades for good because the guard that suppressed them was
 * sticky.
 *
 * jsdom reports every `scrollHeight`/`clientHeight` as 0, so the mount tests
 * define the metrics on the element rather than trusting layout. That is not a
 * workaround — it is the only way to assert the fades at all, and it keeps the
 * test honest about the fact that the cap itself is CSS, not measured here.
 *
 * Which levels get the cap is not pinned here either, because it is not this
 * hook's decision; `reader-seats` pins it on the rendered body.
 *
 * A test asserting that `scrollTop` survives a re-render used to live here. It
 * could never fail: jsdom neither re-creates the element nor clamps `scrollTop`,
 * so it measured the environment, not the plugin. The position restore it was
 * covering turned out to be unreachable too, and both were deleted rather than
 * kept as a pair that agreed with each other and nothing else.
 *
 * One thing deliberately not asserted: the render-loop hazard. `sync` is called
 * from a no-dependency effect on every render, so it is only safe because both
 * `setEdges` calls keep the previous object when nothing changed; a mutant that
 * suppresses the collapsed branch *without returning* falls through and competes
 * with the compute branch, looping forever. That failure mode is a hang at the
 * runner cap with no per-test line — the same shape as passing a DOM node to
 * `assert.equal` — so it is documented here rather than pinned.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { act, useRef, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PROGRAMMATIC_MS, useProcessScroll, edgesOf, metricsOf } from '../src/client/process-scroll.js';

/** Give an element the three numbers the browser would compute for a scroll box. */
function measure(element: HTMLElement, { scrollTop, scrollHeight, clientHeight, onWrite }: {
  scrollTop: number; scrollHeight: number; clientHeight: number;
  /** Called with every position written to the element, so a test can see the
   *  writes a follow makes rather than only where it ended up. */
  onWrite?: (top: number) => void;
}): void {
  Object.defineProperty(element, 'scrollHeight', { value: scrollHeight, configurable: true });
  Object.defineProperty(element, 'clientHeight', { value: clientHeight, configurable: true });
  // `scrollTop` is an own property here rather than happy-dom's accessor: the
  // environment has no layout, so its clamping would measure the stub rather
  // than the plugin — and the writes are half of what these tests are about.
  let top = scrollTop;
  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    get: () => top,
    set: (value: number) => { top = value; onWrite?.(value); },
  });
}

/**
 * The growth signal, under the test's control.
 *
 * The follow is driven by a `ResizeObserver` — content arriving inside a body
 * that is already at its cap — and happy-dom reports no resizes at all, so
 * without this a test could only ever exercise the initial pin. The fake keeps
 * the shape the hook uses (`observe` / `disconnect`) and lets the test say when
 * the body grew.
 */
class FakeResizeObserver {
  static live: FakeResizeObserver[] = [];
  constructor(private readonly callback: () => void) { FakeResizeObserver.live.push(this); }
  observe(): void { /* the test decides when a resize happens */ }
  disconnect(): void { FakeResizeObserver.live = FakeResizeObserver.live.filter(entry => entry !== this); }
  /** Report one resize, as the browser would after layout. */
  grow(): void { act(() => { this.callback(); }); }
}

function withFakeResize(run: () => void): void {
  const scope = globalThis as unknown as { ResizeObserver: unknown };
  const original = scope.ResizeObserver;
  scope.ResizeObserver = FakeResizeObserver;
  FakeResizeObserver.live = [];
  try { run(); } finally { scope.ResizeObserver = original; FakeResizeObserver.live = []; }
}

/**
 * A clock the test owns.
 *
 * Both followers decide whether a scroll event is their own write or the
 * reader's hand by comparing a timestamp, so a test about that decision has to
 * move the clock itself rather than sleep through it.
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

test('the floor is the overflow, never negative', () => {
  assert.deepEqual(metricsOf({ scrollTop: 0, scrollHeight: 400, clientHeight: 400 }), { top: 0, floor: 0 });
  // A body shorter than its cap has no overflow to scroll, and a negative floor
  // would report `canScrollDown` for a body with nothing below it.
  assert.deepEqual(metricsOf({ scrollTop: 0, scrollHeight: 120, clientHeight: 400 }), { top: 0, floor: 0 });
  assert.deepEqual(metricsOf({ scrollTop: 50, scrollHeight: 1000, clientHeight: 400 }), { top: 50, floor: 600 });
});

test('an unscrolled body offers only the downward edge', () => {
  assert.deepEqual(edgesOf({ top: 0, floor: 600 }), { canScrollUp: false, canScrollDown: true });
});

test('a body at its floor offers only the upward edge', () => {
  assert.deepEqual(edgesOf({ top: 600, floor: 600 }), { canScrollUp: true, canScrollDown: false });
});

test('a body in the middle offers both edges', () => {
  assert.deepEqual(edgesOf({ top: 300, floor: 600 }), { canScrollUp: true, canScrollDown: true });
});

test('a body with no overflow offers neither edge', () => {
  assert.deepEqual(edgesOf({ top: 0, floor: 0 }), { canScrollUp: false, canScrollDown: false });
});

test('a fractional floor does not flicker the bottom fade', () => {
  // Fractional line heights make the real floor non-integral. Without slack the
  // bottom fade would blink on and off as the reader reaches the end.
  assert.deepEqual(edgesOf({ top: 599.5, floor: 600 }), { canScrollUp: true, canScrollDown: false });
  assert.deepEqual(edgesOf({ top: 0.5, floor: 600 }), { canScrollUp: false, canScrollDown: true });
});

interface HarnessProps {
  onEdges: (edges: { canScrollUp: boolean; canScrollDown: boolean }) => void;
  open: boolean;
  /** The turn is still running, so the body follows its newest row. */
  follow?: boolean;
  body: (element: HTMLDivElement | null) => void;
}

function Harness({ onEdges, open, follow = false, body }: HarnessProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scroll = useProcessScroll(bodyRef, contentRef, open, follow);
  onEdges(scroll.edges);
  return <div ref={element => { bodyRef.current = element; body(element); }} onScroll={scroll.events.onScroll}>
    <div ref={contentRef} />
  </div>;
}

function mount(node: ReactNode): { root: Root; container: HTMLElement } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(node); });
  return { root, container };
}

test('a scrollable body reports both edges once measured', () => {
  let seen: { canScrollUp: boolean; canScrollDown: boolean } | null = null;
  let element: HTMLDivElement | null = null;
  const { root } = mount(<Harness open onEdges={value => { seen = value; }} body={value => { element = value; }} />);
  // Layout is not run by jsdom, so the metrics are supplied here and the hook is
  // re-run by a real scroll event — the same path the browser takes.
  measure(element!, { scrollTop: 300, scrollHeight: 1000, clientHeight: 400 });
  act(() => { element!.dispatchEvent(new Event('scroll')); });
  assert.deepEqual(seen, { canScrollUp: true, canScrollDown: true });
  act(() => { root.unmount(); });
});

test('a folded body publishes no edges, because nothing can act on them', () => {
  let seen: { canScrollUp: boolean; canScrollDown: boolean } | null = null;
  let element: HTMLDivElement | null = null;
  const { root, container } = mount(<Harness open={false} onEdges={value => { seen = value; }} body={value => { element = value; }} />);
  measure(element!, { scrollTop: 300, scrollHeight: 1000, clientHeight: 400 });
  act(() => { element!.dispatchEvent(new Event('scroll')); });
  // A body inside a closed disclosure is `hidden`; publishing fades for it would
  // paint a mask over content nobody can see.
  assert.deepEqual(seen, { canScrollUp: false, canScrollDown: false });
  act(() => { root.unmount(); });
  container.remove();
});

test('reopening the fold republishes the edges it suppressed', () => {
  let seen: { canScrollUp: boolean; canScrollDown: boolean } | null = null;
  let element: HTMLDivElement | null = null;
  const edges = (value: { canScrollUp: boolean; canScrollDown: boolean }) => { seen = value; };
  const body = (value: HTMLDivElement | null) => { element = value; };
  const { root, container } = mount(<Harness open onEdges={edges} body={body} />);
  measure(element!, { scrollTop: 300, scrollHeight: 1000, clientHeight: 400 });
  act(() => { element!.dispatchEvent(new Event('scroll')); });
  act(() => { root.render(<Harness open={false} onEdges={edges} body={body} />); });
  // Caught in 2 ms by dropping `open` from `sync`'s dependencies — a forgotten
  // dep is the plausible version of this bug, and it leaves a closed body wearing
  // fades for content nobody can see.
  assert.deepEqual(seen, { canScrollUp: false, canScrollDown: false }, 'closing drops the fades');
  // The collapse guard must not be sticky: a reader who closes a group and opens
  // it again is looking straight at a capped body, and a body that stays at rest
  // silently loses both fades — the content below is real, and nothing says so.
  act(() => { root.render(<Harness open onEdges={edges} body={body} />); });
  assert.deepEqual(seen, { canScrollUp: true, canScrollDown: true }, 'reopening restores them');
  act(() => { root.unmount(); });
  container.remove();
});

/**
 * The follow inside a capped body.
 *
 * This exists because the transcript's follower cannot cover this case: a body
 * at its cap does not grow the transcript, so new rows land out of sight while
 * the outer follower has nothing to chase. The reader's report — the view sitting
 * on the messages above while a turn runs — is what these four tests hold apart:
 * pin while running and unclaimed, grow with the body, give way to the reader,
 * hand it back at the floor, and never touch a settled turn.
 */
test('a running body is pinned to its floor and stays there as it grows', () => {
  const clock = fakeClock();
  try {
    const writes: number[] = [];
    let element: HTMLDivElement | null = null;
    withFakeResize(() => {
      mount(<Harness open follow onEdges={() => {}} body={value => { element = value; }} />);
      measure(element!, { scrollTop: 0, scrollHeight: 1000, clientHeight: 400, onWrite: top => writes.push(top) });
      // Growth is the case the follow exists for: the body is already at its cap,
      // so only the content inside it changed.
      clock.at(100);
      FakeResizeObserver.live.at(-1)!.grow();
      assert.deepEqual(writes, [1000], 'the growth pins the body to its newest row');
      clock.at(200);
      FakeResizeObserver.live.at(-1)!.grow();
      assert.equal(element!.scrollTop, 1000, 'and again on the next burst');
    });
  } finally { clock.restore(); }
});

test('the body is pinned when the turn starts, before anything paints', () => {
  const clock = fakeClock();
  try {
    const writes: number[] = [];
    let element: HTMLDivElement | null = null;
    const { root, container } = mount(<Harness open follow onEdges={() => {}} body={value => { element = value; }} />);
    // A body that already holds rows when it appears — the reader expanded a turn
    // that is running — must open at its newest row, not at its first one.
    measure(element!, { scrollTop: 0, scrollHeight: 900, clientHeight: 400, onWrite: top => writes.push(top) });
    act(() => { root.render(<Harness open follow={false} onEdges={() => {}} body={value => { element = value; }} />); });
    act(() => { root.render(<Harness open follow onEdges={() => {}} body={value => { element = value; }} />); });
    assert.equal(writes.at(-1), 900, 'the running turn opens at its floor');
    act(() => { root.unmount(); });
    container.remove();
  } finally { clock.restore(); }
});

test('the reader who scrolls the body themselves keeps it', () => {
  const clock = fakeClock();
  try {
    let element: HTMLDivElement | null = null;
    withFakeResize(() => {
      const { root, container } = mount(<Harness open follow onEdges={() => {}} body={value => { element = value; }} />);
      measure(element!, { scrollTop: 0, scrollHeight: 1000, clientHeight: 400 });
      clock.at(100);
      FakeResizeObserver.live.at(-1)!.grow();
      assert.equal(element!.scrollTop, 1000, 'following to begin with');

      // The reader pages back through the calls. Their scroll arrives later than
      // our last write, which is how the hook tells the two apart.
      clock.at(900);
      element!.scrollTop = 200;
      act(() => { element!.dispatchEvent(new Event('scroll')); });
      clock.at(1000);
      FakeResizeObserver.live.at(-1)!.grow();
      assert.equal(element!.scrollTop, 200, 'a hand on the body outranks the follow');

      // Back at the floor, they hand it back: the same rule the transcript's
      // follower applies one level up.
      clock.at(2000);
      element!.scrollTop = 600;
      act(() => { element!.dispatchEvent(new Event('scroll')); });
      clock.at(2100);
      FakeResizeObserver.live.at(-1)!.grow();
      assert.equal(element!.scrollTop, 1000, 'returning to the floor resumes the follow');

      act(() => { root.unmount(); });
      container.remove();
    });
  } finally { clock.restore(); }
});

test('a settled turn is left exactly where the reader put it', () => {
  const clock = fakeClock();
  try {
    let element: HTMLDivElement | null = null;
    withFakeResize(() => {
      mount(<Harness open onEdges={() => {}} body={value => { element = value; }} />);
      measure(element!, { scrollTop: 0, scrollHeight: 1000, clientHeight: 400 });
      clock.at(100);
      FakeResizeObserver.live.at(-1)!.grow();
      assert.equal(element!.scrollTop, 0, 'a finished turn is one the reader opens to read from the top');
    });
  } finally { clock.restore(); }
});

test('the write guard is longer than a frame and shorter than a reader', () => {
  // Two constraints, and both failures are visible: shorter than a frame and a
  // chase misreads its own write as the reader's hand (the detach this fix is
  // about); long enough to swallow a drag and the reader cannot take the body
  // back at all.
  assert.ok(PROGRAMMATIC_MS >= 34, `the guard must outlast a frame, got ${PROGRAMMATIC_MS}ms`);
  assert.ok(PROGRAMMATIC_MS <= 500, `the guard must not swallow a reader's drag, got ${PROGRAMMATIC_MS}ms`);
});

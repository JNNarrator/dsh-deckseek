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
import { useProcessScroll, edgesOf, metricsOf } from '../src/client/process-scroll.js';

/** Give an element the three numbers the browser would compute for a scroll box. */
function measure(element: HTMLElement, { scrollTop, scrollHeight, clientHeight }: {
  scrollTop: number; scrollHeight: number; clientHeight: number;
}): void {
  Object.defineProperty(element, 'scrollHeight', { value: scrollHeight, configurable: true });
  Object.defineProperty(element, 'clientHeight', { value: clientHeight, configurable: true });
  element.scrollTop = scrollTop;
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
  body: (element: HTMLDivElement | null) => void;
}

function Harness({ onEdges, open, body }: HarnessProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scroll = useProcessScroll(bodyRef, contentRef, open);
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

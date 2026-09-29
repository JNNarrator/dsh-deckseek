import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRef } from 'react';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { ProcessFragment, RetiringContent, DISCLOSURE_SIZE_MS, RETIRE_SIZE_MS } from '../src/client/motion.js';
import { ReasoningCard, RESIZE_MS } from '../src/client/ReasoningCard.js';
import { StreamMotionContext } from '../src/client/streaming.js';
import { WATCHDOG_SLACK_MS } from '../src/client/animation-deadline.js';

/**
 * The liveness guarantee, exercised through the three components that depend on
 * it — the two disclosure bodies and the reasoning card's resize.
 *
 * Two things have to be replaced for this file to test anything at all.
 * happy-dom performs no layout, so every measurement is 0 — a body with nothing
 * to animate never reaches the code under test. And happy-dom's `animate` does
 * finish, so the *path that does not wait for it* would never run. The stub
 * below is the animation that made the bug: it is created, it is never resolved,
 * and it never fires `onfinish`.
 *
 * What can be asserted is therefore read off the double and off the tree: the
 * fill is dropped (the double's `cancel`), a collapse that never reports
 * finishing still leaves the tree, and a card whose resize never lands still
 * gets its inline overrides back. happy-dom cannot paint a height, so it is the
 * removal and the inline style — not a measured box — that prove it.
 */
const MEASURED_HEIGHT = 120;
const WAIT_MS = Math.max(DISCLOSURE_SIZE_MS, RETIRE_SIZE_MS, RESIZE_MS) + WATCHDOG_SLACK_MS + 160;

interface AnimationDouble { onfinish: (() => void) | null; cancels: number; cancel(): void }

let created: AnimationDouble[] = [];
let originalAnimate: typeof Element.prototype.animate;
let originalRect: typeof Element.prototype.getBoundingClientRect;
let originalClientHeight: PropertyDescriptor | undefined;
/** Layout is stubbed, so a card's measured height is whatever the test says. */
let measuredClientHeight = MEASURED_HEIGHT;

beforeEach(() => {
  created = [];
  measuredClientHeight = MEASURED_HEIGHT;
  originalAnimate = Element.prototype.animate;
  originalRect = Element.prototype.getBoundingClientRect;
  originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  Element.prototype.animate = function neverFinishing(this: Element) {
    const double: AnimationDouble = { onfinish: null, cancels: 0, cancel() { this.cancels += 1; } };
    created.push(double);
    return double as unknown as Animation;
  } as typeof Element.prototype.animate;
  Element.prototype.getBoundingClientRect = (() => ({
    height: MEASURED_HEIGHT, width: MEASURED_HEIGHT, top: 0, left: 0, right: MEASURED_HEIGHT, bottom: MEASURED_HEIGHT, x: 0, y: 0, toJSON: () => ({}),
  })) as typeof Element.prototype.getBoundingClientRect;
  Object.defineProperty(Element.prototype, 'scrollHeight', { configurable: true, get: () => MEASURED_HEIGHT });
  // `clientHeight` is an accessor on HTMLElement.prototype, which shadows
  // anything defined on Element.prototype — stub the prototype that wins.
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => measuredClientHeight });
});

afterEach(() => {
  cleanup();
  Element.prototype.animate = originalAnimate;
  Element.prototype.getBoundingClientRect = originalRect;
  delete (Element.prototype as unknown as { scrollHeight?: unknown }).scrollHeight;
  if (originalClientHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
  else delete (HTMLElement.prototype as unknown as { clientHeight?: unknown }).clientHeight;
});

function noop(): void {}

/**
 * The repository's rule for DOM assertions, and the reason this file has a
 * helper at all: `assert.equal(node, null)` **hangs the entire file** the moment
 * it fails, because node's differ deep-formats the element and walks its
 * circular fiber references. A guard that hangs instead of reporting is worse
 * than no guard, so DOM nodes are only ever compared as booleans here.
 */
function rendered(container: HTMLElement, selector: string): boolean {
  return container.querySelector(selector) !== null;
}

/** Let the wall-clock deadline behind the animation actually arrive. */
async function pastDeadline(): Promise<void> {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, WAIT_MS)); });
}

function fragment(open: boolean) {
  return <ProcessFragment open={open} motion onRead={noop} returnFocusTo={createRef<HTMLElement>()} nodeKey="node-1">过程正文</ProcessFragment>;
}

test('a disclosure whose animation never finishes still drops the fill that hides it', async () => {
  const view = render(fragment(false));
  view.rerender(fragment(true));
  assert.equal(created.length, 1, 'the body had something to animate, so the path under test was reached');
  assert.equal(rendered(view.container, '[data-reader-process]'), true);
  assert.equal(created[0]!.cancels, 0, 'while the animation runs, `fill: both` pins the body at its opening height');
  await pastDeadline();
  assert.equal(created[0]!.cancels, 1, 'the deadline drops the fill, which is what makes the row readable');
});

test('a collapse whose animation never finishes still completes', async () => {
  const view = render(fragment(true));
  view.rerender(fragment(false));
  assert.equal(created.length, 1);
  assert.equal(rendered(view.container, '[data-reader-process]'), true, 'the body is still mounted while collapsing');
  await pastDeadline();
  assert.equal(rendered(view.container, '[data-reader-process]'), false, 'the row leaves the tree even though onfinish never came');
});

test('retired narration leaves the tree even when its animation never finishes', async () => {
  const scope = { enabled: true, activatedAt: 0 };
  const view = render(<StreamMotionContext.Provider value={scope}><RetiringContent visible>过程旁白</RetiringContent></StreamMotionContext.Provider>);
  view.rerender(<StreamMotionContext.Provider value={scope}><RetiringContent visible={false}>过程旁白</RetiringContent></StreamMotionContext.Provider>);
  assert.equal(created.length, 1);
  assert.equal(rendered(view.container, '[data-reader-retiring]'), true, 'the retired line is still on screen mid-animation');
  await pastDeadline();
  assert.equal(rendered(view.container, '[data-reader-retiring]'), false, 'stale narration does not stay on screen');
});

test('an expanded reasoning card gets its inline overrides back even when its resize never lands', async () => {
  // `history` without `preview` is the resting card, which is where the reading
  // toggle lives — and the toggle is the only way to reach the resize at all.
  const view = render(<ReasoningCard step={1} active={false} history preview={false} motion selected={false} onRead={noop}>思考正文</ReasoningCard>);
  assert.equal(rendered(view.container, '[data-reader-reasoning-scroll]'), true);
  const port = view.container.querySelector<HTMLElement>('[data-reader-reasoning-scroll]')!;
  assert.equal(rendered(view.container, 'button[aria-expanded]'), true, 'the reading toggle is what reaches the resize');
  // The card only animates when the height actually changed, and layout here is
  // whatever the stub says: mount measured 120, expanding reports 260.
  measuredClientHeight = 260;
  fireEvent.click(view.container.querySelector('button[aria-expanded]')!);
  assert.equal(created.length, 1, 'the card had something to resize, so the path under test was reached');
  assert.equal(port.style.maxHeight, 'none', 'the cap is cleared so the first frame can exceed the old height');
  await pastDeadline();
  assert.equal(port.style.maxHeight, '', 'the inline override comes back even though onfinish never came');
});

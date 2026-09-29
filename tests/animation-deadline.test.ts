import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WATCHDOG_SLACK_MS, settleByDeadline } from '../src/client/animation-deadline.js';
import type { DeadlineClock, Finishable } from '../src/client/animation-deadline.js';

/**
 * The rule under test is "the end state is committed whether or not the
 * animation reports finishing". Both halves of that rule are timing, so the
 * clock is injected and driven by hand: a real timer would make the assertions
 * a race, and the point of this module is that there is no race to lose.
 */
function fakeClock() {
  const entries: { run: () => void; delayMs: number; cancelled: boolean }[] = [];
  const clock: DeadlineClock = {
    schedule: (run, delayMs) => { const entry = { run, delayMs, cancelled: false }; entries.push(entry); return entry; },
    cancel: handle => { (handle as { cancelled: boolean }).cancelled = true; },
  };
  return { clock, entries };
}

/** An animation double whose `onfinish` only fires when the test says so. */
function fakeAnimation() {
  const animation: { onfinish: (() => void) | null } = { onfinish: null };
  return {
    animation: animation as unknown as Finishable,
    finish: () => animation.onfinish?.(),
  };
}

test('the animation finishing commits the end state and drops its deadline', () => {
  const { clock, entries } = fakeClock();
  const { animation, finish } = fakeAnimation();
  const committed: string[] = [];
  settleByDeadline(animation, () => committed.push('settled'), 260, clock);
  assert.deepEqual(committed, [], 'nothing is committed before the animation reports');
  assert.equal(entries.length, 1, 'the deadline is armed when the animation is');
  finish();
  assert.deepEqual(committed, ['settled']);
  assert.equal(entries[0]!.cancelled, true, 'a committed disclosure leaves no timer behind');
});

test('an animation that never finishes is committed by the deadline', () => {
  const { clock, entries } = fakeClock();
  const { animation } = fakeAnimation();
  const committed: string[] = [];
  settleByDeadline(animation, () => committed.push('settled'), 260, clock);
  entries[0]!.run();
  assert.deepEqual(committed, ['settled'], 'the row opens even though onfinish never came');
});

test('the deadline is the duration plus the watchdog slack', () => {
  const { clock, entries } = fakeClock();
  const { animation } = fakeAnimation();
  settleByDeadline(animation, () => {}, 260, clock);
  assert.equal(entries[0]!.delayMs, 260 + WATCHDOG_SLACK_MS);
});

test('finishing and the deadline both arriving still commits exactly once', () => {
  const { clock, entries } = fakeClock();
  const { animation, finish } = fakeAnimation();
  let count = 0;
  settleByDeadline(animation, () => { count += 1; }, 300, clock);
  finish();
  entries[0]!.run();
  assert.equal(count, 1);
});

test('cleaning up stops the deadline, so a superseded animation cannot commit late', () => {
  const { clock, entries } = fakeClock();
  const { animation, finish } = fakeAnimation();
  let count = 0;
  const stop = settleByDeadline(animation, () => { count += 1; }, 260, clock);
  stop();
  entries[0]!.run();
  assert.equal(count, 0, 'the deadline must not commit into a subtree the effect has left');
  assert.equal(entries[0]!.cancelled, true);
  // A re-run replaces the handler, so even a late natural finish is inert.
  finish();
  assert.equal(count, 0);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPINNER_FRAMES, SPINNER_INTERVAL_MS, SPINNER_STILL_FRAME, spinnerFrame } from '../src/client/spinner.ts';

/**
 * The spinner replaced a single breathing `●` because a rotation needs the
 * frames to be interchangeable in one cell. `●` is a wide glyph in CJK-metric
 * monospace fonts and a fixed-width window cut it in half (terminal v3); the
 * whole point of braille is that this can never happen. The check is therefore
 * on the property that makes the rotation safe, not on the exact frames.
 */
test('every braille frame is one narrow cell', () => {
  assert.ok(SPINNER_FRAMES.length >= 8, `expected a rotation, got ${SPINNER_FRAMES.length} frames`);
  for (const frame of SPINNER_FRAMES) {
    const cells = [...frame];
    assert.equal(cells.length, 1, `'${frame}' is more than one glyph`);
    const code = cells[0]!.codePointAt(0)!;
    assert.ok(
      code >= 0x2800 && code <= 0x28ff,
      `'${frame}' is U+${code.toString(16).toUpperCase()}, outside the braille block`,
    );
  }
  // The still frame is one of the rotation's own: a stopped spinner that drew a
  // different glyph would read as a different state.
  assert.ok(SPINNER_FRAMES.includes(SPINNER_STILL_FRAME as never));
});

test('the frame advances one step per tick and wraps', () => {
  assert.equal(spinnerFrame(0), SPINNER_FRAMES[0]);
  assert.equal(spinnerFrame(1), SPINNER_FRAMES[1]);
  assert.equal(spinnerFrame(SPINNER_FRAMES.length), SPINNER_FRAMES[0]);
  // A negative or absurd tick must still land inside the rotation rather than
  // rendering `undefined` — the counter is driven by an interval, and a
  // remount can hand it a value from before.
  assert.equal(spinnerFrame(-1), SPINNER_FRAMES.at(-1));
  assert.equal(spinnerFrame(SPINNER_FRAMES.length * 1000 + 3), SPINNER_FRAMES[3]);
});

test('the interval is visible but not a flicker', () => {
  assert.ok(SPINNER_INTERVAL_MS >= 80 && SPINNER_INTERVAL_MS <= 200, `${SPINNER_INTERVAL_MS}ms is outside the reference range`);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/client/Reader.module.css', import.meta.url), 'utf8');

/**
 * CSS Modules rewrites a keyframe name it finds in an `animation` shorthand to
 * the hashed `@keyframes` name — the built bundle proves it: `@keyframes
 * caretBlink` ships as `_073RcW_caretBlink`, and `animation: thinkShimmer …`
 * ships as `animation:_073RcW_thinkShimmer …`. It does **not** rewrite the
 * contents of a custom property. A name that reaches an `animation` only
 * through a token therefore resolves against nothing and the animation never
 * plays, silently and only in the real build (the test loader is a Proxy and
 * hides it). The terminal cursor and breathing glyph shipped that way once.
 * Timing values may live in tokens — keep the names out.
 */
test('every keyframe name is referenced where CSS Modules can rewrite it', () => {
  const defined = [...css.matchAll(/@keyframes\s+([A-Za-z0-9_-]+)/g)].map(match => match[1]!);
  assert.ok(defined.length >= 3, `expected the skin's keyframes, found ${defined.join(', ') || 'none'}`);

  const customProperties = [...css.matchAll(/--[A-Za-z0-9-]+\s*:\s*([^;}]*)/g)].map(match => match[1]!);
  for (const name of defined) {
    const hidden = customProperties.some(value => new RegExp(`\\b${name}\\b`).test(value));
    assert.ok(!hidden, `${name} is named inside a custom property, where the keyframe rewrite cannot reach it`);
    assert.ok(
      new RegExp(`animation(?:-name)?\\s*:[^;}]*\\b${name}\\b`).test(css),
      `${name} has no literal reference in an animation declaration`,
    );
  }
});

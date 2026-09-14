import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const SRC = fileURLToPath(new URL('../src', import.meta.url));

function cssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(path);
    return entry.name.endsWith('.css') ? [path] : [];
  });
}

const SHEETS = cssFiles(SRC).map(path => ({ path, css: readFileSync(path, 'utf8') }));
const READER_PATH = join(SRC, 'client/Reader.module.css');
const reader = SHEETS.find(sheet => sheet.path === READER_PATH)!;

/** Remove `/* … *\/` comments: prose may quote a colour a sheet must not use. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Remove every `var(...)` expression, honouring nested parentheses. */
function stripVars(css: string): string {
  let out = '';
  let index = 0;
  while (index < css.length) {
    const at = css.indexOf('var(', index);
    if (at === -1) {
      out += css.slice(index);
      break;
    }
    out += css.slice(index, at);
    let depth = 0;
    let cursor = at + 3;
    for (; cursor < css.length; cursor += 1) {
      const char = css[cursor];
      if (char === '(') depth += 1;
      else if (char === ')') {
        depth -= 1;
        if (depth === 0) {
          cursor += 1;
          break;
        }
      }
    }
    index = cursor;
  }
  return out;
}

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
  const defined = [...reader.css.matchAll(/@keyframes\s+([A-Za-z0-9_-]+)/g)].map(match => match[1]!);
  assert.ok(defined.length >= 3, `expected the skin's keyframes, found ${defined.join(', ') || 'none'}`);

  const customProperties = [...reader.css.matchAll(/--[A-Za-z0-9-]+\s*:\s*([^;}]*)/g)].map(match => match[1]!);
  for (const name of defined) {
    const hidden = customProperties.some(value => new RegExp(`\\b${name}\\b`).test(value));
    assert.ok(!hidden, `${name} is named inside a custom property, where the keyframe rewrite cannot reach it`);
    assert.ok(
      new RegExp(`animation(?:-name)?\\s*:[^;}]*\\b${name}\\b`).test(reader.css),
      `${name} has no literal reference in an animation declaration`,
    );
  }
});

/**
 * The reading skins' colours come from the host theme tokens only, so the one
 * literal a plugin sheet may carry is a `var()` fallback — a sandboxed frame has
 * to paint even when the host's tokens are absent. A literal anywhere else
 * silently opts that surface out of both themes at once.
 */
test('no colour literal outside a var() fallback', () => {
  const allowed = new Set(['McpAppFrame.module.css']);
  for (const { path, css } of SHEETS) {
    const bare = stripVars(stripComments(css));
    const literals = bare.match(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g) ?? [];
    const name = path.slice(path.indexOf('/src/') + 5);
    if (allowed.has(name.split('/').pop()!)) {
      assert.deepEqual(literals, [], `${name} keeps its literals inside var() fallbacks only`);
    } else {
      assert.deepEqual(literals, [], `${name} must take every colour from a host token`);
    }
  }
});

/**
 * A `var(--dx-…)` whose token is declared nowhere is an invisible failure: the
 * declaration drops and the element keeps whatever it inherited. The skin token
 * layer is plugin-owned, so its references are checkable without the host.
 */
test('every plugin token a sheet reads is declared somewhere', () => {
  const declared = new Set<string>();
  for (const { css } of SHEETS) {
    for (const match of css.matchAll(/(--dx-[A-Za-z0-9-]+)\s*:/g)) declared.add(match[1]!);
  }
  const missing: string[] = [];
  for (const { path, css } of SHEETS) {
    for (const match of css.matchAll(/var\(\s*(--dx-[A-Za-z0-9-]+)/g)) {
      if (!declared.has(match[1]!)) missing.push(`${match[1]} in ${path.slice(path.indexOf('/src/') + 5)}`);
    }
  }
  assert.deepEqual(missing, [], 'these tokens are read but never declared');
});

/** The focus ring is per skin, and a skin that forgets it falls back to soft's. */
test('every skin declares its own focus ring', () => {
  for (const skin of ['soft', 'paper', 'terminal']) {
    assert.ok(
      new RegExp(`\\[data-deckseek-skin='${skin}'\\]\\s*\\{[^}]*--dx-focus-ring:`).test(reader.css),
      `the ${skin} skin has no --dx-focus-ring`,
    );
  }
});

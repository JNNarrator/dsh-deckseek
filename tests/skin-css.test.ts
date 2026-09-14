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

/** Every `content:` value, as written. */
function contents(css: string): string[] {
  return [...stripComments(css).matchAll(/content:\s*'([^']*)'/g)].map(match => match[1]!);
}

/**
 * A glyph that measures two cells throws off every column it sits in: the tool
 * marker's fixed slot clipped a wide one into a half-disc, and a frame-rotating
 * spinner was rejected for the same reason (see the terminal v3 record). The
 * whole vocabulary is single-cell punctuation, so the rule is checkable — one
 * character, no variation selector, and no glyph from a wide or emoji block.
 */
test('every drawn glyph is one narrow cell', () => {
  const wide = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6\u{1F000}-\u{1FAFF}\uFE0F]/u;
  for (const value of contents(reader.css)) {
    if (value === '') continue; // a rule that draws a box, not a glyph
    const [glyph, ...rest] = [...value];
    assert.equal([...value].length - rest.length, 1, `'${value}' is more than one glyph`);
    assert.ok(rest.every(char => char === ' '), `'${value}' pads with something other than a space`);
    assert.doesNotMatch(glyph!, wide, `'${value}' can measure two cells wide`);
  }
});

/**
 * Colour is never the only signal: each tool phase draws its own glyph in the
 * same declaration that colours it, phases that read the same share both, and
 * red stays reserved for failure. Codewhale's accessibility contract states the
 * rule; this is the half of it a sheet can be held to.
 */
test('tool phases pair a glyph with their colour, and red means failure', () => {
  const rules = [...stripComments(reader.css).matchAll(/([^{}]*toolGlyphState\[data-phase=[^{}]*)\{([^}]*)\}/g)];
  const byPhase = new Map<string, { content: string; color: string }>();
  for (const rule of rules) {
    const phases = [...rule[1]!.matchAll(/data-phase='([a-z]+)'/g)].map(match => match[1]!);
    const content = /content:\s*'([^']*)'/.exec(rule[2]!)?.[1];
    const color = /color:\s*([^;]+)/.exec(rule[2]!)?.[1]?.trim();
    for (const phase of phases) {
      assert.ok(content !== undefined, `${phase} has no glyph`);
      assert.ok(color !== undefined, `${phase} has no colour`);
      byPhase.set(phase, { content: content!, color: color! });
    }
  }
  assert.deepEqual([...byPhase.keys()].sort(),
    ['failed', 'interrupted', 'preparing', 'returned', 'running', 'succeeded'],
    'every tool phase must draw a glyph');
  const glyphs = new Map<string, Set<string>>();
  for (const [phase, { content }] of byPhase) {
    const seen = glyphs.get(content) ?? new Set<string>();
    seen.add(phase);
    glyphs.set(content, seen);
  }
  // Three glyphs for six phases: the pairs differ in wording elsewhere, not here.
  assert.equal(glyphs.size, 3, 'each distinct reading needs its own glyph');
  for (const [content, phases] of glyphs) {
    const colors = new Set([...phases].map(phase => byPhase.get(phase)!.color));
    assert.equal(colors.size, 1, `phases sharing '${content}' must share one colour`);
  }
  const failed = byPhase.get('failed')!.color;
  assert.match(failed, /--dsw-alias-state-error-primary/, 'failure must use the host error token');
  for (const [phase, { color }] of byPhase) {
    if (phase === 'failed' || phase === 'interrupted') continue;
    assert.notEqual(color, failed, `${phase} must not wear the failure colour`);
  }
});

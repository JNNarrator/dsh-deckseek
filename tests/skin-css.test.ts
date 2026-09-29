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

/**
 * The terminal skin colours its furniture by *what a thing is* — a prompt, a
 * workspace path, a count — through a role layer, so the sheet never has to
 * know a colour. The point of the layer is that every role is a host token: a
 * literal here would work in one app theme and fail in the other, and this is
 * the check that keeps the vocabulary honest.
 */
test('every ANSI role resolves to a host token', () => {
  const bare = stripComments(reader.css);
  const declared = new Map<string, string>();
  for (const match of bare.matchAll(/(--dx-[a-z0-9-]+)\s*:\s*([^;}]+)/g)) declared.set(match[1]!, match[2]!.trim());
  const roles = [...declared].filter(([name]) => name.startsWith('--dx-ansi-'));
  assert.ok(roles.length >= 8, `expected the role layer in the terminal skin, found ${roles.length} roles`);
  for (const [name, value] of roles) {
    // A role may alias another plugin token — `--dx-ansi-muted` is the skin's
    // dim ink — but following the chain has to end at a host token.
    let current = value;
    let hops = 0;
    while (true) {
      const inner = /^var\((--dx-[a-z0-9-]+)\)$/.exec(current);
      if (!inner) break;
      const next = declared.get(inner[1]!);
      assert.ok(next !== undefined, `${name} points at ${inner[1]}, which the sheet never declares`);
      assert.ok(hops < 4, `${name} aliases in a circle`);
      current = next!;
      hops += 1;
    }
    assert.match(current, /^var\(--dsw-[a-z0-9-]+\)$/, `${name} must resolve to a host token, not ${current}`);
  }
});

/**
 * The terminal skin must never make `.column` a containing block.
 *
 * This is the one CSS mistake in this sheet that is invisible in a screenshot
 * until it is catastrophic, so it gets its own test rather than a comment.
 *
 * The column's descendants include the vocabulary the tool rows are written in:
 * `.srOnly` spans, folded `.toolState` markers, per-row `.branchReason` labels
 * — around ninety one-pixel absolutely positioned boxes. With a static column
 * they resolve against the host's root and sit where they belong. Give the
 * column a `position` and they resolve against it instead, which lifts them out
 * of the capped process body's clipping — that body is `max-height: 400px` plus
 * `overflow-y: auto`, and it normally swallows an 11,000px process. Their
 * static positions lie deep inside that process, so the column's scrollable
 * overflow becomes the height of the whole process, the host's scroller
 * inherits the phantom range, and the reading view scrolls for tens of
 * thousands of pixels past the end of its own text.
 *
 * Measured in the running app on this exact declaration: `scrollHeight`
 * 12310 → 2107.
 */
test('the terminal skin leaves the column unpositioned', () => {
  const bare = stripComments(reader.css);
  const positioned = [...bare.matchAll(/\[data-deckseek-skin='terminal'\]\s*\.column\s*\{([^}]*)\}/g)]
    .flatMap(match => [...match[1]!.matchAll(/(?:^|;)\s*position\s*:/g)].map(() => match[1]!))
    .filter(body => !/\bposition\s*:\s*static\b/.test(body));
  assert.deepEqual(positioned, [], 'a positioned `.column` re-anchors ninety hidden boxes and adds a phantom scroll range');

  // The corners are anchored to the bars instead, which are positioned anyway:
  // one rule lists all four, so the assertion looks at its body.
  const cornerRule = /([^{}]*\.topBar::before[^{}]*)\{([^}]*)\}/.exec(bare);
  assert.ok(cornerRule !== null, 'the corners must be declared on the bars');
  assert.match(cornerRule[1]!, /\.topBar::after/, 'both top corners');
  assert.match(cornerRule[1]!, /\.statusBar::before/);
  assert.match(cornerRule[1]!, /\.statusBar::after/);
  assert.match(cornerRule[2]!, /position:\s*absolute/, 'anchored to the bar, not laid out in it');
  for (const glyph of ['┌', '┐', '└', '┘']) {
    assert.ok(bare.includes(`content: '${glyph}'`), `the ${glyph} corner must be drawn`);
  }
});

/**
 * The status line and the box-character frame are terminal furniture: a page
 * is not an instrument, so the other two skins keep their existing bottom edge
 * and corners. Both are rendered for every skin and hidden here, which is the
 * plugin's standing rule for skin-specific chrome — this holds the CSS half of
 * it, since a `display: none` that went missing would show up as furniture on
 * the wrong skin rather than as an error.
 */
test('the status line and the box frame are terminal-only', () => {
  const bare = stripComments(reader.css);
  assert.match(bare, /\.statusBar\s*\{\s*display:\s*none;?\s*\}/, 'the status line must start hidden');
  assert.match(bare, /\[data-deckseek-skin='terminal'\]\s*\.statusBar\s*\{[^}]*display:\s*flex/, 'the terminal skin must draw the status line');
  assert.match(bare, /\[data-deckseek-skin='terminal'\]\s*\.topBar::before\s*\{[^}]*content:\s*'┌'/, 'the terminal skin must draw the frame');
  // The command palette and the shortcut sheet are not terminal-only, so the
  // pair that opens them in the toolbar has to be hidden *only* in terminal —
  // where the status line carries the same two entries instead.
  assert.match(bare, /\[data-deckseek-skin='terminal'\]\s*\.toolbarKey\s*\{\s*display:\s*none;?\s*\}/);
});

/**
 * The screen texture is the one layer that has to be *boring* to be safe: off
 * unless the settings document asks for it, painted rather than animated, and
 * confined to the terminal skin. Each of those is a claim a sheet can be held
 * to, and each of them is the kind that fails silently — a texture that
 * animates still ships, it just makes the reading view unusable for anyone who
 * asked for reduced motion.
 */
test('the screen texture is off by default, static, and terminal-only', () => {
  const bare = stripComments(reader.css);
  assert.match(bare, /\.screenTexture\s*\{\s*display:\s*none;?\s*\}/, 'the layer must start hidden');

  const rules = [...bare.matchAll(/([^{}]*\.screenTexture[^{}]*)\{([^}]*)\}/g)];
  assert.ok(rules.length >= 2, `expected the texture rules, found ${rules.length}`);
  for (const [, selector, body] of rules) {
    assert.doesNotMatch(body, /animation|transition/, `${selector.trim()} must be painted, not animated`);
    assert.doesNotMatch(selector, /data-deckseek-skin='(soft|paper)'/, 'the texture belongs to the terminal skin only');
  }
  // The layer must not occupy the column's flow at all. See the test below for
  // why the scheme itself is not the thing to assert.
  //
  // The rule to inspect is the one that makes the layer *visible*, found by its
  // own `display: block` rather than by position in the file. An earlier version
  // of this assertion sliced the sheet on the first `display: block` in it —
  // which belongs to an unrelated `width: 18px; height: 6px` rule — so the
  // lookup returned null and every assertion below it passed vacuously. A
  // vacuous guard is worse than no guard: it reports green.
  const visible = rules.find(([, , body]) => /display:\s*block/.test(body!));
  assert.ok(visible !== undefined, 'the texture needs a rule that makes it visible');
  assert.match(visible[2]!, /position:\s*fixed/, 'the texture must be pinned out of flow, not laid out in the column');
  assert.doesNotMatch(visible[2]!, /height:\s*100vh/, "the texture must not claim a viewport of the column's height");
  assert.doesNotMatch(visible[2]!, /margin-bottom:\s*-100vh/, 'the texture must not cancel its own height with a negative margin');
  // Both levels are named, and the level is what the root attribute carries.
  assert.match(bare, /\[data-deckseek-texture='soft'\]/);
  assert.match(bare, /\[data-deckseek-texture='crt'\]/);
});

/**
 * The texture layer's first fix was `position: sticky`, and it reproduced the
 * frame-corner incident by a second route.
 *
 * `sticky` kept the column unpositioned, so the scheme-level guard above (and
 * the one in the column test) passed — but the sticky box still takes part in
 * the column's layout. `height: 100vh` with `margin-bottom: -100vh` cancels
 * that space only in a column at least one viewport tall. In a SHORTER column —
 * a fresh session, a short history, the state a reader is in when they first
 * turn a level on — the 100vh box is the tallest thing in the column, so the
 * column's scrollable overflow becomes a viewport while the text ends a hundred
 * pixels in. The restored reading position lands in that empty range and the
 * reader sees a blank page. Measured in Chrome against this sheet: content
 * 246px, texture 613px, host scroll overflow 11px with the level on and 0 with
 * it off; with a single turn, content 104px, texture 613px.
 *
 * So the assertion is the OUTCOME, not the scheme: a full-height element must
 * not be able to contribute to the column's height. `fixed` takes it out of
 * flow entirely. This generalises the lesson from the frame-corner incident — a
 * guard that names the fix you chose stops guarding the moment you choose a
 * different one, and this one layer was fixed twice for a single bug.
 */
test("no full-height layer can occupy the column's flow", () => {
  const bare = stripComments(reader.css);
  const offenders: string[] = [];
  for (const [, selector, body] of bare.matchAll(/([^{}]*)\{([^}]*)\}/g)) {
    if (!/height:\s*(?:100vh|100dvh)/.test(body!)) continue;
    if (/\bposition\s*:\s*(?:fixed|absolute)\b/.test(body!)) continue;
    if (!/column|screenTexture|root/.test(selector!)) continue;
    offenders.push(selector!.trim());
  }
  assert.deepEqual(offenders, [], "a full-height box in the column's flow hands the view a phantom scroll range");
});

/**
 * The reading measure fills its pane, and stays readable while doing it.
 *
 * The column used to take `--dsh-chat-content-width`, the host's own chat
 * column. That token is sized for chat bubbles beside a composer, and a reading
 * view that inherits it spends most of a wide window on two empty gutters — so
 * the width is a plugin decision now, and the two halves of it are both
 * asserted: it must not go back to the host's narrower token, and it must keep
 * some ceiling, because past roughly 90 characters the eye loses its place on
 * the return sweep and "wider" stops being "better".
 */
test('the reading measure fills its pane, within a readability ceiling', () => {
  const bare = stripComments(reader.css);
  const column = /(^|\})\s*\.column\s*\{([^}]*)\}/.exec(bare);
  assert.ok(column !== null, '.column must be declared');
  const body = column[2]!;
  assert.match(body, /max-width:\s*var\(--dx-content-width\)/, 'the column takes the plugin measure token');
  assert.doesNotMatch(body, /--dsh-chat-content-width/, "the chat column's width is not the reading measure");

  const token = /--dx-content-width:\s*([^;]+);/.exec(bare);
  assert.ok(token !== null, '--dx-content-width must be declared');
  const value = token[1]!.trim();
  assert.match(value, /min\(\s*100%\s*,/, 'the measure must be able to fill its container');
  const ceiling = Number(/(\d+)px/.exec(value)?.[1] ?? '0');
  assert.ok(ceiling >= 900, `the ceiling is ${ceiling}px, narrower than the pane it is meant to fill`);
  assert.ok(ceiling <= 1400, `the ceiling is ${ceiling}px, past the point a line stops being readable`);
});

/**
 * The jump control sits where the eye already is, and says what it does.
 *
 * It used to be a 40px circle pushed into the gutter by `margin-right: -46px`,
 * under a comment that measured exactly how much margin a full line needed. The
 * arithmetic only held above 900px of container — below that the button sat on
 * the text it was meant to clear — and it made the control's position a function
 * of the window width rather than of the reading measure. These assertions pin
 * the replacement's two properties: it is centred by the layout instead of
 * placed by hand, and it is labelled instead of being a bare glyph.
 */
test('the jump control is centred on the measure and carries a label', () => {
  const bare = stripComments(reader.css);
  const dock = /\.jumpDock\s*\{([^}]*)\}/.exec(bare);
  assert.ok(dock !== null, '.jumpDock must be declared');
  assert.match(dock[1]!, /justify-content:\s*center/, 'the dock centres the pill on the measure');
  assert.doesNotMatch(dock[1]!, /align-self:\s*flex-end/, 'the dock is no longer pushed to the column edge');
  assert.doesNotMatch(bare, /\.jumpDock\s*\{[^}]*margin-right/, 'the gutter arithmetic must not come back');
  assert.doesNotMatch(bare, /@container[^{]*\{[^}]*\.jumpDock[^}]*margin-right/, 'nor may it be re-added under a container query');
  assert.doesNotMatch(dock[1]!, /pointer-events:\s*auto/, 'the zero-height dock itself must stay transparent to the pointer');

  const jump = /\.jump\s*\{([^}]*)\}/.exec(bare);
  assert.ok(jump !== null, '.jump must be declared');
  assert.match(jump[1]!, /pointer-events:\s*auto/, 'the pill takes the pointer back');
  assert.match(jump[1]!, /border-radius:\s*999px/, 'the pill is a pill');
  assert.match(jump[1]!, /--jump-lift:/, 'the lift lives in a variable so :active can scale without dropping it');
  assert.doesNotMatch(jump[1]!, /width:\s*40px/, 'a fixed 40px circle cannot carry a label');
  // The count is the reason to press, so it must be drawn and must be stable.
  assert.match(bare, /\.jumpCount\s*\{[^}]*font-variant-numeric:\s*tabular-nums/, 'the badge must not resize as it ticks');
  assert.match(bare, /\[data-deckseek-skin='terminal'\]\s*\.jump\s*\{/, 'the terminal skin renders it in its own idiom');
});

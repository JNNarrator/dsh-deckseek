// Pinned plates must cover the frame's inner edges, and where a strip between a
// plate and the frame has to be covered, it must be PAINTED rather than laid out.
//
// Why this file exists: the terminal skin draws its frame by padding the column,
// so a row that bleeds out to the frame's inner edges — the user band does, by
// its own `calc(-1 * var(--dx-frame-pad-x))` margin — slides past anything pinned
// inside the content box. The top bar covered that with a `-10px` top margin
// paired with a 10px top padding: correct only while those two numbers are equal,
// and nothing fails when they stop being. The bottom bar had no coverage at all.
// Both now paint with a shadow, which takes part in no layout, so an unrelated
// geometry edit cannot break the coverage.
//
// These assertions read the SOURCE sheet and locate rules by their own selector
// and declarations, never by slicing between markers: a guard that silently
// finds nothing passes for the wrong reason, which has already happened here.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SHEET = fileURLToPath(new URL('../src/client/Reader.module.css', import.meta.url));
const css = readFileSync(SHEET, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const TERMINAL = "[data-deckseek-skin='terminal']";

interface Block { selector: string; body: string }

/** Every `selector { … }` block, including the ones nested in `@media`/`@container`. */
function blocks(source: string): Block[] {
  const out: Block[] = [];
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] !== '{') continue;
    let depth = 1;
    let end = i + 1;
    for (; end < source.length && depth > 0; end += 1) {
      if (source[end] === '{') depth += 1;
      else if (source[end] === '}') depth -= 1;
    }
    const body = source.slice(i + 1, end - 1);
    let start = i - 1;
    while (start >= 0 && !'{};'.includes(source[start]!)) start -= 1;
    const selector = source.slice(start + 1, i).trim();
    if (selector.startsWith('@')) out.push(...blocks(body));
    else if (selector.length > 0) out.push({ selector, body });
    i = end - 1;
  }
  return out;
}

const ALL = blocks(css);

/** A plate is sticky and opaque: it hides whatever is passing behind it. */
const STICKY_OPAQUE = ALL.filter(block =>
  /position:\s*sticky/.test(block.body) && /background:\s*var\(--dsw-alias-bg-base\)/.test(block.body));
const PLATE_CLASSES = ['statusBar'] as const;

/** Every terminal-scoped rule that styles a given plate, wherever the plate's
 *  own `position`/`background` happen to be declared. */
function terminalRules(plateClass: string): Block[] {
  const rules = ALL.filter(block => block.selector.includes(TERMINAL) && new RegExp(`\\.${plateClass}\\b`).test(block.selector));
  assert.ok(rules.length > 0, `no terminal rule found for .${plateClass}`);
  return rules;
}
const bodyOf = (rules: Block[]): string => rules.map(rule => rule.body).join('\n');

test('the pinned opaque plates are exactly the ones this suite covers', () => {
  // A third plate would sail past every assertion below, so it has to arrive as
  // an explicit edit to this list rather than as a silent hole in the guard.
  const classes = [...new Set(STICKY_OPAQUE.flatMap(block =>
    [...block.selector.matchAll(/\.([A-Za-z][\w-]*)/g)].map(match => match[1]!)))].sort();
  assert.deepEqual(classes, ['statusBar']);
});

for (const plateClass of PLATE_CLASSES) {
  test(`.${plateClass} reaches the frame's inner edges`, () => {
    const body = bodyOf(terminalRules(plateClass));
    const spansFrame = /margin[^;]*calc\(-1 \* var\(--dx-frame-pad-x\)\)/.test(body);
    const paintsFrame = /box-shadow:[^;]*calc\(-1 \* var\(--dx-frame-pad-x\)\)/.test(body)
      && /box-shadow:[^;]*var\(--dx-frame-pad-x\) 0 0/.test(body);
    assert.equal(spansFrame || paintsFrame, true,
      'the plate must span the frame itself or paint out to it, or a bleeding row shows in the gutter beside it');
  });
}

/**
 * The top of the column is an anchor, not a row, and this is the arithmetic that
 * makes it free.
 *
 * It used to be the reading toolbar: a bar carrying the title, the workspace and
 * three controls, costing its own height plus one column gap at the top of a
 * view whose whole point is text. Those controls now ride in the bottom strip —
 * a row that already existed — and what is left is a zero-height anchor holding
 * the frame's corners and, when it is open, the search row.
 *
 * Two things can silently re-open that strip, and both are asserted here: a
 * height that is not zero, and a negative margin that no longer equals the gap
 * the column opens beside it. The second is the subtle one — the pair is a
 * subtraction, so a second copy of either number keeps `height: 0` true while the
 * anchor quietly costs the difference. Hence the token.
 */
test('the top anchor costs no reading height', () => {
  const anchor = ALL.find(block => /(^|\s)\.topBar\s*$/.test(block.selector.trim()));
  assert.ok(anchor !== undefined, '.topBar must be declared');
  assert.match(anchor.body, /height:\s*0\b/, 'the anchor must have no height of its own');
  assert.match(anchor.body, /margin-bottom:\s*calc\(-1 \* var\(--dx-gap-column\)\)/,
    'the anchor must cancel the gap it is charged, through the shared token');
  assert.match(anchor.body, /position:\s*sticky/, 'the corners hang off it and stay pinned with it');
  assert.doesNotMatch(anchor.body, /background:/, 'nothing is painted at the top of the column any more');

  // One token, read by both sides of the subtraction.
  assert.match(css, /\.column\s*\{[^}]*gap:\s*var\(--dx-gap-column\)/, 'the column gap must come from the token');
  assert.match(css, /--dx-gap-column:\s*calc\(22px \+ var\(--dx-font-delta\)\)/, 'the soft rhythm, declared once');

  // The terminal skin keeps its own density, so it re-points the token rather
  // than the gap: the anchor's margin then follows the same number the column
  // uses, which is the whole point of the token.
  const terminalColumn = /\[data-deckseek-skin='terminal'\]\s*\.column\s*\{([^}]*)\}/.exec(css);
  assert.ok(terminalColumn !== null, 'the terminal column must be declared');
  assert.match(terminalColumn[1]!, /--dx-gap-column:\s*var\(--dx-gap-block\)/,
    'the terminal gap and the anchor cancellation have to be the same number');
});

test('the top anchor is an anchor and a panel host, never a row', () => {
  // The terminal rule is the one that used to carry a painted plate: a strip
  // above a bar, covered because the bar slid over it. With no bar and no height
  // there is nothing above the anchor but the scroller's own edge, so any
  // block-axis box or paint here is the old strip coming back.
  const body = bodyOf(terminalRules('topBar'));
  assert.doesNotMatch(body, /(margin|padding)-block/, 'no vertical box may be declared on the anchor');
  assert.doesNotMatch(body, /\bbox-shadow\s*:/, 'the plate above the bar is gone with the bar');
  assert.doesNotMatch(body, /\bbackground\s*:/, 'the anchor must stay transparent');
  // The horizontal bleed stays: it is what puts the corner glyphs on the frame's
  // corners instead of 12px inside them.
  assert.match(body, /margin-inline:\s*calc\(-1 \* var\(--dx-frame-pad-x\)\)/);
  assert.match(body, /padding-inline:\s*var\(--dx-frame-pad-x\)/);
});

test('the bottom bar paints past its own box on both sides', () => {
  // Its plate is the column's content box, so painting is the only thing that can
  // reach the gutters a bleeding row slides through.
  const body = bodyOf(terminalRules('statusBar'));
  assert.match(body, /box-shadow:\s*calc\(-1 \* var\(--dx-frame-pad-x\)\) 0 0 /);
  assert.match(body, /,\s*var\(--dx-frame-pad-x\) 0 0 /);
});

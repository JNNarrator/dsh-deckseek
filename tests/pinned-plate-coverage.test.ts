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
const PLATE_CLASSES = ['topBar', 'statusBar'] as const;

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
  assert.deepEqual(classes, ['statusBar', 'topBar']);
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

test('the top bar does not cover its strip with a margin its own padding cancels', () => {
  const body = bodyOf(terminalRules('topBar'));
  assert.doesNotMatch(body, /margin:\s*-/,
    'a negative top margin is only correct while the padding equals it; they cancel in the flow, so an unrelated padding edit would silently resize the bar');
  assert.match(body, /box-shadow:\s*0 -\d+px 0 /,
    'the strip above the bar has to be painted instead');
});

test('the bottom bar paints past its own box on both sides', () => {
  // Its plate is the column's content box, so painting is the only thing that can
  // reach the gutters a bleeding row slides through.
  const body = bodyOf(terminalRules('statusBar'));
  assert.match(body, /box-shadow:\s*calc\(-1 \* var\(--dx-frame-pad-x\)\) 0 0 /);
  assert.match(body, /,\s*var\(--dx-frame-pad-x\) 0 0 /);
});

// Two ways this view managed to break the whole app pane, both silent, both
// fixed by a rule rather than by a bug hunt.
//
// 1. A closed `<dialog>` that is still LAID OUT. `.imageDialog` declares
//    `display: flex`, and an author `display` outranks the user agent's
//    `dialog:not([open]) { display: none }` — so every image in a session put a
//    real box in the log, as tall as its picture. Measured in the running app on
//    an image-heavy session: thirteen of them, thousands of pixels of nothing,
//    and the transcript's own scroll height swollen with it.
//
// 2. A focus that SCROLLS. `element.focus()` reveals the element, scrolling every
//    ancestor that can scroll — and the host's conversation root scrolls while
//    declaring `overflow: hidden`. Its close button carried `autoFocus`, so the
//    browser focused it on mount, the host root moved to `scrollTop` 3815, and
//    the whole pane slid 6373px out of the window: a black page, re-broken on
//    every re-mount.
//
// The assertions below read the source, because both failures are invisible in
// review: nothing *looks* wrong about `autoFocus` on a dialog's close button.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const SRC = fileURLToPath(new URL('../src', import.meta.url));

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

const SHEETS = readdirSync(join(SRC, 'client'), { withFileTypes: true })
  .flatMap(entry => entry.isFile() && entry.name.endsWith('.css') ? [join(SRC, 'client', entry.name)] : []);
const CLIENT_FILES = files(SRC).filter(path => !path.endsWith('focus.ts'));

/** Comments explain these rules; they must not be able to satisfy them. */
const code = (text: string): string => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

test('nothing in the view focuses without preventScroll', () => {
  const offenders: string[] = [];
  for (const path of CLIENT_FILES) {
    const source = code(readFileSync(path, 'utf8'));
    // `autoFocus` cannot pass focus options, so it is never allowed here — it is
    // the precise call that broke the pane.
    if (/autoFocus/.test(source)) offenders.push(`${path}: autoFocus`);
    for (const match of source.matchAll(/\.focus\s*\(([^)]*)\)/g)) {
      const args = match[1]!.trim();
      if (!args.includes('preventScroll')) offenders.push(`${path}: .focus(${args})`);
    }
  }
  assert.deepEqual(offenders, [], 'every focus in this view goes through focus.ts, or passes preventScroll itself');
  // The rule needs a tool to route through, and the tool needs to be the one
  // that passes the option — a helper that forgot it would satisfy nothing above.
  assert.match(readFileSync(join(SRC, 'client/focus.ts'), 'utf8'), /focus\(\{\s*preventScroll:\s*true\s*\}\)/);
});

test('a closed dialog is never laid out', () => {
  // The explicit hide, not the user agent's: it has to outrank `.imageDialog`'s
  // own `display`, which is what the rule is for.
  const sheet = SHEETS.map(path => ({ path, css: readFileSync(path, 'utf8') }))
    .find(entry => entry.css.includes('.imageDialog'))!;
  assert.ok(sheet, '.imageDialog must be declared somewhere');
  const hidden = /\.imageDialog:not\(\[open\]\)\s*\{([^}]*)\}/.exec(sheet.css);
  assert.ok(hidden !== null, 'the closed state must be hidden explicitly, or every image becomes a box in the log');
  assert.match(hidden[1]!, /display:\s*none/);
  // And the open state still declares a display, or the dialog would collapse.
  const open = /(^|\})\s*\.imageDialog\s*\{([^}]*)\}/.exec(sheet.css);
  assert.ok(open !== null, '.imageDialog must be declared');
  assert.match(open[2]!, /display:\s*flex/);
});

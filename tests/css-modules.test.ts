// The CSS Modules transform's own output.
//
// This suite exists because of a bug it would have caught, and because the
// three suites that were already here could not:
//
//  - `npm test` never runs the transform: the test loader answers `.css`
//    imports with a Proxy that returns the property name.
//  - `tsc` never sees a stylesheet.
//  - `tests/skin-css.test.ts` reads the *source* sheets, which were correct.
//
// The transform renamed names by bare-word substitution over the whole sheet,
// so `flex-direction: column` became `flex-direction: _ekqmtO_column` — an
// invalid value the browser dropped, turning every flex column in the reading
// view into a flex row. The view still rendered; it laid each turn out beside
// the last, one character wide. Nothing failed.
//
// So the assertions below are about the transform: a declaration's *value* must
// survive it untouched, and a rename must happen only where a rename is legal.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { scopeCss, stripComments } from '../scripts/css-modules.mjs';

const SRC = fileURLToPath(new URL('../src', import.meta.url));

function cssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(path);
    return entry.name.endsWith('.module.css') ? [path] : [];
  });
}

const SHEETS = cssFiles(SRC).map(path => ({
  path: path.slice(path.indexOf('/src/') + 5),
  css: readFileSync(path, 'utf8'),
  scoped: scopeCss(readFileSync(path, 'utf8'), '_TESTPREFIX_'),
}));

/**
 * Every declaration value in a sheet. `animation` and `animation-name` are
 * excluded: a keyframe name is the one name that legitimately appears in a
 * value, and rescoping it there is the whole point of the transform.
 */
function declarationValues(css: string): string[] {
  const values: string[] = [];
  for (const block of stripComments(css).matchAll(/\{([^{}]*)\}/g)) {
    for (const declaration of block[1]!.split(';')) {
      const at = declaration.indexOf(':');
      if (at === -1) continue;
      const property = declaration.slice(0, at).trim().toLowerCase();
      if (property === 'animation' || property === 'animation-name') continue;
      values.push(declaration.slice(at + 1).trim());
    }
  }
  return values;
}

/**
 * The bug, stated as a property: **a scoped sheet may not contain its own scope
 * prefix inside a declaration value.** A scoped name is a class; classes are
 * selected, never declared as values. Any occurrence is a rename that landed
 * where it does not belong — and, because a prefixed identifier is not a valid
 * value for anything, a declaration the browser then threw away.
 */
test('no scoped name leaks into a declaration value', () => {
  for (const sheet of SHEETS) {
    const leaked = declarationValues(sheet.scoped.css).filter(value => value.includes('_TESTPREFIX_'));
    assert.deepEqual(leaked, [], `${sheet.path} renamed a value: ${leaked.join(' | ')}`);
  }
});

/**
 * The exact declaration the bug destroyed. Listed by name as well as by the
 * property above, because `flex-direction: column` is the one where the failure
 * is loudest: it silently rotates an entire layout.
 */
test('keyword values survive a rename of a class with the same name', () => {
  const withColumn = SHEETS.filter(sheet => /\.column\b/.test(sheet.css));
  assert.ok(withColumn.length > 0, 'expected a sheet with a `.column` class');
  for (const sheet of withColumn) {
    const before = declarationValues(sheet.css).filter(value => value === 'column').length;
    const after = declarationValues(sheet.scoped.css).filter(value => value === 'column').length;
    assert.equal(after, before, `${sheet.path} lost a \`column\` value`);
  }
  // And the whole repository: every flex column the source declared is still a
  // flex column in the output.
  const source = SHEETS.flatMap(sheet => declarationValues(sheet.css));
  const scoped = SHEETS.flatMap(sheet => declarationValues(sheet.scoped.css));
  for (const keyword of ['column', 'row', 'auto', 'none', 'stretch']) {
    assert.equal(
      scoped.filter(value => value === keyword).length,
      source.filter(value => value === keyword).length,
      `the transform changed how many declarations use \`${keyword}\``,
    );
  }
});

test('class names are scoped in selectors, and only there', () => {
  const sheet = SHEETS.find(entry => entry.path.endsWith('Reader.module.css'))!;
  const scoped = stripComments(sheet.scoped.css);
  assert.match(scoped, /\._TESTPREFIX_column\b/, 'selectors must carry the scoped name');
  assert.match(sheet.scoped.map.get('column')!, /^_TESTPREFIX_column$/);
  // A descendant selector keeps its shape.
  assert.match(scoped, /\._TESTPREFIX_toolReceipt\s+\._TESTPREFIX_blocks\b/, 'a descendant selector keeps its shape');
});

test('a :global() body is spliced back verbatim', () => {
  const sheet = SHEETS.find(entry => entry.path.endsWith('MarkdownText.module.css'))!;
  assert.match(sheet.scoped.css, /:global\(\.md-x\)|\.md-code-block|\.md-table-wide/, 'a global class must survive');
  assert.ok(!sheet.scoped.css.includes('_TESTPREFIX_md-'), 'a global class must not be scoped');
});

test('animation values reference the scoped keyframe name', () => {
  const sheet = SHEETS.find(entry => entry.path.endsWith('Reader.module.css'))!;
  const scoped = stripComments(sheet.scoped.css);
  const keyframes = [...scoped.matchAll(/@keyframes\s+(_TESTPREFIX_[A-Za-z0-9_-]+)/g)].map(match => match[1]!);
  assert.ok(keyframes.length >= 3, `expected the skin's keyframes, found ${keyframes.join(', ') || 'none'}`);
  for (const name of keyframes) {
    const bare = name.slice('_TESTPREFIX_'.length);
    assert.match(scoped, new RegExp(`animation(?:-name)?\\s*:[^;}]*\\b${name}\\b`), `${bare} is defined but never referenced`);
    assert.doesNotMatch(scoped, new RegExp(`animation(?:-name)?\\s*:[^;}]*\\b${bare}\\b`), `${bare} is referenced unscoped`);
  }
});

test('the timing stays in its token while the name is rewritten', () => {
  const sheet = SHEETS.find(entry => entry.path.endsWith('Reader.module.css'))!;
  assert.match(
    stripComments(sheet.scoped.css),
    /animation:\s*caretBlink\b|animation:[^;}]*_TESTPREFIX_caretBlink[^;}]*var\(--dx-blink-timing\)/,
    'the caret keeps its timing token beside the scoped keyframe name',
  );
});

test('every sheet in the repository survives the transform', () => {
  assert.ok(SHEETS.length >= 8, `expected the plugin's sheets, found ${SHEETS.length}`);
  for (const sheet of SHEETS) {
    const before = (stripComments(sheet.css).match(/\{/g) ?? []).length;
    const after = (stripComments(sheet.scoped.css).match(/\{/g) ?? []).length;
    assert.equal(after, before, `${sheet.path} lost a block`);
    assert.ok(sheet.scoped.map.size > 0, `${sheet.path} exported no names`);
  }
});

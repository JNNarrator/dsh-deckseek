// The host's own turn-tail cards, and the one rule that decides which file
// surface a turn shows.
//
// This suite reads the source on purpose. The decision "the host's card is on
// screen, so this view's chips row steps aside" is made by ONE CSS rule matching
// the host's own card markers — no mount test can exercise it (happy-dom applies
// no stylesheet), and no pure function can decide it (the host's summary does not
// survive a host restart, so "the turn has a changes announcement" is not the
// same fact as "the card drew"). What a test can do is pin the three names the
// rule depends on, in both files that must agree, and fail when either side
// moves.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { OFFICIAL_SLOTS, officialSeat } from '../src/client/official-slots.js';

const CLIENT = fileURLToPath(new URL('../src/client', import.meta.url));
const css = readFileSync(join(CLIENT, 'Reader.module.css'), 'utf8');
const reader = readFileSync(join(CLIENT, 'Reader.tsx'), 'utf8');

/** The wrappers this view renders its own rows through, as the reader marks them. */
const SEAT = 'data-reader-official-tail';

test('the wrapper the reader renders is the one the hiding rule matches', () => {
  assert.match(reader, new RegExp(`${SEAT}(=|\\b)`), 'the reader must mark the borrowed seat\'s wrapper');
  assert.match(css, new RegExp(`\\[${SEAT}\\]`), 'and the rule must match that marker, not a class that can drift');
});

test('the rule fires on the host\'s own card markers, and on no other tail card', () => {
  // Measured on the running host: the changed-files card carries
  // `data-changed-files`, the delivery cards carry `data-presented-files-row`
  // (with `data-presented-file` per row). A plan or schedule card carries
  // neither, and must not silence a turn's file list.
  for (const marker of ['data-changed-files', 'data-presented-files-row']) {
    assert.match(css, new RegExp(`\\[${SEAT}\\] \\[${marker}\\]`), `the hiding rule must key on ${marker}`);
  }
  const rule = css.slice(css.indexOf(`[${SEAT}]`));
  const line = rule.slice(0, rule.indexOf('}') + 1);
  assert.match(line, /\.deliverablesRoot\s*\{[^}]*display:\s*none/, 'and it must hide exactly this view\'s chip row');
});

test('the seat the rule is keyed on is the seat the bridge actually fills', () => {
  // A rule that watches a seat nobody writes to would hide nothing and say
  // nothing; the name has to be the one `officialSeat` builds.
  const tail = officialSeat('tail');
  assert.equal(tail, `dsh-deckseek.official.tail/${OFFICIAL_SLOTS.tail}`);
  assert.match(reader, /renderSlot\(officialSeat\('tail'\)/, 'the reader renders that seat');
  assert.match(css, new RegExp(`\\[${SEAT}\\]`), 'and the rule watches the wrapper the reader renders around it');
});

test('the chips row is still mounted while hidden, because its resolver is not', () => {
  // Hiding the row must not hide the inline mentions: the produced-files
  // resolver comes from the same turn data, and it is what makes a file named in
  // the closing prose clickable. `display: none` keeps that, an unmounted row
  // would not.
  assert.match(reader, /showDeliverablesRow\(boundary\.status, deliverables\) && openFile && <Deliverables/);
  assert.match(reader, /<ProducedFilesContext\.Provider value=\{mentions\}>/);
});

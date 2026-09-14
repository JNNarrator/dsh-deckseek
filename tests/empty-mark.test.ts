import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_MARK, EMPTY_MARK_COLUMNS } from '../src/client/empty-mark.ts';

const lines = EMPTY_MARK.split('\n');
const BRAILLE = /^[\u2800-\u28FF]+$/;

/**
 * The mark is a dot matrix, so its only unit is the braille cell: one character
 * is one 2x4 dot block. Two properties keep it intact wherever it lands.
 *
 * Every line is exactly as wide as the widest line, because a braille cell's
 * width is East Asian *ambiguous* — a CJK-first fallback renders it two cells
 * wide. Equal widths mean the mark scales as a whole; ragged rows would shear
 * the shape, which is the same failure that sheared the tool marker into a
 * half-disc once. And every character is a braille cell (U+2800 is the blank
 * one), so no line can silently fall back to a different font and break the grid.
 */
test('every line of the idle mark is the same number of braille cells', () => {
  assert.ok(lines.length >= 4, `expected a mark, got ${lines.length} rows`);
  const widths = new Set(lines.map(line => line.length));
  assert.deepEqual([...widths].sort(), [EMPTY_MARK_COLUMNS], 'rows must share one width');
});

test('the idle mark is braille only', () => {
  for (const [index, line] of lines.entries()) {
    assert.match(line, BRAILLE, `row ${index} carries a character outside U+2800–U+28FF`);
  }
});

test('the idle mark stays small enough for an idle screen', () => {
  assert.ok(lines.length <= 8, `${lines.length} rows is not an idle mark`);
  assert.ok(EMPTY_MARK_COLUMNS <= 24, `${EMPTY_MARK_COLUMNS} cells would dominate a narrow reading column`);
});

test('the idle mark is not blank', () => {
  const ink = lines.join('').replace(/\u2800/g, '');
  assert.ok(ink.length > 20, `the mark draws ${ink.length} cells`);
});

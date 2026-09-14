import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitAnnouncement } from '../src/client/announce.ts';

test('splitAnnouncement leaves short text as one chunk', () => {
  assert.deepEqual(splitAnnouncement('你好'), ['你好']);
  assert.deepEqual(splitAnnouncement(''), []);
  assert.deepEqual(splitAnnouncement('   '), []);
});

test('splitAnnouncement cuts long text at sentence boundaries within the limit', () => {
  const long = `${'一。'.repeat(100)}末尾`;
  const chunks = splitAnnouncement(long, 20);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(chunk => chunk.length <= 20));
  assert.equal(chunks.join(''), long);
});

test('splitAnnouncement prefers CJK and western sentence boundaries', () => {
  const text = '第一句。第二句！第三句? Fourth sentence. Fifth sentence!';
  const chunks = splitAnnouncement(text, 12);
  assert.equal(chunks.join(''), text);
  assert.ok(chunks.some(chunk => chunk.includes('。')));
});

test('splitAnnouncement falls back to a hard cut when no boundary fits', () => {
  const text = 'x'.repeat(50);
  const chunks = splitAnnouncement(text, 20);
  assert.equal(chunks.join(''), text);
  assert.ok(chunks.every(chunk => chunk.length <= 20));
});

test('splitAnnouncement backs off to a word break before cutting a word', () => {
  // Heard through a screen reader, the old hard cut produced
  // "byte-level pass-\nthrough for sam\ne-family proto" — half words.
  const chunks = splitAnnouncement('abcdefghij klmnopqrst uvwxyz', 15);
  assert.deepEqual(chunks, ['abcdefghij ', 'klmnopqrst ', 'uvwxyz']);
});

test('splitAnnouncement refuses a word break so early the chunk becomes a fragment', () => {
  // The only break sits near the start; ending there would hand the reader two
  // characters at a time, so the limit wins.
  const text = `a ${'b'.repeat(60)}`;
  const chunks = splitAnnouncement(text, 20);
  assert.equal(chunks[0], text.slice(0, 20));
  assert.equal(chunks.join(''), text);
});

test('splitAnnouncement has no word break to use in unspaced scripts', () => {
  const text = '中'.repeat(45);
  const chunks = splitAnnouncement(text, 20);
  assert.deepEqual(chunks.map(chunk => chunk.length), [20, 20, 5]);
  assert.equal(chunks.join(''), text);
});

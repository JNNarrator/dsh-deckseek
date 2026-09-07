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

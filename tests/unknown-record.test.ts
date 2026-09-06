import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unknownKindLabel, pickPreviewText, summarizeFields } from '../src/client/unknown-record.ts';

test('unknownKindLabel maps known unrendered kinds to friendly Chinese labels', () => {
  assert.equal(unknownKindLabel('system-prompt'), '系统提示词');
  assert.equal(unknownKindLabel('turn-process'), '执行过程记录');
  assert.equal(unknownKindLabel('anything-else'), 'anything-else');
});

test('pickPreviewText returns the payload itself for plain strings', () => {
  assert.equal(pickPreviewText('你是 DeepSeek，一个乐于助人的助手。'), '你是 DeepSeek，一个乐于助人的助手。');
  assert.equal(pickPreviewText(''), null);
  assert.equal(pickPreviewText(42), null);
  assert.equal(pickPreviewText(null), null);
});

test('pickPreviewText reads common text fields from object payloads', () => {
  assert.equal(pickPreviewText({ content: '请扮演…' }), '请扮演…');
  assert.equal(pickPreviewText({ text: 'hello' }), 'hello');
  assert.equal(pickPreviewText({ prompt: 'p' }), 'p');
  assert.equal(pickPreviewText({ value: 'v' }), 'v');
  assert.equal(pickPreviewText({ blocks: [{ kind: 'text' }] }), null);
  assert.equal(pickPreviewText({ content: '' }), null);
});

test('summarizeFields renders compact field summaries without leaking long values', () => {
  assert.equal(summarizeFields({ step: 3, status: 'running' }), 'step: 3 · status: running');
  assert.equal(summarizeFields({ list: [1, 2, 3] }), 'list: […]3 项');
  assert.equal(summarizeFields({ nested: { a: 1 } }), 'nested: {…}');
  assert.equal(summarizeFields(['a', 'b']), '数组 · 2 项');
  assert.equal(summarizeFields({}), '空对象');
  assert.equal(summarizeFields('text'), '');
  assert.equal(summarizeFields(null), '');
});

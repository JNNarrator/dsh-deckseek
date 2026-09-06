import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';
import { buildSearchIndex, searchMatches } from '../src/client/search-index.ts';

function node(key: string, kind: 'user' | 'assistant-step', payload: unknown): ChatConversationViewNode {
  return {
    key, kind, target: 'chat', anchorSeq: 1, visibility: 'visible',
    location: { kind: 'turn', turn: 1, key: `t1:${key}`, seq: 1 }, data: payload,
  } as unknown as ChatConversationViewNode;
}

test('buildSearchIndex collects user and assistant text in display order', () => {
  const get = (key: string) => key === 'a'
    ? node('a', 'user', { content: [{ type: 'text', text: '问题：如何优化？' }] })
    : key === 'b'
      ? node('b', 'assistant-step', { blocks: [{ kind: 'text', text: '答案一' }, { kind: 'reasoning', text: '思考' }] })
      : node('c', 'assistant-step', { blocks: [] });
  const index = buildSearchIndex(['a', 'b', 'c'], get);
  assert.equal(index.length, 2);
  assert.equal(index[0]!.kind, 'user');
  assert.equal(index[0]!.text, '问题：如何优化？');
  assert.equal(index[1]!.text, '答案一');
});

test('searchMatches is case-insensitive with counts and snippets', () => {
  const entries = [
    { key: 'a', kind: 'user' as const, text: '问题：如何优化？', turn: 1 },
    { key: 'b', kind: 'assistant' as const, text: 'Optimization helps.', turn: 1 },
  ];
  assert.deepEqual(searchMatches(entries, '优化'), [{ key: 'a', count: 1, snippet: '问题：如何优化？' }]);
  assert.deepEqual(searchMatches(entries, 'optimi'), [{ key: 'b', count: 1, snippet: 'Optimization helps.' }]);
  assert.deepEqual(searchMatches(entries, '不存在'), []);
  assert.deepEqual(searchMatches(entries, '  '), []);
  assert.equal(searchMatches(entries, 'o')[0]!.count, 2);
});
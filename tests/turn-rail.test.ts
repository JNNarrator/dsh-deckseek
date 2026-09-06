import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';
import { buildRailItems } from '../src/client/turn-rail.ts';
import type { ReaderGroup } from '../src/client/projection.ts';

function node(key: string, kind: 'user' | 'assistant-step', text: string): ChatConversationViewNode {
  return {
    key, kind, target: 'chat', anchorSeq: 1, visibility: 'visible',
    location: { kind: 'turn', turn: 1, key: `t1:${key}`, seq: 1 },
    data: kind === 'user' ? { content: [{ type: 'text', text }] } : { blocks: [{ kind: 'text', text }] },
  } as unknown as ChatConversationViewNode;
}

test('buildRailItems emits one mark per turn group with the first user prompt', () => {
  const groups: ReaderGroup[] = [
    { key: 'turn:1', turn: 1, keys: ['a', 'b'] },
    { key: 'turn:2', turn: 2, keys: ['c'] },
    { key: 'node:x', turn: null, keys: ['x'] },
  ];
  const get = (key: string) => key === 'a' ? node('a', 'user', '如何优化缓存？')
    : key === 'c' ? node('c', 'assistant-step', '答案') : undefined;
  const items = buildRailItems(groups, get);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], { key: 'turn:1', turn: 1, label: '如何优化缓存？' });
  assert.deepEqual(items[1], { key: 'turn:2', turn: 2, label: '' });
});

test('buildRailItems trims long prompts and skips empty groups', () => {
  const groups: ReaderGroup[] = [{ key: 'turn:1', turn: 1, keys: ['a', 'b'] }];
  const long = '这是一个非常非常非常非常非常非常非常非常非常非常非常长的提示词内容';
  const get = (key: string) => key === 'a' ? node('a', 'user', long) : node('b', 'assistant-step', 'x');
  const items = buildRailItems(groups, get);
  assert.equal(items.length, 1);
  assert.ok(items[0]!.label.endsWith('…'));
  assert.ok(items[0]!.label.length <= 28);
});
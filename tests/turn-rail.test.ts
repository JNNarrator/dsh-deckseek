import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';
import { buildRailItems } from '../src/client/turn-rail.ts';

function node(key: string, kind: 'user' | 'steering' | 'assistant-step', text: string, location: unknown = { kind: 'turn', turn: { turn: 1 } }): ChatConversationViewNode {
  return {
    key, kind, target: 'chat', anchorSeq: 1, visibility: 'visible',
    location,
    data: kind === 'assistant-step' ? { blocks: [{ kind: 'text', text }] } : { content: [{ type: 'text', text }] },
  } as unknown as ChatConversationViewNode;
}

test('buildRailItems emits one row per user and steering message in display order', () => {
  const order = ['a', 'b', 'c', 'd'];
  const get = (key: string) => key === 'a' ? node('a', 'user', '如何优化缓存？')
    : key === 'b' ? node('b', 'assistant-step', '答案')
    : key === 'c' ? node('c', 'steering', '补充一下')
    : key === 'd' ? node('d', 'user', '继续', { kind: 'unresolved' }) : undefined;
  const items = buildRailItems(order, get);
  assert.equal(items.length, 3);
  assert.deepEqual(items[0], { key: 'a', turn: 1, label: '如何优化缓存？' });
  assert.deepEqual(items[1], { key: 'c', turn: 1, label: '补充一下' });
  assert.deepEqual(items[2], { key: 'd', turn: null, label: '继续' });
});

test('buildRailItems trims long titles and skips hidden or missing nodes', () => {
  const long = `这是一个${'非常'.repeat(30)}长的提示词内容，需要被截断显示在右侧导航里`;
  const hidden = { ...node('h', 'user', '隐藏'), visibility: 'hidden' } as unknown as ChatConversationViewNode;
  const get = (key: string) => key === 'a' ? node('a', 'user', long) : key === 'h' ? hidden : undefined;
  const items = buildRailItems(['a', 'h', 'x'], get);
  assert.equal(items.length, 1);
  assert.equal(items[0]!.key, 'a');
  assert.ok(items[0]!.label.endsWith('…'));
  assert.ok(items[0]!.label.length <= 64);
});

test('buildRailItems returns an empty list for an empty order', () => {
  assert.deepEqual(buildRailItems([], () => undefined), []);
});

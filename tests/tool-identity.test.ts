import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-conversation/client';
import { toolIdentity } from '../src/client/tool-activity.ts';

test('toolIdentity prefers the call name when present', () => {
  const block = { kind: 'tool-result', call: { name: 'edit', argsRaw: '{}' }, callId: 'c', time: 1, callTime: 0 } as ToolCallBlock;
  assert.equal(toolIdentity({ block }).name, 'edit');
});

test('toolIdentity falls back to the localized generic label in node (zh) context', () => {
  const block = { kind: 'tool-result', call: { name: undefined, argsRaw: '{}' }, callId: 'c', time: 1, callTime: 0 } as unknown as ToolCallBlock;
  assert.equal(toolIdentity({ block }).name, '工具调用');
});

test('toolIdentity uses the draft name before the generic fallback', () => {
  const draft = { kind: 'tool-call', name: 'search', argsRaw: '{}', callId: 'd' } as unknown as ToolCallBlock;
  assert.equal(toolIdentity({ draft }).name, 'search');
});

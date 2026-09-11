import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-conversation/client';
import { toolRowModel } from '../src/client/native/tool-call-model.ts';

function settled(name: string, args: Record<string, unknown>): ToolCallBlock {
  return {
    kind: 'tool-result', call: { name, argsRaw: JSON.stringify(args) }, callId: 'c1', time: 1, callTime: 0,
    content: [], isError: false, subCalls: [],
  } as unknown as ToolCallBlock;
}

test('a tool-row path under the session cwd displays relative', () => {
  const model = toolRowModel('read', settled('read', { path: '/w/proj/src/a.ts' }), '/w/proj');
  assert.equal(model.summary, 'src/a.ts');
});

test('a tool-row path outside the session cwd keeps its absolute form', () => {
  const model = toolRowModel('read', settled('read', { path: '/elsewhere/a.ts' }), '/w/proj');
  assert.equal(model.summary, '/elsewhere/a.ts');
});

test('without a session cwd the path is left untouched', () => {
  const model = toolRowModel('read', settled('read', { path: '/w/proj/src/a.ts' }));
  assert.equal(model.summary, '/w/proj/src/a.ts');
});

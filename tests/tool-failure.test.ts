import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-conversation/client';
import { toolFailureLine, toolFailureText } from '../src/client/tool-activity.ts';

function failed(text: string, meta?: Record<string, unknown>): ToolCallBlock {
  return {
    kind: 'tool-result', call: { name: 'edit', argsRaw: '{}' }, callId: 'c1', time: 1, callTime: 0,
    content: text ? [{ type: 'text', text }] : [], isError: true, meta, subCalls: [],
  } as unknown as ToolCallBlock;
}

test('toolFailureText returns the first non-empty text payload, cleaned and clamped', () => {
  assert.equal(toolFailureText(failed('boom\n[exit code: 1]')), 'boom');
  assert.equal(toolFailureText(failed('boom\n[killed by signal: SIGKILL]')), 'boom');
  assert.equal(toolFailureText(failed('')), null);
  const long = 'x'.repeat(300);
  assert.equal(toolFailureText(failed(long)), `${'x'.repeat(239)}…`);
});

test('toolFailureLine joins name, exit code and signal', () => {
  assert.equal(toolFailureLine(failed('', { exitCode: 1 })), 'edit · 退出码 1');
  assert.equal(toolFailureLine(failed('', { exitCode: 1, signal: 'SIGKILL' })), 'edit · 退出码 1 · 信号 SIGKILL');
  assert.equal(toolFailureLine(failed('')), 'edit');
});

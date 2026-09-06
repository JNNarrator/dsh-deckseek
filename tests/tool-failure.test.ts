import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-conversation/client';
import { toolFailureLine, toolFailureText, toolStateLabel } from '../src/client/tool-activity.ts';

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

test('toolStateLabel maps start and end phases per tool category', () => {
  assert.equal(toolStateLabel('read', 'running'), '正在阅读');
  assert.equal(toolStateLabel('read', 'succeeded'), '已阅读');
  assert.equal(toolStateLabel('search', 'preparing'), '正在搜索');
  assert.equal(toolStateLabel('search', 'returned'), '已找到');
  assert.equal(toolStateLabel('write', 'running'), '正在写入');
  assert.equal(toolStateLabel('write', 'succeeded'), '已写入');
  assert.equal(toolStateLabel('terminal', 'running'), '正在执行');
  assert.equal(toolStateLabel('terminal', 'succeeded'), '已执行');
  assert.equal(toolStateLabel('web', 'running'), '正在获取');
  assert.equal(toolStateLabel('web', 'succeeded'), '已获取');
  assert.equal(toolStateLabel('other', 'running'), '正在执行');
  assert.equal(toolStateLabel('other', 'succeeded'), '已完成');
  assert.equal(toolStateLabel('read', 'failed'), '失败');
  assert.equal(toolStateLabel('read', 'interrupted'), '已中断');
});

test('toolStateLabel speaks English with the en locale', () => {
  assert.equal(toolStateLabel('read', 'running', 'en'), 'Reading…');
  assert.equal(toolStateLabel('search', 'succeeded', 'en'), 'Found');
  assert.equal(toolStateLabel('read', 'failed', 'en'), 'Failed');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-conversation/client';
import { diffStat, toolFailureFacts, toolFailureText, toolFailureTitle, toolStateLabel } from '../src/client/tool-activity.ts';

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

test('toolFailureFacts keeps only exit code and signal, and is empty without either', () => {
  assert.equal(toolFailureFacts(failed('', { exitCode: 1 })), '退出码 1');
  assert.equal(toolFailureFacts(failed('', { exitCode: 1, signal: 'SIGKILL' })), '退出码 1 · 信号 SIGKILL');
  assert.equal(toolFailureFacts(failed('')), null);
});

test('toolFailureTitle names the failed tool inside the title', () => {
  assert.equal(toolFailureTitle(failed('')), '工具执行失败 · edit');
});

test('toolFailureTitle falls back to the generic title without a declared name', () => {
  const anonymous = { ...failed(''), call: { argsRaw: '{}' } } as unknown as ToolCallBlock;
  assert.equal(toolFailureTitle(anonymous), '工具执行失败');
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

test('diffStat counts per-hunk line additions and removals', () => {
  const stat = diffStat([
    { path: 'a.ts', oldText: 'const a = 1;\nconst b = 2;', newText: 'const a = 2;\nconst b = 2;\nconst c = 3;' },
    { path: 'b.ts', oldText: null, newText: 'fresh file\n' },
  ]);
  assert.deepEqual(stat, { added: 4, removed: 1 });
});

test('diffStat returns null when hunks carry no line changes', () => {
  assert.equal(diffStat([{ path: 'a.ts', oldText: 'same', newText: 'same' }]), null);
  assert.equal(diffStat([{ path: 'a.ts', oldText: '', newText: '' }]), null);
});

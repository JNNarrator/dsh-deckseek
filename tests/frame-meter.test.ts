import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-conversation/client';
import { collapsedSummary, frameMeterLabel, railTurns, turnCounts } from '../src/client/frame-meter.ts';
import type { ReaderFlowEntry } from '../src/client/tool-activity.ts';

function settled(name: string, args: Record<string, unknown>, isError = false): ToolCallBlock {
  return {
    kind: 'tool-result', call: { name, argsRaw: JSON.stringify(args) }, callId: `c-${name}-${JSON.stringify(args)}`,
    time: 1, callTime: 0, content: [], isError, subCalls: [],
  } as unknown as ToolCallBlock;
}

function call(name: string, args: Record<string, unknown>, isError = false): ReaderFlowEntry {
  return { kind: 'tool', key: `reader-tool:${name}`, callId: 'c', step: 1, order: 0, block: settled(name, args, isError) };
}

test('counts read tool calls, distinct files and failures off one turn', () => {
  const flow: ReaderFlowEntry[] = [
    call('read', { file_path: '/w/a.ts' }),
    call('read', { file_path: '/w/a.ts' }),
    call('edit', { file_path: '/w/b.ts' }),
    call('bash', { command: 'ls' }, true),
  ];
  assert.deepEqual(turnCounts(flow), { tools: 4, files: 2, failed: 1 });
});

test('a turn with no tool calls carries no fold summary', () => {
  assert.equal(collapsedSummary(turnCounts([])), null);
});

test('the fold summary names what it counted, and drops empty parts', () => {
  assert.equal(collapsedSummary({ tools: 4, files: 2, failed: 1 }), '4 次工具调用 · 2 个文件 · 1 次失败');
  assert.equal(collapsedSummary({ tools: 3, files: 0, failed: 0 }), '3 次工具调用');
});

test('the fold summary follows the requested language', () => {
  assert.equal(collapsedSummary({ tools: 3, files: 1, failed: 0 }, 'en'), '3 tool calls · 1 file');
});

test('English counts one call in the singular', () => {
  assert.equal(collapsedSummary({ tools: 1, files: 0, failed: 0 }, 'en'), '1 tool call');
  assert.equal(collapsedSummary({ tools: 1, files: 1, failed: 1 }, 'en'), '1 tool call · 1 file · 1 failed');
});

test('the window bar reports loaded turns and the newest turn’s steps', () => {
  assert.equal(frameMeterLabel(12, 34, false), '12 轮 · 最新一轮 34 步');
  assert.equal(frameMeterLabel(12, 0, false), '12 轮');
  assert.equal(frameMeterLabel(0, 0, false), null);
});

test('unloaded history is marked as a floor, not a total', () => {
  assert.equal(frameMeterLabel(12, 5, true), '12+ 轮 · 最新一轮 5 步');
});

test('the turn count comes off the marks the rail can draw', () => {
  // Measured in the host after paging: the first user message was outside the
  // loaded window, so the rail drew 3 marks while the bar — counting turn
  // groups — said 4. The number beside the rail counts what the rail holds.
  const items = [{ turn: 2 }, { turn: 3 }, { turn: 4 }];
  assert.deepEqual(railTurns(items), { count: 3, latest: 4 });
});

test('the rail turn count is distinct turns and follows the newest anchor', () => {
  // A steering message shares its turn, so two marks in one turn stay one turn.
  assert.deepEqual(railTurns([{ turn: 1 }, { turn: 1 }, { turn: 2 }]), { count: 2, latest: 2 });
  // A message with no turn behind it draws a mark but is not a turn.
  assert.deepEqual(railTurns([{ turn: null }, { turn: 5 }]), { count: 1, latest: 5 });
  assert.deepEqual(railTurns([]), { count: 0, latest: null });
  assert.deepEqual(railTurns([{ turn: null }]), { count: 0, latest: null });
  // Turn numbers arrive in display order, but the newest is the largest.
  assert.deepEqual(railTurns([{ turn: 9 }, { turn: 2 }]), { count: 2, latest: 9 });
});

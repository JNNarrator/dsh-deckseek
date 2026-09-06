import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTokens, turnProcessLabel, turnTailStats } from '../src/client/turn-records.ts';

test('turnProcessLabel mirrors the native turn-process summary', () => {
  assert.equal(turnProcessLabel({ messageCount: 0, toolCallCount: 0, subagentCount: 0 }), '已思考');
  assert.equal(
    turnProcessLabel({ messageCount: 2, toolCallCount: 3, subagentCount: 1 }),
    '3 次工具调用 · 2 条消息 · 1 个 subagent',
  );
  assert.equal(turnProcessLabel({ messageCount: 1, toolCallCount: 0, subagentCount: 0 }), '1 条消息');
  assert.equal(turnProcessLabel({ messageCount: 0, toolCallCount: 0, subagentCount: 2 }), '2 个 subagent');
});

test('formatTokens renders compact token counts', () => {
  assert.equal(formatTokens(0), '0');
  assert.equal(formatTokens(999), '999');
  assert.equal(formatTokens(1200), '1.2k');
  assert.equal(formatTokens(12345), '12.3k');
  assert.equal(formatTokens(123456), '123k');
});

test('turnTailStats renders a compact stats line or null', () => {
  assert.equal(turnTailStats({ tokenUsage: { totalTokens: 12345 } }), '约 12.3k tokens');
  assert.equal(turnTailStats({ tokensPerSecond: 42, ttftMs: 1200 }), '42 tok/s · 首字 1.2s');
  assert.equal(turnTailStats({ tokenUsage: { totalTokens: 999 } }), '约 999 tokens');
  assert.equal(turnTailStats({}), null);
});

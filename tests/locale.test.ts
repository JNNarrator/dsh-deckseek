import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  en, formatTokens, turnProcessLabelIn, turnTailStatsIn, uiIn, unknownKindLabelIn, zh,
} from '../src/client/locale.ts';

test('zh and en dictionaries cover the same keys', () => {
  const zhKeys = Object.keys(zh).sort();
  const enKeys = Object.keys(en).sort();
  assert.deepEqual(enKeys, zhKeys);
  assert.ok(zhKeys.length > 80, `expected a substantial dictionary, got ${zhKeys.length}`);
});

test('uiIn substitutes {placeholders}', () => {
  assert.equal(uiIn('zh', 'status.timeSeconds', { seconds: 32 }), '用时 32 秒');
  assert.equal(uiIn('en', 'status.timeSeconds', { seconds: 32 }), 'Took 32s');
  assert.equal(uiIn('zh', 'reader.toolbarTitle'), '阅读 · 原始记录完整保留');
  assert.equal(uiIn('en', 'reader.toolbarTitle'), 'Reading · original record fully preserved');
});

test('turnProcessLabelIn mirrors the native summaries in both languages', () => {
  assert.equal(turnProcessLabelIn('zh', { messageCount: 0, toolCallCount: 0, subagentCount: 0 }), '已思考');
  assert.equal(turnProcessLabelIn('en', { messageCount: 0, toolCallCount: 0, subagentCount: 0 }), 'Thought for a while');
  assert.equal(
    turnProcessLabelIn('zh', { messageCount: 2, toolCallCount: 3, subagentCount: 1 }),
    '3 次工具调用 · 2 条消息 · 1 个 subagent',
  );
  assert.equal(
    turnProcessLabelIn('en', { messageCount: 2, toolCallCount: 3, subagentCount: 1 }),
    '3 tool calls · 2 messages · 1 subagent',
  );
  assert.equal(turnProcessLabelIn('en', { messageCount: 1, toolCallCount: 0, subagentCount: 0 }), '1 message');
});

test('turnTailStatsIn renders compact stats or null in both languages', () => {
  assert.equal(turnTailStatsIn('zh', { tokenUsage: { totalTokens: 12345 } }), '约 12.3k tokens');
  assert.equal(turnTailStatsIn('en', { tokenUsage: { totalTokens: 12345 } }), '~12.3k tokens');
  assert.equal(turnTailStatsIn('zh', { tokensPerSecond: 42, ttftMs: 1200 }), '42 tok/s · 首字 1.2s');
  assert.equal(turnTailStatsIn('en', { tokensPerSecond: 42, ttftMs: 1200 }), '42 tok/s · first token 1.2s');
  assert.equal(turnTailStatsIn('zh', {}), null);
});

test('formatTokens renders compact token counts', () => {
  assert.equal(formatTokens(0), '0');
  assert.equal(formatTokens(999), '999');
  assert.equal(formatTokens(1200), '1.2k');
  assert.equal(formatTokens(12345), '12.3k');
  assert.equal(formatTokens(123456), '123k');
});

test('unknownKindLabelIn translates known kinds and passes others through', () => {
  assert.equal(unknownKindLabelIn('zh', 'system-prompt'), '系统提示词');
  assert.equal(unknownKindLabelIn('en', 'system-prompt'), 'System prompt');
  assert.equal(unknownKindLabelIn('zh', 'turn-process'), '执行过程记录');
  assert.equal(unknownKindLabelIn('en', 'turn-process'), 'Turn process record');
  assert.equal(unknownKindLabelIn('en', 'some-future-kind'), 'some-future-kind');
});
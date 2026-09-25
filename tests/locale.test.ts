import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cacheHitRate, en, formatTokens, messageClock, turnProcessLabelIn, turnTailDetailIn, turnTailStatsIn, uiIn, unknownKindLabelIn, zh,
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
  const plain = { uncachedInputTokens: 2000, outputTokens: 345, totalTokens: 12345 };
  assert.equal(turnTailStatsIn('zh', { tokenUsage: plain }), '约 12.3k tokens');
  assert.equal(turnTailStatsIn('en', { tokenUsage: plain }), '~12.3k tokens');
  // A turn with no cache or reasoning buckets reports only the total: the
  // optional fields are absent, not zero, so nothing is invented for them.
  assert.equal(turnTailStatsIn('zh', {}), null);
  assert.equal(turnTailStatsIn('en', { tokenUsage: null }), null);
});

test('a turn with cache and reasoning buckets reports both beside the total', () => {
  const usage = { uncachedInputTokens: 500, outputTokens: 400, totalTokens: 3000, cacheReadTokens: 1500, reasoningTokens: 220 };
  assert.equal(turnTailStatsIn('zh', { tokenUsage: usage }), '约 3k tokens · 缓存命中 75% · 其中推理 220 tok');
  assert.equal(turnTailStatsIn('en', { tokenUsage: usage }), '~3k tokens · 75% cached · 220 tok reasoning');
});

test('cacheHitRate reads the provider uncached count as its denominator', () => {
  assert.equal(cacheHitRate({ uncachedInputTokens: 500, outputTokens: 0, totalTokens: 500, cacheReadTokens: 1500 }), 75);
  // No cache bucket reported: no rate, rather than a fabricated 0%.
  assert.equal(cacheHitRate({ uncachedInputTokens: 500, outputTokens: 0, totalTokens: 500 }), null);
  // Every prompt token was a cache hit.
  assert.equal(cacheHitRate({ uncachedInputTokens: 0, outputTokens: 0, totalTokens: 10, cacheReadTokens: 10 }), 100);
  assert.equal(cacheHitRate({ uncachedInputTokens: 0, outputTokens: 0, totalTokens: 0, cacheReadTokens: 0 }), null);
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
test('turnTailDetailIn reports every bucket the turn supplied, and skips the rest', () => {
  const full = {
    uncachedInputTokens: 500, outputTokens: 400, totalTokens: 3000,
    cacheReadTokens: 1500, cacheWriteTokens: 600, reasoningTokens: 220,
    routes: [{ provider: 'deepseek', model: 'deepseek-chat' }],
  };
  assert.equal(turnTailDetailIn('en', { tokenUsage: full }), [
    '3000 tok total',
    '500 tok uncached input',
    '1500 tok cache read',
    '600 tok cache write',
    '400 tok output',
    '220 tok of it reasoning',
    'routes deepseek/deepseek-chat',
  ].join('\n'));
  // A turn that reported no cache buckets and no route prints only what it knew.
  assert.equal(turnTailDetailIn('en', { tokenUsage: { uncachedInputTokens: 2, outputTokens: 3, totalTokens: 5 } }),
    ['5 tok total', '2 tok uncached input', '3 tok output'].join('\n'));
  assert.equal(turnTailDetailIn('en', {}), null);
});

test('turnTailDetailIn lists every route that billed the turn', () => {
  const usage = {
    uncachedInputTokens: 1, outputTokens: 1, totalTokens: 2,
    routes: [{ provider: 'a', model: 'm1' }, { provider: 'b', model: 'm2' }],
  };
  assert.match(turnTailDetailIn('en', { tokenUsage: usage })!, /routes a\/m1 · b\/m2$/);
  // An empty route list means nothing is known, so the row is absent rather
  // than printed empty.
  assert.doesNotMatch(turnTailDetailIn('en', { tokenUsage: { ...usage, routes: [] } })!, /routes/);
});

/** The end stamp on the turn tail. Its whole reason to exist is the day
 *  boundary: a stamp from today is a clock, and a stamp from another day has to
 *  say which day or it is worse than no stamp at all. */
test('messageClock prints a bare clock for today and a dated stamp otherwise', () => {
  const now = new Date(2026, 8, 23, 14, 30).getTime();
  const today = new Date(2026, 8, 23, 9, 5).getTime();
  const thisYear = new Date(2026, 7, 3, 14, 3).getTime();
  const otherYear = new Date(2025, 11, 31, 23, 59).getTime();
  assert.equal(messageClock(today, 'zh', now), '09:05');
  assert.equal(messageClock(today, 'en', now), '09:05');
  assert.equal(messageClock(thisYear, 'zh', now), '8月3日 14:03');
  assert.equal(messageClock(thisYear, 'en', now), '8/3 14:03');
  assert.equal(messageClock(otherYear, 'zh', now), '2025年12月31日 23:59');
  assert.equal(messageClock(otherYear, 'en', now), '2025-12-31 23:59');
});

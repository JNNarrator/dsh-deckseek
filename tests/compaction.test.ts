import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compactionFacts, compactTokens } from '../src/client/compaction.js';

test('token counts read the way a person counts them', () => {
  assert.equal(compactTokens(640), '640');
  assert.equal(compactTokens(999), '999');
  assert.equal(compactTokens(1000), '1.0k');
  assert.equal(compactTokens(1240), '1.2k');
  assert.equal(compactTokens(48210), '48.2k');
});

test('the divider states what the compaction cost, in both languages', () => {
  assert.equal(compactionFacts({ shadowedItemCount: 42, shadowedTokenCount: 1240 }, 'zh').label,
    '已精简 42 条历史消息 · 释放约 1.2k tokens');
  assert.equal(compactionFacts({ shadowedItemCount: 42, shadowedTokenCount: 1240 }, 'en').label,
    'Compacted 42 earlier messages · about 1.2k tokens freed');
  assert.equal(compactionFacts({ shadowedItemCount: 7 }, 'en').label, 'Compacted 7 earlier messages');
  assert.equal(compactionFacts({ shadowedTokenCount: 800 }, 'en').label, 'Earlier memory reorganised · about 800 tokens freed');
});

test('a record with no counts still gets a sentence, never a zero', () => {
  // Counts are optional in the record; printing `0 messages` would be a lie.
  assert.equal(compactionFacts({}, 'en').label, 'Earlier context was compacted');
  assert.equal(compactionFacts({ shadowedItemCount: 0, shadowedTokenCount: 0 }, 'en').label, 'Earlier context was compacted');
  assert.equal(compactionFacts(null, 'en').label, 'Earlier context was compacted');
});

test('a blank or missing summary leaves nothing to expand', () => {
  assert.equal(compactionFacts({ summary: '   ' }, 'en').summary, null);
  assert.equal(compactionFacts({}, 'en').summary, null);
  assert.equal(compactionFacts({ summary: 42 }, 'en').summary, null);
  assert.equal(compactionFacts({ summary: '要点 1\n要点 2' }, 'en').summary, '要点 1\n要点 2');
});

test('the counts never leak into the memo', () => {
  const facts = compactionFacts({ summary: 'memo text', shadowedItemCount: 3 }, 'en');
  assert.equal(facts.summary, 'memo text');
  assert.equal(facts.label, 'Compacted 3 earlier messages');
});

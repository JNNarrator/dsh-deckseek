import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WordTimeline } from '../src/client/word-timeline.js';

/**
 * Ported from upstream dsh-better-display `3759091`: opening a long existing
 * answer must not mint a component per historical word, and must not paint a
 * word-by-word reveal over text the reader already had.
 */
test('opening a long existing answer does not animate every historical word', () => {
  const timeline = new WordTimeline();
  const history = '已经接收的历史文字。'.repeat(20000);
  timeline.begin(history, true, 0, 100);
  assert.equal(timeline.hasLiveText, false, 'history must bypass per-word components');

  timeline.begin(`${history}新内容`, true, 0, 200);
  assert.equal(timeline.hasLiveText, true);
  const words = timeline.words(`${history}新内容`, 0);
  assert.ok(words.length < 10, `historical prefix expanded into ${words.length} words`);
  assert.equal(words.map(word => word.text).join(''), history + '新内容');
});

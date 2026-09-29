import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Nodes } from 'mdast';
import { WORD_MOTION, WordTimeline } from '../src/client/word-timeline.js';
import { IncrementalMarkdownParser } from '../src/client/markdown/incremental.js';
import { parseGfm, parseGfmWithMath } from '../src/client/markdown/parse.js';

function textLeaves(node: Nodes): { value: string; offset: number }[] {
  if (node.type === 'text') return [{ value: node.value, offset: node.position!.start.offset! }];
  return 'children' in node ? node.children.flatMap(textLeaves) : [];
}

test('CJK resegmentation and unfinished Markdown cannot reveal later text before queued earlier text', () => {
  for (const full of [
    '前面的字还在排队，后面 **加粗重点** 怎么抢先出现。',
    '前面 words waiting... [后面的链接](https://example.com) 接着文字。',
  ]) {
    const timeline = new WordTimeline();
    timeline.begin('', true, 0, 0);
    for (let end = 1; end <= full.length; end++) {
      const now = 100 + end * 8;
      const source = full.slice(0, end);
      timeline.begin(source, true, 0, now);
      const words = textLeaves(parseGfm(source)).flatMap(leaf => timeline.words(leaf.value, leaf.offset)).filter(word => word.text.trim());
      for (let index = 1; index < words.length; index++) {
        const previous = words[index - 1]!;
        const current = words[index]!;
        assert.ok((previous.born ?? -Infinity) <= (current.born ?? -Infinity), `${source}: ${JSON.stringify(previous)} overtaken by ${JSON.stringify(current)}`);
      }
    }
  }
});

test('leaf render order cannot determine the order of word arrival', () => {
  const timeline = new WordTimeline();
  timeline.begin('', true, 0, 0);
  timeline.begin('alpha beta', true, 0, 100);
  const later = timeline.words('beta', 6)[0]!;
  const earlier = timeline.words('alpha', 0)[0]!;
  assert.ok(earlier.born! <= later.born!, 'A later-rendered earlier source leaf was scheduled last');
});

test('historical and already-received prefixes never replay', () => {
  const history = new WordTimeline();
  history.begin('已经完成的正文。', false, 0, 100);
  assert.equal(history.hasLiveText, false);
  assert.ok(history.words('已经完成的正文。', 0).every(word => word.born === null));
  const running = new WordTimeline();
  running.begin('已经收到的部分。', true, 0, 100);
  assert.ok(running.words('已经收到的部分。', 0).every(word => word.born === null));
});

test('only new word identities receive the reference stagger, with a bounded queue', () => {
  const timeline = new WordTimeline();
  timeline.begin('', true, 0, 0);
  timeline.begin('one two three four five six seven', true, 0, 100);
  const words = timeline.words('one two three four five six seven', 0).filter(word => word.text.trim());
  // Derived from the constant, not written out: the assertion that matters is
  // that the stagger is uniform and starts at `now`, and pinning the literal
  // milliseconds made a timing change look like a behavioural regression.
  const [first, second, third] = words;
  assert.equal(first!.born, 100);
  assert.equal(second!.born, 100 + WORD_MOTION.gap);
  assert.equal(third!.born, 100 + WORD_MOTION.gap * 2);
  assert.ok(words.every(word => word.born! <= 100 + WORD_MOTION.maxDelay));
  timeline.begin('one two three four five six seven eight', true, 0, 900);
  assert.deepEqual(timeline.words('one two three', 0).filter(word => word.text.trim()).map(word => word.born), [100, 100 + WORD_MOTION.gap, 100 + WORD_MOTION.gap * 2]);
});

/**
 * The reveal must not become the thing the reader waits for.
 *
 * The three constants are a latency budget: a word enters at `now + maxDelay` at
 * worst, and takes `duration` to finish arriving, so the last word of a burst is
 * settled `maxDelay + duration` after the burst landed. The recipe's own numbers
 * put that at 590ms, which for a CJK answer — where the segmenter emits about
 * one item per character — is most of a second of typing after the model has
 * already moved on. This test is the reason the budget is written down: it is
 * the property a constant change must preserve, and unlike a pinned literal it
 * fails for the right reason.
 */
test('the word reveal stays inside its latency budget', () => {
  const budget = WORD_MOTION.duration + WORD_MOTION.maxDelay;
  assert.ok(budget <= 400, `reveal budget is ${budget}ms, over the 400ms a reader tolerates`);

  const timeline = new WordTimeline();
  timeline.begin('', true, 0, 0);
  const burst = '这是一整批一起到达的中文回答内容，用来量它多久才能全部显现。';
  timeline.begin(burst, true, 0, 1000);
  const born = timeline.words(burst, 0).filter(word => word.text.trim()).map(word => word.born!);
  assert.ok(born.length > 10, `expected a burst of words, got ${born.length}`);
  assert.ok(Math.max(...born) <= 1000 + WORD_MOTION.maxDelay, 'no word may be queued past the bound');
  assert.ok(Math.max(...born) + WORD_MOTION.duration - 1000 <= budget, 'the last word must settle inside the budget');
});

test('stop, motion-off and authoritative replacement cancel old births', () => {
  const timeline = new WordTimeline();
  timeline.begin('', true, 0, 0);
  timeline.begin('原始输出', true, 0, 100);
  assert.ok(timeline.words('原始输出', 0).some(word => word.born !== null));
  const previous = timeline.generation;
  timeline.begin('修正的输出', true, 1, 200);
  assert.ok(timeline.generation > previous);
  assert.ok(timeline.words('修正的输出', 0).every(word => word.born === null));
  timeline.begin('修正的输出', false, 1, 300);
  timeline.begin('修正的输出', true, 1, 300);
  assert.ok(timeline.words('修正的输出', 0).every(word => word.born === null));
});

test('word segmentation retains all whitespace, CJK, and combined emoji', () => {
  const text = '中文  English\n👩🏽‍💻 e\u0301 🇨🇳';
  const timeline = new WordTimeline();
  timeline.begin('', true, 0, 0);
  timeline.begin(text, true, 0, 100);
  const words = timeline.words(text, 0);
  assert.equal(words.map(word => word.text).join(''), text);
  assert.ok(words.some(word => word.text === '👩🏽‍💻'));
  assert.ok(words.some(word => word.text === 'e\u0301'));
});

test('animated word boxes preserve Chinese punctuation wrapping and source offsets', () => {
  const text = '慢慢走着，看看「夜晚」与（远方）。 English, too!';
  const timeline = new WordTimeline();
  timeline.begin('', true, 0, 0);
  timeline.begin(' '.repeat(20) + text, true, 0, 100);
  const words = timeline.words(text, 20);
  assert.equal(words.map(word => word.text).join(''), text);
  for (const word of words) assert.equal(text.slice(word.key - 20, word.key - 20 + word.text.length), word.text);
  assert.ok(words.some(word => word.text === '着，'));
  assert.ok(words.some(word => word.text === '「夜晚」'));
  assert.ok(words.some(word => word.text === '（远方）。'));
  assert.ok(words.some(word => word.text === 'English,'));
});

test('a closing mark arriving later does not restart the preceding word', () => {
  const timeline = new WordTimeline();
  timeline.begin('', true, 0, 0);
  timeline.begin('夜晚', true, 0, 100);
  const first = timeline.words('夜晚', 0)[0];
  timeline.begin('夜晚。', true, 0, 500);
  const next = timeline.words('夜晚。', 0)[0];
  assert.equal(next.key, first.key);
  assert.equal(next.born, first.born);
  assert.equal(next.text, '夜晚。');
});

test('incremental source offsets survive freezing and match the final parse', () => {
  const text = '第一段。\n\n第二段 **加粗**。\n\n第三段。\n\n第四段。';
  const parser = new IncrementalMarkdownParser(parseGfm);
  for (let i = 1; i <= text.length; i++) parser.update(text.slice(0, i));
  const parsed = parser.update(text);
  const blocks = [...parsed.frozen, ...parsed.tail];
  assert.deepEqual(blocks.map(block => block.key), parseGfm(text).children.map(node => node.position!.start.offset));
  for (const block of blocks) {
    const base = block.key - block.node.position!.start.offset!;
    assert.equal(text.slice(base + block.node.position!.start.offset!, base + block.node.position!.end.offset!), text.slice(block.key, block.key + block.node.position!.end.offset! - block.node.position!.start.offset!));
  }
});

test('the pinned DSH grammar retains CJK emphasis, GFM and math compatibility', () => {
  const parsed = parseGfm('**加粗。**中文\n\n| 项目 | 数量 |\n| --- | --- |\n| A | 2 |\n\n- [x] 完成');
  assert.ok(parsed.children.some(node => node.type === 'table'));
  assert.ok(parsed.children.some(node => node.type === 'list'));
  const first = parsed.children[0];
  assert.ok(first?.type === 'paragraph' && first.children.some(node => node.type === 'strong'));
  const math = parseGfmWithMath('公式 \\(x^2\\)');
  assert.ok(math.children.some(node => node.type === 'paragraph' && node.children.some(child => child.type === 'inlineMath')));
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countNewRecords } from '../src/client/motion.js';

/**
 * The unread badge is the whole reason the jump control is worth pressing, so
 * the rule behind it is tested on its own rather than through a mounted reader.
 *
 * A wrong count is worse than no count: it tells a reader to go back for
 * something that is not there. The two ways to get it wrong are counting a
 * batch that is not a record, and counting a subtree as one thing when React
 * mounted several records inside it.
 */
const record = (...addedNodes: Node[]): MutationRecord =>
  ({ addedNodes: addedNodes as unknown as NodeList } as unknown as MutationRecord);

function element(html: string): Element {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host.firstElementChild!;
}

test('a batch of one new record counts as one', () => {
  const answer = element('<article data-reader-anchor>an answer</article>');
  assert.equal(countNewRecords([record(answer)]), 1);
});

test('a subtree is counted per record inside it, however deep', () => {
  // What a turn arriving looks like to React: one wrapper, several records.
  const turn = element(`<section data-reader-turn="3">
    <div data-reader-anchor>question</div>
    <div><article data-reader-anchor>an answer</article></div>
    <div data-reader-reasoning-card data-reader-anchor>thinking</div>
  </section>`);
  assert.equal(countNewRecords([record(turn)]), 3);
});

test('an added record that also contains records counts for both', () => {
  // Deliberate: the outer record is a record a reader can read, and so is each
  // one inside it. Counting the subtree as a single arrival would under-report
  // exactly the case the badge exists for.
  const card = element('<div data-reader-anchor><div data-reader-anchor>inner</div></div>');
  assert.equal(countNewRecords([record(card)]), 2);
});

test('chrome and text nodes are not records', () => {
  const chrome = element('<div class="toolbar"><span>reading</span></div>');
  const text = document.createTextNode('streaming text');
  assert.equal(countNewRecords([record(chrome, text)]), 0);
  assert.equal(countNewRecords([]), 0);
});

test('several mutations in one batch add up', () => {
  const first = element('<div data-reader-anchor>a</div>');
  const second = element('<div data-reader-anchor>b</div>');
  assert.equal(countNewRecords([record(first), record(second)]), 2);
});

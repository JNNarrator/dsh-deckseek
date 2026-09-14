import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import { StatusText } from '../src/client/motion.js';
import { Blocks } from '../src/client/Blocks.js';
import { MarkdownText } from '../src/client/markdown/MarkdownText.js';
import { markdownLabels } from '../src/client/primitive-labels.js';
import type { BlockRenderProps } from '../src/client/types.js';

afterEach(cleanup);

const renderSlotChain = ((_name: string, _props: unknown, options: { fallback: ReactNode }) => options.fallback) as unknown as BlockRenderProps['renderSlotChain'];
const loadImage = (() => Promise.reject(new Error('unused in this suite'))) as unknown as BlockRenderProps['loadImage'];

/** The status line's parts: the phase sentence keeps the live region, and the
 *  terminal skin's three decorations stay out of the accessibility tree. */
test('the phase sentence owns the live region; the decorations do not', () => {
  const { container } = render(<StatusText text="深度求索中… 12 秒" motion={false} shimmer verb="梳理中…" clock="12 秒" />);
  const live = container.querySelectorAll('[role="status"]');
  assert.equal(live.length, 1);
  assert.equal(live[0]!.textContent, '深度求索中… 12 秒');
  assert.equal(container.querySelector('.think')?.getAttribute('aria-hidden'), 'true');
  for (const selector of ['.statusGlyph', '.statusVerb', '.statusClock']) {
    assert.equal(container.querySelector(selector)?.getAttribute('aria-hidden'), 'true', `${selector} must not reach assistive tech`);
  }
  assert.equal(container.querySelector('.statusVerb')?.textContent, '梳理中…');
  assert.equal(container.querySelector('.statusClock')?.textContent, '12 秒');
  assert.equal(container.querySelector('.statusText')?.getAttribute('data-reader-status-verb'), 'true');
});

/** A thinking or waiting line has no working verb, so the skin shows the
 *  sentence and the node-level marker stays absent. */
test('a phase without a working verb renders neither verb nor clock', () => {
  const { container } = render(<StatusText text="大肥鱼正在思考中… 12 秒" motion shimmer />);
  assert.equal(container.querySelector('.statusVerb'), null);
  assert.equal(container.querySelector('.statusClock'), null);
  assert.equal(container.querySelector('.statusText')?.getAttribute('data-reader-status-verb'), null);
});

/** The clock lives inside the label and ticks every second. Swapping on the
 *  label slid the whole sentence once a second; the phase key must keep the
 *  animation on real phase changes and let the digits change in place. */
test('ticking digits do not re-animate, a phase change does', () => {
  const { container, rerender } = render(<StatusText text="深度求索中… 12 秒" motion swapKey="delving" shimmer verb="梳理中…" clock="12 秒" />);
  const root = container.querySelector('.statusText')!;
  const current = () => root.querySelector('[data-reader-status-copy="current"]')?.textContent;

  assert.equal(current(), '深度求索中… 12 秒');
  rerender(<StatusText text="深度求索中… 13 秒" motion swapKey="delving" shimmer verb="梳理中…" clock="13 秒" />);
  assert.equal(current(), '深度求索中… 13 秒');
  assert.equal(root.querySelector('[data-reader-status-copy="outgoing"]'), null, 'a tick must not spawn an exiting copy');

  rerender(<StatusText text="用时 13 秒" motion swapKey="done" />);
  assert.equal(root.querySelector('[data-reader-status-copy="outgoing"]')?.textContent, '深度求索中… 13 秒');
});

/** The streaming cursor is CSS-only, so what a test can hold is its premise:
 *  the last block-level child of a streaming answer's Markdown is a text
 *  element, which is where the caret's ::after has to land. */
test('a Markdown answer ends in a text block the caret can host', () => {
  const paragraph = render(<MarkdownText text={'first paragraph\n\nlast paragraph'} labels={markdownLabels} />);
  const root = paragraph.container.querySelector('.markdown');
  assert.equal(root?.lastElementChild?.tagName, 'P');
  paragraph.unmount();

  const list = render(<MarkdownText text={'intro\n\n- one\n- two'} labels={markdownLabels} />);
  const last = list.container.querySelector('.markdown')?.lastElementChild;
  assert.equal(last?.tagName, 'UL');
  assert.equal(last?.lastElementChild?.tagName, 'LI');
});

/** The caret keys on the block container the assistant marks while it streams. */
test('a live answer exposes the streaming hook the caret keys on', () => {
  const { container } = render(<Blocks blocks={[{ kind: 'text', text: 'hello there' }]} streaming renderSlotChain={renderSlotChain} loadImage={loadImage} />);
  const blocks = container.querySelector('.blocks');
  assert.equal(blocks?.getAttribute('data-streaming'), 'true');
  assert.ok(container.querySelector('.readingText > .markdown > p'), 'the caret path must resolve on a live answer');
});

test('a settled answer carries no streaming hook', () => {
  const { container } = render(<Blocks blocks={[{ kind: 'text', text: 'hello there' }]} renderSlotChain={renderSlotChain} loadImage={loadImage} />);
  assert.equal(container.querySelector('.blocks')?.getAttribute('data-streaming'), null);
});

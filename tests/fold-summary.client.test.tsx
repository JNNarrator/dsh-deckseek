import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRef } from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { Disclosure } from '../src/client/motion.js';

afterEach(cleanup);

function fold(summary: string | undefined, open = false) {
  const changes: boolean[] = [];
  const view = render(<Disclosure open={open} onChange={value => changes.push(value)} controls="flow" buttonRef={createRef<HTMLButtonElement>()}
    label={<span>处理中</span>} summary={summary} status="7 个步骤" />);
  return { view, changes };
}

test('a folded turn states what the fold hides', () => {
  const { view } = fold('8 次工具调用 · 3 个文件');
  const summary = view.container.querySelector('[data-reader-fold-summary]');
  assert.equal(summary?.textContent, '8 次工具调用 · 3 个文件');
  assert.equal(view.container.querySelector('[data-reader-disclosure]')?.getAttribute('data-expanded'), 'false');
});

test('a turn with nothing to count draws no summary node', () => {
  const { view } = fold(undefined);
  assert.equal(view.container.querySelector('[data-reader-fold-summary]') === null, true);
});

/** The summary is information, so it stays in the tree when the turn opens —
 *  the terminal skin hides its pixels, the other skins never showed it. */
test('opening the turn keeps the summary in the step-count line', () => {
  const { view } = fold('2 次工具调用', true);
  const summary = view.container.querySelector('[data-reader-fold-summary]');
  assert.equal(summary?.textContent, '2 次工具调用');
  assert.equal(view.container.querySelector('[data-reader-disclosure]')?.getAttribute('data-expanded'), 'true');
});

test('the fold still toggles', () => {
  const { view, changes } = fold('1 次工具调用');
  fireEvent.click(view.container.querySelector('button')!);
  assert.deepEqual(changes, [true]);
});

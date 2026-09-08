import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRef, useRef } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach } from 'node:test';
import { SearchPanel } from '../src/client/SearchPanel.js';

afterEach(cleanup);

const INDEX = [
  { key: 'a', kind: 'user' as const, text: 'first deckseek note', turn: 1 },
  { key: 'b', kind: 'assistant' as const, text: 'reply about DeckSeek tools', turn: 1 },
];

function Fixture({ onClose }: { onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  return (
    <div ref={root}>
      <div data-reader-key="a"><p>first deckseek note</p></div>
      <div data-reader-key="b"><p>reply about DeckSeek tools</p></div>
      <div data-reader-key="c"><p>unrelated content</p></div>
      <SearchPanel root={root} index={INDEX} onClose={onClose} />
    </div>
  );
}

test('panel opens with the input focused', () => {
  render(<Fixture onClose={() => {}} />);
  const input = screen.getByPlaceholderText('在阅读页中查找…');
  assert.equal(document.activeElement, input);
});

test('typing marks every matching block and shows the match count', () => {
  const { container } = render(<Fixture onClose={() => {}} />);
  const input = screen.getByPlaceholderText('在阅读页中查找…');
  fireEvent.change(input, { target: { value: 'deckseek' } });
  screen.getByText('1 / 2');
  assert.equal(container.querySelectorAll('.searchMarked').length, 2);
  // The unrelated block never matches.
  assert.equal(container.querySelector('[data-reader-key="c"] .searchMarked'), null);
});

test('next navigation moves the cursor and flashes the active block', () => {
  const { container } = render(<Fixture onClose={() => {}} />);
  const input = screen.getByPlaceholderText('在阅读页中查找…');
  fireEvent.change(input, { target: { value: 'deckseek' } });
  fireEvent.click(screen.getByRole('button', { name: '下一个（Enter）' }));
  screen.getByText('2 / 2');
  assert.ok(container.querySelector('.searchHit'), 'active block carries the flash outline');
});

test('an empty query clears the marks', () => {
  const { container } = render(<Fixture onClose={() => {}} />);
  const input = screen.getByPlaceholderText('在阅读页中查找…');
  fireEvent.change(input, { target: { value: 'deckseek' } });
  fireEvent.change(input, { target: { value: '' } });
  assert.equal(container.querySelectorAll('.searchMarked').length, 0);
});

test('Escape closes the panel through onClose', () => {
  let closed = false;
  render(<Fixture onClose={() => { closed = true; }} />);
  const input = screen.getByPlaceholderText('在阅读页中查找…');
  fireEvent.keyDown(input, { key: 'Escape' });
  assert.equal(closed, true);
});

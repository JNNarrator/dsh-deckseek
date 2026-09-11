import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DeckSeekSection } from '../src/client/DeckSeekSection.js';
import type { SkinId } from '../src/skin.js';

afterEach(cleanup);

function face(skin: SkinId, writable = true) {
  const calls: SkinId[] = [];
  return {
    calls,
    injected: { useSkin: () => skin, useWritable: () => writable, setSkin: (next: SkinId) => { calls.push(next); } },
  };
}

test('renders one radio per skin with the current one checked', () => {
  const { injected } = face('terminal');
  render(<DeckSeekSection useSkin={injected.useSkin} useWritable={injected.useWritable} setSkin={injected.setSkin} />);
  const radios = screen.getAllByRole('radio');
  assert.equal(radios.length, 3);
  const checked = radios.filter(node => node.getAttribute('aria-checked') === 'true');
  assert.equal(checked.length, 1);
  assert.equal(checked[0].getAttribute('data-skin'), 'terminal');
});

test('choosing another tile reports that skin', () => {
  const { injected, calls } = face('soft');
  render(<DeckSeekSection useSkin={injected.useSkin} useWritable={injected.useWritable} setSkin={injected.setSkin} />);
  fireEvent.click(screen.getByRole('radio', { name: /纸面/ }));
  assert.deepEqual(calls, ['paper']);
});

test('a read-only document disables every tile and says so', () => {
  const { injected } = face('soft', false);
  render(<DeckSeekSection useSkin={injected.useSkin} useWritable={injected.useWritable} setSkin={injected.setSkin} />);
  for (const radio of screen.getAllByRole('radio')) assert.equal((radio as HTMLButtonElement).disabled, true);
  assert.ok(screen.getByText(/不支持持久化设置/));
});

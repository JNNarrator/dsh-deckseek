import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DeckSeekSection } from '../src/client/DeckSeekSection.js';
import type { SkinId, WorkDetailId } from '../src/skin.js';

afterEach(cleanup);

function face(skin: SkinId, writable = true, workDetail: WorkDetailId = 'standard') {
  const calls: SkinId[] = [];
  const detailCalls: WorkDetailId[] = [];
  const injected = {
    useSkin: () => skin,
    useWritable: () => writable,
    setSkin: (next: SkinId) => { calls.push(next); },
    useWorkDetail: () => workDetail,
    setWorkDetail: (next: WorkDetailId) => { detailCalls.push(next); },
  };
  return { calls, detailCalls, injected, render: () => render(<DeckSeekSection {...injected} />) };
}

test('renders one radio per skin with the current one checked', () => {
  const { injected } = face('terminal');
  render(<DeckSeekSection {...injected} />);
  const skins = screen.getAllByRole('radio').filter(node => node.hasAttribute('data-skin'));
  assert.equal(skins.length, 3);
  const checked = skins.filter(node => node.getAttribute('aria-checked') === 'true');
  assert.equal(checked.length, 1);
  assert.equal(checked[0].getAttribute('data-skin'), 'terminal');
});

test('choosing another tile reports that skin', () => {
  const { injected, calls } = face('soft');
  render(<DeckSeekSection {...injected} />);
  fireEvent.click(screen.getByRole('radio', { name: /纸面/ }));
  assert.deepEqual(calls, ['paper']);
});

test('a read-only document disables every tile and says so', () => {
  const { injected } = face('soft', false);
  render(<DeckSeekSection {...injected} />);
  for (const radio of screen.getAllByRole('radio')) assert.equal((radio as HTMLButtonElement).disabled, true);
  assert.ok(screen.getByText(/不支持持久化设置/));
});

test('renders one radio per work-details level with the current one checked', () => {
  const { injected } = face('soft', true, 'verbose');
  render(<DeckSeekSection {...injected} />);
  const levels = screen.getAllByRole('radio').filter(node => node.hasAttribute('data-work-detail-option'));
  assert.deepEqual(levels.map(node => node.getAttribute('data-work-detail-option')), ['compact', 'standard', 'detailed', 'verbose']);
  const checked = levels.filter(node => node.getAttribute('aria-checked') === 'true');
  assert.equal(checked.length, 1);
  assert.equal(checked[0].getAttribute('data-work-detail-option'), 'verbose');
});

test('choosing another work-details level reports it, leaving the skin alone', () => {
  const { injected, calls, detailCalls } = face('soft');
  render(<DeckSeekSection {...injected} />);
  fireEvent.click(screen.getByRole('radio', { name: /全部展开/ }));
  assert.deepEqual(detailCalls, ['verbose']);
  assert.deepEqual(calls, []);
});

test('the work-details name a level by what it does, not by the host enum', () => {
  const { injected } = face('soft');
  render(<DeckSeekSection {...injected} />);
  // Every level carries its own one-line hint, so the choice is legible without
  // knowing what `verbose` means upstream. Scoped to the option tiles: the row's
  // own hint above them shares some of the same wording.
  const row = document.querySelector('[data-work-detail]')!;
  for (const hint of [/折起整轮过程/, /运行中标题显示命令/, /当前轮过程展开/, /不折起任何一轮/]) {
    assert.ok(row.textContent && hint.test(row.textContent), String(hint));
  }
});

test('a read-only document disables the work-details tiles too', () => {
  const { injected } = face('soft', false);
  render(<DeckSeekSection {...injected} />);
  const levels = screen.getAllByRole('radio').filter(node => node.hasAttribute('data-work-detail-option'));
  assert.equal(levels.length, 4);
  for (const radio of levels) assert.equal((radio as HTMLButtonElement).disabled, true);
});
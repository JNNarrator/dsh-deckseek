import { test } from 'node:test';
import assert from 'node:assert/strict';
import { afterEach } from 'node:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CopyAnswer } from '../src/client/Blocks.js';

afterEach(cleanup);

function stubClipboard(writeText: () => 'ok' | 'deny'): void {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async () => {
        if (writeText() === 'deny') throw new Error('denied');
      },
    },
  });
}

const BLOCKS = [{ kind: 'text' as const, text: 'hello world' }];

test('renders nothing when the answer has no text', () => {
  const { container } = render(<CopyAnswer blocks={[{ kind: 'other', block: null }]} />);
  assert.equal(container.textContent, '');
});

test('copy shows the success receipt in the status region', async () => {
  stubClipboard(() => 'ok');
  render(<CopyAnswer blocks={BLOCKS} />);
  fireEvent.click(screen.getByRole('button', { name: '复制回答' }));
  const receipt = await screen.findByText('已复制');
  assert.equal(receipt.getAttribute('role'), 'status');
});

test('copy shows the failure receipt when the write throws', async () => {
  stubClipboard(() => 'deny');
  render(<CopyAnswer blocks={BLOCKS} />);
  fireEvent.click(screen.getByRole('button', { name: '复制回答' }));
  await screen.findByText('未能复制，请手动选择文字');
});

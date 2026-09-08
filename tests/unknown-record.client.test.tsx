import { test } from 'node:test';
import assert from 'node:assert/strict';
import { afterEach } from 'node:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { UnknownRecord } from '../src/client/UnknownRecord.js';

afterEach(cleanup);

function stubClipboard(): string[] {
  const written: string[] = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async (text: string) => {
        written.push(text);
      },
    },
  });
  return written;
}

test('renders the friendly kind label, the raw kind, and a field summary', () => {
  const { container } = render(<UnknownRecord kind="custom-surface" data={{ step: 3, status: 'running' }} />);
  assert.match(container.textContent ?? '', /系统提示词|自定义|custom-surface/);
  screen.getByText('step: 3 · status: running');
});

test('arrays summarize with the localized prefix and objects cover the empty case', () => {
  const { container } = render(<UnknownRecord kind="weird" data={['a', 'b']} />);
  screen.getByText('数组 · 2 项');
  const empty = render(<UnknownRecord kind="weird" data={{}} />);
  screen.getByText('空对象');
  empty.unmount();
});

test('copy writes the raw JSON and shows the success receipt', async () => {
  const written = stubClipboard();
  const data = { hello: 'world' };
  const { container } = render(<UnknownRecord kind="weird" data={data} />);
  fireEvent.click(screen.getByRole('button', { name: '复制记录' }));
  await screen.findByText('已复制');
  assert.deepEqual(JSON.parse(written[0] ?? '{}'), data);
  assert.ok((container.textContent ?? '').includes('已复制'));
});

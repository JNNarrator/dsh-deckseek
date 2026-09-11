import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, screen, cleanup } from '@testing-library/react';
import { FailureCard } from '../src/client/FailureCard.js';

afterEach(cleanup);

test('the failure card shows the note it is given', () => {
  render(<FailureCard title="工具执行失败 · edit" message="退出码 1" note="详情保留在执行记录中。" />);
  assert.equal(screen.getByText('详情保留在执行记录中。').textContent, '详情保留在执行记录中。');
});

test('the failure card omits the note when the turn already says it below', () => {
  render(<FailureCard title="工具执行失败 · edit" message="退出码 1" />);
  assert.equal(screen.queryByText('详情保留在执行记录中。'), null);
  assert.ok(screen.getByText('工具执行失败 · edit'));
});

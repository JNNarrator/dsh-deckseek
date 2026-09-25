import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ModelRetryNode } from '@deepseek-ai/dsh-client-ui-conversation/client';
import { retryFailure, retryLabel, retryMaximum, retrySeconds } from '../src/client/native/ModelRetryRow.tsx';
import { zh, en, uiIn } from '../src/client/locale.ts';

function attempt(overrides: Partial<ModelRetryNode> = {}): ModelRetryNode {
  return {
    kind: 'model-retry', seq: 1, time: 0, retryState: 'scheduled',
    retryId: 'r1', turn: 1, step: 1, provider: 'deepseek', mode: 'normal',
    policyKey: 'k', retry: 2, maxRetries: 5, delayMs: 4_000,
    failure: { message: 'upstream 503', code: 'SERVER' },
    ...overrides,
  } as unknown as ModelRetryNode;
}

test('an always-mode retry reports an unbounded cap rather than its numeric field', () => {
  // `maxRetries` is absent in always mode; printing a number would claim a
  // limit the policy does not have.
  assert.equal(retryMaximum(attempt({ mode: 'normal', maxRetries: 5 })), '5');
  assert.equal(retryMaximum(attempt({ mode: 'always' })), '∞');
  assert.equal(retryMaximum(attempt({ mode: 'always', maxRetries: 9 })), '∞');
});

test('a recorded wait is reported in whole seconds with a floor of one', () => {
  assert.equal(retrySeconds(attempt({ delayMs: 4_000 })), 4);
  assert.equal(retrySeconds(attempt({ delayMs: 4_001 })), 5);
  assert.equal(retrySeconds(attempt({ delayMs: 1 })), 1);
  assert.equal(retrySeconds(attempt({ delayMs: 0 })), 1);
});

test('the lifecycle label follows the client-derived retry state', () => {
  assert.equal(retryLabel(attempt({ retryState: 'cancelled' }), false), '重试已取消');
  assert.equal(retryLabel(attempt({ retryState: 'started' }), false), '已开始重试');
  assert.equal(retryLabel(attempt({ retryState: 'scheduled' }), false), '等待重试');
  // Active overrides the durable state: a scheduled attempt that is counting
  // down is by definition still waiting.
  assert.equal(retryLabel(attempt({ retryState: 'scheduled' }), true), '等待重试');
});

test('AUTH is replaced by an actionable sentence; every other code keeps the provider message', () => {
  assert.equal(retryFailure(attempt({ failure: { message: '401 unauthorized', code: 'AUTH' } })),
    '凭据无效或已过期，重试不会成功。');
  assert.equal(retryFailure(attempt({ failure: { message: 'upstream 503', code: 'SERVER' } })), 'upstream 503');
  // A provider message that happens to read like a credentials error is still
  // kept when the code does not say AUTH.
  assert.equal(retryFailure(attempt({ failure: { message: '401 unauthorized', code: 'RATE_LIMIT' } })),
    '401 unauthorized');
});

test('the retry status sentence exists in both dictionaries and interpolates every field', () => {
  for (const [lang, dict] of [['zh', zh], ['en', en]] as const) {
    const key = 'retry.status' as const;
    assert.equal(typeof dict[key], 'string', lang);
    const rendered = uiIn(lang, key, { label: 'L', retry: 2, max: 5, seconds: 4 });
    for (const part of ['L', '2', '5', '4']) {
      assert.ok(rendered.includes(part), `${lang} ${key} dropped ${part}: ${rendered}`);
    }
    assert.ok(!rendered.includes('{'), `${lang} ${key} left a placeholder: ${rendered}`);
  }
});

test('every retry label exists in both dictionaries', () => {
  for (const key of ['retry.scheduled', 'retry.started', 'retry.cancelled', 'retry.delay',
    'retry.failure', 'retry.provider', 'retry.auth'] as const) {
    assert.equal(typeof zh[key], 'string', `zh missing ${key}`);
    assert.equal(typeof en[key], 'string', `en missing ${key}`);
    assert.notEqual(zh[key], '', key);
  }
  // The three lifecycle labels must stay distinct, or a cancelled retry reads
  // exactly like a running one.
  assert.equal(new Set([zh['retry.scheduled'], zh['retry.started'], zh['retry.cancelled']]).size, 3);
});
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ContextMessageNode } from '@deepseek-ai/dsh-client-ui-conversation/client';
import { triggerFamily, triggerSourceName, triggerTitleKey, isTriggerFamily } from '../src/client/native/TurnTriggerRow.tsx';
import { zh, en } from '../src/client/locale.ts';

function trigger(source: unknown): ContextMessageNode {
  return { content: [], source } as unknown as ContextMessageNode;
}

test('every recorded source kind maps to its own family', () => {
  assert.equal(triggerFamily(trigger({ kind: 'goal' })), 'goal');
  assert.equal(triggerFamily(trigger({ kind: 'agent-message' })), 'agent');
  assert.equal(triggerFamily(trigger({ kind: 'team-message' })), 'team');
  assert.equal(triggerFamily(trigger({ kind: 'subagent-settled' })), 'subagent');
  assert.equal(triggerFamily(trigger({ kind: 'schedule' })), 'schedule');
  assert.equal(triggerFamily(trigger({ kind: 'tool-jobs' })), 'job');
  assert.equal(triggerFamily(trigger({ kind: 'cordis-host-runner' })), 'plugin');
});

test('a webhook splits on its provider, because a GitHub event reads differently', () => {
  assert.equal(triggerFamily(trigger({ kind: 'webhook', provider: 'github' })), 'github');
  assert.equal(triggerFamily(trigger({ kind: 'webhook', provider: 'stripe' })), 'webhook');
  assert.equal(triggerFamily(trigger({ kind: 'webhook' })), 'webhook');
});

test('an unknown or malformed source is attributed to the neutral family, never dropped', () => {
  // The row still has to appear: a turn that started on its own is worse than
  // an unattributed one.
  assert.equal(triggerFamily(trigger({ kind: 'something-new' })), 'request');
  assert.equal(triggerFamily(trigger({})), 'request');
  assert.equal(triggerFamily(trigger(undefined)), 'request');
  assert.equal(triggerFamily(trigger(null)), 'request');
  assert.equal(triggerFamily(trigger([])), 'request');
  assert.equal(triggerFamily(trigger({ kind: 42 })), 'request');
});

test('a source name is read from the first field that carries one', () => {
  assert.equal(triggerSourceName(trigger({ kind: 'schedule', label: 'nightly' })), 'nightly');
  assert.equal(triggerSourceName(trigger({ kind: 'schedule', name: 'nightly' })), 'nightly');
  assert.equal(triggerSourceName(trigger({ kind: 'schedule', id: 'abc' })), 'abc');
  assert.equal(triggerSourceName(trigger({ kind: 'schedule', label: 'nightly', name: 'other' })), 'nightly');
  // An empty string names nothing, so the row shows no source rather than a blank.
  assert.equal(triggerSourceName(trigger({ kind: 'schedule', label: '' })), null);
  assert.equal(triggerSourceName(trigger({ kind: 'schedule', label: 7 })), null);
  assert.equal(triggerSourceName(trigger({ kind: 'schedule' })), null);
});

test('every family resolves to a title key present in both dictionaries', () => {
  const families = ['request', 'goal', 'agent', 'team', 'subagent', 'github', 'webhook', 'schedule', 'job', 'plugin'] as const;
  for (const family of families) {
    const key = triggerTitleKey(family);
    assert.equal(typeof zh[key], 'string', `zh missing ${key}`);
    assert.equal(typeof en[key], 'string', `en missing ${key}`);
    assert.notEqual(zh[key], '', key);
  }
  // The ten families must not collapse onto one shared title: a reader cannot
  // tell a schedule from a webhook if both say "notified".
  assert.equal(new Set(families.map(triggerTitleKey)).size, families.length);
});

test('the explanation and source label exist in both dictionaries', () => {
  assert.equal(typeof zh['trigger.explanation'], 'string');
  assert.equal(typeof en['trigger.explanation'], 'string');
  assert.equal(typeof zh['trigger.source'], 'string');
  assert.equal(typeof en['trigger.source'], 'string');
});

test('isTriggerFamily accepts the real families and rejects everything else', () => {
  assert.equal(isTriggerFamily('schedule'), true);
  assert.equal(isTriggerFamily('github'), true);
  assert.equal(isTriggerFamily('request'), true);
  assert.equal(isTriggerFamily('kind'), false);
  assert.equal(isTriggerFamily(''), false);
  assert.equal(isTriggerFamily('Schedule'), false);
});
// The row is reached through `Reader`'s non-process seat, which holds no host
// `chat` locale seat. Rendering the component directly is the standing check
// that the row is usable without one — before this was split out, the retry and
// trigger branches had been written into the foldable-process path only, which
// no node of either kind ever takes, so both were unreachable at runtime while
// type-checking and unit tests stayed green.
test('the row renders without a host locale seat', async () => {
  const { render, cleanup } = await import('@testing-library/react');
  const { TurnTriggerRow } = await import('../src/client/native/TurnTriggerRow.tsx');
  const node = {
    content: [{ type: 'text', text: 'Finished nightly index rebuild.' }],
    source: { kind: 'schedule', name: 'nightly-index' },
  } as unknown as ContextMessageNode;
  const view = render(<TurnTriggerRow node={node} title="定时任务" explanation="这条通知触发了本轮回复。" />);
  const root = view.container.querySelector('[data-trigger-family]');
  assert.equal(root?.getAttribute('data-trigger-family'), 'schedule');
  assert.match(view.container.textContent ?? '', /定时任务/);
  assert.match(view.container.textContent ?? '', /nightly-index/);
  // The body is collapsed to start with, so the family above is read off the
  // wrapper — the marker must not depend on expanding.
  assert.equal(view.container.querySelector('[data-turn-trigger-body]') === null, true);
  cleanup();
});

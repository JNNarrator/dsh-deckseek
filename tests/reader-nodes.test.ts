// The one list two subsystems depend on.
//
// `Reader.tsx` dispatches on these kinds to its own renderers, and the
// official-rendering bridge must not borrow an official renderer for any of
// them. The failure mode is what makes this worth a test: adding a kind to the
// dispatch and forgetting the list does not break anything loudly — the kind is
// simply rendered twice, once by each side. So the list is checked against the
// dispatch in BOTH directions, from the source, rather than trusted.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { READER_NODES, isReaderNode } from '../src/client/reader-nodes.js';

const reader = readFileSync(new URL('../src/client/Reader.tsx', import.meta.url), 'utf8');

/**
 * The chat-node dispatch's kinds: `isNode(node, 'x')` and `node.kind === 'x'`.
 *
 * The receiver has to be pinned to `node`. This file also switches on two other
 * unions — a block's `kind` (`reasoning`), a flow item's `kind` (`tool`, `node`),
 * a command outcome's `kind` (`error`) and a pending request's `kind`
 * (`question`) — and matching those reported five kinds that are not chat nodes
 * at all. A guard that cannot tell which union it is reading is worse than none.
 */
function dispatchedKinds(source: string): Set<string> {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const found = new Set<string>();
  for (const match of withoutComments.matchAll(/isNode\(\s*\w+\s*,\s*'([a-z-]+)'\s*\)/g)) found.add(match[1]!);
  for (const match of withoutComments.matchAll(/node\.kind\s*===\s*'([a-z-]+)'/g)) found.add(match[1]!);
  // `unknown` is the fallback row for a kind nobody drew, not a kind the view
  // draws: it must NOT be in the list, or the bridge would refuse to mirror the
  // very renderer that exists for kinds this view does not know.
  found.delete('unknown');
  return found;
}

test('every kind the view dispatches on is on the list', () => {
  const missing = [...dispatchedKinds(reader)].filter(kind => !READER_NODES.includes(kind));
  assert.deepEqual(missing, [],
    'these kinds are drawn by the view but not listed, so the bridge would mirror an official renderer for them and render them twice');
});

test('every kind on the list is one the view dispatches on', () => {
  const dispatch = dispatchedKinds(reader);
  const stale = READER_NODES.filter(kind => !dispatch.has(kind));
  assert.deepEqual(stale, [],
    'these kinds are listed but nothing draws them, so the bridge would refuse an official renderer for a kind that then renders as a JSON dump');
});

test('the list is frozen and answers through its predicate', () => {
  assert.ok(Object.isFrozen(READER_NODES), 'a shared list that callers can mutate is not a contract');
  for (const kind of READER_NODES) assert.equal(isReaderNode(kind), true);
  for (const other of ['unknown', 'future-node-kind', undefined]) assert.equal(isReaderNode(other), false);
});

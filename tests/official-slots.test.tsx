// The official-rendering bridge.
//
// Driven through a fake registry rather than a mounted Reader, because the seat
// renders through the host's own `renderSlot` — which the test harness stubs, so
// a mount test here would assert the stub, not the bridge. What is worth
// asserting is exactly what the bridge does to the registry: which seats it
// declares, that it preserves the host's component identity, that it mounts
// incrementally, and that it lets go of everything it took.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import {
  EXPECTED, OFFICIAL_SLOTS, acceptsOfficialNode, installOfficialSlots, mirrorOfficialSlot, officialChildren, officialSeat,
  type CompositionRegistry, type SlotSpecLike, type StoredEntryLike,
} from '../src/client/official-slots.js';
import { READER_NODES } from '../src/client/reader-nodes.js';

interface Entry extends StoredEntryLike { options: { key?: string; name?: string; [key: string]: unknown } }

/** A registry with just the operations the bridge uses, plus seeding. */
function registry(specs: Record<string, SlotSpecLike | undefined> = {}) {
  const slots = new Map<string, Entry[]>();
  const listeners = new Map<string, Set<() => void>>();
  const injected: string[] = [];
  const notify = (key: string): void => { for (const listener of [...listeners.get(key) ?? []]) listener(); };
  const registry: CompositionRegistry & { seed(key: string, entries: Entry[]): void; notify(key: string): void; injected: string[] } = {
    injected,
    spec: key => specs[key],
    entriesOfSlot: key => slots.get(key) ?? [],
    subscribe(key, listener) {
      const set = listeners.get(key) ?? new Set();
      set.add(listener);
      listeners.set(key, set);
      return () => { set.delete(listener); };
    },
    inject(key, effect) {
      if (!specs[key]) return () => {};
      injected.push(key);
      return effect();
    },
    register(options, component) {
      const key = String(options.name);
      // A real `entriesOfSlot` entry carries its declared children at the top
      // level, so the fake has to as well — otherwise it would hide the very
      // thing the child-translation test is about.
      const entry: Entry = {
        component, options, registrant: options.registrant as string | undefined,
        ...(options.children ? { children: options.children as Record<string, unknown> } : {}),
      };
      const list = slots.get(key) ?? [];
      list.push(entry);
      slots.set(key, list);
      notify(key);
      return () => {
        const at = list.indexOf(entry);
        if (at >= 0) { list.splice(at, 1); notify(key); }
      };
    },
    seed(key, entries) { slots.set(key, [...entries]); },
    notify,
  };
  return registry;
}

const hostSpecs = { [OFFICIAL_SLOTS.actions]: EXPECTED.actions, [OFFICIAL_SLOTS.tools]: EXPECTED.tools, [OFFICIAL_SLOTS.nodes]: EXPECTED.nodes };
const entry = (key: string, component: unknown = () => null): Entry => ({ component, options: { key, name: 'x' } });

test('the seats are declared with what the host says they are', () => {
  const seats = officialChildren(registry(hostSpecs));
  assert.deepEqual(Object.keys(seats), [officialSeat('actions'), officialSeat('tools'), officialSeat('nodes')]);
  assert.deepEqual(seats[officialSeat('actions')], { kind: 'list', scope: 'session' });
  assert.equal(seats[officialSeat('nodes')]!.kind, 'keyed');
});

test('a slot the host declares differently is refused, not mirrored', () => {
  const changed = { ...hostSpecs, [OFFICIAL_SLOTS.tools]: { kind: 'list', scope: 'session' } };
  assert.throws(() => officialChildren(registry(changed)), /Official slot contract changed: tool\.call\.toolview/);
});

test('the node family mirrors every kind except the ones this view draws', () => {
  for (const kind of READER_NODES) assert.equal(acceptsOfficialNode(entry(kind)), false, `${kind} is drawn here; mirroring it would render it twice`);
  assert.equal(acceptsOfficialNode(entry('some-future-kind')), true);
  assert.equal(acceptsOfficialNode({ component: null, options: {} }), true, 'a keyless entry cannot be a kind this view draws');
});

test('mirroring keeps the host\'s component and names both owners', () => {
  const slots = registry();
  const original = () => null;
  slots.seed(OFFICIAL_SLOTS.nodes, [{ component: original, options: { key: 'future' }, registrant: 'official-plugin' }]);
  const dispose = mirrorOfficialSlot(slots, OFFICIAL_SLOTS.nodes, officialSeat('nodes'), 'dsh-deckseek.official.nodes');
  const mirrored = slots.entriesOfSlot(officialSeat('nodes'));
  assert.equal(mirrored.length, 1);
  assert.equal(mirrored[0]!.component, original, 'the host\'s component itself, never a re-implementation');
  assert.match(mirrored[0]!.registrant ?? '', /official-plugin/, 'the alias says who really wrote it');
  dispose();
  assert.deepEqual(slots.entriesOfSlot(officialSeat('nodes')), []);
});

test('a new official entry mounts without remounting the ones already there', () => {
  const slots = registry();
  const first = () => null;
  slots.seed(OFFICIAL_SLOTS.nodes, [{ component: first, options: { key: 'a' } }]);
  const dispose = mirrorOfficialSlot(slots, OFFICIAL_SLOTS.nodes, officialSeat('nodes'), 'ns');
  const before = slots.entriesOfSlot(officialSeat('nodes'))[0]!.component;
  slots.entriesOfSlot(OFFICIAL_SLOTS.nodes) as Entry[];
  slots.seed(OFFICIAL_SLOTS.nodes, [...slots.entriesOfSlot(OFFICIAL_SLOTS.nodes), { component: () => null, options: { key: 'b' } }]);
  slots.notify(OFFICIAL_SLOTS.nodes);
  const after = slots.entriesOfSlot(officialSeat('nodes'));
  assert.equal(after.length, 2, 'the new entry is mounted');
  assert.equal(after[0]!.component, before, 'and the one already mounted kept its identity, so it did not remount');
  dispose();
});

test('an official entry that goes away takes its alias with it', () => {
  const slots = registry();
  const keep = () => null;
  const drop = () => null;
  slots.seed(OFFICIAL_SLOTS.tools, [{ component: keep, options: { key: 'k' } }, { component: drop, options: { key: 'd' } }]);
  const dispose = mirrorOfficialSlot(slots, OFFICIAL_SLOTS.tools, officialSeat('tools'), 'ns');
  assert.equal(slots.entriesOfSlot(officialSeat('tools')).length, 2);
  slots.seed(OFFICIAL_SLOTS.tools, [{ component: keep, options: { key: 'k' } }]);
  slots.notify(OFFICIAL_SLOTS.tools);
  const left = slots.entriesOfSlot(officialSeat('tools'));
  assert.equal(left.length, 1, 'only the removed one was unmounted');
  assert.equal(left[0]!.component, keep);
  dispose();
});

test('the filter is the node family\'s alone', () => {
  const slots = registry();
  slots.seed(OFFICIAL_SLOTS.nodes, [entry('user'), entry('some-future-kind')]);
  const dispose = mirrorOfficialSlot(slots, OFFICIAL_SLOTS.nodes, officialSeat('nodes'), 'ns', acceptsOfficialNode);
  const mirrored = slots.entriesOfSlot(officialSeat('nodes'));
  assert.equal(mirrored.length, 1, 'the kind this view draws is left out');
  assert.equal(mirrored[0]!.options.key, 'some-future-kind');
  dispose();
});

test('an entry\'s own child slots are declared under the alias, and read from there', () => {
  const slots = registry();
  const seen: string[] = [];
  const Original = (props: Record<string, unknown>): ReactElement | null => {
    (props.renderSlot as (key: string) => unknown)?.('tool.call.detail');
    return <div>official</div>;
  };
  slots.seed(OFFICIAL_SLOTS.tools, [{ component: Original, options: { key: 'k' }, children: { 'tool.call.detail': { kind: 'keyed', scope: 'session' } } }]);
  const dispose = mirrorOfficialSlot(slots, OFFICIAL_SLOTS.tools, officialSeat('tools'), 'dsh-deckseek.official.tools');
  const mirrored = slots.entriesOfSlot(officialSeat('tools'))[0]!;
  assert.deepEqual(Object.keys(mirrored.children ?? {}), ['dsh-deckseek.official.tools/tool.call.detail']);
  const Component = mirrored.component as (props: Record<string, unknown>) => ReactElement | null;
  render(<Component renderSlot={(key: string) => { seen.push(key); return null; }} />);
  assert.deepEqual(seen, ['dsh-deckseek.official.tools/tool.call.detail'], 'the child renders into the seat this plugin declared, not into the host\'s slot');
  dispose();
});

test('installing takes every family, and letting go returns all of them', () => {
  const slots = registry(hostSpecs);
  slots.seed(OFFICIAL_SLOTS.actions, [{ component: () => null, options: { id: 'a' } }]);
  slots.seed(OFFICIAL_SLOTS.nodes, [entry('some-future-kind')]);
  const stop = installOfficialSlots({ slots } as never);
  assert.deepEqual(slots.injected, [OFFICIAL_SLOTS.actions, OFFICIAL_SLOTS.tools, OFFICIAL_SLOTS.nodes]);
  assert.equal(slots.entriesOfSlot(officialSeat('actions')).length, 1);
  assert.equal(slots.entriesOfSlot(officialSeat('nodes')).length, 1);
  stop();
  for (const family of ['actions', 'tools', 'nodes'] as const) assert.deepEqual(slots.entriesOfSlot(officialSeat(family)), [], `${family} seat must be empty after disposal`);
});

test('a contract change at install time leaves nothing half-installed', () => {
  const slots = registry({ ...hostSpecs, [OFFICIAL_SLOTS.tools]: { kind: 'keyed', scope: 'global' } });
  // The first family has to have mounted something, or this test passes whether
  // or not the failed install cleans up after itself — which is how the version
  // without this line survived the mutation that removed the cleanup.
  slots.seed(OFFICIAL_SLOTS.actions, [{ component: () => null, options: { id: 'a' } }]);
  slots.seed(OFFICIAL_SLOTS.nodes, [entry('some-future-kind')]);
  assert.throws(() => installOfficialSlots({ slots } as never), /Official slot contract changed/);
  for (const family of ['actions', 'tools', 'nodes'] as const) {
    assert.deepEqual(slots.entriesOfSlot(officialSeat(family)), [], `${family} must not be left mounted`);
  }
});

/**
 * `forkAt` is the one member of `ReaderInjected` that is not read off the
 *   reading view's own seat. The host delivers the branch action with
 *   `ChatNodeOwnerProps`, which the `'conversation.view'` seat never holds, so
 *   the plugin rebuilds it from the two services the host's own implementation
 *   calls. That makes it unusually easy to get wrong in a way TypeScript cannot
 *   see: the code could name the wrong service, drop `atSeq`, drop
 *   `increaseTitle`, or open the parent session instead of the child, and every
 *   other test in this suite would stay green because none of them describe the
 *   action at all.
 *
 * So these tests drive `apply` and read what the injected face actually does,
 *   rather than testing a hand-built stand-in for it. The reader is never
 *   mounted here: the point is the service call behind the action, which only
 *   `apply` decides.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act } from 'react';
import type { Context } from '@deepseek-ai/cordis';
import { apply } from '../src/client/index.js';

type SlotConfig = { name: string; inject?: (sessionId: string) => Record<string, unknown> };

/**
 * The narrowest context `apply` reads: the slot registry, the settings form, the
 *   session controller, and a workspace service. `entriesOfSlot` reports no
 *   native session body, which is what the entry button waits on, so
 *   `installReaderEntry` subscribes and stops there — it cannot contribute a
 *   slot here and this file is not about it. `ctx.effect` is a no-op because its
 *   only job is clearing the face cache on teardown.
 */
function fakeContext(options: {
  fork?: (opts: unknown) => Promise<unknown>;
  workspace?: unknown;
}) {
  const configs: SlotConfig[] = [];
  const opened: unknown[] = [];
  const forks: unknown[] = [];
  const ctx = {
    slots: {
      inject: (_name: string, factory: () => unknown) => { factory(); },
      register: (config: SlotConfig) => { configs.push(config); return config; },
      entriesOfSlot: () => [],
      subscribe: () => () => {},
    },
    configForms: {
      get: () => ({ subscribe: () => () => {}, getSnapshot: () => ({ value: {}, writable: false }), set: async () => {} }),
    },
    sessions: {
      binding: () => ({ session: { loadOlder: async () => {} } }),
      fork: (opts: unknown) => {
        forks.push(opts);
        return options.fork === undefined ? Promise.resolve('child-7') : options.fork(opts);
      },
    },
    effect: () => {},
    get: (serviceName: string) => (serviceName === 'uiWorkspace'
      ? options.workspace === undefined
        ? { openSession: (target: unknown) => { opened.push(target); } }
        : options.workspace
      : undefined),
  };
  return { ctx: ctx as unknown as Context, configs, opened, forks };
}

/** The reading view's face factory, as the host would call it. */
function readerFace(configs: SlotConfig[]): (sessionId: string) => Record<string, unknown> {
  const view = configs.find(config => config.name === 'conversation.view');
  assert.notEqual(view, undefined, 'apply registered no conversation.view slot');
  assert.equal(typeof view!.inject, 'function', 'the conversation.view slot injects no face');
  return view!.inject!;
}

/** Resolve every promise the fire-and-forget fork left behind. */
async function settle(): Promise<void> {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

test('branching forks the session at the tail and opens the child', async () => {
  const { ctx, configs, opened, forks } = fakeContext({});
  apply(ctx);
  const inject = readerFace(configs);
  const face = inject('session-1');
  const forkAt = face.forkAt;
  assert.equal(typeof forkAt, 'function', 'the reading view was given no branch action');
  // One face per session: the button re-renders on every tail frame, and a
  // rebuilt face would hand React a new function identity each time.
  assert.equal(inject('session-1'), face, 'the injected face was rebuilt for the same session');

  (forkAt as (seq: number) => void)(42);
  await settle();

  assert.deepEqual(forks, [{ sessionId: 'session-1', atSeq: 42, increaseTitle: true }],
    'the fork did not ask for the parent session at the tail sequence with a distinct child title');
  assert.deepEqual(opened, ['child-7'],
    'the child session was not opened, so forking would produce a conversation the reader cannot see');
});

test('a host without a workspace browser still forks, and still loads the reader', async () => {
  const { ctx, configs, forks } = fakeContext({ workspace: null });
  // `uiWorkspace` is resolved lazily rather than listed in `inject`, so a
  // deployment without one must still apply the plugin and still fork.
  apply(ctx);
  const face = readerFace(configs)('session-1');
  (face.forkAt as (seq: number) => void)(7);
  await settle();

  assert.equal(forks.length, 1, 'a deployment without a workspace browser refused to fork at all');
});

test('a refused fork is swallowed instead of escaping the click handler', async () => {
  // The host leaves the source view untouched when a fork is refused; the plugin
  // mirrors that by swallowing, so nothing must reject out of the handler.
  const { ctx, configs } = fakeContext({ fork: () => Promise.reject(new Error('session/fork-unavailable')) });
  apply(ctx);
  const face = readerFace(configs)('session-1');
  (face.forkAt as (seq: number) => void)(3);
  await settle();
  assert.equal(true, true);
});
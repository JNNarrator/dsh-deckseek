// The one capability that runs something on the user's machine.
//
// Both halves are asserted here: the pure rules that decide whether a path is
// inside the session's root, and the route that applies them. The route is
// driven through injected dependencies rather than a live server, because the
// interesting assertions are all refusals — and a refusal that was never
// exercised is indistinguishable from a route that forgot to check.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRevealRoute, normalizeAbsolute, systemOpener, withinRoot } from '../src/reveal-path.js';
import type { RevealDeps, RevealRequestLike, RevealResponseLike } from '../src/reveal-path.js';

test('an absolute path reduces to one comparable form', () => {
  assert.equal(normalizeAbsolute('/w/proj/src/a.ts'), '/w/proj/src/a.ts');
  assert.equal(normalizeAbsolute('/w/proj/./src//a.ts'), '/w/proj/src/a.ts');
  assert.equal(normalizeAbsolute('/w/proj/src/../b.ts'), '/w/proj/b.ts');
  assert.equal(normalizeAbsolute('/w/proj/src/'), '/w/proj/src');
  assert.equal(normalizeAbsolute('C:\\w\\proj\\a.ts'), 'C:/w/proj/a.ts', 'a drive keeps its identity, upper-cased');
  assert.equal(normalizeAbsolute('/'), '/');
});

test('a path that is not absolute, or that climbs past its own root, has no comparable form', () => {
  assert.equal(normalizeAbsolute('w/proj/a.ts'), undefined);
  assert.equal(normalizeAbsolute('./a.ts'), undefined);
  assert.equal(normalizeAbsolute(''), undefined);
  assert.equal(normalizeAbsolute(undefined), undefined);
  assert.equal(normalizeAbsolute(7), undefined);
  assert.equal(normalizeAbsolute('/../../etc/passwd'), undefined, 'a traversal past the root is not a path, it is a refusal');
});

test('the boundary is a separator, not a string prefix', () => {
  assert.equal(withinRoot('/w/proj', '/w/proj/src/a.ts'), '/w/proj/src/a.ts');
  assert.equal(withinRoot('/w/proj', '/w/proj'), '/w/proj', 'the root itself is a legitimate target');
  assert.equal(withinRoot('/w/proj', '/w/proj2/a.ts'), undefined, 'a sibling whose name starts the same way is not inside');
  assert.equal(withinRoot('/w/proj', '/w/proj/../elsewhere/a.ts'), undefined);
  assert.equal(withinRoot('/w/proj', '/etc/passwd'), undefined);
  assert.equal(withinRoot('/w/proj', 'relative.ts'), undefined);
  assert.equal(withinRoot(undefined, '/w/proj/a.ts'), undefined, 'no root means nothing is inside it');
  assert.equal(withinRoot('/', '/anything/at/all'), '/anything/at/all');
});

test('the opener is claimed only where revealing exists', () => {
  assert.equal(systemOpener('darwin')!.command, 'open');
  assert.deepEqual(systemOpener('darwin')!.args('/w/a.ts'), ['-R', '/w/a.ts'], 'select the file, do not open it');
  assert.deepEqual(systemOpener('win32')!.args('C:\\w\\a.ts'), ['/select,C:\\w\\a.ts']);
  // `xdg-open` would OPEN the file. Revealing is not launching, and this plugin
  // does not get to decide to run a file, so Linux is not claimed.
  assert.equal(systemOpener('linux'), undefined);
});

interface Response extends RevealResponseLike { body: string }

function response(): Response {
  return {
    statusCode: 0, body: '',
    setHeader() {},
    end(body?: string) { this.body = body ?? ''; },
  };
}

function harness(overrides: Partial<RevealDeps> = {}) {
  const calls: { command: string; args: readonly string[] }[] = [];
  const warnings: string[] = [];
  const deps: RevealDeps = {
    registry: () => ({ list: () => [{ path: '/w/proj', sessionIds: ['s1'] }] }),
    realpath: async path => path,
    exists: async () => true,
    spawn: (command, args) => { calls.push({ command, args }); },
    readBody: async () => JSON.stringify({ sessionId: 's1', path: '/w/proj/src/a.ts' }),
    platform: 'darwin',
    warn: message => { warnings.push(message); },
    ...overrides,
  };
  return { route: createRevealRoute(deps), calls, warnings };
}

async function request(route: ReturnType<typeof createRevealRoute>, req: RevealRequestLike): Promise<Response> {
  const res = response();
  await route.handler(req, res);
  return res;
}

test('the route is namespaced by this plugin and matches exactly', () => {
  const { route } = harness();
  assert.equal(route.kind, 'exact');
  assert.equal(route.path, '/dsh-deckseek/reveal');
});

test('anything but POST is refused before the body is even read', async () => {
  let read = false;
  const { route } = harness({ readBody: async () => { read = true; return '{}'; } });
  for (const method of ['GET', 'PUT', 'DELETE', undefined]) {
    assert.equal((await request(route, { method })).statusCode, 405);
  }
  assert.equal(read, false, 'a refused method must not be given a body read');
});

test('a body that is not a request is refused', async () => {
  for (const body of ['not json', '{}', '{"sessionId":"s1"}', '{"sessionId":"","path":""}', '{"sessionId":"s1","path":7}']) {
    const { route } = harness({ readBody: async () => body });
    assert.equal((await request(route, { method: 'POST' })).statusCode, 400, body);
  }
});

test('a deployment with no registry refuses rather than trusting the caller', async () => {
  const { route, calls } = harness({ registry: () => undefined });
  assert.equal((await request(route, { method: 'POST' })).statusCode, 403);
  assert.deepEqual(calls, []);
});

test('a session that belongs to no workspace is refused', async () => {
  const { route, calls } = harness({ registry: () => ({ list: () => [{ path: '/w/proj', sessionIds: ['other'] }] }) });
  assert.equal((await request(route, { method: 'POST' })).statusCode, 403);
  assert.deepEqual(calls, []);
});

test('a path that does not exist is refused', async () => {
  const { route, calls } = harness({ exists: async () => false });
  assert.equal((await request(route, { method: 'POST' })).statusCode, 403);
  assert.deepEqual(calls, []);
});

test('a path outside the session root is refused and nothing is spawned', async () => {
  const { route, calls } = harness({ readBody: async () => JSON.stringify({ sessionId: 's1', path: '/etc/passwd' }) });
  const res = await request(route, { method: 'POST' });
  assert.equal(res.statusCode, 403);
  assert.deepEqual(calls, [], 'the refusal has to happen before the opener, not after');
});

test('a symlink that resolves out of the workspace is refused', async () => {
  // The request is lexically inside the root; only the resolved path reveals it.
  // This is the case a prefix check on the REQUESTED string would let through.
  const { route, calls } = harness({
    readBody: async () => JSON.stringify({ sessionId: 's1', path: '/w/proj/link.ts' }),
    realpath: async path => path === '/w/proj/link.ts' ? '/elsewhere/real.ts' : path,
  });
  assert.equal((await request(route, { method: 'POST' })).statusCode, 403);
  assert.deepEqual(calls, []);
});

test('a resolvable path inside the session root is handed to the platform opener', async () => {
  const { route, calls } = harness();
  const res = await request(route, { method: 'POST' });
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /"ok":true/);
  assert.deepEqual(calls, [{ command: 'open', args: ['-R', '/w/proj/src/a.ts'] }]);
});

test('the opener receives the resolved path, never the requested one', async () => {
  const { route, calls } = harness({
    readBody: async () => JSON.stringify({ sessionId: 's1', path: '/w/proj/./src/../src/a.ts' }),
    realpath: async path => path === '/w/proj' ? '/w/proj' : '/w/proj/src/a.ts',
  });
  assert.equal((await request(route, { method: 'POST' })).statusCode, 200);
  assert.deepEqual(calls, [{ command: 'open', args: ['-R', '/w/proj/src/a.ts'] }]);
});

test('a platform with no reveal is refused, not silently downgraded to an open', async () => {
  const { route, calls } = harness({ platform: 'linux' });
  assert.equal((await request(route, { method: 'POST' })).statusCode, 501);
  assert.deepEqual(calls, []);
});

test('an opener that cannot start is reported rather than claimed as success', async () => {
  const { route } = harness({ spawn: () => { throw new Error('ENOENT'); } });
  const res = await request(route, { method: 'POST' });
  assert.equal(res.statusCode, 500);
  assert.match(res.body, /"ok":false/);
});

test('every refusal is recorded with its reason', async () => {
  const { route, warnings } = harness({ readBody: async () => JSON.stringify({ sessionId: 's1', path: '/etc/passwd' }) });
  await request(route, { method: 'POST' });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0]!, /reveal refused/);
});

// The reveal route as the host plugin actually installs it.
//
// The route's own rules are asserted pure in `reveal-path.test.ts`; what is
// asserted here is the WIRING — that the entry registers the route where the
// deployment has a web server, registers nothing where it does not, and hands
// the route a registry lookup that goes through the host context rather than a
// value captured at load.
//
// Every request driven here is a refusal, on purpose: the happy path would spawn
// the machine's real file manager, and no test gets to do that. The happy path
// is covered by the factory's own suite, which injects the spawn.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../src/dsh-deckseek.js';
import { REVEAL_PATH } from '../src/reveal-path.js';
import type { RevealRequestLike, RevealResponseLike } from '../src/reveal-path.js';

interface Route { kind: string; path: string; handler: (req: RevealRequestLike, res: RevealResponseLike) => void | Promise<void> }

/**
 * A host context with just enough cordis semantics to be faithful where it
 * matters: `inject` only composes when EVERY named service is present, which is
 * what lets "no web server" mean "no route" rather than "a broken callback".
 */
function host(options: { withoutWebServer?: boolean; withoutRegistry?: boolean } = {}) {
  const routes: Route[] = [];
  const effects: string[] = [];
  const available: Record<string, unknown> = {
    workspaceRegistry: { list: () => [{ path: '/w/proj', sessionIds: ['s1'] }] },
  };
  if (!options.withoutWebServer) {
    available.webServer = {
      register(route: Route) { routes.push(route); return () => {}; },
    };
  }
  if (options.withoutRegistry) delete available.workspaceRegistry;
  const ctx = {
    fiber: {},
    inject(names: string[], callback: (sub: unknown) => unknown) {
      if (names.some(name => available[name] === undefined)) return;
      callback({
        webServer: available.webServer,
        settings: available.settings,
        get: (name: string) => available[name],
        effect(run: () => unknown, label: string) { effects.push(label); return run(); },
      });
    },
  };
  return { ctx, routes, effects };
}

/** A request that carries its body inline, as the route's reader expects. */
function request(method: string, body: string) {
  return {
    method,
    on(event: string, handler: (chunk?: unknown) => void) {
      if (event === 'data') handler(body);
      if (event === 'end') handler();
    },
  } as RevealRequestLike;
}

function response() {
  return { statusCode: 0, body: '', setHeader() {}, end(body?: string) { this.body = body ?? ''; } };
}

async function drive(route: Route, req: RevealRequestLike) {
  const res = response();
  await route.handler(req, res);
  return res;
}

test('the entry registers the reveal route where the host has a web server', () => {
  const { ctx, routes, effects } = host();
  apply(ctx as never);
  assert.equal(routes.length, 1, 'exactly one route, and only the reveal one');
  assert.equal(routes[0]!.path, REVEAL_PATH);
  assert.equal(routes[0]!.kind, 'exact', 'a prefix route would answer for paths this plugin does not own');
  assert.ok(effects.includes('dsh-deckseek: /dsh-deckseek/reveal route'), 'registered through an effect, so it is disposed with the plugin');
});

test('a deployment with no web server installs nothing and still loads', () => {
  const { ctx, routes } = host({ withoutWebServer: true });
  apply(ctx as never);
  assert.deepEqual(routes, [], 'no web server means no route, not a broken one');
});

test('a request without a session the registry knows is refused', async () => {
  const { ctx, routes } = host();
  apply(ctx as never);
  const res = await drive(routes[0]!, request('POST', JSON.stringify({ sessionId: 'someone-else', path: '/w/proj/a.ts' })));
  assert.equal(res.statusCode, 403);
});

test('the route asks the host context for the registry on every request', async () => {
  // Not a value captured at load: a deployment that installs the registry after
  // the plugin must still be served, and one that never installs it must refuse.
  const { ctx, routes } = host({ withoutRegistry: true });
  apply(ctx as never);
  const res = await drive(routes[0]!, request('POST', JSON.stringify({ sessionId: 's1', path: '/w/proj/a.ts' })));
  assert.equal(res.statusCode, 403, 'without a registry there is no bound to check against, so nothing is revealed');
});

test('a path that does not exist on disk is refused', async () => {
  // The real `exists` is `stat`, and this path is not there. Nothing spawns.
  const { ctx, routes } = host();
  apply(ctx as never);
  const res = await drive(routes[0]!, request('POST', JSON.stringify({ sessionId: 's1', path: '/w/proj/definitely-not-here.ts' })));
  assert.equal(res.statusCode, 403);
});

test('a method other than POST is refused before the registry is consulted', async () => {
  const { ctx, routes } = host({ withoutRegistry: true });
  apply(ctx as never);
  const res = await drive(routes[0]!, request('GET', ''));
  assert.equal(res.statusCode, 405, 'the method check comes first, so a wrong method cannot even probe the registry');
});

/**
 * Load the packaged plugin the way the app will, without restarting the app.
 *
 * A plugin has three ways to be broken that neither `npm test` nor `tsc` can
 * see, because all three depend on the *packaged* artifacts rather than on the
 * sources:
 *
 * 1. The profile does not list the plugin, so it is never composed.
 * 2. The host half does not resolve its own dependencies from the profile.
 * 3. The client bundle asks the app's module loader for something the loader
 *    does not provide. That one is the nastiest: the bundle still builds, the
 *    sources still type-check, and the failure only exists at load time. It has
 *    happened — an early build externalized `@deepseek-ai/dsh-util-workspace-path`
 *    that the shipped bundle inlines, because a plain utility is not one of the
 *    client modules the loader registers.
 *
 * Usage: `node scripts/preflight-plugin.mjs [profileDir]`
 * Defaults to `~/.dsh/profiles/desktop`. Exits non-zero on the first failure.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The app bundle whose peer expectations this plugin will be measured against. */
const app = process.env.DSH_APP ?? '/Applications/DeepSeek Harness.app';

const fail = message => { console.error(`✖ ${message}`); process.exit(1); };
const pass = message => { console.log(`✔ ${message}`); };
const profile = resolve(process.argv[2] ?? join(homedir(), '.dsh/profiles/desktop'));

// ── 1. the profile composes the plugin ──────────────────────────────────────
if (!existsSync(join(profile, 'package.json'))) fail(`no profile at ${profile}`);
const realProfile = realpathSync(profile);
if (realProfile !== profile) console.log(`  note: ${profile} is a symlink to ${realProfile}`);
const manifest = JSON.parse(readFileSync(join(profile, 'package.json'), 'utf8'));
const bundles = manifest.dsh?.profile?.bundles ?? [];
if (!bundles.includes('dsh-deckseek')) fail('the profile does not list dsh-deckseek in dsh.profile.bundles');
if (manifest.dependencies?.['dsh-deckseek'] === undefined) fail('the profile does not depend on dsh-deckseek');
pass(`profile ${profile} composes dsh-deckseek (${manifest.dependencies['dsh-deckseek']})`);

// ── 2. Node resolves it there, with its own dependencies ────────────────────
const requireFromProfile = createRequire(join(profile, 'package.json'));
let packageRoot;
try {
  packageRoot = requireFromProfile.resolve('dsh-deckseek/package.json');
} catch {
  fail('dsh-deckseek does not resolve from the profile');
}
const pkg = JSON.parse(readFileSync(packageRoot, 'utf8'));
// The absolute path, because a profile directory is often a symlink — on this
// machine `desktop` points at `default`, so "installed into desktop" and
// "installed into default" are the same directory and a shortened path hides it.
pass(`resolved ${pkg.name}@${pkg.version} from ${resolve(packageRoot, '..')}`);

if (pkg.dsh?.client?.platform !== 'web') fail(`expected a web client bundle, got ${pkg.dsh?.client?.platform}`);
const patch = resolve(packageRoot, '..', pkg.dsh?.bundle?.patch ?? '');
if (!existsSync(patch)) fail(`the bundle patch ${pkg.dsh?.bundle?.patch} is missing`);
pass('the entry declares a web client bundle and a bundle patch');

const hostHalf = pathToFileURL(join(packageRoot, '..', 'lib/dsh-deckseek.js')).href;
let host;
try {
  host = await import(hostHalf);
} catch (error) {
  fail(`the host half does not import: ${error.message}`);
}
for (const key of ['Config', 'apply', 'inject', 'name']) {
  if (host[key] === undefined) fail(`the host half does not export ${key}`);
}
if (host.name !== 'dsh-deckseek') fail(`the host half is named ${host.name}, which is not the profile entry id`);
pass('the host half imports and exports Config / apply / inject / name');

// ── 3. the host will actually accept it ─────────────────────────────────────
//
// The gate that matters most, and the one that is invisible from the sources:
// the harness refuses a plugin whose peer ranges exclude its own version, and a
// refused plugin is simply absent — no crash, no error, nothing to look at.
// This plugin shipped a `<0.2.0-0` bound once and disappeared the moment the
// app updated to 0.2.0-rc.1, while `npm test` and `tsc` stayed green.
let appVersion = null;
try {
  appVersion = execFileSync('defaults', ['read', `${app}/Contents/Info.plist`, 'CFBundleShortVersionString'], { encoding: 'utf8' }).trim();
} catch {
  console.log(`  note: could not read the app version from ${app}; skipping the peer check`);
}
let semver = null;
try {
  semver = (await import('semver')).default;
} catch {
  console.log('  note: semver is not installed; skipping the peer check (`npm i -D semver`)');
}
if (appVersion !== null && semver !== null) {
  const hostPackages = Object.keys(pkg.peerDependencies ?? {}).filter(name => name.startsWith('@deepseek-ai/dsh'));
  const rejected = hostPackages.filter(name => {
    const range = pkg.peerDependencies[name];
    // `includePrerelease` is what the harness itself uses, and it is what makes
    // `>=0.1.7-rc.1 <0.3.0-0` accept `0.2.0-rc.1`.
    return !semver.satisfies(appVersion, range, { includePrerelease: true });
  });
  if (rejected.length > 0) {
    fail(`the installed app is ${appVersion}, which these peer ranges exclude: ${rejected.map(name => `${name} ${pkg.peerDependencies[name]}`).join(', ')}`);
  }
  pass(`the installed app is ${appVersion}, inside all ${hostPackages.length} host peer ranges`);
}

// ── 3. the client bundle registers, and asks only for what exists ───────────
const clientPath = join(packageRoot, '..', 'lib/client.js');
const code = readFileSync(clientPath, 'utf8');

/**
 * Modules the app's loader can hand a browser bundle. Anything else has to be
 * bundled: a `require` for it resolves to nothing at load time.
 */

/**
 * The build's own CSS must survive its transform.
 *
 * `tests/css-modules.test.ts` checks the transform on the sources; this checks
 * the artifact that will actually load, which is the one that ships. A scoped
 * name inside a layout value is the signature of a rename that landed where it
 * does not belong — it turns `flex-direction: column` into an invalid value the
 * browser drops, and the reading view silently lays every turn out side by side
 * at one character wide.
 */
const layoutValues = [...code.matchAll(/(flex-direction|align-items|justify-content|display)\s*:\s*(_[A-Za-z0-9]+_[A-Za-z0-9_-]+)/g)];
if (layoutValues.length > 0) {
  fail(`the build substituted a class name into a layout value: ${[...new Set(layoutValues.map(match => match[0]))].join(', ')}`);
}
const directions = (code.match(/flex-direction:\s*column/g) ?? []).length;
if (directions < 5) fail(`the built CSS declares only ${directions} flex columns; expected the sheets' own`);
pass(`the built CSS keeps its declarations (${directions} flex columns, no class name in a value)`);

const LOADABLE = [/^react$/, /^react-dom$/, /^react\//, /^react-dom\//, /^@deepseek-ai\/dsh-client-/, /^@deepseek-ai\/dsh-api-/];
const required = [...new Set([...code.matchAll(/require\("([^"]+)"\)/g)].map(match => match[1]))].sort();
const unloadable = required.filter(id => !LOADABLE.some(pattern => pattern.test(id)));
if (unloadable.length > 0) {
  fail(`the client bundle requires modules the loader does not register: ${unloadable.join(', ')}`);
}
pass(`the client bundle requires only loadable modules (${required.join(', ')})`);

// Evaluate it against the real React and a stub loader, so the top-level code
// — including every stylesheet injection — actually runs.
const { GlobalRegistrator } = await import('@happy-dom/global-registrator');
GlobalRegistrator.register();
const ReactNamespace = await import('react');
const jsxRuntime = await import('react/jsx-runtime');
const shell = () => new Proxy({}, { get: (_target, key) => (key === '__esModule' ? true : () => null) });
let registered = null;
globalThis.window.__ModuleLoader__ = { load(entry) { registered = entry; } };
const fakeRequire = id => id === 'react' ? ReactNamespace : id === 'react/jsx-runtime' ? jsxRuntime : shell();
let exports;
try {
  new Function('window', 'document', code)(globalThis.window, globalThis.document);
  if (registered === null) fail('the bundle never called the module loader');
  exports = registered.factory(fakeRequire);
} catch (error) {
  fail(`the client bundle throws while loading: ${error.message}`);
}
if (registered?.id !== 'dsh-deckseek') fail(`the bundle registers as ${registered?.id}, not as the profile entry id`);
for (const key of ['apply', 'inject', 'name']) {
  if (exports?.[key] === undefined) fail(`the client bundle does not export ${key}`);
}
pass(`the client bundle loads and registers as "${registered.id}" (${Object.keys(exports).join(', ')})`);

const sheets = globalThis.document.querySelectorAll('style[data-deckseek-sheet]');
if (sheets.length === 0) fail('the client bundle injected no stylesheet');
pass(`${sheets.length} stylesheets injected`);

console.log('\nAll preflight checks passed. The plugin is ready for the app to load on next start.');

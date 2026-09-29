/**
 * Local stand-in for the private dshx devkit's `externalClientBundle` adapter.
 *
 * The real devkit lives in its own repository and installs itself into a
 * Harness checkout at `tools/dshx`; `tsdown.config.ts` imports it from
 * `$DSHX_DEVKIT` (default `$DSHX_HARNESS`). This file provides the same entry
 * point so the plugin can be built without that checkout.
 *
 * It reproduces the two things the devkit does that plain tsdown cannot:
 *
 * 1. **CSS Modules.** See `scripts/css-modules.mjs`, which owns the transform
 *    and explains why it is structural rather than textual.
 * 2. **The browser bundle envelope.** A client plugin is loaded by the app as
 *    `window.__ModuleLoader__.load({ id, factory })`, where the factory
 *    receives `require` for the shared externals (react and every
 *    `@deepseek-ai/*` client package). Bundle and envelope are produced here.
 */

import { cssModules } from '../../../../css-modules.mjs';

/** Extension a browser client bundle ships as, regardless of `"type": "module"`. */
const CLIENT_EXTENSION = '.js';

/**
 * What the app's module loader can hand the factory, by `require`.
 *
 * React plus the *client* packages. It is deliberately narrower than "every
 * `@deepseek-ai/*` package": the loader registers client-side modules only, so
 * a plain utility such as `@deepseek-ai/dsh-util-workspace-path` has to be
 * bundled. The shipped 0.11.0 bundle is the evidence — it inlines that
 * utility's own source while requiring the client packages, and an earlier
 * draft of this file externalized it and produced a bundle the app could not
 * load.
 */
const CLIENT_EXTERNAL = [
  /^react$/,
  /^react-dom$/,
  /^react\//,
  /^react-dom\//,
  /^@deepseek-ai\/dsh-client-/,
  /^@deepseek-ai\/dsh-api-/,
];

/**
 * The devkit's adapter entry: a tsdown config (or config list) for the plugin.
 *
 * @param id - plugin entry id, also the module id the browser loader registers.
 * @param hostEntries - host-side entries, built as ESM.
 * @param options - `clientEntry` names the browser entry, if any.
 * @returns tsdown configuration.
 */
export function externalClientBundle(id, hostEntries, { clientEntry } = {}) {
  const shared = {
    outDir: 'lib',
    dts: false,
    clean: false,
    sourcemap: true,
    target: 'es2024',
  };
  const configs = [{
    ...shared,
    entry: hostEntries,
    format: 'esm',
    platform: 'node',
    // The host half runs under Node inside the profile, which resolves every
    // bare import from the plugin's own dependencies.
    deps: { neverBundle: true },
    outExtensions: () => ({ js: '.js' }),
  }];
  if (clientEntry) {
    configs.push({
      ...shared,
      entry: { client: clientEntry },
      format: 'cjs',
      platform: 'browser',
      // The browser has no module resolver: only what the app's loader hands
      // the factory may stay external. Everything else (markdown, KaTeX,
      // micromark) is bundled, and `alwaysBundle` is what overrides tsdown's
      // default of externalizing the plugin's own `dependencies`.
      deps: {
        neverBundle: CLIENT_EXTERNAL,
        alwaysBundle: [/^(?!react$|react-dom$|react\/|react-dom\/|@deepseek-ai\/dsh-client-|@deepseek-ai\/dsh-api-).+/],
      },
      outExtensions: () => ({ js: CLIENT_EXTENSION }),
      plugins: [cssModules()],
      banner: `window.__ModuleLoader__.load({\n\tid: ${JSON.stringify(id)},\n\tfactory: (require) => {\n\t\tvar module = { exports: {} };\n\t\tvar exports = module.exports;`,
      footer: `\t\treturn module.exports;\n\t}\n});`,
    });
  }
  return configs;
}

export default externalClientBundle;

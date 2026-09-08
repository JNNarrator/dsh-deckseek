// Intercepts imports for the DOM test environment:
// 1. Stylesheets have no runtime under node:test — a Proxy returns the
//    property name as the export, so assertions can key off readable names.
// 2. @deepseek-ai runtime packages resolve to the DSH Desktop app's built
//    copies (extract with:
//      npx @electron/asar extract "/Applications/DSH Desktop.app/Contents/Resources/app.asar" /tmp/dsh-asar
//    ), honoring each package's exports map. Override the location with
//    DSH_TEST_APP_MODULES.
// 3. react / react-dom / react/jsx-runtime requested from inside the app
//    extraction remap to THIS plugin's copies — two React instances in one
//    tree break hooks (the app copy's dispatcher is not the renderer's).
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const APP_MODULES = process.env.DSH_TEST_APP_MODULES ?? '/tmp/dsh-asar/node_modules';
const PLUGIN_MODULES = pathToFileURL(`${new URL('..', import.meta.url).pathname}node_modules/`).href;

function resolveAppPackage(specifier) {
  const rest = specifier.slice('@deepseek-ai/'.length);
  const segments = rest.split('/');
  const scope = `@deepseek-ai/${segments[0]}`;
  const pkgDir = `${APP_MODULES}/${scope}`;
  const manifest = JSON.parse(readFileSync(`${pkgDir}/package.json`, 'utf8'));
  const key = segments.length > 1 ? `./${segments.slice(1).join('/')}` : '.';
  const exported = manifest.exports?.[key];
  const target = typeof exported === 'string' ? exported : exported?.default ?? manifest.main ?? 'index.js';
  return pathToFileURL(`${pkgDir}/${String(target).replace(/^\.\//, '')}`);
}

export async function resolve(specifier, context, next) {
  if (specifier.endsWith('.css')) {
    return {
      shortCircuit: true,
      url: 'data:text/javascript,export default new Proxy({}, { get: (target, property) => String(property) })',
    };
  }
  if (specifier.startsWith('@deepseek-ai/')) {
    try {
      return { shortCircuit: true, url: resolveAppPackage(specifier).href };
    } catch {
      // Package not present in the app extraction — fall through.
    }
  }
  if (context.parentURL?.includes('/dsh-asar/') &&
      (specifier === 'react' || specifier === 'react-dom' || specifier === 'react/jsx-runtime')) {
    const base = specifier.split('/')[0];
    const file = specifier === 'react/jsx-runtime' ? 'jsx-runtime.js' : 'index.js';
    return { shortCircuit: true, url: `${PLUGIN_MODULES}${base}/${file}` };
  }
  return next(specifier, context);
}

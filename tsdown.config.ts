import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Builds use an explicit checkout, never an implicit production configuration.
const root = process.env.DSHX_HARNESS;
if (!root) throw new Error('Set DSHX_HARNESS to the checkout used for this build.');

// The dshx devkit is not part of the harness: it is a separate repository that
// installs itself into a checkout at `tools/dshx` and reads the target's client
// platform table through DSHX_HARNESS. DSHX_DEVKIT therefore names where the
// devkit lives, so one installation can build against several harness
// checkouts. It defaults to the harness checkout, which is the usual layout.
const devkit = process.env.DSHX_DEVKIT ?? root;
const adapter = resolve(devkit, 'tools/dshx/src/client-build.js');
if (!existsSync(adapter)) {
  throw new Error(`DSHX externalClientBundle adapter is missing at ${adapter}.`);
}
const { externalClientBundle } = await import(pathToFileURL(adapter).href);
export default externalClientBundle('dsh-deckseek', ['src/dsh-deckseek.ts'], {
  clientEntry: 'src/client/index.tsx',
});

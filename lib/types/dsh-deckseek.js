import { spawn } from 'node:child_process';
import { realpath, stat } from 'node:fs/promises';
import { DeckSeekConfigSchema } from './skin-settings.js';
import { MAX_REVEAL_BODY_BYTES, createRevealRoute } from './reveal-path.js';
/** Read one request body, refusing to buffer an unbounded one. */
function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        const request = req;
        if (typeof request?.on !== 'function') {
            resolve('');
            return;
        }
        let body = '';
        request.on('data', chunk => {
            body += String(chunk);
            if (body.length > MAX_REVEAL_BODY_BYTES)
                reject(new Error('request body too large'));
        });
        request.on('end', () => resolve(body));
        request.on('error', error => reject(error instanceof Error ? error : new Error(String(error))));
    });
}
/** The host implementations behind the route's injected decision. */
function hostDeps(webCtx) {
    return {
        registry: () => webCtx.get?.('workspaceRegistry'),
        realpath: async (path) => { try {
            return await realpath(path);
        }
        catch {
            return undefined;
        } },
        exists: async (path) => { try {
            await stat(path);
            return true;
        }
        catch {
            return false;
        } },
        // Detached and never awaited: the opener outlives the request, and its exit
        // status is not this plugin's business. Array arguments, never a shell.
        spawn: (command, args) => { spawn(command, [...args], { detached: true, stdio: 'ignore' }).unref(); },
        readBody: readRequestBody,
        platform: process.platform,
        warn: (message, detail) => { console.warn(message, detail ?? ''); },
    };
}
export const name = 'dsh-deckseek';
export const inject = [];
/**
 * The plugin's own config schema, which is also its settings section.
 *
 * 0.1.7 derives a plugin's settings namespace from its profile entry id and
 * reads the schema off `entry.fiber.runtime.Config`, replacing the old
 * imperative `ctx.settings.register(namespace, schema)` call. The namespace is
 * therefore this entry's id — {@link DECKSEEK_SETTINGS_NAMESPACE}.
 *
 * This must be the *volatile* schema, not the durable envelope: the host
 * derives the served form with `volatileForm(schema)` and drops any namespace
 * whose schema has no volatile field. See {@link DeckSeekConfigSchema}.
 */
export const Config = DeckSeekConfigSchema;
// Presentation only: no provider, tool, session-log or permission mutations.
export function apply(ctx) {
    // Composed only when the deployment provides the settings service; the
    // browser half renders the default skin when the namespace is absent.
    ctx.inject(['settings'], (settingsCtx) => {
        // The plugin ships its own section in the settings UI, so the host must not
        // also auto-generate a form page from this schema.
        settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber));
    });
    // Registered only where the deployment has a web server at all. Both the
    // server and the registry are read lazily: a deployment missing either keeps
    // working and simply has no reveal route, which is the same degradation the
    // browser half applies when it has no opener.
    ctx.inject(['webServer'], webCtx => {
        webCtx.effect(() => webCtx.webServer.register(createRevealRoute(hostDeps(webCtx))), 'dsh-deckseek: /dsh-deckseek/reveal route');
    });
}
//# sourceMappingURL=dsh-deckseek.js.map
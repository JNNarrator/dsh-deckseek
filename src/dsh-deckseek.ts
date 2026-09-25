import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-settings';
import { DeckSeekConfigSchema } from './skin-settings.js';

export const name = 'dsh-deckseek';
export const inject: string[] = [];

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
export function apply(ctx: Context): void {
  // Composed only when the deployment provides the settings service; the
  // browser half renders the default skin when the namespace is absent.
  ctx.inject(['settings'], (settingsCtx) => {
    // The plugin ships its own section in the settings UI, so the host must not
    // also auto-generate a form page from this schema.
    settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber));
  });
}

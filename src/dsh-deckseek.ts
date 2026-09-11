import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-settings';
import { DECKSEEK_SETTINGS_NAMESPACE } from './skin.js';
import { DeckSeekSettingsSchema } from './skin-settings.js';

export const name = 'dsh-deckseek';
export const inject: string[] = [];

// Presentation only: no provider, tool, session-log or permission mutations.
export function apply(ctx: Context): void {
  // Registered only when the deployment composes the settings service; the
  // browser half renders the default skin when the namespace is absent.
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(DECKSEEK_SETTINGS_NAMESPACE, DeckSeekSettingsSchema);
  });
}

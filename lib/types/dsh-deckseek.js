import { DECKSEEK_SETTINGS_NAMESPACE } from './skin.js';
import { DeckSeekSettingsSchema } from './skin-settings.js';
export const name = 'dsh-deckseek';
export const inject = [];
// Presentation only: no provider, tool, session-log or permission mutations.
export function apply(ctx) {
    // Registered only when the deployment composes the settings service; the
    // browser half renders the default skin when the namespace is absent.
    ctx.inject(['settings'], (settingsCtx) => {
        settingsCtx.settings.register(DECKSEEK_SETTINGS_NAMESPACE, DeckSeekSettingsSchema);
    });
}
//# sourceMappingURL=dsh-deckseek.js.map
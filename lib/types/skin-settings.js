/** DeckSeek section of the Host user-settings document. */
import z from '@deepseek-ai/schemastery';
import { DEFAULT_SKIN, SKIN_FIELD, SKIN_IDS } from './skin.js';
/** Durable DeckSeek schema. */
export const DeckSeekSettingsSchema = z.object({
    [SKIN_FIELD]: z.union([...SKIN_IDS]).default(DEFAULT_SKIN),
});
//# sourceMappingURL=skin-settings.js.map
/** DeckSeek section of the Host user-settings document. */
import z from '@deepseek-ai/schemastery';
import { DEFAULT_SKIN, SKIN_FIELD, SKIN_IDS, DEFAULT_WORK_DETAIL, WORK_DETAIL_FIELD, WORK_DETAIL_SETTING_VALUES, } from './skin.js';
/** Durable DeckSeek schema. */
export const DeckSeekSettingsSchema = z.object({
    [SKIN_FIELD]: z.union([...SKIN_IDS]).default(DEFAULT_SKIN),
    // `.loose()` accepts a saved value this build does not name yet, so an older
    // plugin reading a newer document validates instead of dropping the section.
    [WORK_DETAIL_FIELD]: z.union([...WORK_DETAIL_SETTING_VALUES]).default(DEFAULT_WORK_DETAIL).loose(),
});
/**
 * The plugin's own config schema, which is also its settings section.
 *
 * This is the volatile twin of {@link DeckSeekSettingsSchema}: same fields,
 * same defaults, but every field marked volatile so the settings system can
 * actually serve and write it. The durable schema stays plain because it is
 * also the wire envelope the browser validates against.
 */
export const DeckSeekConfigSchema = z.object({
    [SKIN_FIELD]: z.union([...SKIN_IDS]).default(DEFAULT_SKIN).volatile(),
    [WORK_DETAIL_FIELD]: z.union([...WORK_DETAIL_SETTING_VALUES]).default(DEFAULT_WORK_DETAIL).loose().volatile(),
});
//# sourceMappingURL=skin-settings.js.map
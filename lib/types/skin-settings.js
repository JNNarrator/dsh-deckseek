/** DeckSeek section of the Host user-settings document. */
import z from '@deepseek-ai/schemastery';
import { DEFAULT_SKIN, SKIN_FIELD, SKIN_IDS, DEFAULT_SCREEN_TEXTURE, SCREEN_TEXTURE_IDS, TEXTURE_FIELD, DEFAULT_WORK_DETAIL, WORK_DETAIL_FIELD, WORK_DETAIL_SETTING_VALUES, } from './skin.js';
/** Durable DeckSeek schema. */
export const DeckSeekSettingsSchema = z.object({
    // `.loose()` for the same reason the work-details field carries it below, and
    // with a recent example: the paper skin shipped and was then removed. A
    // document that still selects it must VALIDATE — an enum narrowed under a
    // saved value throws, and a section that fails validation is dropped whole,
    // which is how a removed skin turns into "the settings panel is gone". The
    // view degrades the value instead: it reads every skin through `parseSkin`.
    [SKIN_FIELD]: z.union([...SKIN_IDS]).default(DEFAULT_SKIN).loose(),
    [TEXTURE_FIELD]: z.union([...SCREEN_TEXTURE_IDS]).default(DEFAULT_SCREEN_TEXTURE),
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
    [SKIN_FIELD]: z.union([...SKIN_IDS]).default(DEFAULT_SKIN).loose().volatile(),
    [TEXTURE_FIELD]: z.union([...SCREEN_TEXTURE_IDS]).default(DEFAULT_SCREEN_TEXTURE).volatile(),
    [WORK_DETAIL_FIELD]: z.union([...WORK_DETAIL_SETTING_VALUES]).default(DEFAULT_WORK_DETAIL).loose().volatile(),
});
//# sourceMappingURL=skin-settings.js.map
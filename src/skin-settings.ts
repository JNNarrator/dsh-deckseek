/** DeckSeek section of the Host user-settings document. */

import type { Volatile } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import {
  DEFAULT_SKIN, SKIN_FIELD, SKIN_IDS, type SkinId,
  DEFAULT_SCREEN_TEXTURE, SCREEN_TEXTURE_IDS, TEXTURE_FIELD, type ScreenTextureId,
  DEFAULT_WORK_DETAIL, WORK_DETAIL_FIELD, WORK_DETAIL_SETTING_VALUES, type WorkDetailSettingValue,
} from './skin.js';

/** Durable DeckSeek section; also the wire envelope the browser scope validates against. */
export interface DeckSeekSettings {
  /** Selected reading skin. */
  skin: SkinId;
  /** Screen texture drawn over the terminal skin's window; off by default. */
  texture: ScreenTextureId;
  /**
   * How much of a Turn's process the reader shows at rest. Stored as the raw
   * setting value so a legacy host spelling round-trips unchanged;
   * {@link parseWorkDetail} is what turns it into a level.
   */
  workDetail: WorkDetailSettingValue;
}

/** Durable DeckSeek schema. */
export const DeckSeekSettingsSchema: z<DeckSeekSettings> = z.object({
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
 * Runtime preferences projected to the browser.
 *
 * Each field is a {@link Volatile} box because a settings field only reaches
 * the browser when its schema node is marked `.volatile()`: `ctx.settings`
 * derives the editable form with `volatileForm(schema)`, which walks the object
 * dict and keeps only volatile children. A schema with no volatile field yields
 * no form at all, and the whole namespace is then dropped from the descriptor
 * the browser mirrors — so the settings section would render with no data and
 * every control disabled, and any write would be refused with
 * `Plugin entry "dsh-deckseek" has no volatile fields`.
 */
export interface DeckSeekConfig {
  /** Selected reading skin. */
  skin: Volatile<SkinId>;
  /** Screen texture, reactive to the Host settings document. */
  texture: Volatile<ScreenTextureId>;
  /** Raw work-detail setting value; `parseWorkDetail` turns it into a level. */
  workDetail: Volatile<WorkDetailSettingValue>;
}

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
/** DeckSeek section of the Host user-settings document. */

import type { Volatile } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import {
  DEFAULT_SKIN, SKIN_FIELD, SKIN_IDS, type SkinId,
  DEFAULT_WORK_DETAIL, WORK_DETAIL_FIELD, WORK_DETAIL_SETTING_VALUES, type WorkDetailSettingValue,
} from './skin.js';

/** Durable DeckSeek section; also the wire envelope the browser scope validates against. */
export interface DeckSeekSettings {
  /** Selected reading skin. */
  skin: SkinId;
  /**
   * How much of a Turn's process the reader shows at rest. Stored as the raw
   * setting value so a legacy host spelling round-trips unchanged;
   * {@link parseWorkDetail} is what turns it into a level.
   */
  workDetail: WorkDetailSettingValue;
}

/** Durable DeckSeek schema. */
export const DeckSeekSettingsSchema: z<DeckSeekSettings> = z.object({
  [SKIN_FIELD]: z.union([...SKIN_IDS]).default(DEFAULT_SKIN),
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
  [SKIN_FIELD]: z.union([...SKIN_IDS]).default(DEFAULT_SKIN).volatile(),
  [WORK_DETAIL_FIELD]: z.union([...WORK_DETAIL_SETTING_VALUES]).default(DEFAULT_WORK_DETAIL).loose().volatile(),
});
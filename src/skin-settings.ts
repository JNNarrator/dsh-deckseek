/** DeckSeek section of the Host user-settings document. */

import z from '@deepseek-ai/schemastery';
import { DEFAULT_SKIN, SKIN_FIELD, SKIN_IDS, type SkinId } from './skin.js';

/** Durable DeckSeek section; also the wire envelope the browser scope validates against. */
export interface DeckSeekSettings {
  /** Selected reading skin. */
  skin: SkinId;
}

/** Durable DeckSeek schema. */
export const DeckSeekSettingsSchema: z<DeckSeekSettings> = z.object({
  [SKIN_FIELD]: z.union([...SKIN_IDS]).default(DEFAULT_SKIN),
});

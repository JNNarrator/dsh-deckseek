/** DeckSeek section of the Host user-settings document. */
import z from '@deepseek-ai/schemastery';
import { type SkinId } from './skin.js';
/** Durable DeckSeek section; also the wire envelope the browser scope validates against. */
export interface DeckSeekSettings {
    /** Selected reading skin. */
    skin: SkinId;
}
/** Durable DeckSeek schema. */
export declare const DeckSeekSettingsSchema: z<DeckSeekSettings>;
//# sourceMappingURL=skin-settings.d.ts.map
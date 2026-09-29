/** DeckSeek section of the Host user-settings document. */
import type { Volatile } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type SkinId, type ScreenTextureId, type WorkDetailSettingValue } from './skin.js';
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
export declare const DeckSeekSettingsSchema: z<DeckSeekSettings>;
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
export declare const DeckSeekConfigSchema: z<Schemastery.ObjectS<NoInfer<{
    skin: z<"terminal" | "soft", "terminal" | "soft", "volatile-defined">;
    texture: z<"soft" | "off" | "crt", "soft" | "off" | "crt", "volatile-defined">;
    workDetail: z<"compact" | "standard" | "detailed" | "verbose" | "normal" | "expanded", "compact" | "standard" | "detailed" | "verbose" | "normal" | "expanded", "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    skin: z<"terminal" | "soft", "terminal" | "soft", "volatile-defined">;
    texture: z<"soft" | "off" | "crt", "soft" | "off" | "crt", "volatile-defined">;
    workDetail: z<"compact" | "standard" | "detailed" | "verbose" | "normal" | "expanded", "compact" | "standard" | "detailed" | "verbose" | "normal" | "expanded", "volatile-defined">;
}>>, "plain">;
//# sourceMappingURL=skin-settings.d.ts.map
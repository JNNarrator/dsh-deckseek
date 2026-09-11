/**
 * Reading-skin contract shared by the Host settings schema and the browser.
 * Deliberately zero imports: the client bundle must not pull the settings
 * schema (and schemastery with it) in just to name a skin.
 */
/** Skin identifiers accepted by the settings document. */
export declare const SKIN_IDS: readonly ["paper", "soft", "terminal"];
/** One reading skin: editorial flow, cards, or instrument rows. */
export type SkinId = typeof SKIN_IDS[number];
/** Skin used when the settings document carries no override or an unknown one. */
export declare const DEFAULT_SKIN: SkinId;
/** Settings namespace owned by this plugin. */
export declare const DECKSEEK_SETTINGS_NAMESPACE = "deckseek";
/** Field carrying the selected skin inside that namespace. */
export declare const SKIN_FIELD = "skin";
/**
 * @param value - value crossing the settings or registry boundary.
 * @returns whether the value is one of the declared skins.
 */
export declare function isSkin(value: unknown): value is SkinId;
/**
 * @param value - value crossing the settings boundary.
 * @returns the matching skin, or {@link DEFAULT_SKIN} for anything else.
 */
export declare function parseSkin(value: unknown): SkinId;
//# sourceMappingURL=skin.d.ts.map
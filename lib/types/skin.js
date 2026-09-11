/**
 * Reading-skin contract shared by the Host settings schema and the browser.
 * Deliberately zero imports: the client bundle must not pull the settings
 * schema (and schemastery with it) in just to name a skin.
 */
/** Skin identifiers accepted by the settings document. */
export const SKIN_IDS = ['paper', 'soft', 'terminal'];
/** Skin used when the settings document carries no override or an unknown one. */
export const DEFAULT_SKIN = 'soft';
/** Settings namespace owned by this plugin. */
export const DECKSEEK_SETTINGS_NAMESPACE = 'deckseek';
/** Field carrying the selected skin inside that namespace. */
export const SKIN_FIELD = 'skin';
/**
 * @param value - value crossing the settings or registry boundary.
 * @returns whether the value is one of the declared skins.
 */
export function isSkin(value) {
    return typeof value === 'string' && SKIN_IDS.includes(value);
}
/**
 * @param value - value crossing the settings boundary.
 * @returns the matching skin, or {@link DEFAULT_SKIN} for anything else.
 */
export function parseSkin(value) {
    return isSkin(value) ? value : DEFAULT_SKIN;
}
//# sourceMappingURL=skin.js.map
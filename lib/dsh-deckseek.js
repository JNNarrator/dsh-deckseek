import z from "@deepseek-ai/schemastery";
//#region src/skin.ts
/**
* Reading-skin contract shared by the Host settings schema and the browser.
* Deliberately zero imports: the client bundle must not pull the settings
* schema (and schemastery with it) in just to name a skin.
*/
/** Skin identifiers accepted by the settings document. */
const SKIN_IDS = [
	"paper",
	"soft",
	"terminal"
];
/** Skin used when the settings document carries no override or an unknown one. */
const DEFAULT_SKIN = "soft";
/** Settings namespace owned by this plugin. */
const DECKSEEK_SETTINGS_NAMESPACE = "deckseek";
//#endregion
//#region src/skin-settings.ts
/** DeckSeek section of the Host user-settings document. */
/** Durable DeckSeek schema. */
const DeckSeekSettingsSchema = z.object({ ["skin"]: z.union([...SKIN_IDS]).default(DEFAULT_SKIN) });
//#endregion
//#region src/dsh-deckseek.ts
const name = "dsh-deckseek";
const inject = [];
function apply(ctx) {
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.settings.register(DECKSEEK_SETTINGS_NAMESPACE, DeckSeekSettingsSchema);
	});
}
//#endregion
export { apply, inject, name };

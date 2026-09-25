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
/** Field carrying the selected skin inside that namespace. */
const SKIN_FIELD = "skin";
/**
* How much of a Turn's process the reader shows at rest. Mirrors the host's
* `TRANSCRIPT_VIEW_MODES` so one preference means the same thing in either
* conversation view; renderers never compare this enum, they read the booleans
* of {@link WorkDetailPolicy} derived from it.
*/
const WORK_DETAIL_IDS = [
	"compact",
	"standard",
	"detailed",
	"verbose"
];
/** Field carrying the selected work-details level inside the namespace. */
const WORK_DETAIL_FIELD = "workDetail";
/** Work-details level used when the settings document carries no override. */
const DEFAULT_WORK_DETAIL = "standard";
/**
* Values the durable field accepts but never offers: the host's two-mode
* generation saved `normal` for standard and `expanded` for detailed. Reading
* them keeps an existing host preference intact instead of silently resetting.
*/
const LEGACY_WORK_DETAIL_IDS = ["normal", "expanded"];
/** Every value the durable field accepts. */
const WORK_DETAIL_SETTING_VALUES = [...WORK_DETAIL_IDS, ...LEGACY_WORK_DETAIL_IDS];
z.object({
	[SKIN_FIELD]: z.union([...SKIN_IDS]).default(DEFAULT_SKIN),
	[WORK_DETAIL_FIELD]: z.union([...WORK_DETAIL_SETTING_VALUES]).default(DEFAULT_WORK_DETAIL).loose()
});
/**
* The plugin's own config schema, which is also its settings section.
*
* This is the volatile twin of {@link DeckSeekSettingsSchema}: same fields,
* same defaults, but every field marked volatile so the settings system can
* actually serve and write it. The durable schema stays plain because it is
* also the wire envelope the browser validates against.
*/
const DeckSeekConfigSchema = z.object({
	[SKIN_FIELD]: z.union([...SKIN_IDS]).default(DEFAULT_SKIN).volatile(),
	[WORK_DETAIL_FIELD]: z.union([...WORK_DETAIL_SETTING_VALUES]).default(DEFAULT_WORK_DETAIL).loose().volatile()
});
//#endregion
//#region src/dsh-deckseek.ts
const name = "dsh-deckseek";
const inject = [];
/**
* The plugin's own config schema, which is also its settings section.
*
* 0.1.7 derives a plugin's settings namespace from its profile entry id and
* reads the schema off `entry.fiber.runtime.Config`, replacing the old
* imperative `ctx.settings.register(namespace, schema)` call. The namespace is
* therefore this entry's id — {@link DECKSEEK_SETTINGS_NAMESPACE}.
*
* This must be the *volatile* schema, not the durable envelope: the host
* derives the served form with `volatileForm(schema)` and drops any namespace
* whose schema has no volatile field. See {@link DeckSeekConfigSchema}.
*/
const Config = DeckSeekConfigSchema;
function apply(ctx) {
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber));
	});
}
//#endregion
export { Config, apply, inject, name };

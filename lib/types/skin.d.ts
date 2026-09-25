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
/**
 * Settings namespace owned by this plugin.
 *
 * 0.1.7 derives a plugin's settings namespace from its profile entry id, so
 * this must stay equal to the `id` in `cordis.patch.yml` / `dshx.yml`. It was
 * `deckseek` before 0.1.7; an existing `deckseek:` section in the user-settings
 * document is no longer read and the skin falls back to {@link DEFAULT_SKIN}.
 */
export declare const DECKSEEK_SETTINGS_NAMESPACE = "dsh-deckseek";
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
/**
 * How much of a Turn's process the reader shows at rest. Mirrors the host's
 * `TRANSCRIPT_VIEW_MODES` so one preference means the same thing in either
 * conversation view; renderers never compare this enum, they read the booleans
 * of {@link WorkDetailPolicy} derived from it.
 */
export declare const WORK_DETAIL_IDS: readonly ["compact", "standard", "detailed", "verbose"];
/** One work-details level. */
export type WorkDetailId = typeof WORK_DETAIL_IDS[number];
/** Field carrying the selected work-details level inside the namespace. */
export declare const WORK_DETAIL_FIELD = "workDetail";
/** Work-details level used when the settings document carries no override. */
export declare const DEFAULT_WORK_DETAIL: WorkDetailId;
/**
 * Values the durable field accepts but never offers: the host's two-mode
 * generation saved `normal` for standard and `expanded` for detailed. Reading
 * them keeps an existing host preference intact instead of silently resetting.
 */
export declare const LEGACY_WORK_DETAIL_IDS: readonly ["normal", "expanded"];
/** Every value the durable field accepts. */
export declare const WORK_DETAIL_SETTING_VALUES: readonly ["compact", "standard", "detailed", "verbose", "normal", "expanded"];
/** Whatever the settings document may hold for this field. */
export type WorkDetailSettingValue = typeof WORK_DETAIL_SETTING_VALUES[number];
/**
 * Presentation capabilities one work-details level enables. These are the
 * plugin's own switches, not a copy of the host interface: they name the
 * decisions this reader actually makes.
 */
export interface WorkDetailPolicy {
    /** Level this policy came from; for diagnostics, never for branching. */
    readonly level: WorkDetailId;
    /** Fold a completed Turn's process behind the whole-Turn control. */
    readonly foldCompletedTurns: boolean;
    /** Give Turns a collapsible process group header. */
    readonly groupProcess: boolean;
    /** Let the running turn's group title name the command, path, or query in flight. */
    readonly liveProcessDetail: boolean;
    /** Preview a settled reasoning row's first line beside its title. */
    readonly settledReasoningPreview: boolean;
}
/**
 * @param value - value crossing the settings boundary.
 * @returns whether the value names a level, current or legacy.
 */
export declare function isWorkDetailSetting(value: unknown): value is WorkDetailSettingValue;
/**
 * Normalize a saved value, mapping the host's legacy spellings onto their
 * current levels.
 * @param value - value crossing the settings boundary.
 * @returns the matching level, or {@link DEFAULT_WORK_DETAIL} for anything else.
 */
export declare function parseWorkDetail(value: unknown): WorkDetailId;
/**
 * Resolve the constant policy for one level. The same level always yields the
 * same object so selectors over a policy keep stable identities.
 * @param level - persisted work-details level.
 * @returns the level's presentation policy.
 */
export declare function workDetailPolicy(level: WorkDetailId): WorkDetailPolicy;
//# sourceMappingURL=skin.d.ts.map
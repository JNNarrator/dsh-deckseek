/**
 * Reading-skin contract shared by the Host settings schema and the browser.
 * Deliberately zero imports: the client bundle must not pull the settings
 * schema (and schemastery with it) in just to name a skin.
 */

/** Skin identifiers accepted by the settings document. */
export const SKIN_IDS = ['paper', 'soft', 'terminal'] as const;

/** One reading skin: editorial flow, cards, or instrument rows. */
export type SkinId = typeof SKIN_IDS[number];

/** Skin used when the settings document carries no override or an unknown one. */
export const DEFAULT_SKIN: SkinId = 'soft';

/**
 * Settings namespace owned by this plugin.
 *
 * 0.1.7 derives a plugin's settings namespace from its profile entry id, so
 * this must stay equal to the `id` in `cordis.patch.yml` / `dshx.yml`. It was
 * `deckseek` before 0.1.7; an existing `deckseek:` section in the user-settings
 * document is no longer read and the skin falls back to {@link DEFAULT_SKIN}.
 */
export const DECKSEEK_SETTINGS_NAMESPACE = 'dsh-deckseek';

/** Field carrying the selected skin inside that namespace. */
export const SKIN_FIELD = 'skin';

/**
 * @param value - value crossing the settings or registry boundary.
 * @returns whether the value is one of the declared skins.
 */
export function isSkin(value: unknown): value is SkinId {
  return typeof value === 'string' && (SKIN_IDS as readonly string[]).includes(value);
}

/**
 * @param value - value crossing the settings boundary.
 * @returns the matching skin, or {@link DEFAULT_SKIN} for anything else.
 */
export function parseSkin(value: unknown): SkinId {
  return isSkin(value) ? value : DEFAULT_SKIN;
}

/**
 * How much of a Turn's process the reader shows at rest. Mirrors the host's
 * `TRANSCRIPT_VIEW_MODES` so one preference means the same thing in either
 * conversation view; renderers never compare this enum, they read the booleans
 * of {@link WorkDetailPolicy} derived from it.
 */
export const WORK_DETAIL_IDS = ['compact', 'standard', 'detailed', 'verbose'] as const;

/** One work-details level. */
export type WorkDetailId = typeof WORK_DETAIL_IDS[number];

/** Field carrying the selected work-details level inside the namespace. */
export const WORK_DETAIL_FIELD = 'workDetail';

/** Work-details level used when the settings document carries no override. */
export const DEFAULT_WORK_DETAIL: WorkDetailId = 'standard';

/**
 * Values the durable field accepts but never offers: the host's two-mode
 * generation saved `normal` for standard and `expanded` for detailed. Reading
 * them keeps an existing host preference intact instead of silently resetting.
 */
export const LEGACY_WORK_DETAIL_IDS = ['normal', 'expanded'] as const;

/** Every value the durable field accepts. */
export const WORK_DETAIL_SETTING_VALUES = [...WORK_DETAIL_IDS, ...LEGACY_WORK_DETAIL_IDS] as const;

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

const WORK_DETAIL_POLICIES: Readonly<Record<WorkDetailId, WorkDetailPolicy>> = {
  compact: { level: 'compact', foldCompletedTurns: true, groupProcess: true, liveProcessDetail: false, settledReasoningPreview: false },
  standard: { level: 'standard', foldCompletedTurns: true, groupProcess: true, liveProcessDetail: true, settledReasoningPreview: true },
  detailed: { level: 'detailed', foldCompletedTurns: true, groupProcess: true, liveProcessDetail: true, settledReasoningPreview: true },
  verbose: { level: 'verbose', foldCompletedTurns: false, groupProcess: false, liveProcessDetail: false, settledReasoningPreview: true },
};

/**
 * @param value - value crossing the settings boundary.
 * @returns whether the value names a level, current or legacy.
 */
export function isWorkDetailSetting(value: unknown): value is WorkDetailSettingValue {
  return typeof value === 'string' && (WORK_DETAIL_SETTING_VALUES as readonly string[]).includes(value);
}

/**
 * Normalize a saved value, mapping the host's legacy spellings onto their
 * current levels.
 * @param value - value crossing the settings boundary.
 * @returns the matching level, or {@link DEFAULT_WORK_DETAIL} for anything else.
 */
export function parseWorkDetail(value: unknown): WorkDetailId {
  if (value === 'normal') return 'standard';
  if (value === 'expanded') return 'detailed';
  return WORK_DETAIL_IDS.includes(value as WorkDetailId) ? value as WorkDetailId : DEFAULT_WORK_DETAIL;
}

/**
 * Resolve the constant policy for one level. The same level always yields the
 * same object so selectors over a policy keep stable identities.
 * @param level - persisted work-details level.
 * @returns the level's presentation policy.
 */
export function workDetailPolicy(level: WorkDetailId): WorkDetailPolicy {
  return WORK_DETAIL_POLICIES[level];
}

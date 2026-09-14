/**
 * Readouts for the terminal skin's window bar and collapsed process header.
 *
 * Everything here is counted off data the reading view already holds — the turns
 * it grouped from the live session, their steps, and the tool calls inside a
 * turn's own flow. The reference TUIs all print tokens, cost and context
 * occupancy in those slots; this plugin has no such projection and does not add
 * one, so the bar reports volume instead of spend. See
 * docs/design/terminal-skin-v3.md.
 */

import { activityPhase, activitySummary, type ReaderFlowEntry } from './tool-activity.js';
import { currentLocale, uiIn, type UiLang } from './locale.js';

export interface TurnCounts { tools: number; files: number; failed: number }

/** Tool, file and failure counts for one turn's flow. */
export function turnCounts(flow: readonly ReaderFlowEntry[], lang: UiLang = currentLocale()): TurnCounts {
  const files = new Set<string>();
  let tools = 0;
  let failed = 0;
  for (const entry of flow) {
    if (entry.kind !== 'tool') continue;
    tools += 1;
    if (activityPhase(entry) === 'failed') failed += 1;
    const summary = summaryOf(entry, lang);
    if ((summary.category === 'read' || summary.category === 'write') && summary.target !== undefined) files.add(summary.target);
  }
  return { tools, files: files.size, failed };
}

/**
 * `activitySummary` parses the call's arguments, so it is cached against the
 * block/draft object the way the tool row's own `useMemo` is: a tool call whose
 * result streams in arrives as a new object, never as a mutation of the old one.
 */
const summaryCache = new WeakMap<object, Map<UiLang, ReturnType<typeof activitySummary>>>();
function summaryOf(entry: Extract<ReaderFlowEntry, { kind: 'tool' }>, lang: UiLang) {
  const holder = entry.block ?? entry.draft;
  if (holder === undefined) return activitySummary(entry, lang);
  let byLang = summaryCache.get(holder);
  if (byLang === undefined) { byLang = new Map(); summaryCache.set(holder, byLang); }
  const hit = byLang.get(lang);
  if (hit !== undefined) return hit;
  const value = activitySummary(entry, lang);
  byLang.set(lang, value);
  return value;
}

/**
 * The one line a folded turn leaves behind: what the process cost, in calls
 * rather than in prose. Fails closed to `null` so a turn with no tool calls
 * carries no extra line. English needs the singular forms; Chinese does not, and
 * repeats its own string under `frame.toolsOne` / `frame.filesOne` so the two
 * dictionaries keep the same key set.
 */
export function collapsedSummary(counts: TurnCounts, lang: UiLang = currentLocale()): string | null {
  const parts: string[] = [];
  if (counts.tools > 0) parts.push(uiIn(lang, counts.tools === 1 ? 'frame.toolsOne' : 'frame.tools', { count: counts.tools }));
  if (counts.files > 0) parts.push(uiIn(lang, counts.files === 1 ? 'frame.filesOne' : 'frame.files', { count: counts.files }));
  if (counts.failed > 0) parts.push(uiIn(lang, 'frame.failed', { count: counts.failed }));
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * The turns the rail can anchor, and the newest of them.
 *
 * The rail draws one mark per loaded user/steering message, so a turn whose
 * message sits outside the loaded window has no mark to click. Counting turn
 * groups instead would print a number with nothing beside it on screen —
 * measured on a session where the host's paging had dropped the first user
 * message: the bar read 4 turns while the rail drew 3 marks. The bar sits next
 * to the rail, so it counts what the rail holds; `hasMore` still marks the
 * total as a floor.
 */
export function railTurns(items: readonly { readonly turn: number | null }[]): { count: number; latest: number | null } {
  const turns = new Set<number>();
  for (const item of items) if (item.turn !== null) turns.add(item.turn);
  let latest: number | null = null;
  for (const turn of turns) if (latest === null || turn > latest) latest = turn;
  return { count: turns.size, latest };
}

/**
 * Window-bar readout: how much the reading view is holding, and how long the
 * newest turn ran. `more` marks history the session has not loaded yet, so the
 * count reads as a floor rather than a total.
 */
export function frameMeterLabel(turns: number, steps: number, more: boolean, lang: UiLang = currentLocale()): string | null {
  if (turns <= 0) return null;
  const parts = [uiIn(lang, more ? 'meter.turnsMore' : 'meter.turns', { count: turns })];
  if (steps > 0) parts.push(uiIn(lang, 'meter.steps', { count: steps }));
  return parts.join(' · ');
}

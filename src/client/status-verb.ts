/**
 * Working-phase verbs for the terminal skin's status line.
 *
 * The terminal skin reads as a terminal partly because its spinner carries a
 * verb the way the reference TUI (dsh-TUI) and Claude Code do, instead of the
 * phase sentence the card skins show. The pick is derived from the turn key
 * rather than drawn at random, for two reasons: the header and the dock render
 * the status line for one turn in separate components, and a random pick would
 * make them disagree; and a turn must keep its verb across re-renders, which a
 * mounted turn produces constantly while its answer streams.
 *
 * The semantic phase labels stay in `status.delving` / `status.thinkingName`:
 * the verb replaces the working label, never the "thinking" one, so the signal
 * that the model is reasoning is not traded away for flavour.
 */

import { currentLocale, uiIn, type UiLang } from './locale.js';

/** Ordered pool; the ids are `locale.ts` keys, so both dictionaries must hold them. */
export const STATUS_VERB_IDS = [
  'reviewing',
  'analyzing',
  'considering',
  'planning',
  'checking',
  'searching',
  'building',
  'summarizing',
] as const;

export type StatusVerbId = (typeof STATUS_VERB_IDS)[number];

/** FNV-1a over the turn key: tiny, stable, and free of any session state. */
function hash(key: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) {
    value ^= key.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

/** The verb one turn shows, with the trailing ellipsis the status line reads with. */
export function pickStatusVerb(turnKey: string, lang: UiLang = currentLocale()): string {
  const id = STATUS_VERB_IDS[hash(turnKey) % STATUS_VERB_IDS.length]!;
  return `${uiIn(lang, `status.verb.${id}`)}…`;
}

/**
 * The header label for a group the projection could not tie to a turn: the
 * session preamble — the system prompt, injected context, command records.
 *
 * That group has no phase to report, so a phase sentence must not be used for
 * it: on a finished session the status line read "In progress" on the first
 * line of the page, and the live region announced the same claim. Returns
 * `null` for a turn-backed group, whose label the phase logic owns.
 */
export function preambleLabel(turn: number | null, lang: UiLang = currentLocale()): string | null {
  return turn === null ? uiIn(lang, 'turn.preamble') : null;
}

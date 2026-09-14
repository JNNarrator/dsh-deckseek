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
import { type UiLang } from './locale.js';
/** Ordered pool; the ids are `locale.ts` keys, so both dictionaries must hold them. */
export declare const STATUS_VERB_IDS: readonly ["reviewing", "analyzing", "considering", "planning", "checking", "searching", "building", "summarizing"];
export type StatusVerbId = (typeof STATUS_VERB_IDS)[number];
/** The verb one turn shows, with the trailing ellipsis the status line reads with. */
export declare function pickStatusVerb(turnKey: string, lang?: UiLang): string;
//# sourceMappingURL=status-verb.d.ts.map
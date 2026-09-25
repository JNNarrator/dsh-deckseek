import type { ContextMessageNode } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
/**
 * Source families a waking message can come from.
 *
 * These are the durable `source.kind` values the harness records, plus the one
 * split that matters to a reader: a webhook from GitHub is reported as a
 * webhook at the event level but reads completely differently from an arbitrary
 * caller, so `github` is its own family rather than an alias of `webhook`.
 */
export type TriggerFamily = 'request' | 'goal' | 'agent' | 'team' | 'subagent' | 'github' | 'webhook' | 'schedule' | 'job' | 'plugin';
/**
 * Resolve a waking message's source family.
 *
 * An unrecognised `kind` is attributed to `request`, the neutral family, rather
 * than being hidden: the harness's own `turnTriggerDetails` does the same, and
 * the alternative — dropping the row — would make a turn appear to have started
 * on its own. Nothing here reads success or failure out of the source, because
 * the durable record does not carry it.
 * @param node - durable trigger context, including the original notification body.
 * @returns the family whose title and glyph the row presents.
 */
export declare function triggerFamily(node: ContextMessageNode): TriggerFamily;
/** The dictionary key holding a family's title, as written in the plugin dictionary. */
export type TriggerTitleKey = 'trigger.request' | 'trigger.goal' | 'trigger.agent' | 'trigger.team' | 'trigger.subagent' | 'trigger.github' | 'trigger.webhook' | 'trigger.schedule' | 'trigger.job' | 'trigger.plugin';
/** The dictionary key holding a family's title. */
export declare function triggerTitleKey(family: TriggerFamily): TriggerTitleKey;
/** Whether a string names a family this row can present. */
export declare function isTriggerFamily(value: string): value is TriggerFamily;
/** The name a producer recorded, or null when the durable source names none. */
export declare function triggerSourceName(node: ContextMessageNode): string | null;
/**
 * Render a non-human message that began a turn.
 *
 * A trigger is the first thing in a turn and the only durable record of why the
 * turn exists, so the reading view keeps it even when process detail is folded
 * away. It is collapsed by default — the title alone answers "why did this turn
 * start" for the common cases — and expands to the notification body, prefixed
 * by the harness's own explanation of what the row is.
 * @param props - Durable trigger content, its source, and the locale seat.
 * @returns A collapsed trigger notice, expandable to the notification body.
 */
export declare function TurnTriggerRow({ node, title, explanation, t }: {
    node: ContextMessageNode;
    /** The localized family title, resolved by the caller from the plugin dictionary. */
    title: string;
    /** The localized explanation that this notice began the turn. */
    explanation: string;
    /**
     * Host locale seat, passed only by seats that hold one. The reading view's
     * `MainNode` deliberately does not, so the body falls back to the plugin's
     * own labels rather than the whole row being unavailable there.
     */
    t?: TranslateNS<'chat'>;
}): import("react").JSX.Element;
//# sourceMappingURL=TurnTriggerRow.d.ts.map
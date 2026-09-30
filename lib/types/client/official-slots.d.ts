/**
 * Lending a seat to the host's own renderers.
 *
 * This view replaces `conversation.view`, so the host's node renderers never
 * mount on their own here: every kind this view does not draw itself used to fall
 * to a JSON dump. Re-drawing the host's kinds one at a time is a race the plugin
 * loses — the host adds kinds faster than a reading view re-implements them.
 *
 * So the official registrations are MIRRORED into seats this plugin owns: the
 * original component, options and locale stay the host's, and the platform keeps
 * binding injection, hooks and stores. The plugin contributes composition, not a
 * second implementation of anyone's UI. Only `conversation.chat.node` is
 * filtered, and only to exclude the kinds this view already draws (see
 * `reader-nodes.ts`) — those would otherwise be rendered twice.
 *
 * Adapted from upstream `666d7ec`, with four deliberate differences:
 *  - the seats are named for this plugin (`dsh-deckseek.official.*`);
 *  - `conversation.chat.turnTail` IS mirrored, but this view renders it in its own
 *    closing area instead of borrowing the host's closing row: the row this view
 *    draws itself is its own stats line, and what the host contributes to the tail
 *    — the changed-files card, delivery cards, plan cards — is what a reader of a
 *    finished turn wants under it. The host's own row is not part of the slot, so
 *    taking the seat duplicates nothing;
 *  - `conversation.message.images` is NOT mirrored: this view renders message
 *    images itself through `Blocks`.
 */
import type { Context } from '@deepseek-ai/cordis';
/** The official slots this plugin borrows a seat from, and the seat it lends. */
export declare const OFFICIAL_SLOTS: {
    readonly actions: "conversation.chat.assistant-actions";
    readonly tools: "tool.call.toolview";
    readonly nodes: "conversation.chat.node";
    readonly tail: "conversation.chat.turnTail";
};
export type OfficialFamily = keyof typeof OFFICIAL_SLOTS;
/**
 * The seat names as literal types.
 *
 * The view hands these to `renderSlot`, so a typo has to be a compile error
 * rather than a slot that silently renders nothing.
 */
export type OfficialSeat = {
    [F in OfficialFamily]: `dsh-deckseek.official.${F}/${(typeof OFFICIAL_SLOTS)[F]}`;
}[OfficialFamily];
/**
 * What the host declares each of those to be.
 *
 * Checked at install time rather than assumed: the host owns these contracts, and
 * a kind or scope that changed under a mirror would otherwise fail silently — the
 * mirror would register a spec the platform never resolves.
 */
export declare const EXPECTED: {
    readonly actions: {
        readonly kind: "list";
        readonly scope: "session";
    };
    readonly tools: {
        readonly kind: "keyed";
        readonly scope: "session";
    };
    readonly nodes: {
        readonly kind: "keyed";
        readonly scope: "session";
    };
    readonly tail: {
        readonly kind: "list";
        readonly scope: "session";
    };
};
/** The families in declaration order; one list so a new family cannot be half-added. */
export declare const OFFICIAL_FAMILIES: readonly ["actions", "tools", "nodes", "tail"];
/** This plugin's seat for one family, named so two owners can never collide. */
export declare function officialSeat<F extends OfficialFamily>(family: F): `dsh-deckseek.official.${F}/${(typeof OFFICIAL_SLOTS)[F]}`;
/** Reactive entry count for one borrowed seat (0 when the host contributes none). */
export declare function useOfficialSeat(family: OfficialFamily): number;
export interface SlotSpecLike {
    kind: string;
    scope: string;
}
export interface StoredEntryLike {
    component: unknown;
    options: {
        key?: string;
        name?: string;
        [key: string]: unknown;
    };
    registrant?: string;
    locale?: string;
    children?: Record<string, unknown>;
}
/**
 * The registry operations the bridge needs. Deliberately the erased, public
 * boundary rather than the typed one: an alias is a runtime composition, and the
 * typed `SlotMap` overloads describe statically declared keys only.
 */
export interface CompositionRegistry {
    spec(key: string): SlotSpecLike | undefined;
    entriesOfSlot(key: string): readonly StoredEntryLike[];
    subscribe(key: string, listener: () => void): () => void;
    inject(key: string, effect: () => () => void): () => void;
    register(options: Record<string, unknown>, component: unknown): () => void;
}
/**
 * Mirror one official slot into a seat this plugin owns.
 *
 * Incremental on purpose: unrelated registrations must not remount the cards
 * already sitting in the seat, because each of them holds its own subscriptions.
 * A source that unloads (or hot-reloads) disposes its subtree before its
 * replacement is registered.
 *
 * `onCount` reports how many entries the seat holds after every reconcile, so a
 * view can tell "the host contributes nothing here" from "the host's card for
 * this turn is empty" — and draw its own row only in the first case.
 */
export declare function mirrorOfficialSlot(slots: CompositionRegistry, source: string, target: string, namespace: string, accept?: (entry: StoredEntryLike) => boolean, onCount?: (count: number) => void): () => void;
/**
 * The child-seat table the view registration declares.
 *
 * Keyed by the literal seat names rather than `string`, because the platform
 * derives the render props a view component receives from the child keys its
 * registration names: a seat that only exists at runtime is a seat the type
 * checker can never hand a `renderSlot` for. So the tail seat carries its spec
 * literally — it is the one this view renders itself.
 */
export type OfficialChildSeats = {
    [K in OfficialSeat]: SlotSpecLike;
} & {
    'dsh-deckseek.official.tail/conversation.chat.turnTail': {
        kind: 'list';
        scope: 'session';
    };
};
/**
 * The child-seat specs the view registration must declare, validated first.
 *
 * The declared spec is this plugin's own `EXPECTED` entry, and the host's spec is
 * read only to be compared with it: kind and scope are all a child declaration
 * carries, and a mismatch has to be an install-time failure rather than a
 * declaration the platform silently never resolves.
 */
export declare function officialChildren(slots: Pick<CompositionRegistry, 'spec'>): OfficialChildSeats;
/** Whether an official node entry has no renderer of ours already. */
export declare function acceptsOfficialNode(entry: StoredEntryLike): boolean;
/**
 * Install the mirror for every family, on the public registry API only.
 * @returns the disposer that stops all of them.
 */
export declare function installOfficialSlots(ctx: Context): () => void;
//# sourceMappingURL=official-slots.d.ts.map
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
 * Adapted from upstream `666d7ec`, with three deliberate differences:
 *  - the seats are named for this plugin (`dsh-deckseek.official.*`);
 *  - `conversation.chat.turnTail` is NOT mirrored: this view draws its own closing
 *    row, and borrowing the host's would put two of them in one turn;
 *  - `conversation.message.images` is NOT mirrored for the same reason — this
 *    view renders message images itself through `Blocks`.
 */
import type { Context } from '@deepseek-ai/cordis';
/** The official slots this plugin borrows a seat from, and the seat it lends. */
export declare const OFFICIAL_SLOTS: {
    readonly actions: "conversation.chat.assistant-actions";
    readonly tools: "tool.call.toolview";
    readonly nodes: "conversation.chat.node";
};
export type OfficialFamily = keyof typeof OFFICIAL_SLOTS;
/**
 * What the host declares each of those to be.
 *
 * Checked at install time rather than assumed: the host owns these contracts, and
 * a kind or scope that changed under a mirror would otherwise fail silently — the
 * mirror would register a spec the platform never resolves.
 */
export declare const EXPECTED: Record<OfficialFamily, {
    kind: string;
    scope: string;
}>;
/** This plugin's seat for one family, named so two owners can never collide. */
export declare function officialSeat(family: OfficialFamily): string;
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
 */
export declare function mirrorOfficialSlot(slots: CompositionRegistry, source: string, target: string, namespace: string, accept?: (entry: StoredEntryLike) => boolean): () => void;
/** The child-seat specs the view registration must declare, validated first. */
export declare function officialChildren(slots: Pick<CompositionRegistry, 'spec'>): Record<string, SlotSpecLike>;
/** Whether an official node entry has no renderer of ours already. */
export declare function acceptsOfficialNode(entry: StoredEntryLike): boolean;
/**
 * Install the mirror for every family, on the public registry API only.
 * @returns the disposer that stops all of them.
 */
export declare function installOfficialSlots(ctx: Context): () => void;
//# sourceMappingURL=official-slots.d.ts.map
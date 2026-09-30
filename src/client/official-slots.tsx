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
import { createElement, memo, useMemo, useSyncExternalStore, type ComponentType, type ReactNode } from 'react';
import { isReaderNode } from './reader-nodes.js';

/** The official slots this plugin borrows a seat from, and the seat it lends. */
export const OFFICIAL_SLOTS = {
  actions: 'conversation.chat.assistant-actions',
  tools: 'tool.call.toolview',
  nodes: 'conversation.chat.node',
  tail: 'conversation.chat.turnTail',
} as const;
export type OfficialFamily = keyof typeof OFFICIAL_SLOTS;

/**
 * The seat names as literal types.
 *
 * The view hands these to `renderSlot`, so a typo has to be a compile error
 * rather than a slot that silently renders nothing.
 */
export type OfficialSeat = { [F in OfficialFamily]: `dsh-deckseek.official.${F}/${(typeof OFFICIAL_SLOTS)[F]}` }[OfficialFamily];

/**
 * What the host declares each of those to be.
 *
 * Checked at install time rather than assumed: the host owns these contracts, and
 * a kind or scope that changed under a mirror would otherwise fail silently — the
 * mirror would register a spec the platform never resolves.
 */
export const EXPECTED = {
  actions: { kind: 'list', scope: 'session' },
  tools: { kind: 'keyed', scope: 'session' },
  nodes: { kind: 'keyed', scope: 'session' },
  tail: { kind: 'list', scope: 'session' },
} as const satisfies Record<OfficialFamily, { kind: string; scope: string }>;

/** The families in declaration order; one list so a new family cannot be half-added. */
export const OFFICIAL_FAMILIES = ['actions', 'tools', 'nodes', 'tail'] as const satisfies readonly OfficialFamily[];

/** This plugin's seat for one family, named so two owners can never collide. */
export function officialSeat<F extends OfficialFamily>(family: F): `dsh-deckseek.official.${F}/${(typeof OFFICIAL_SLOTS)[F]}` {
  return `dsh-deckseek.official.${family}/${OFFICIAL_SLOTS[family]}`;
}

/**
 * How many entries the host contributes to each borrowed seat.
 *
 * The reading view draws its own produced-files row, and the host's tail cards
 * draw the same files with counts, an expandable list and the host's own open
 * controls. Both in one turn is exactly the duplication this view avoids
 * elsewhere, so its own row is drawn only where the host contributes no tail at
 * all. That is a fact about the seat, not about one turn's data, so it is
 * published here rather than guessed at a render site — and it is reactive,
 * because the host's registrations can arrive after this view mounts.
 */
const seatCounts = new Map<OfficialFamily, number>();
const seatListeners = new Set<() => void>();

function publishSeatCount(family: OfficialFamily, count: number): void {
  if ((seatCounts.get(family) ?? 0) === count) return;
  seatCounts.set(family, count);
  for (const listener of [...seatListeners]) listener();
}

/** Reactive entry count for one borrowed seat (0 when the host contributes none). */
export function useOfficialSeat(family: OfficialFamily): number {
  return useSyncExternalStore(
    listener => { seatListeners.add(listener); return () => { seatListeners.delete(listener); }; },
    () => seatCounts.get(family) ?? 0,
    () => 0,
  );
}

export interface SlotSpecLike { kind: string; scope: string }

export interface StoredEntryLike {
  component: unknown;
  options: { key?: string; name?: string; [key: string]: unknown };
  registrant?: string;
  locale?: string;
  children?: Record<string, unknown>;
}

interface RenderSlot {
  (key: string, owner: object, options?: object): ReactNode;
}
interface RenderProps extends Record<string, unknown> {
  renderSlot?: RenderSlot;
  renderSlotChain?: RenderSlot;
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

/** Child seats are named per alias, because a declaration has one owner. */
function translatedComponent(entry: StoredEntryLike, names: ReadonlyMap<string, string>): unknown {
  if (names.size === 0) return entry.component;
  const Original = entry.component as ComponentType<Record<string, unknown>>;
  return memo(function TranslatedOfficialChildren(props: RenderProps) {
    const renders = useMemo(() => {
      const translate = (render: RenderSlot | undefined): RenderSlot | undefined => {
        if (!render) return undefined;
        return (key, owner, options) => {
          const seat = names.get(key);
          // An undeclared child is a contract change, not a routing detail:
          // rendering it under the source name would register into the host's own
          // slot a second time.
          if (!seat) throw new Error(`Undeclared official child slot: ${key}`);
          return render(seat, owner, options);
        };
      };
      return { renderSlot: translate(props.renderSlot), renderSlotChain: translate(props.renderSlotChain) };
    }, [props.renderSlot, props.renderSlotChain]);
    return createElement(Original, { ...props, ...renders });
  });
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
export function mirrorOfficialSlot(
  slots: CompositionRegistry,
  source: string,
  target: string,
  namespace: string,
  accept: (entry: StoredEntryLike) => boolean = () => true,
  onCount?: (count: number) => void,
): () => void {
  const mounted = new Map<StoredEntryLike, () => void>();
  let stopped = false;
  const reconcile = (): void => {
    if (stopped) return;
    const entries = slots.entriesOfSlot(source).filter(accept);
    const wanted = new Set(entries);
    for (const [entry, dispose] of mounted) {
      if (wanted.has(entry)) continue;
      dispose();
      mounted.delete(entry);
    }
    for (const entry of entries) {
      if (mounted.has(entry)) continue;
      const names = new Map(Object.keys(entry.children ?? {}).map(key => [key, `${namespace}/${key}`]));
      const children = Object.fromEntries([...names].map(([key, seat]) => [seat, entry.children![key]]));
      const disposers: (() => void)[] = [];
      const dispose = (): void => { for (const stop of disposers.splice(0).reverse()) stop(); };
      try {
        const { component: _component, options, children: _children, ...metadata } = entry;
        disposers.push(slots.register({
          ...options, ...metadata, name: target,
          ...(names.size > 0 ? { children } : {}),
          registrant: `dsh-deckseek → ${entry.registrant ?? source}`,
        }, translatedComponent(entry, names)));
        for (const [key, seat] of names) disposers.push(mirrorOfficialSlot(slots, key, seat, namespace));
        mounted.set(entry, dispose);
      } catch (error) {
        dispose();
        throw error;
      }
    }
    onCount?.(mounted.size);
  };
  const unsubscribe = slots.subscribe(source, reconcile);
  const dispose = (): void => {
    stopped = true;
    unsubscribe();
    for (const stop of [...mounted.values()].reverse()) stop();
    mounted.clear();
    onCount?.(0);
  };
  try { reconcile(); } catch (error) { dispose(); throw error; }
  return dispose;
}

/**
 * The child-seat table the view registration declares.
 *
 * Keyed by the literal seat names rather than `string`, because the platform
 * derives the render props a view component receives from the child keys its
 * registration names: a seat that only exists at runtime is a seat the type
 * checker can never hand a `renderSlot` for. So the tail seat carries its spec
 * literally — it is the one this view renders itself.
 */
export type OfficialChildSeats = { [K in OfficialSeat]: SlotSpecLike } & {
  'dsh-deckseek.official.tail/conversation.chat.turnTail': { kind: 'list'; scope: 'session' };
};

/**
 * The child-seat specs the view registration must declare, validated first.
 *
 * The declared spec is this plugin's own `EXPECTED` entry, and the host's spec is
 * read only to be compared with it: kind and scope are all a child declaration
 * carries, and a mismatch has to be an install-time failure rather than a
 * declaration the platform silently never resolves.
 */
export function officialChildren(slots: Pick<CompositionRegistry, 'spec'>): OfficialChildSeats {
  for (const family of OFFICIAL_FAMILIES) {
    const source = OFFICIAL_SLOTS[family];
    const spec = slots.spec(source);
    if (spec && (spec.kind !== EXPECTED[family].kind || spec.scope !== EXPECTED[family].scope)) {
      throw new Error(`Official slot contract changed: ${source} (${spec.kind}/${spec.scope})`);
    }
  }
  return {
    [officialSeat('actions')]: EXPECTED.actions,
    [officialSeat('tools')]: EXPECTED.tools,
    [officialSeat('nodes')]: EXPECTED.nodes,
    [officialSeat('tail')]: EXPECTED.tail,
  };
}

/** Whether an official node entry has no renderer of ours already. */
export function acceptsOfficialNode(entry: StoredEntryLike): boolean {
  return !isReaderNode(entry.options.key);
}

/**
 * Install the mirror for every family, on the public registry API only.
 * @returns the disposer that stops all of them.
 */
export function installOfficialSlots(ctx: Context): () => void {
  const slots = ctx.slots as unknown as CompositionRegistry;
  const disposers: (() => void)[] = [];
  try {
    for (const family of OFFICIAL_FAMILIES) {
      const source = OFFICIAL_SLOTS[family];
      disposers.push(slots.inject(source, () => {
        const spec = slots.spec(source);
        // The seat's own declaration is what the platform resolves against, so a
        // mismatch here means the child spec this plugin declared is stale.
        if (spec && (spec.kind !== EXPECTED[family].kind || spec.scope !== EXPECTED[family].scope)) {
          throw new Error(`Official slot contract changed: ${source}`);
        }
        return mirrorOfficialSlot(slots, source, officialSeat(family), `dsh-deckseek.official.${family}`,
          family === 'nodes' ? acceptsOfficialNode : undefined,
          count => publishSeatCount(family, count));
      }));
    }
  } catch (error) {
    for (const stop of disposers.reverse()) stop();
    throw error;
  }
  return () => { for (const stop of disposers.splice(0).reverse()) stop(); };
}

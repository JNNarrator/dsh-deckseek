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
import { createElement, memo, useMemo, type ComponentType, type ReactNode } from 'react';
import { isReaderNode } from './reader-nodes.js';

/** The official slots this plugin borrows a seat from, and the seat it lends. */
export const OFFICIAL_SLOTS = {
  actions: 'conversation.chat.assistant-actions',
  tools: 'tool.call.toolview',
  nodes: 'conversation.chat.node',
} as const;
export type OfficialFamily = keyof typeof OFFICIAL_SLOTS;

/**
 * What the host declares each of those to be.
 *
 * Checked at install time rather than assumed: the host owns these contracts, and
 * a kind or scope that changed under a mirror would otherwise fail silently — the
 * mirror would register a spec the platform never resolves.
 */
export const EXPECTED: Record<OfficialFamily, { kind: string; scope: string }> = {
  actions: { kind: 'list', scope: 'session' },
  tools: { kind: 'keyed', scope: 'session' },
  nodes: { kind: 'keyed', scope: 'session' },
};

/** This plugin's seat for one family, named so two owners can never collide. */
export function officialSeat(family: OfficialFamily): string {
  return `dsh-deckseek.official.${family}/${OFFICIAL_SLOTS[family]}`;
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
 */
export function mirrorOfficialSlot(
  slots: CompositionRegistry,
  source: string,
  target: string,
  namespace: string,
  accept: (entry: StoredEntryLike) => boolean = () => true,
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
  };
  const unsubscribe = slots.subscribe(source, reconcile);
  const dispose = (): void => {
    stopped = true;
    unsubscribe();
    for (const stop of [...mounted.values()].reverse()) stop();
    mounted.clear();
  };
  try { reconcile(); } catch (error) { dispose(); throw error; }
  return dispose;
}

/** The child-seat specs the view registration must declare, validated first. */
export function officialChildren(slots: Pick<CompositionRegistry, 'spec'>): Record<string, SlotSpecLike> {
  const declared: Record<string, SlotSpecLike> = {};
  for (const family of Object.keys(OFFICIAL_SLOTS) as OfficialFamily[]) {
    const source = OFFICIAL_SLOTS[family];
    const spec = slots.spec(source);
    if (spec && (spec.kind !== EXPECTED[family].kind || spec.scope !== EXPECTED[family].scope)) {
      throw new Error(`Official slot contract changed: ${source} (${spec.kind}/${spec.scope})`);
    }
    declared[officialSeat(family)] = spec ?? EXPECTED[family];
  }
  return declared;
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
    for (const family of Object.keys(OFFICIAL_SLOTS) as OfficialFamily[]) {
      const source = OFFICIAL_SLOTS[family];
      disposers.push(slots.inject(source, () => {
        const spec = slots.spec(source);
        // The seat's own declaration is what the platform resolves against, so a
        // mismatch here means the child spec this plugin declared is stale.
        if (spec && (spec.kind !== EXPECTED[family].kind || spec.scope !== EXPECTED[family].scope)) {
          throw new Error(`Official slot contract changed: ${source}`);
        }
        return mirrorOfficialSlot(slots, source, officialSeat(family), `dsh-deckseek.official.${family}`,
          family === 'nodes' ? acceptsOfficialNode : undefined);
      }));
    }
  } catch (error) {
    for (const stop of disposers.reverse()) stop();
    throw error;
  }
  return () => { for (const stop of disposers.splice(0).reverse()) stop(); };
}

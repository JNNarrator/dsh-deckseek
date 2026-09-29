import { createElement, memo, useMemo } from 'react';
import { isReaderNode } from './reader-nodes.js';
/** The official slots this plugin borrows a seat from, and the seat it lends. */
export const OFFICIAL_SLOTS = {
    actions: 'conversation.chat.assistant-actions',
    tools: 'tool.call.toolview',
    nodes: 'conversation.chat.node',
};
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
};
/** This plugin's seat for one family, named so two owners can never collide. */
export function officialSeat(family) {
    return `dsh-deckseek.official.${family}/${OFFICIAL_SLOTS[family]}`;
}
/** Child seats are named per alias, because a declaration has one owner. */
function translatedComponent(entry, names) {
    if (names.size === 0)
        return entry.component;
    const Original = entry.component;
    return memo(function TranslatedOfficialChildren(props) {
        const renders = useMemo(() => {
            const translate = (render) => {
                if (!render)
                    return undefined;
                return (key, owner, options) => {
                    const seat = names.get(key);
                    // An undeclared child is a contract change, not a routing detail:
                    // rendering it under the source name would register into the host's own
                    // slot a second time.
                    if (!seat)
                        throw new Error(`Undeclared official child slot: ${key}`);
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
export function mirrorOfficialSlot(slots, source, target, namespace, accept = () => true) {
    const mounted = new Map();
    let stopped = false;
    const reconcile = () => {
        if (stopped)
            return;
        const entries = slots.entriesOfSlot(source).filter(accept);
        const wanted = new Set(entries);
        for (const [entry, dispose] of mounted) {
            if (wanted.has(entry))
                continue;
            dispose();
            mounted.delete(entry);
        }
        for (const entry of entries) {
            if (mounted.has(entry))
                continue;
            const names = new Map(Object.keys(entry.children ?? {}).map(key => [key, `${namespace}/${key}`]));
            const children = Object.fromEntries([...names].map(([key, seat]) => [seat, entry.children[key]]));
            const disposers = [];
            const dispose = () => { for (const stop of disposers.splice(0).reverse())
                stop(); };
            try {
                const { component: _component, options, children: _children, ...metadata } = entry;
                disposers.push(slots.register({
                    ...options, ...metadata, name: target,
                    ...(names.size > 0 ? { children } : {}),
                    registrant: `dsh-deckseek → ${entry.registrant ?? source}`,
                }, translatedComponent(entry, names)));
                for (const [key, seat] of names)
                    disposers.push(mirrorOfficialSlot(slots, key, seat, namespace));
                mounted.set(entry, dispose);
            }
            catch (error) {
                dispose();
                throw error;
            }
        }
    };
    const unsubscribe = slots.subscribe(source, reconcile);
    const dispose = () => {
        stopped = true;
        unsubscribe();
        for (const stop of [...mounted.values()].reverse())
            stop();
        mounted.clear();
    };
    try {
        reconcile();
    }
    catch (error) {
        dispose();
        throw error;
    }
    return dispose;
}
/** The child-seat specs the view registration must declare, validated first. */
export function officialChildren(slots) {
    const declared = {};
    for (const family of Object.keys(OFFICIAL_SLOTS)) {
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
export function acceptsOfficialNode(entry) {
    return !isReaderNode(entry.options.key);
}
/**
 * Install the mirror for every family, on the public registry API only.
 * @returns the disposer that stops all of them.
 */
export function installOfficialSlots(ctx) {
    const slots = ctx.slots;
    const disposers = [];
    try {
        for (const family of Object.keys(OFFICIAL_SLOTS)) {
            const source = OFFICIAL_SLOTS[family];
            disposers.push(slots.inject(source, () => {
                const spec = slots.spec(source);
                // The seat's own declaration is what the platform resolves against, so a
                // mismatch here means the child spec this plugin declared is stale.
                if (spec && (spec.kind !== EXPECTED[family].kind || spec.scope !== EXPECTED[family].scope)) {
                    throw new Error(`Official slot contract changed: ${source}`);
                }
                return mirrorOfficialSlot(slots, source, officialSeat(family), `dsh-deckseek.official.${family}`, family === 'nodes' ? acceptsOfficialNode : undefined);
            }));
        }
    }
    catch (error) {
        for (const stop of disposers.reverse())
            stop();
        throw error;
    }
    return () => { for (const stop of disposers.splice(0).reverse())
        stop(); };
}
//# sourceMappingURL=official-slots.js.map
import { useLayoutEffect, useRef } from 'react';
import { ReaderEntryPolicy, hasStoredViewChoice, readerEntryRequested } from './entry-policy.js';
function isConversationStore(store) {
    return typeof store === 'object' && store !== null
        && store.spec.persist === 'dsh.conversation'
        && typeof store.spec.actions.setView === 'function';
}
function ReaderEntry({ useStore, actions, sessionId }) {
    const view = useStore(state => state.view);
    // Re-arm per session: the entry owns the first view decision only, and a
    // session whose user never picked a tab (new sessions included) opens on
    // the reader. Explicit tab choices are persisted and always respected.
    const armed = useRef(null);
    const policy = useRef(null);
    if (armed.current?.actions !== actions || armed.current.sessionId !== sessionId) {
        armed.current = { actions, sessionId };
        policy.current = new ReaderEntryPolicy(readerEntryRequested(location.search), () => {
            const url = new URL(location.href);
            url.searchParams.delete('reader');
            history.replaceState(history.state, '', url.pathname + url.search + url.hash);
        }, !hasStoredViewChoice(sessionId));
    }
    useLayoutEffect(() => {
        const next = policy.current?.select(view) ?? null;
        if (next)
            actions.setView(next);
    }, [view, actions, sessionId]);
    return null;
}
/**
 * Reuse the native store handle; its framework-owned instance preserves
 * drafts. Our apply runs before the host declares its session body, so the
 * first registration attempt finds no conversation.session entry — wait for
 * its declaration reactively, then register against the now-live store.
 */
export function installReaderEntry(ctx) {
    const tryRegister = () => {
        const native = ctx.slots.entriesOfSlot('conversation.session')[0]?.store;
        if (!isConversationStore(native))
            return false;
        ctx.slots.register({
            name: 'conversation.input.dock',
            id: 'dsh-deckseek-entry',
            store: native,
        }, ReaderEntry);
        return true;
    };
    if (tryRegister())
        return;
    let done = false;
    let unsubMutate = () => { };
    const attempt = () => {
        if (done || !tryRegister())
            return;
        done = true;
        unsubMutate();
    };
    const unsub = ctx.slots.subscribe('conversation.session', () => attempt());
    ctx.effect(() => () => { unsub(); });
}
//# sourceMappingURL=entry.js.map
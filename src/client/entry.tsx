import { useLayoutEffect, useRef } from 'react';
import type { Context } from '@deepseek-ai/cordis';
import type { ConversationStore } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { PropsRuntime, PropsStore, StoreDecl } from '@deepseek-ai/dsh-client-ui-slots';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import { ReaderEntryPolicy, hasStoredViewChoice, readerEntryRequested } from './entry-policy.js';

function isConversationStore(store: StoreDecl | undefined): store is ConversationStore {
  return typeof store === 'object' && store !== null
    && store.spec.persist === 'dsh.conversation'
    && typeof store.spec.actions.setView === 'function';
}

type EntryProps = PropsRuntime<'conversation.input.dock'> & PropsStore<ConversationStore>;

function ReaderEntry({ useStore, actions, sessionId }: EntryProps) {
  const view = useStore(state => state.view);
  // Re-arm per session: the entry owns the first view decision only, and a
  // session whose user never picked a tab (new sessions included) opens on
  // the reader. Explicit tab choices are persisted and always respected.
  const armed = useRef<{ actions: unknown; sessionId: string | undefined } | null>(null);
  const policy = useRef<ReaderEntryPolicy | null>(null);
  if (armed.current?.actions !== actions || armed.current.sessionId !== sessionId) {
    armed.current = { actions, sessionId };
    policy.current = new ReaderEntryPolicy(
      readerEntryRequested(location.search),
      () => {
        const url = new URL(location.href);
        url.searchParams.delete('reader');
        history.replaceState(history.state, '', url.pathname + url.search + url.hash);
      },
      !hasStoredViewChoice(sessionId),
    );
  }
  useLayoutEffect(() => {
    const next = policy.current?.select(view) ?? null;
    if (next) actions.setView(next);
  }, [view, actions]);
  return null;
}

/** Reuse the native store handle; its framework-owned instance preserves drafts. */
export function installReaderEntry(ctx: Context): void {
  ctx.slots.inject('conversation.input.dock', () => {
    const native = ctx.slots.entriesOfSlot('conversation.session')[0]?.store;
    if (!isConversationStore(native)) return () => {};
    return ctx.slots.register({
      name: 'conversation.input.dock',
      id: 'dsh-deckseek-entry',
      store: native,
    }, ReaderEntry);
  });
}

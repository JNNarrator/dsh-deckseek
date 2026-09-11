import { useSyncExternalStore } from 'react';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-api-session-controller/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-settings/client';
import { DEFAULT_SKIN, DECKSEEK_SETTINGS_NAMESPACE, SKIN_FIELD, parseSkin, type SkinId } from '../skin.js';
import type { DeckSeekSettings } from '../skin-settings.js';
import { DeckSeekSection } from './DeckSeekSection.js';
import { Reader } from './Reader.js';
import { createReaderStore } from './store.js';
import { installReaderEntry } from './entry.js';
import { ui } from './locale.js';
import type { DeckSeekSectionInjected, ReaderInjected } from './types.js';

export type { ReaderBlockOwner } from './types.js';
export { McpAppFrame } from './McpAppFrame.js';
export const name = 'dsh-deckseek-client';
export const inject = ['slots', 'sessions', 'settingsScope'];

export function apply(ctx: Context): void {
  const store = createReaderStore();
  const scope = ctx.settingsScope.bind<DeckSeekSettings>({ namespace: DECKSEEK_SETTINGS_NAMESPACE });
  // One hook instance shared by the reader view and the settings page, so both
  // read the same mirror and re-render on the same notification.
  const useSkin = (): SkinId => useSyncExternalStore(
    listener => scope.subscribe(listener),
    () => parseSkin(scope.getSnapshot().value?.skin),
    () => DEFAULT_SKIN,
  );
  const useWritable = (): boolean => useSyncExternalStore(
    listener => scope.subscribe(listener),
    () => scope.getSnapshot().writable,
    () => false,
  );
  const setSkin = (next: SkinId): void => { void scope.set(SKIN_FIELD, next); };
  const faces = new Map<SessionId, ReaderInjected>();
  ctx.effect(() => () => { faces.clear(); });
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'reader',
    order: -5,
    label: () => ui('reader.tab'),
    locale: 'chat',
    children: { 'dsh-deckseek.block': { kind: 'chain', scope: 'session' } },
    store,
    inject: (sessionId: SessionId): ReaderInjected => {
      const existing = faces.get(sessionId);
      if (existing) return existing;
      const session = () => {
        const current = ctx.sessions.binding(sessionId)?.session;
        if (!current) throw new Error(ui('reader.sessionClosed'));
        return current;
      };
      const face: ReaderInjected = {
        loadOlder: async () => { await session().loadOlder(); },
        loadImage: async attachment => {
          const receipt = await session().readAttachment(attachment.attachmentId);
          if (!receipt.ok) throw new Error(receipt.error.message);
          return { data: Uint8Array.from(receipt.value.data), mediaType: receipt.value.attachment.mediaType };
        },
        useSkin,
      };
      faces.set(sessionId, face);
      return face;
    },
  }, Reader));
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'deckseek',
    order: 30,
    label: () => ui('settings.nav'),
    inject: (): DeckSeekSectionInjected => ({ useSkin, useWritable, setSkin }),
  }, DeckSeekSection));
  installReaderEntry(ctx);
}

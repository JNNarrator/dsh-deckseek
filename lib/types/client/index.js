import { useSyncExternalStore } from 'react';
import { DEFAULT_SKIN, DEFAULT_WORK_DETAIL, DECKSEEK_SETTINGS_NAMESPACE, SKIN_FIELD, WORK_DETAIL_FIELD, parseSkin, parseWorkDetail, } from '../skin.js';
import { DeckSeekSection } from './DeckSeekSection.js';
import { Reader } from './Reader.js';
import { createReaderStore } from './store.js';
import { installReaderEntry } from './entry.js';
import { ui } from './locale.js';
export { McpAppFrame } from './McpAppFrame.js';
export const name = 'dsh-deckseek-client';
export const inject = ['slots', 'sessions', 'configForms'];
export function apply(ctx) {
    const store = createReaderStore();
    // 0.1.7 replaced `ctx.settingsScope.bind({ namespace })` with the shared
    // config-form service, keyed by the Host plugin entry id — which is exactly
    // the settings namespace the entry's own Config schema declares.
    const form = ctx.configForms.get(DECKSEEK_SETTINGS_NAMESPACE);
    // One hook instance shared by the reader view and the settings page, so both
    // read the same mirror and re-render on the same notification.
    const useSkin = () => useSyncExternalStore(listener => form.subscribe(listener), () => parseSkin(form.getSnapshot().value?.skin), () => DEFAULT_SKIN);
    const useWritable = () => useSyncExternalStore(listener => form.subscribe(listener), () => form.getSnapshot().writable, () => false);
    const useWorkDetail = () => useSyncExternalStore(listener => form.subscribe(listener), () => parseWorkDetail(form.getSnapshot().value?.workDetail), () => DEFAULT_WORK_DETAIL);
    const setSkin = (next) => { void form.set(SKIN_FIELD, next); };
    const setWorkDetail = (next) => { void form.set(WORK_DETAIL_FIELD, next); };
    const faces = new Map();
    ctx.effect(() => () => { faces.clear(); });
    ctx.slots.inject('conversation.view', () => ctx.slots.register({
        name: 'conversation.view',
        id: 'reader',
        order: -5,
        label: () => ui('reader.tab'),
        locale: 'chat',
        children: { 'dsh-deckseek.block': { kind: 'chain', scope: 'session' } },
        store,
        inject: (sessionId) => {
            const existing = faces.get(sessionId);
            if (existing)
                return existing;
            const session = () => {
                const current = ctx.sessions.binding(sessionId)?.session;
                if (!current)
                    throw new Error(ui('reader.sessionClosed'));
                return current;
            };
            const face = {
                loadOlder: async () => { await session().loadOlder(); },
                loadImage: async (attachment) => {
                    const receipt = await session().readAttachment(attachment.attachmentId);
                    if (!receipt.ok)
                        throw new Error(receipt.error.message);
                    return { data: Uint8Array.from(receipt.value.data), mediaType: receipt.value.attachment.mediaType };
                },
                // The host's own `forkAt` (`ui-chat/src/client/apply.ts`) is exactly this
                // pair of calls plus a trailing `increaseTitle: true`. It is rebuilt
                // rather than received because the host delivers it with
                // `ChatNodeOwnerProps`, and the reading view's seat
                // (`ConvViewOwnerProps`) never holds one — every prop this seat receives
                // is owned by the conversation view, which has no chat nodes to hand
                // down. Both services are already reachable from here: `sessions` is
                // declared in this plugin's `inject` list, and `uiWorkspace` is resolved
                // lazily so a deployment without a workspace browser degrades to a no-op
                // rather than refusing to load the plugin.
                forkAt: (seq) => {
                    void ctx.sessions
                        .fork({ sessionId, atSeq: seq, increaseTitle: true })
                        .then(childId => { ctx.get('uiWorkspace')?.openSession(childId); })
                        // A failed fork leaves the source view untouched, matching the host:
                        // the session stays open and the reader keeps their place.
                        .catch(() => { });
                },
                useSkin,
                useWorkDetail,
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
        inject: () => ({ useSkin, useWritable, setSkin, useWorkDetail, setWorkDetail }),
    }, DeckSeekSection));
    installReaderEntry(ctx);
}
//# sourceMappingURL=index.js.map
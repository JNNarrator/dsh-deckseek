import { Reader } from './Reader.js';
import { createReaderStore } from './store.js';
import { installReaderEntry } from './entry.js';
import { ui } from './locale.js';
export { McpAppFrame } from './McpAppFrame.js';
export const name = 'dsh-deckseek-client';
export const inject = ['slots', 'sessions'];
export function apply(ctx) {
    const store = createReaderStore();
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
            };
            faces.set(sessionId, face);
            return face;
        },
    }, Reader));
    installReaderEntry(ctx);
}
//# sourceMappingURL=index.js.map
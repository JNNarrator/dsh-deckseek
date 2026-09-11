import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
import type { AssistantBlock } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { PropsLocale, PropsRenderSlots, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { createReaderStore } from './store.js';
export interface ReaderBlockOwner {
    block: AssistantBlock;
    streaming: boolean;
    source: 'assistant' | 'user' | 'tool';
}
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface SlotMap {
        /** Trusted installed renderers may opt in; unknown model payloads never execute code. */
        'dsh-deckseek.block': {
            kind: 'chain';
            scope: 'session';
            owner: ReaderBlockOwner;
        };
    }
}
export interface ReaderInjected {
    loadOlder: () => Promise<void>;
    loadImage: (attachment: ImageAttachmentRef) => Promise<{
        data: Uint8Array;
        mediaType: string;
    }>;
}
export type ReaderProps = PropsRuntime<'conversation.view'> & PropsLocale<'chat'> & PropsRenderSlots<'dsh-deckseek.block'> & PropsStore<ReturnType<typeof createReaderStore>> & ReaderInjected;
/** Values threaded from a turn down to its rows. */
export interface TurnRowContext {
    /** Session workspace root; a tool-row path beneath it displays relative. */
    cwd?: string;
    /** Trailing note for a failure card; omitted once the turn renders its own terminal line. */
    failureNote?: string;
}
export type BlockRenderProps = Pick<ReaderProps, 'renderSlotChain' | 'loadImage'>;
//# sourceMappingURL=types.d.ts.map
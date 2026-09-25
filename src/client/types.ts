import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
import type { AssistantBlock } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { PropsLocale, PropsRenderSlots, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type {} from '@deepseek-ai/dsh-client-ui-chat/client';
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client';
import type {} from '@deepseek-ai/dsh-client-ui-session/client';
import type { SkinId, WorkDetailId } from '../skin.js';
import type { createReaderStore } from './store.js';

export interface ReaderBlockOwner {
  block: AssistantBlock;
  streaming: boolean;
  source: 'assistant' | 'user' | 'tool';
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** Trusted installed renderers may opt in; unknown model payloads never execute code. */
    'dsh-deckseek.block': { kind: 'chain'; scope: 'session'; owner: ReaderBlockOwner };
  }
}

export interface ReaderInjected {
  loadOlder: () => Promise<void>;
  loadImage: (attachment: ImageAttachmentRef) => Promise<{ data: Uint8Array; mediaType: string }>;
  /**
   * Fork this session at an event seq and open the child.
   *
   * The reading view cannot receive the host's `forkAt` (it is delivered with
   * `ChatNodeOwnerProps`, which this seat never holds), so the capability is
   * rebuilt here from the two services the host's own implementation uses:
   * `sessions.fork` and `uiWorkspace.openSession`.
   */
  forkAt: (seq: number) => void;
  /** Current reading skin, reactive to the Host settings document. */
  useSkin: () => SkinId;
  /** Current work-details level, reactive to the Host settings document. */
  useWorkDetail: () => WorkDetailId;
}
export type ReaderProps = PropsRuntime<'conversation.view'>
  & PropsLocale<'chat'>
  & PropsRenderSlots<'dsh-deckseek.block'>
  & PropsStore<ReturnType<typeof createReaderStore>>
  & ReaderInjected;
/** Values threaded from a turn down to its rows. */
export interface TurnRowContext {
  /** Session workspace root; a tool-row path beneath it displays relative. */
  cwd?: string
  /** Trailing note for a failure card; omitted once the turn renders its own terminal line. */
  failureNote?: string
}
export type BlockRenderProps = Pick<ReaderProps, 'renderSlotChain' | 'loadImage'>;

/** Injected face of the DeckSeek settings page. */
export interface DeckSeekSectionInjected {
  /** Current reading skin, reactive to the Host settings document. */
  useSkin: () => SkinId;
  /** Whether the Host document accepts writes; memory-mode deployments never do. */
  useWritable: () => boolean;
  /** Persist one skin choice. */
  setSkin: (next: SkinId) => void;
  /** Current work-details level, reactive to the Host settings document. */
  useWorkDetail: () => WorkDetailId;
  /** Persist one work-details choice. */
  setWorkDetail: (next: WorkDetailId) => void;
}

import type { EngineStoreHandle } from '@deepseek-ai/dsh-client-store';
export interface ReaderState {
    expanded: Record<string, boolean>;
    motion: boolean;
}
type ReaderActions = {
    setExpanded: (draft: ReaderState, key: string, value: boolean) => void;
    setMotion: (draft: ReaderState, value: boolean) => void;
};
export declare function createReaderStore(): EngineStoreHandle<ReaderState, ReaderActions>;
export {};
//# sourceMappingURL=store.d.ts.map
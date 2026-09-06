/** Select the reading view on entry, without fighting a later explicit tab choice. */
export declare class ReaderEntryPolicy {
    private readonly requested;
    private readonly consumeRequest;
    /** Open on the reader for sessions whose user never picked a tab (new sessions). */
    private readonly defaultReader;
    private entered;
    constructor(requested: boolean, consumeRequest?: () => void, 
    /** Open on the reader for sessions whose user never picked a tab (new sessions). */
    defaultReader?: boolean);
    select(view: string | null | undefined): 'reader' | null;
}
export declare function readerEntryRequested(search: string): boolean;
/** True when this session has a persisted, explicit View tab choice in storage. */
export declare function hasStoredViewChoice(sessionId: string | undefined): boolean;
//# sourceMappingURL=entry-policy.d.ts.map
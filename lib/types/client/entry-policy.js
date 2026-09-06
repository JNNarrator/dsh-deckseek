/** Select the reading view on entry, without fighting a later explicit tab choice. */
export class ReaderEntryPolicy {
    requested;
    consumeRequest;
    defaultReader;
    entered = false;
    constructor(requested, consumeRequest = () => { }, 
    /** Open on the reader for sessions whose user never picked a tab (new sessions). */
    defaultReader = false) {
        this.requested = requested;
        this.consumeRequest = consumeRequest;
        this.defaultReader = defaultReader;
    }
    select(view) {
        const requested = !this.entered && (this.requested || this.defaultReader);
        if (!this.entered) {
            this.entered = true;
            if (this.requested)
                this.consumeRequest();
        }
        return (requested || view == null) && view !== 'reader' ? 'reader' : null;
    }
}
export function readerEntryRequested(search) {
    const value = new URLSearchParams(search).get('reader');
    return value === '1' || /^0\.1\.0-trial\.\d+$/.test(value ?? '');
}
/** True when this session has a persisted, explicit View tab choice in storage. */
export function hasStoredViewChoice(sessionId) {
    if (!sessionId || typeof localStorage === 'undefined')
        return false;
    try {
        const raw = localStorage.getItem(`dsh.conversation.${sessionId}`);
        if (raw === null)
            return false;
        const stored = JSON.parse(raw);
        return typeof stored === 'object' && stored !== null && typeof stored.view === 'string';
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=entry-policy.js.map
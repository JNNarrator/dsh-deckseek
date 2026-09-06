/** Select the reading view on entry, without fighting a later explicit tab choice. */
export class ReaderEntryPolicy {
  private entered = false;

  constructor(
    private readonly requested: boolean,
    private readonly consumeRequest: () => void = () => {},
    /** Open on the reader for sessions whose user never picked a tab (new sessions). */
    private readonly defaultReader = false,
  ) {}

  select(view: string | null | undefined): 'reader' | null {
    const requested = !this.entered && (this.requested || this.defaultReader);
    if (!this.entered) {
      this.entered = true;
      if (this.requested) this.consumeRequest();
    }
    return (requested || view == null) && view !== 'reader' ? 'reader' : null;
  }
}

export function readerEntryRequested(search: string): boolean {
  const value = new URLSearchParams(search).get('reader');
  return value === '1' || /^0\.1\.0-trial\.\d+$/.test(value ?? '');
}

/** True when this session has a persisted, explicit View tab choice in storage. */
export function hasStoredViewChoice(sessionId: string | undefined): boolean {
  if (!sessionId || typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem(`dsh.conversation.${sessionId}`);
    if (raw === null) return false;
    const stored: unknown = JSON.parse(raw);
    return typeof stored === 'object' && stored !== null && typeof (stored as { view?: unknown }).view === 'string';
  } catch {
    return false;
  }
}

/** Split newly settled text into announcement chunks (≤ `max` chars each). */
export declare function splitAnnouncement(text: string, max?: number): string[];
/**
 * Track the announced length of a growing text and return the pending log
 * entries. Only growth is announced; selection-held or settled text is not
 * re-read. The log keeps the last `MAX_LOG_CHUNKS` entries so long sessions
 * do not accumulate an unbounded live region.
 */
export declare function useLiveAnnounce(text: string): string[];
//# sourceMappingURL=announce.d.ts.map
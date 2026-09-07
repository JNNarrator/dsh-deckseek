import { useEffect, useRef, useState } from 'react';
/**
 * Polite announcements for streamed answer text. The animated word surface is
 * aria-hidden (one leaf per word would flood the accessibility tree), so the
 * settled transcript is re-announced through a `role="log"` region — chunked
 * and sentence-aware, so a screen reader gets growing text in bounded pieces
 * instead of one giant dump when the stream finishes.
 */
/** Sentence boundary characters treated as safe cut points. */
const BOUNDARIES = ['。', '！', '？', '. ', '! ', '? ', '\n'];
/** Split newly settled text into announcement chunks (≤ `max` chars each). */
export function splitAnnouncement(text, max = 180) {
    const chunks = [];
    let rest = text.trim();
    while (rest.length > max) {
        const head = rest.slice(0, max);
        const cut = Math.max(...BOUNDARIES.map(boundary => head.lastIndexOf(boundary)));
        const end = cut >= 0 ? cut + 1 : max;
        chunks.push(rest.slice(0, end));
        rest = rest.slice(end);
    }
    if (rest.length > 0)
        chunks.push(rest);
    return chunks;
}
const MAX_LOG_CHUNKS = 40;
/**
 * Track the announced length of a growing text and return the pending log
 * entries. Only growth is announced; selection-held or settled text is not
 * re-read. The log keeps the last `MAX_LOG_CHUNKS` entries so long sessions
 * do not accumulate an unbounded live region.
 */
export function useLiveAnnounce(text) {
    const announcedRef = useRef(0);
    const [chunks, setChunks] = useState([]);
    useEffect(() => {
        if (text.length <= announcedRef.current)
            return;
        const next = splitAnnouncement(text.slice(announcedRef.current));
        announcedRef.current = text.length;
        if (next.length === 0)
            return;
        setChunks(current => {
            const merged = [...current, ...next];
            return merged.length > MAX_LOG_CHUNKS ? merged.slice(-MAX_LOG_CHUNKS) : merged;
        });
    }, [text]);
    return chunks;
}
//# sourceMappingURL=announce.js.map
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { searchMatches } from './search-index.js';
import { ui } from './locale.js';
import css from './Reader.module.css';
/**
 * In-view search over user/assistant text. Matches navigate to the rendered
 * block (flashed briefly); the DSH session remains the source of truth.
 */
export const SearchPanel = memo(function SearchPanel({ root, index, onClose }) {
    const [query, setQuery] = useState('');
    const [cursor, setCursor] = useState(0);
    const row = useRef(null);
    const input = useRef(null);
    const matches = useMemo(() => searchMatches(index, query), [index, query]);
    const active = matches.length === 0 ? null : matches[cursor % matches.length];
    const flashTimer = useRef(null);
    useEffect(() => () => { if (flashTimer.current)
        clearTimeout(flashTimer.current); }, []);
    // The owning message can be a huge article (process records included).
    // Descend to the smallest element that still contains the hit so the jump,
    // the flash and the per-match marking always land on something the user
    // can actually see.
    const locate = useCallback((key, needle) => {
        const container = root.current;
        if (!container)
            return null;
        const owner = Array.from(container.querySelectorAll('[data-reader-key]'))
            .find(element => element.dataset.readerKey === key);
        if (!owner)
            return null;
        let target = owner;
        for (;;) {
            const child = Array.from(target.children)
                .filter((node) => node instanceof HTMLElement && !!node.textContent && node.textContent.toLowerCase().includes(needle))[0];
            if (!child)
                break;
            target = child;
        }
        return target;
    }, [root]);
    useEffect(() => {
        input.current?.focus();
        // Inserting the panel shifts the flow and the browser's scroll anchoring
        // compensates after this commit; wait two frames, then nudge the
        // conversation scroller only (never the host app's outer page scroll).
        let frame2 = 0;
        const frame1 = requestAnimationFrame(() => {
            frame2 = requestAnimationFrame(() => {
                const container = root.current;
                const rowEl = row.current;
                if (!container || !rowEl)
                    return;
                const scroller = container.closest('[data-conversation-scroll]') ?? container;
                const clipped = rowEl.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
                if (clipped < 0)
                    scroller.scrollTop += clipped;
            });
        });
        return () => { cancelAnimationFrame(frame1); cancelAnimationFrame(frame2); };
    }, []);
    const marked = useRef([]);
    // Every matching block keeps a quiet tint while the search is open; the
    // active match additionally gets the flashing outline on jump.
    useEffect(() => {
        const clear = () => {
            for (const element of marked.current)
                element.classList.remove(css.searchMarked);
            marked.current = [];
        };
        const needle = query.trim().toLowerCase();
        if (!active || needle === '') {
            clear();
            return;
        }
        for (const match of matches) {
            const target = locate(match.key, needle);
            if (!target)
                continue;
            target.classList.add(css.searchMarked);
            marked.current.push(target);
        }
        return clear;
    }, [matches, active, query, locate]);
    useEffect(() => {
        const container = root.current;
        if (!container || !active)
            return;
        const target = locate(active.key, query.trim().toLowerCase());
        if (!target)
            return;
        // Scroll the conversation port itself; scrollIntoView would also drag the
        // host app's outer page scroller and displace the whole shell.
        const scroller = container.closest('[data-conversation-scroll]') ?? container;
        const port = scroller.getBoundingClientRect();
        const box = target.getBoundingClientRect();
        scroller.scrollTop += box.top - port.top - Math.max(24, (port.height - box.height) / 2);
        target.classList.add(css.searchHit);
        if (flashTimer.current)
            clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => target.classList.remove(css.searchHit), 2000);
    }, [active, locate, query]);
    const step = (delta) => {
        if (matches.length > 0)
            setCursor(value => (value + delta + matches.length) % matches.length);
    };
    return (_jsxs("div", { ref: row, className: css.searchRow, "data-reader-search": true, role: "search", children: [_jsx("input", { ref: input, className: css.searchInput, value: query, autoFocus: true, onChange: event => { setQuery(event.target.value); setCursor(0); }, placeholder: ui('reader.searchPlaceholder'), onKeyDown: event => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        step(event.shiftKey ? -1 : 1);
                    }
                    else if (event.key === 'Escape') {
                        onClose();
                    }
                } }), _jsx("span", { className: css.searchMeta, role: "status", children: query.trim() ? (matches.length === 0 ? ui('reader.searchNoMatches') : `${(cursor % matches.length) + 1} / ${matches.length}`) : '' }), _jsx("button", { type: "button", className: css.textButton, disabled: matches.length === 0, "aria-label": ui('reader.searchPrevTitle'), title: ui('reader.searchPrevTitle'), onClick: () => step(-1), children: "\u2191" }), _jsx("button", { type: "button", className: css.textButton, disabled: matches.length === 0, "aria-label": ui('reader.searchNextTitle'), title: ui('reader.searchNextTitle'), onClick: () => step(1), children: "\u2193" }), _jsx("button", { type: "button", className: css.textButton, "aria-label": ui('reader.searchClose'), title: ui('reader.searchClose'), onClick: onClose, children: "\u00D7" })] }));
});
//# sourceMappingURL=SearchPanel.js.map
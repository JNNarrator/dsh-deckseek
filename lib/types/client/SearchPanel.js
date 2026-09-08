import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { searchMatches } from './search-index.js';
import { ui } from './locale.js';
import css from './Reader.module.css';
/**
 * In-view search over user/assistant text. Occurrences are highlighted
 * character-exact through the CSS Custom Highlight API (with a block-level
 * tint as a second layer); the DSH session remains the source of truth.
 */
export const SearchPanel = memo(function SearchPanel({ root, index, onClose }) {
    const [query, setQuery] = useState('');
    const [cursor, setCursor] = useState(0);
    const row = useRef(null);
    const input = useRef(null);
    const flashTimer = useRef(null);
    const matches = useMemo(() => searchMatches(index, query), [index, query]);
    const locate = useCallback((key, needle) => {
        const container = root.current;
        if (!container)
            return null;
        const owner = Array.from(container.querySelectorAll('[data-reader-key]'))
            .find(element => element.dataset.readerKey === key);
        if (!owner)
            return null;
        // The owning message can be a huge article (process records included).
        // Descend to the smallest element that still contains the hit so the jump,
        // the flash and the marking always land on something the user can see.
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
    // Block-level tint: shows which blocks matched while scrolling a long doc.
    const marked = useRef([]);
    useEffect(() => {
        const clear = () => {
            for (const element of marked.current)
                element.classList.remove(css.searchMarked);
            marked.current = [];
        };
        const needle = query.trim().toLowerCase();
        if (needle === '') {
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
    }, [matches, query, locate]);
    // Character-exact occurrences across all matching blocks, in document order.
    const occurrences = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle)
            return [];
        const list = [];
        for (const match of matches) {
            const block = locate(match.key, needle);
            if (!block)
                continue;
            const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                const text = node.nodeValue ?? '';
                const lower = text.toLowerCase();
                let from = 0;
                for (;;) {
                    const hit = lower.indexOf(needle, from);
                    if (hit === -1)
                        break;
                    const range = document.createRange();
                    range.setStart(node, hit);
                    range.setEnd(node, hit + needle.length);
                    list.push({ range, block });
                    from = hit + needle.length;
                }
            }
        }
        return list;
    }, [matches, query, locate]);
    const supportsHighlights = typeof CSS !== 'undefined' && 'highlights' in CSS;
    useEffect(() => {
        if (!supportsHighlights)
            return;
        const highlights = CSS.highlights;
        if (occurrences.length === 0) {
            highlights.delete('deckseek-matches');
            highlights.delete('deckseek-search-active');
            return;
        }
        highlights.set('deckseek-matches', new Highlight(...occurrences.map(occurrence => occurrence.range)));
    }, [occurrences, supportsHighlights]);
    useEffect(() => () => {
        if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
            CSS.highlights.delete('deckseek-matches');
            CSS.highlights.delete('deckseek-search-active');
        }
    }, []);
    const activeOccurrence = occurrences.length === 0 ? null : occurrences[cursor % occurrences.length];
    useEffect(() => {
        if (!supportsHighlights || !activeOccurrence)
            return;
        const highlights = CSS.highlights;
        highlights.set('deckseek-search-active', new Highlight(activeOccurrence.range));
    }, [activeOccurrence, supportsHighlights]);
    useEffect(() => {
        const container = root.current;
        if (!container || !activeOccurrence)
            return;
        // Scroll the conversation port itself; scrollIntoView would also drag the
        // host app's outer page scroller and displace the whole shell.
        const scroller = container.closest('[data-conversation-scroll]') ?? container;
        const port = scroller.getBoundingClientRect();
        const box = activeOccurrence.range.getBoundingClientRect();
        scroller.scrollTop += box.top - port.top - Math.max(24, (port.height - box.height) / 2);
        activeOccurrence.block.classList.add(css.searchHit);
        if (flashTimer.current)
            clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => activeOccurrence.block.classList.remove(css.searchHit), 2000);
    }, [activeOccurrence, root]);
    const step = (delta) => {
        if (occurrences.length > 0)
            setCursor(value => (value + delta + occurrences.length) % occurrences.length);
    };
    return (_jsxs("div", { ref: row, className: css.searchRow, "data-reader-search": true, role: "search", children: [_jsx("input", { ref: input, className: css.searchInput, value: query, autoFocus: true, onChange: event => { setQuery(event.target.value); setCursor(0); }, placeholder: ui('reader.searchPlaceholder'), onKeyDown: event => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        step(event.shiftKey ? -1 : 1);
                    }
                    else if (event.key === 'Escape') {
                        onClose();
                    }
                } }), _jsx("span", { className: css.searchMeta, role: "status", children: query.trim() ? (occurrences.length === 0 ? ui('reader.searchNoMatches') : `${(cursor % occurrences.length) + 1} / ${occurrences.length}`) : '' }), _jsx("button", { type: "button", className: css.textButton, disabled: occurrences.length === 0, "aria-label": ui('reader.searchPrevTitle'), title: ui('reader.searchPrevTitle'), onClick: () => step(-1), children: "\u2191" }), _jsx("button", { type: "button", className: css.textButton, disabled: occurrences.length === 0, "aria-label": ui('reader.searchNextTitle'), title: ui('reader.searchNextTitle'), onClick: () => step(1), children: "\u2193" }), _jsx("button", { type: "button", className: css.textButton, "aria-label": ui('reader.searchClose'), title: ui('reader.searchClose'), onClick: onClose, children: "\u00D7" })] }));
});
//# sourceMappingURL=SearchPanel.js.map
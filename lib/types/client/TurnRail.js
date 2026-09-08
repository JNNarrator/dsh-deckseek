import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ui } from './locale.js';
import { jumpLock } from './jump-lock.js';
import css from './Reader.module.css';
/**
 * Right-edge message marks in the style of a minimal editor rail: one tiny
 * pill per user message, the active one highlighted, hovering shows a styled
 * info bubble, clicking scrolls that message into view. The rail lives inside
 * the reader's right padding gutter, so the reading column stays centered;
 * hidden on narrow widths.
 */
export const TurnRail = memo(function TurnRail({ root, items }) {
    const [activeKey, setActiveKey] = useState(null);
    const [tip, setTip] = useState(null);
    const nav = useRef(null);
    const frame = useRef(0);
    // A click owns the highlight until the jump settles or the user scrolls on
    // their own: near the document end the landing position can never cross the
    // threshold line, so position-based updates would revert the clicked mark.
    // Every way out is covered — reached target, wheel, key, pointer (scrollbar
    // drag), content growth, and a backup timer — otherwise the mark freezes.
    const pending = useRef(false);
    const target = useRef(null);
    const backup = useRef(null);
    const updateRef = useRef(() => { });
    const releaseRef = useRef(() => { });
    const flashed = useRef(null);
    const flashTimer = useRef(null);
    const tipOf = (item) => [item.turn !== null ? ui('rail.turn', { turn: item.turn }) : null, item.label || ui('rail.message')]
        .filter(Boolean).join(' · ');
    const list = useRef(null);
    // Dense histories: compress the per-mark footprint so every mark stays
    // visible without scrolling; past the compression floor the rail falls
    // back to its hover/focus-revealed scrollbar.
    useLayoutEffect(() => {
        const listEl = list.current;
        if (!listEl)
            return;
        const fit = () => {
            listEl.style.removeProperty('--rail-squeeze');
            if (items.length < 2)
                return;
            const natural = listEl.scrollHeight;
            if (natural <= listEl.clientHeight)
                return;
            listEl.style.setProperty('--rail-squeeze', Math.max(0.3, listEl.clientHeight / natural).toFixed(3));
            if (listEl.scrollHeight > listEl.clientHeight + 2)
                listEl.style.removeProperty('--rail-squeeze');
        };
        fit();
        const observer = new ResizeObserver(fit);
        observer.observe(listEl);
        return () => observer.disconnect();
    }, [items]);
    useEffect(() => {
        const content = root.current;
        if (!content)
            return;
        const scroller = content.closest('[data-conversation-scroll]') ?? content;
        // Anchor elements are stable per rail item; build the lookup once per
        // item list instead of on every scroll frame.
        const anchors = new Map(Array.from(content.querySelectorAll('[data-reader-key]'))
            .map(element => [element.dataset.readerKey, element]));
        const update = () => {
            frame.current = 0;
            if (pending.current)
                return;
            const threshold = scroller.getBoundingClientRect().top + 24;
            let current = null;
            for (const item of items) {
                const anchor = anchors.get(item.key);
                if (!anchor)
                    continue;
                if (anchor.getBoundingClientRect().top <= threshold)
                    current = item.key;
                else
                    break;
            }
            // Pinned at the document end, the last message owns the highlight even
            // though its anchor cannot reach the threshold line.
            const atBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 96;
            if (!current && atBottom && items.length > 0)
                current = items[items.length - 1].key;
            setActiveKey(previous => previous === current ? previous : current);
        };
        updateRef.current = update;
        const release = () => {
            if (!pending.current)
                return;
            pending.current = false;
            target.current = null;
            jumpLock.active = false;
            if (backup.current) {
                clearTimeout(backup.current);
                backup.current = null;
            }
            if (!frame.current)
                frame.current = requestAnimationFrame(update);
        };
        releaseRef.current = release;
        const onScroll = () => {
            // The jump's own smooth scroll ends here: back to position tracking.
            if (pending.current && target.current !== null && Math.abs(scroller.scrollTop - target.current) <= 1) {
                release();
                return;
            }
            if (!frame.current)
                frame.current = requestAnimationFrame(update);
        };
        update();
        scroller.addEventListener('scroll', onScroll, { passive: true });
        scroller.addEventListener('wheel', release, { passive: true });
        scroller.addEventListener('keydown', release);
        scroller.addEventListener('pointerdown', release);
        window.addEventListener('resize', onScroll, { passive: true });
        const growth = new ResizeObserver(release);
        growth.observe(content);
        return () => {
            cancelAnimationFrame(frame.current);
            if (backup.current)
                clearTimeout(backup.current);
            scroller.removeEventListener('scroll', onScroll);
            scroller.removeEventListener('wheel', release);
            scroller.removeEventListener('keydown', release);
            scroller.removeEventListener('pointerdown', release);
            window.removeEventListener('resize', onScroll);
            growth.disconnect();
        };
    }, [root, items]);
    useEffect(() => () => {
        if (flashTimer.current)
            clearTimeout(flashTimer.current);
    }, []);
    const jump = (item) => {
        const content = root.current;
        if (!content)
            return;
        const scroller = content.closest('[data-conversation-scroll]') ?? content;
        const anchor = Array.from(content.querySelectorAll('[data-reader-key]'))
            .find(element => element.dataset.readerKey === item.key);
        if (!anchor)
            return;
        // Scroll the conversation port directly: scrollIntoView would also drag
        // the host app's outer page scroller and displace the whole shell. Clamp
        // to the scrollable range so the "reached target" check can always fire.
        const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        const top = Math.min(Math.max(0, anchor.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 24), max);
        setActiveKey(item.key);
        if (flashTimer.current)
            clearTimeout(flashTimer.current);
        flashed.current?.classList.remove(css.markFlash);
        flashed.current = anchor;
        anchor.classList.add(css.markFlash);
        flashTimer.current = setTimeout(() => {
            anchor.classList.remove(css.markFlash);
            flashed.current = null;
        }, 1600);
        // Already at the target: nothing will scroll, so do not take the lock.
        if (Math.abs(top - scroller.scrollTop) < 1)
            return;
        target.current = top;
        pending.current = true;
        jumpLock.active = true;
        if (backup.current)
            clearTimeout(backup.current);
        backup.current = setTimeout(() => releaseRef.current(), 1200);
        scroller.scrollTo({ top, behavior: 'smooth' });
    };
    const showTip = (key, element) => {
        const navEl = nav.current;
        if (!navEl)
            return;
        const top = element.getBoundingClientRect().top - navEl.getBoundingClientRect().top + element.offsetHeight / 2;
        setTip({ key, top });
    };
    return (_jsxs("nav", { ref: nav, className: css.rail, "aria-label": ui('rail.label'), children: [_jsx("ul", { ref: list, className: css.railList, role: "region", "aria-label": ui('rail.label'), tabIndex: 0, children: items.map(item => (_jsx("li", { className: css.railRow, children: _jsx("button", { type: "button", className: css.railItem, "data-active": item.key === activeKey || undefined, "aria-label": tipOf(item), onClick: () => jump(item), onMouseEnter: event => showTip(item.key, event.currentTarget), onMouseLeave: () => setTip(null), children: _jsx("span", { className: css.railDash, "aria-hidden": true }) }) }, item.key))) }), tip && (() => {
                const item = items.find(entry => entry.key === tip.key);
                if (!item)
                    return null;
                return _jsx("div", { className: css.railTip, style: { top: tip.top }, role: "tooltip", children: tipOf(item) });
            })()] }));
});
//# sourceMappingURL=TurnRail.js.map
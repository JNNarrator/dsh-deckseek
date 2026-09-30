import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import css from './Reader.module.css';
import { settleByDeadline } from './animation-deadline.js';
import { SPINNER_INTERVAL_MS, SPINNER_STILL_FRAME, spinnerFrame } from './spinner.js';
import { StreamMotionContext } from './streaming.js';
import { jumpLock } from './jump-lock.js';
import { focusWithoutScroll } from './focus.js';
import { PROGRAMMATIC_MS } from './process-scroll.js';
import { ui } from './locale.js';
const EASING = 'cubic-bezier(.22,1,.36,1)';
/** This view's definition of "a record a reader can read" — the same marker the
 *  reading-anchor capture uses, so the unread badge and the anchor agree about
 *  what counts as content. */
const RECORD = '[data-reader-anchor]';
/** Two digits is all the badge is worth: "12" tells a reader to go back, and
 *  "1284" tells them nothing the rest of the control does not already. */
const UNREAD_CAP = 99;
/** How far off the foot still counts as being at the foot. Inside it the view
 *  follows; outside it, only the reader's own hand may stop the following. */
const FOLLOW_GAP = 72;
/**
 * Count the records in one batch of DOM mutations.
 *
 * Split out of the observer because it is the whole of the unread rule, and the
 * rule is worth testing without a browser: a count that double-counts nested
 * records, or that counts a text node as a record, is worse than no count — it
 * tells the reader to go back for something that is not there.
 *
 * `closest` is deliberately not consulted: an added subtree counts as one
 * record for each record inside it, however deep, which is what a batch of
 * newly-arrived turns looks like to React.
 */
export function countNewRecords(mutations) {
    let added = 0;
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (!(node instanceof Element))
                continue;
            added += (node.matches(RECORD) ? 1 : 0) + node.querySelectorAll(RECORD).length;
        }
    }
    return added;
}
export function useMotionAllowed(enabled) {
    const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const change = () => setReduced(query.matches);
        query.addEventListener('change', change);
        return () => query.removeEventListener('change', change);
    }, []);
    return enabled && !reduced;
}
export function usePinnedSelection(root, selector = '[data-reader-answer], [data-reader-process]') {
    const [keys, setKeys] = useState([]);
    useEffect(() => {
        const update = () => {
            const selection = document.getSelection();
            const range = selection && !selection.isCollapsed && selection.rangeCount ? selection.getRangeAt(0) : null;
            const next = range && root.current
                ? [...new Set(Array.from(root.current.querySelectorAll(selector))
                        .filter(element => range.intersectsNode(element))
                        .map(element => element.dataset.readerKey ?? element.dataset.readerProcessKey).filter(Boolean))]
                : [];
            setKeys(previous => previous.length === next.length && previous.every((key, index) => key === next[index]) ? previous : next);
        };
        document.addEventListener('selectionchange', update);
        return () => document.removeEventListener('selectionchange', update);
    }, [root, selector]);
    return keys;
}
/**
 * The busy status line. `text` is the semantic phase label every skin reads;
 * while a turn is open it also carries the elapsed clock inside it. The terminal
 * skin instead reads the reference TUI's idiom — a breathing glyph, a per-turn
 * working verb and a tabular clock in its own slot — so `verb` and `clock` are
 * supplied as separate parts and the CSS picks which of the two the skin shows.
 */
export function StatusText({ text, ariaText, motion, shimmer = false, verb, clock, swapKey, detail }) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(() => !document.hidden);
    const [forcedColors, setForcedColors] = useState(() => window.matchMedia('(forced-colors: active)').matches);
    const allowed = motion && visible && !forcedColors;
    const key = swapKey ?? text;
    const [frame, setFrame] = useState({ key, text, id: 0, phase: 'idle', outgoing: null });
    // Adjust before commit, so a new label cannot paint once before its entry state.
    // Reuse the previous incoming key: a rapid change exits from its current pose.
    if (frame.key !== key)
        setFrame({
            key, text, id: frame.id + 1, phase: allowed ? 'start' : 'idle',
            outgoing: allowed ? { text: frame.text, id: frame.id } : null,
        });
    // Same phase, new digits: update the painted string without re-animating it.
    else if (frame.text !== text)
        setFrame({ ...frame, text });
    useEffect(() => {
        const update = () => setVisible(!document.hidden);
        const query = window.matchMedia('(forced-colors: active)');
        const colors = () => setForcedColors(query.matches);
        document.addEventListener('visibilitychange', update);
        query.addEventListener('change', colors);
        return () => { document.removeEventListener('visibilitychange', update); query.removeEventListener('change', colors); };
    }, []);
    useLayoutEffect(() => {
        const id = frame.id;
        const settle = () => setFrame(current => current.id === id && current.outgoing
            ? { ...current, phase: 'idle', outgoing: null } : current);
        if (!allowed) {
            settle();
            return;
        }
        if (!frame.outgoing || !ref.current)
            return;
        // Commit the supplied .is-enter-start pose before releasing CSS transitions.
        ref.current.getBoundingClientRect();
        let timer = 0;
        const tick = requestAnimationFrame(() => {
            setFrame(current => current.id === id ? { ...current, phase: 'running' } : current);
            timer = window.setTimeout(settle, 200); // 150ms swap + 50ms incoming gap.
        });
        return () => { cancelAnimationFrame(tick); window.clearTimeout(timer); };
    }, [frame.id, allowed]);
    const active = shimmer && allowed;
    const swapping = allowed && frame.outgoing !== null;
    // The terminal skin's spinner. It ticks only while the reading view is
    // actually showing a busy line, so it costs nothing at rest, and with motion
    // disallowed it holds one frame — which still says "running is happening"
    // without anything moving.
    const spinning = allowed && shimmer;
    const [tick, setTick] = useState(0);
    useEffect(() => {
        if (!spinning)
            return;
        const timer = window.setInterval(() => setTick(value => value + 1), SPINNER_INTERVAL_MS);
        return () => window.clearInterval(timer);
    }, [spinning]);
    return _jsxs("span", { className: css.statusText, "data-reader-status": true, "data-reader-busy": shimmer, "data-reader-status-verb": verb !== undefined || undefined, "data-ud-check": "reader-status", children: [_jsx("span", { className: css.statusGlyph, "aria-hidden": "true", children: spinning ? spinnerFrame(tick) : SPINNER_STILL_FRAME }), _jsxs("span", { className: css.think, "aria-hidden": "true", "data-active": active, "data-reader-status-phase": swapping ? frame.phase : 'idle', "data-ud-motion": "reader-thinking-state", children: [_jsx("span", { className: css.thinkSizer, children: text }), swapping && _jsx("span", { className: `${css.thinkText} ${frame.phase === 'running' ? css.isExit : ''}`, "data-reader-status-copy": "outgoing", "data-text": frame.outgoing.text, children: frame.outgoing.text }, frame.outgoing.id), _jsx("span", { ref: ref, className: `${css.thinkText} ${swapping && frame.phase === 'start' ? css.isEnterStart : ''}`, "data-reader-status-copy": "current", "data-reader-shimmer": active || undefined, "data-text": text, children: text }, frame.id)] }), verb !== undefined && _jsx("span", { className: css.statusVerb, "aria-hidden": "true", children: verb }), detail !== undefined && _jsx("span", { className: css.statusDetail, "data-reader-status-detail": true, "aria-hidden": "true", children: detail }), clock !== undefined && _jsx("span", { className: css.statusClock, "data-reader-status-clock": true, "aria-hidden": "true", children: clock }), _jsx("span", { className: css.srOnly, role: "status", "aria-live": "polite", "aria-atomic": "true", children: ariaText ?? text })] });
}
/**
 * The fold's whole header, and nothing else: one line, one button.
 *
 * It used to carry a second row under the button — `思考与过程 · N 个步骤` —
 * which cost a full line above every process and restated a count the reader
 * already had: the strip pinned to the bottom prints how many steps the newest
 * turn has spent, and the fold's own summary prints this turn's, inline, for
 * free. A fold header is the one row a reader has to pass to reach the work, so
 * it is kept to the height of its own text.
 */
export function Disclosure({ open, onChange, label, activity, summary, controls, buttonRef }) {
    const ActivityGlyph = activity?.glyph;
    return _jsx("div", { className: css.disclosure, "data-reader-disclosure": true, "data-expanded": open, children: _jsxs("button", { ref: buttonRef, type: "button", className: css.disclosureButton, "aria-label": open ? ui('turn.foldAriaCollapse') : ui('turn.foldAriaExpand'), "aria-expanded": open, "aria-controls": controls, onClick: () => onChange(!open), children: [label, activity !== undefined && _jsxs("span", { className: css.foldActivity, "data-reader-fold-activity": true, "data-activity": activity.phrase, children: [ActivityGlyph && _jsx(ActivityGlyph, { className: css.foldActivityGlyph }), _jsx("span", { className: css.foldActivityPhrase, children: activity.phrase })] }), summary !== undefined && _jsx("span", { className: css.frameCounts, "data-reader-fold-summary": true, children: summary }), _jsx("svg", { className: css.chevron, "data-open": open, viewBox: "0 0 16 16", width: "12", height: "12", "aria-hidden": "true", children: _jsx("path", { d: "m6 4 4 4-4 4" }) })] }) });
}
/** Opening or closing one disclosure body. */
export const DISCLOSURE_SIZE_MS = 260;
/** Folding one retired narration out of the live stream. */
export const RETIRE_SIZE_MS = 220;
/** Supplemental details stay in source order beside their own narration. */
export function ProcessFragment({ open, motion, onRead, returnFocusTo, nodeKey, children, framed = false }) {
    const body = useRef(null);
    const running = useRef(null);
    const previous = useRef(open);
    const [present, setPresent] = useState(open);
    useLayoutEffect(() => {
        const element = body.current;
        if (!element)
            return;
        const from = running.current ? element.getBoundingClientRect().height : previous.current ? element.scrollHeight : 0;
        running.current?.cancel();
        running.current = null;
        const changed = previous.current !== open;
        previous.current = open;
        if (open)
            setPresent(true);
        if (!open && element.contains(document.activeElement))
            focusWithoutScroll(returnFocusTo.current);
        element.style.height = open ? 'auto' : '0px';
        const target = open ? element.scrollHeight : 0;
        if (!motion || !changed || Math.abs(from - target) < 1) {
            setPresent(open);
            return;
        }
        const animation = element.animate([{ height: `${from}px` }, { height: `${target}px` }], { duration: DISCLOSURE_SIZE_MS, easing: EASING, fill: 'both' });
        running.current = animation;
        // `fill: 'both'` holds whichever keyframe this animation stopped on, and the
        // body only becomes readable when the fill is dropped — here, by the cancel
        // below. An animation that never advances (re-run, unmount, a subtree the
        // compositor skips) never reaches `onfinish`, which would leave the row in the
        // DOM at zero height: clicked it, and nothing happened. The deadline commits
        // the same end state on a wall clock instead.
        return settleByDeadline(animation, () => {
            if (running.current !== animation)
                return;
            running.current = null;
            animation.cancel();
            setPresent(open);
        }, DISCLOSURE_SIZE_MS);
    }, [open, motion, returnFocusTo]);
    useEffect(() => () => { running.current?.cancel(); }, []);
    if (!open && !present)
        return null;
    return _jsx("div", { ref: body, className: css.disclosureBody, "data-reader-process": true, "data-reader-process-key": nodeKey, "data-ud-motion": "reader-process-size", "aria-hidden": !open, onPointerDown: () => { if (open)
            onRead(); }, onFocusCapture: () => { if (open)
            onRead(); }, ...(!open ? { inert: '' } : {}), children: _jsx("div", { className: framed ? css.processFrame : css.processContents, children: children }) });
}
/** Retire only narration that was actually visible; historical rows stay folded. */
export function RetiringContent({ visible, children }) {
    const { enabled } = useContext(StreamMotionContext);
    const root = useRef(null);
    const animation = useRef(null);
    const [present, setPresent] = useState(visible);
    const [focusHeld, setFocusHeld] = useState(false);
    useLayoutEffect(() => {
        const element = root.current;
        if (visible) {
            animation.current?.cancel();
            animation.current = null;
            setPresent(true);
            return;
        }
        if (!element)
            return;
        if (element.contains(document.activeElement)) {
            setFocusHeld(true);
            return;
        }
        if (focusHeld)
            return;
        const from = element.getBoundingClientRect().height;
        animation.current?.cancel();
        animation.current = null;
        if (!enabled || from < 1) {
            setPresent(false);
            return;
        }
        const next = element.animate([{ height: `${from}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: RETIRE_SIZE_MS, easing: EASING, fill: 'both' });
        animation.current = next;
        // A collapse that never reports finishing would leave the retired narration
        // pinned at its old height — and, because `present` never flips, in the tree.
        // The deadline completes the retirement regardless.
        return settleByDeadline(next, () => {
            if (animation.current !== next)
                return;
            animation.current = null;
            next.cancel();
            setPresent(false);
        }, RETIRE_SIZE_MS);
    }, [visible, enabled, focusHeld]);
    useEffect(() => () => animation.current?.cancel(), []);
    if (!visible && !present)
        return null;
    return _jsx("div", { ref: root, className: css.retiringContent, "data-reader-retiring": visible ? 'visible' : 'retiring', "data-ud-motion": "reader-progress-retire", onBlur: event => { if (!event.currentTarget.contains(event.relatedTarget))
            setFocusHeld(false); }, children: children });
}
// DOM-only behavior: the native Session remains the sole source of business data.
export function useReadingScroll(root, motion) {
    const port = useRef(null);
    const following = useRef(true);
    const anchor = useRef(null);
    const [detached, setDetached] = useState(false);
    // How many readable records have arrived since the reader left the bottom.
    // The count is what makes the jump control worth pressing, so it is counted
    // on the same marker the anchor capture uses: `[data-reader-anchor]` is
    // already this view's definition of "a record a reader can read".
    const [unread, setUnread] = useState(0);
    const unreadCount = useRef(0);
    // When the last write of ours landed. A scroll event cannot otherwise be told
    // apart from the reader's hand — see `onScroll` in the effect below.
    const wroteAt = useRef(-Infinity);
    const clearUnread = () => {
        if (unreadCount.current === 0)
            return;
        unreadCount.current = 0;
        setUnread(0);
    };
    useLayoutEffect(() => {
        const content = root.current;
        if (!content)
            return;
        const scroll = content.closest('[data-conversation-scroll]') ?? content;
        port.current = scroll;
        let followFrame = 0;
        let lastFrameAt = 0;
        const selected = () => {
            const selection = document.getSelection();
            return selection && !selection.isCollapsed && selection.anchorNode && content.contains(selection.anchorNode);
        };
        // A focused text input pauses auto-follow; ordinary button focus must not
        // permanently detach the view from the newest content.
        const focusBlocks = () => {
            const active = document.activeElement;
            if (!active || !content.contains(active))
                return false;
            return active instanceof HTMLElement && active.closest('textarea,input,[contenteditable=true],[role=textbox]') !== null;
        };
        const capture = () => {
            const top = scroll.getBoundingClientRect().top;
            const candidate = Array.from(content.querySelectorAll('[data-reader-anchor]')).find(element => element.getBoundingClientRect().bottom > top + 8);
            anchor.current = candidate ? { element: candidate, top: candidate.getBoundingClientRect().top } : null;
        };
        // Where the scrollport stood when this listener last looked. A hand and the
        // content's own growth are told apart by direction: content arriving below
        // never lifts the top edge, and only a reader ever does.
        let lastTop = scroll.scrollTop;
        const onScroll = () => {
            // A jump owns the scrollport while its smooth scroll runs: those frames are
            // neither our write nor the reader's hand, and reading them as "the reader
            // scrolled away" is what detached the view a moment after the reader asked
            // it to come back down.
            if (jumpLock.active)
                return;
            const top = scroll.scrollTop;
            const previous = lastTop;
            lastTop = top;
            // The foot is where following lives, however the reader reached it: the one
            // who scrolls down onto the newest line has asked for it as plainly as the
            // one who never left.
            if (scroll.scrollHeight - top - scroll.clientHeight < FOLLOW_GAP) {
                following.current = true;
                setDetached(false);
                clearUnread();
                capture();
                return;
            }
            // Our own writes come back as scroll events a frame later, and a chase
            // writes more than once per frame by construction — so a value compare
            // ("is this where I last put it?") misreads those writes as the reader's
            // hand. The misread is not harmless: a burst leaves the remaining gap
            // above the bottom threshold, so the follower detached *itself* exactly
            // while it was doing its job, which is what "it still sits on the messages
            // above" is. A timestamp cannot be fooled that way: an event from the last
            // frame is ours, an event from a hand is not.
            if (performance.now() - wroteAt.current < PROGRAMMATIC_MS)
                return;
            // Away from the foot, only one thing decides: did the reader move the
            // viewport UP? A gap that merely grew is not an answer to that question —
            // it is the answer arriving — and treating growth as the reader's hand is
            // what parked the view on rows it had already read while the newest work
            // continued out of sight below it.
            if (top < previous - .5) {
                following.current = false;
                setDetached(true);
                cancelAnimationFrame(followFrame);
                followFrame = 0;
                capture();
            }
        };
        const onWheel = (event) => {
            cancelAnimationFrame(followFrame);
            followFrame = 0;
            if (event.deltaY < 0) {
                following.current = false;
                setDetached(true);
                capture();
            }
        };
        const onKey = (event) => {
            if (event.target instanceof HTMLElement && event.target.closest('textarea,input,[contenteditable=true]'))
                return;
            if (['PageUp', 'Home', 'ArrowUp'].includes(event.key)) {
                cancelAnimationFrame(followFrame);
                followFrame = 0;
                following.current = false;
                setDetached(true);
                capture();
            }
        };
        const writeTop = (top) => { scroll.scrollTop = top; wroteAt.current = performance.now(); };
        /**
         * Start the chase again if it is still supposed to be running.
         *
         * `follow` gives up when the reader selects text or focuses a field inside a
         * record, and nothing used to restart it once that pause ended: the reader
         * cleared their selection and the view stayed parked wherever it had been,
         * with `following` still true, so not even the "back to latest" control
         * appeared. A pause is not a decision — the reader who copies a line and
         * clicks away has asked for nothing — so the end of a pause is a resume
         * signal. `focusout` covers the field case; `selectionchange` and a return to
         * a visible tab cover the rest.
         */
        const resume = () => {
            if (!following.current || jumpLock.active || followFrame)
                return;
            if (selected() || focusBlocks())
                return;
            lastFrameAt = performance.now();
            followFrame = requestAnimationFrame(follow);
        };
        /* Following is a chase, and its time constant is the whole feel of it.
         *
         * It was 52ms: a reader watching an answer stream in saw the text arrive and
         * then the viewport drift down to it a beat later, which reads as the view
         * lagging rather than as the text being new. 18ms closes ~60% of the
         * remaining gap per frame, so the lag stays within about one frame's worth
         * of growth and the bottom edge looks pinned to the text.
         *
         * It stays an eased chase rather than a bare `scrollTop = scrollHeight`,
         * because the easing is what makes a burst land smoothly instead of
         * snapping. `SNAP` ends the chase once the remainder is under a line:
         * easing a 3px gap across frames is pure latency, and it is also what kept
         * `detached` flickering for a frame at the tail of every burst. */
        const SNAP = 24;
        const follow = (now) => {
            followFrame = 0;
            if (!following.current || selected() || focusBlocks())
                return;
            const gap = scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop;
            const delta = Math.min(48, Math.max(1, now - lastFrameAt));
            lastFrameAt = now;
            if (!motion || Math.abs(gap) < SNAP) {
                writeTop(scroll.scrollHeight);
                capture();
                return;
            }
            writeTop(scroll.scrollTop + gap * (1 - Math.exp(-delta / 18)));
            followFrame = requestAnimationFrame(follow);
        };
        const firstFrame = requestAnimationFrame(() => {
            if (following.current && !selected())
                writeTop(scroll.scrollHeight);
            capture();
        });
        const observer = new ResizeObserver(() => {
            // A programmatic jump is animating: anchor compensation would fight its
            // smooth scroll and derail it. Yield until the jump releases the lock.
            if (jumpLock.active)
                return;
            if (selected())
                return;
            if (following.current && !focusBlocks()) {
                if (!motion)
                    writeTop(scroll.scrollHeight);
                else if (!followFrame) {
                    lastFrameAt = performance.now();
                    followFrame = requestAnimationFrame(follow);
                }
            }
            else if (!following.current && anchor.current?.element.isConnected) {
                const delta = anchor.current.element.getBoundingClientRect().top - anchor.current.top;
                if (Math.abs(delta) > .5)
                    writeTop(scroll.scrollTop + delta);
            }
            capture();
        });
        observer.observe(content);
        if (scroll !== content)
            observer.observe(scroll);
        // Count what arrives while the reader is away. A `ResizeObserver` cannot do
        // this — it reports that the content got taller, not how many records
        // arrived — and the count is the part of the control that answers "is it
        // worth going back for". Capped, because past a couple of digits the exact
        // number stops carrying information.
        const records = new MutationObserver(mutations => {
            if (following.current)
                return;
            const added = countNewRecords(mutations);
            if (added === 0)
                return;
            unreadCount.current = Math.min(UNREAD_CAP, unreadCount.current + added);
            setUnread(unreadCount.current);
        });
        records.observe(content, { childList: true, subtree: true });
        scroll.addEventListener('scroll', onScroll, { passive: true });
        scroll.addEventListener('wheel', onWheel, { passive: true });
        scroll.addEventListener('keydown', onKey);
        content.addEventListener('focusout', resume);
        document.addEventListener('selectionchange', resume);
        document.addEventListener('visibilitychange', resume);
        return () => {
            cancelAnimationFrame(firstFrame);
            cancelAnimationFrame(followFrame);
            observer.disconnect();
            records.disconnect();
            scroll.removeEventListener('scroll', onScroll);
            scroll.removeEventListener('wheel', onWheel);
            scroll.removeEventListener('keydown', onKey);
            content.removeEventListener('focusout', resume);
            document.removeEventListener('selectionchange', resume);
            document.removeEventListener('visibilitychange', resume);
        };
    }, [root, motion]);
    return { detached, unread, jump: () => {
            following.current = true;
            setDetached(false);
            clearUnread();
            // Same yield rule as rail jumps: nothing may fight this smooth scroll.
            jumpLock.active = true;
            setTimeout(() => { jumpLock.active = false; }, 1200);
            port.current?.scrollTo({ top: port.current.scrollHeight, behavior: 'smooth' });
        } };
}
/** Remember the reading position per session and restore it on return. */
export function useReadingPosition(root, sessionId, ready) {
    const key = `dsh-deckseek:reader:pos:${sessionId}`;
    const [restored, setRestored] = useState(false);
    const done = useRef(false);
    useLayoutEffect(() => {
        const content = root.current;
        if (!ready || !content || done.current)
            return;
        const scroll = content.closest('[data-conversation-scroll]') ?? content;
        if (typeof sessionStorage === 'undefined')
            return;
        let saved = 0;
        try {
            saved = Number(sessionStorage.getItem(key) ?? '0');
        }
        catch { /* storage unavailable */ }
        if (Number.isFinite(saved) && saved > 480 && saved <= scroll.scrollHeight - scroll.clientHeight + 200) {
            // Restore after the initial follow frame so the reading-scroll follower
            // observes the jump as a user scroll and stops auto-following.
            requestAnimationFrame(() => { scroll.scrollTop = saved; });
            setRestored(true);
        }
        done.current = true;
    }, [ready, key, root]);
    useEffect(() => {
        const content = root.current;
        if (!content || typeof sessionStorage === 'undefined')
            return;
        const scroll = content.closest('[data-conversation-scroll]') ?? content;
        const save = () => { try {
            sessionStorage.setItem(key, String(scroll.scrollTop));
        }
        catch { /* storage unavailable */ } };
        const timer = window.setInterval(save, 2000);
        window.addEventListener('beforeunload', save);
        return () => { window.clearInterval(timer); window.removeEventListener('beforeunload', save); };
    }, [key, root]);
    return restored;
}
//# sourceMappingURL=motion.js.map
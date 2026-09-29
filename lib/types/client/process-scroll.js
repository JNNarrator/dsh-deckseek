/** Capped process-group scrolling, with edge fades.
 *
 *  0.1.7 gives a folded process group a height cap (`max-height: min(400px, 50vh)`)
 *  so a fifty-call turn cannot push the answer off screen, and fades whichever
 *  edge has more content behind it. The plugin did without both: a long turn
 *  simply grew, and the reader scrolled the transcript instead.
 *
 *  This is deliberately NOT a port of the host's `use-process-scroll`, which is
 *  built on the host's shared follow controller (`use-scroll-follow`) and carries
 *  behaviours this plugin has no seat for — `scrollend` settling, and
 *  interruption from events that bubble out of editable controls. What is copied
 *  is the part a reader can actually see: the cap, the two edge fades, and the
 *  follow — but the follow here is NOT the transcript's follow one level down.
 *
 *  It used to be neither, on the argument that "the transcript's own follow
 *  controller already owns that intent, and two controllers disagreeing about
 *  where the reader wants to be is worse than one". That argument is wrong for a
 *  capped body, and the reader is the one who pays: content lands *inside* the
 *  cap, the transcript's follower never fires (a body at its cap does not grow
 *  the transcript), and a running turn's newest rows sit out of sight below a
 *  window frozen on its first screenful. Measured in the running app, watching a
 *  turn with the fold open: the rows stop and the reader has to chase them by
 *  hand, which is exactly the "it still sits on the messages above" report.
 *
 *  The two controllers are not rivals because they act on different axes: this
 *  one moves the cap's own `scrollTop`, the transcript's moves the scrollport
 *  that contains the body. Neither write changes the other's metrics. The rule
 *  each follows is also the same one, so they agree by construction: follow the
 *  newest until the reader scrolls away by hand, and hand the position back as
 *  soon as the reader returns to the floor. Where they differ is the gate —
 *  this one follows only while the turn is still running, because a settled
 *  body is one the reader opens in order to read from the top.
 *
 *  The cap is applied by CSS, not measured here. That matters: `max-height` is
 *  the thing that makes `scrollHeight` exceed `clientHeight`, so a test or a
 *  browser that does not apply the stylesheet sees no overflow and no fades. The
 *  fades are therefore derived from measured metrics and never assumed. Which
 *  levels get the cap is the caller's decision (`Reader` caps only the level that
 *  actually folds), so this hook does not take a cap flag — a body that is not
 *  capped has no overflow and reports no edges on its own. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
const AT_REST = { canScrollUp: false, canScrollDown: false };
/** A sub-pixel slack, so a body scrolled to its exact floor is not reported as
 *  still having content below it. Fractional line heights make the floor
 *  non-integral, and a bare `>` flickers the bottom fade on and off. */
const EDGE_SLACK = 1;
/**
 * How long after one of our own writes the body's next scroll event still
 * counts as ours.
 *
 * The transcript's follower learned this the hard way: scroll events are
 * delivered asynchronously (once per frame, coalesced), so by the time a write's
 * own event arrives the writer has usually written again — a chase moves more
 * than a pixel per frame by construction. Comparing the event's position against
 * the last written position therefore misreads our own writes as the reader's
 * hand, and a misread during a fast burst detaches the follow that is doing the
 * writing. A timestamp says what the value compare was trying to say: an event
 * from the last frame belongs to us.
 *
 * Exported so the tests can hold the margin's one real constraint: it must be
 * shorter than the pause a reader's own scroll can produce, and longer than a
 * frame.
 */
export const PROGRAMMATIC_MS = 200;
/** Exported for the test that pins the sub-pixel slack: a fractional line height
 *  makes the floor non-integral, and a bare `>` flickers the bottom fade. */
export function metricsOf(body) {
    return { top: body.scrollTop, floor: Math.max(0, body.scrollHeight - body.clientHeight) };
}
export function edgesOf(metrics) {
    return {
        canScrollUp: metrics.top > EDGE_SLACK,
        canScrollDown: metrics.top < metrics.floor - EDGE_SLACK,
    };
}
function sameEdges(left, right) {
    return left.canScrollUp === right.canScrollUp && left.canScrollDown === right.canScrollDown;
}
/**
 * Report which edges of one process body are hiding content.
 *
 * @param bodyRef - the capped scrolling element.
 * @param contentRef - the uncapped content inside it, whose resize is what tells
 *   us the body has grown. Observing the body alone misses growth whenever the
 *   body is already at its cap, because then the body's own box never changes.
 * @param open - whether the group is expanded.
 *
 * No keydown handler is bound, unlike the host's copy, which lists the scrolling
 * keys so it can interrupt its own smooth auto-follow when the reader pages. The
 * browser already moves the capped body natively and the resulting `scroll` event
 * is what reports the edges here; binding a handler would swallow keys the
 * transcript's own turn navigation wants, for no gain.
 *
 * No reading position is saved or restored either. A restore was written, and
 * mutation testing showed it could never run: `saved` was cleared on every entry
 * into a closed or uncapped state, and the effect's dependencies only change when
 * `open` does, so it could never observe a non-null position. The browser already
 * keeps `scrollTop` for an element it does not re-create, and this cap does not
 * flicker mid-stream — it changes only when the reader folds or changes level.
 */
export function useProcessScroll(bodyRef, contentRef, open, follow = false) {
    const [edges, setEdges] = useState(AT_REST);
    // Who owns this body's scroll position. `false` until the reader takes it: a
    // running turn then keeps its newest row in view on its own.
    const takenOver = useRef(false);
    // When we last wrote the position. A scroll event that arrives inside this
    // window is our own write coming back, never the reader's hand; comparing
    // values instead cannot work, because scroll events are delivered a frame
    // later and a chase writes more than once per frame.
    const wroteAt = useRef(0);
    const sync = useCallback(() => {
        const body = bodyRef.current;
        if (body === null)
            return;
        // A closed group's body is collapsed by its own animation, not by an
        // ancestor: the plugin's disclosure header and this body are siblings, so
        // there is no `[hidden]` or `[data-expanded]` element above it to find —
        // the `open` prop is the only signal, and it is the honest one.
        if (!open) {
            setEdges(previous => sameEdges(previous, AT_REST) ? previous : AT_REST);
            return;
        }
        const next = edgesOf(metricsOf(body));
        setEdges(previous => sameEdges(previous, next) ? previous : next);
    }, [bodyRef, open]);
    /** Pin the body to its floor. Only ever called while the reader owns nothing. */
    const pin = useCallback(() => {
        const body = bodyRef.current;
        if (body === null)
            return;
        body.scrollTop = body.scrollHeight;
        wroteAt.current = performance.now();
    }, [bodyRef]);
    // Before paint, so a body that is opening does not paint one frame of stale
    // fades; and on `open`, so a closed body drops its fades immediately.
    useLayoutEffect(() => {
        if (bodyRef.current === null)
            return;
        sync();
    }, [bodyRef, open, sync]);
    useEffect(() => {
        if (bodyRef.current === null)
            return;
        sync();
    });
    // A turn that ends stops following, and the next one starts over with a clean
    // slate: whether the reader had taken over is a fact about the turn they were
    // watching, not about the group.
    useEffect(() => {
        if (!follow)
            takenOver.current = false;
    }, [follow]);
    // Open, running and unclaimed: put the newest row in view, before the frame
    // that would otherwise paint the previous screenful of it.
    useLayoutEffect(() => {
        if (open && follow && !takenOver.current) {
            pin();
            sync();
        }
    }, [open, follow, pin, sync]);
    // Growth is reported through the content, not the body: once the body is at
    // its cap its own box stops changing, so a body-only observer would never fire
    // for the very case the fades exist to serve.
    useLayoutEffect(() => {
        const body = bodyRef.current;
        const content = contentRef.current;
        if (body === null || !open)
            return;
        if (typeof ResizeObserver === 'undefined')
            return;
        const observer = new ResizeObserver(() => {
            if (follow && !takenOver.current)
                pin();
            sync();
        });
        observer.observe(body);
        if (content !== null)
            observer.observe(content);
        return () => { observer.disconnect(); };
    }, [bodyRef, contentRef, open, follow, pin, sync]);
    /**
     * The body's own scroll events: our writes and the reader's hand arrive on the
     * same channel.
     *
     * A write we made is recognised by its timestamp rather than by its value —
     * see `wroteAt` — and only changes the fades. Anything else is the reader, so
     * it decides ownership by the same rule the transcript's follower uses one
     * level up: still content below means they are reading history, and the floor
     * means they are back with the newest row.
     */
    const onScroll = useCallback(() => {
        const body = bodyRef.current;
        if (body !== null && open && follow && performance.now() - wroteAt.current >= PROGRAMMATIC_MS) {
            takenOver.current = edgesOf(metricsOf(body)).canScrollDown;
        }
        sync();
    }, [bodyRef, follow, open, sync]);
    return { edges, events: { onScroll } };
}
//# sourceMappingURL=process-scroll.js.map
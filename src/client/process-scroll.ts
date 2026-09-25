/** Capped process-group scrolling, with edge fades.
 *
 *  0.1.7 gives a folded process group a height cap (`max-height: min(400px, 50vh)`)
 *  so a fifty-call turn cannot push the answer off screen, and fades whichever
 *  edge has more content behind it. The plugin did without both: a long turn
 *  simply grew, and the reader scrolled the transcript instead.
 *
 *  This is deliberately NOT a port of the host's `use-process-scroll`, which is
 *  built on the host's shared follow controller (`use-scroll-follow`) and carries
 *  behaviours this plugin has no seat for — smooth auto-follow of a growing body,
 *  `scrollend` settling, and interruption from events that bubble out of editable
 *  controls. A group body here does not auto-follow: the transcript's own follow
 *  controller already owns that intent, and two controllers disagreeing about
 *  where the reader wants to be is worse than one. What is copied is the part a
 *  reader can actually see: the cap and the two edge fades.
 *
 *  The cap is applied by CSS, not measured here. That matters: `max-height` is
 *  the thing that makes `scrollHeight` exceed `clientHeight`, so a test or a
 *  browser that does not apply the stylesheet sees no overflow and no fades. The
 *  fades are therefore derived from measured metrics and never assumed. Which
 *  levels get the cap is the caller's decision (`Reader` caps only the level that
 *  actually folds), so this hook does not take a cap flag — a body that is not
 *  capped has no overflow and reports no edges on its own. */
import { useCallback, useEffect, useLayoutEffect, useState, type DOMAttributes, type RefObject } from 'react';

export interface ScrollEdges {
  readonly canScrollUp: boolean;
  readonly canScrollDown: boolean;
}

const AT_REST: ScrollEdges = { canScrollUp: false, canScrollDown: false };

/** A sub-pixel slack, so a body scrolled to its exact floor is not reported as
 *  still having content below it. Fractional line heights make the floor
 *  non-integral, and a bare `>` flickers the bottom fade on and off. */
const EDGE_SLACK = 1;

interface Metrics {
  readonly top: number;
  readonly floor: number;
}

/** Exported for the test that pins the sub-pixel slack: a fractional line height
 *  makes the floor non-integral, and a bare `>` flickers the bottom fade. */
export function metricsOf(body: { scrollTop: number; scrollHeight: number; clientHeight: number }): Metrics {
  return { top: body.scrollTop, floor: Math.max(0, body.scrollHeight - body.clientHeight) };
}

export function edgesOf(metrics: Metrics): ScrollEdges {
  return {
    canScrollUp: metrics.top > EDGE_SLACK,
    canScrollDown: metrics.top < metrics.floor - EDGE_SLACK,
  };
}

function sameEdges(left: ScrollEdges, right: ScrollEdges): boolean {
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
export function useProcessScroll(
  bodyRef: RefObject<HTMLDivElement | null>,
  contentRef: RefObject<HTMLDivElement | null>,
  open: boolean,
): { edges: ScrollEdges; events: Pick<DOMAttributes<HTMLDivElement>, 'onScroll'> } {
  const [edges, setEdges] = useState<ScrollEdges>(AT_REST);

  const sync = useCallback(() => {
    const body = bodyRef.current;
    if (body === null) return;
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

  // Before paint, so a body that is opening does not paint one frame of stale
  // fades; and on `open`, so a closed body drops its fades immediately.
  useLayoutEffect(() => {
    if (bodyRef.current === null) return;
    sync();
  }, [bodyRef, open, sync]);

  useEffect(() => {
    if (bodyRef.current === null) return;
    sync();
  });

  // Growth is reported through the content, not the body: once the body is at
  // its cap its own box stops changing, so a body-only observer would never fire
  // for the very case the fades exist to serve.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    const content = contentRef.current;
    if (body === null || !open) return;
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => { sync(); });
    observer.observe(body);
    if (content !== null) observer.observe(content);
    return () => { observer.disconnect(); };
  }, [bodyRef, contentRef, open, sync]);

  return { edges, events: { onScroll: sync } };
}

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
import { type DOMAttributes, type RefObject } from 'react';
export interface ScrollEdges {
    readonly canScrollUp: boolean;
    readonly canScrollDown: boolean;
}
interface Metrics {
    readonly top: number;
    readonly floor: number;
}
/** Exported for the test that pins the sub-pixel slack: a fractional line height
 *  makes the floor non-integral, and a bare `>` flickers the bottom fade. */
export declare function metricsOf(body: {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
}): Metrics;
export declare function edgesOf(metrics: Metrics): ScrollEdges;
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
export declare function useProcessScroll(bodyRef: RefObject<HTMLDivElement | null>, contentRef: RefObject<HTMLDivElement | null>, open: boolean): {
    edges: ScrollEdges;
    events: Pick<DOMAttributes<HTMLDivElement>, 'onScroll'>;
};
export {};
//# sourceMappingURL=process-scroll.d.ts.map
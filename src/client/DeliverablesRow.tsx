import { memo } from 'react';
import css from './Reader.module.css';
import { basename, visibleDeliverables } from './deliverables.js';
import { ui } from './locale.js';

/**
 * The files one closed turn produced.
 *
 * A row rather than part of the answer, because the artifacts belong to the stop
 * the turn made: the answer is what the model said, the row is what it left on
 * disk. It waits for the turn to close (see `showDeliverablesRow`) — a row that
 * appeared on the first write would claim the work is finished while it is still
 * being written.
 *
 * Each chip is one control. Upstream also hangs "show in folder" and "copy path"
 * off the chip; the reveal action arrives with the host route for it (W3d), and
 * the path is already the chip's title, so the second control is not here yet
 * rather than absent by oversight.
 */
export const Deliverables = memo(function Deliverables({ paths, openFile }: {
  paths: readonly string[]; openFile: (path: string) => void;
}) {
  const { shown, hidden } = visibleDeliverables(paths);
  return <div className={css.deliverablesRoot} data-reader-deliverables>
    <span className={css.deliverablesLabel}>{ui('deliverables.label')}</span>
    <div className={css.deliverablesLane}>
      <div className={css.deliverablesChips}>
        {shown.map(path => <button key={path} type="button" className={css.deliverableChip}
          title={path} aria-label={ui('deliverable.open', { path })} onClick={() => openFile(path)}>
          <span className={css.deliverableName}>{basename(path)}</span>
        </button>)}
        {hidden > 0 && <span className={css.deliverablesMore}>{ui('deliverables.more', { count: hidden })}</span>}
      </div>
    </div>
  </div>;
});

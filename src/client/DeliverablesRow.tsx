import { memo } from 'react';
import css from './Reader.module.css';
import { basename, dirname, visibleDeliverables } from './deliverables.js';
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
 * Each chip carries two controls: the file name opens the file, and the folder
 * control selects it in the OS file manager. The second one needs a server route
 * the plugin only registers where the host has a web server and a workspace
 * registry, so where that is missing it opens the containing folder instead — a
 * lesser affordance, and the only one available, rather than a dead control.
 */
export const Deliverables = memo(function Deliverables({ paths, openFile, revealFile }: {
  paths: readonly string[]; openFile: (path: string) => void; revealFile?: ((path: string) => void) | undefined;
}) {
  const { shown, hidden } = visibleDeliverables(paths);
  const reveal = (path: string): void => {
    if (revealFile) revealFile(path);
    else openFile(dirname(path));
  };
  return <div className={css.deliverablesRoot} data-reader-deliverables>
    <span className={css.deliverablesLabel}>{ui('deliverables.label')}</span>
    <div className={css.deliverablesLane}>
      <div className={css.deliverablesChips}>
        {shown.map(path => <span key={path} className={css.deliverableChip} data-deliverable={path}>
          <button type="button" className={css.deliverableOpen}
            title={path} aria-label={ui('deliverable.open', { path })} onClick={() => openFile(path)}>
            <span className={css.deliverableName}>{basename(path)}</span>
          </button>
          <button type="button" className={css.deliverableReveal}
            title={ui('deliverable.reveal', { path })} aria-label={ui('deliverable.reveal', { path })} onClick={() => reveal(path)}>
            <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
              <path d="M1.75 4.4a1 1 0 0 1 1-1h3.05l1.45 1.55h5a1 1 0 0 1 1 1v6.05a1 1 0 0 1-1 1H2.75a1 1 0 0 1-1-1z" />
              <path d="M1.75 6.9h12.5" />
            </svg>
          </button>
        </span>)}
        {hidden > 0 && <span className={css.deliverablesMore}>{ui('deliverables.more', { count: hidden })}</span>}
      </div>
    </div>
  </div>;
});

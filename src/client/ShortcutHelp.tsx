import { Fragment, useEffect } from 'react';
import { ui, type UiKey } from './locale.js';
import css from './Reader.module.css';
import { focusWithoutScroll } from './focus.js';

/**
 * The reading view's shortcut sheet, opened with `?`.
 *
 * It lists only keys this view owns. The composer, sending a message and the
 * host's risky-action confirmation are host surfaces with their own bindings,
 * so the sheet says so instead of silently omitting them — a shortcut sheet
 * that looks complete but is not is worse than one that draws its own border.
 */
const ROWS: ReadonlyArray<{ group: 'reading' | 'panels'; keys: string; label: UiKey }> = [
  { group: 'panels', keys: '^K', label: 'help.key.palette' },
  { group: 'panels', keys: '?', label: 'help.key.help' },
  { group: 'reading', keys: '/', label: 'help.key.search' },
  { group: 'reading', keys: 'Enter', label: 'help.key.next' },
  { group: 'reading', keys: 'Shift+Enter', label: 'help.key.prev' },
  { group: 'reading', keys: 'j', label: 'help.key.scrollDown' },
  { group: 'reading', keys: 'k', label: 'help.key.scrollUp' },
  { group: 'reading', keys: 'g', label: 'help.key.top' },
  { group: 'reading', keys: 'G', label: 'help.key.bottom' },
  { group: 'panels', keys: 'Esc / q', label: 'help.key.dismiss' },
];

export function ShortcutHelp({ onClose }: { onClose: () => void }) {
  // Focus the close control so the sheet is reachable by keyboard: it is a
  // dialog, and a dialog that opens with focus still on the page behind it
  // cannot be left with the keyboard.
  useEffect(() => { focusWithoutScroll(document.querySelector<HTMLButtonElement>('[data-reader-help] [data-autofocus]')); }, []);
  return <div className={css.paletteScrim} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={css.palette} data-reader-help role="dialog" aria-modal="true" aria-label={ui('help.title')}>
      <p className={css.helpTitle}>{ui('help.title')}</p>
      <dl className={css.helpList}>
        {(['reading', 'panels'] as const).map(group => <Fragment key={group}>
          <dt className={css.helpGroup}>{ui(group === 'reading' ? 'help.group.reading' : 'help.group.panels')}</dt>
          {ROWS.filter(row => row.group === group).map(row => <dd key={row.keys} className={css.helpRow}>
            <kbd className={css.helpKeys}>{row.keys}</kbd>
            <span className={css.helpLabel}>{ui(row.label)}</span>
          </dd>)}
        </Fragment>)}
      </dl>
      <p className={css.paletteNote}>{ui('help.note.hosts')}</p>
      <button type="button" data-autofocus className={css.helpClose} onClick={onClose}>{ui('help.close')}</button>
    </div>
  </div>;
}

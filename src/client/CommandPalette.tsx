import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { filterCommands, groupCommands, type ReaderCommand } from './commands.js';
import { ui } from './locale.js';
import css from './Reader.module.css';
import { focusWithoutScroll } from './focus.js';

/**
 * The reading view's command palette.
 *
 * Everything it can do is also reachable without it — the palette is the
 * discoverable index, not the only door: each entry carries the keystroke that
 * runs it directly where one exists. It filters as you type, walks with the
 * arrow keys, and closes before running so the command's own focus lands on a
 * page with no palette in the way.
 */
export function CommandPalette({ commands, onClose }: {
  commands: readonly ReaderCommand[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useMemo(() => filterCommands(commands, query), [commands, query]);
  const groups = useMemo(() => groupCommands(list), [list]);
  // Focus goes to the field, not the list: a palette is typed into first.
  useEffect(() => { focusWithoutScroll(input.current); }, []);
  // A new query re-ranks the list, so the highlight returns to the best match
  // rather than staying on whatever index the previous list happened to hold.
  useEffect(() => { setActive(0); }, [query]);
  const run = useCallback((command: ReaderCommand | undefined) => {
    if (!command) return;
    onClose();
    command.run();
  }, [onClose]);
  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(index => list.length === 0 ? 0 : (index + 1) % list.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(index => list.length === 0 ? 0 : (index - 1 + list.length) % list.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(list[active]);
    }
  };
  // The highlighted row is found by id, not by walking the group headings, so
  // the flat index the arrow keys move stays in step with the grouped render.
  const activeId = list[active]?.id;
  return <div className={css.paletteScrim} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={css.palette} role="dialog" aria-modal="true" aria-label={ui('palette.title')} data-reader-palette onKeyDown={onKeyDown}>
      <div className={css.paletteField}>
        <span className={css.palettePrompt} aria-hidden="true">&gt;</span>
        <input ref={input} className={css.paletteInput} value={query} onChange={event => setQuery(event.target.value)}
          placeholder={ui('palette.placeholder')} aria-label={ui('palette.placeholder')}
          aria-controls="dsh-deckseek-palette-list" aria-expanded="true" role="combobox" autoComplete="off" spellCheck={false} />
      </div>
      {list.length === 0
        ? <p className={css.paletteEmpty}>{ui('palette.empty')}</p>
        : <div className={css.paletteList} id="dsh-deckseek-palette-list" role="listbox" aria-label={ui('palette.title')}>
          {groups.map(group => <div key={group.group} className={css.paletteGroup}>
            <p className={css.paletteGroupLabel} aria-hidden="true">{group.group}</p>
            {group.commands.map(command => <button key={command.id} type="button" role="option" aria-selected={command.id === activeId}
              className={css.paletteItem} data-active={command.id === activeId || undefined}
              onMouseEnter={() => setActive(list.indexOf(command))} onClick={() => run(command)}>
              <span className={css.paletteLabel}>{command.label}</span>
              {command.hint !== undefined && <kbd className={css.paletteHint}>{command.hint}</kbd>}
            </button>)}
          </div>)}
        </div>}
      <p className={css.paletteNote} aria-hidden="true">{ui('help.note.palette')}</p>
    </div>
  </div>;
}

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { searchMatches, type SearchEntry } from './search-index.js';
import { ui } from './locale.js';
import css from './Reader.module.css';

/**
 * In-view search over user/assistant text. Matches navigate to the rendered
 * block (flashed briefly); the DSH session remains the source of truth.
 */
export const SearchPanel = memo(function SearchPanel({ root, index, onClose }: {
  root: RefObject<HTMLElement>; index: readonly SearchEntry[]; onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => searchMatches(index, query), [index, query]);
  const active = matches.length === 0 ? null : matches[cursor % matches.length]!;
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    const container = root.current;
    if (!container || !active) return;
    let target: HTMLElement | null = null;
    for (const element of Array.from(container.querySelectorAll<HTMLElement>('[data-reader-key]'))) {
      if (element.getAttribute('data-reader-key') === active.key) { target = element; break; }
    }
    if (!target) return;
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    target.classList.add(css.searchHit);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => target?.classList.remove(css.searchHit), 2000);
  }, [active, root]);

  const step = (delta: number) => {
    if (matches.length > 0) setCursor(value => (value + delta + matches.length) % matches.length);
  };

  return (
    <div className={css.searchRow} data-reader-search role="search">
      <input
        ref={input} className={css.searchInput} value={query}
        onChange={event => { setQuery(event.target.value); setCursor(0); }}
        placeholder={ui('reader.searchPlaceholder')}
        onKeyDown={event => {
          if (event.key === 'Enter') { event.preventDefault(); step(event.shiftKey ? -1 : 1); }
          else if (event.key === 'Escape') { onClose(); }
        }}
      />
      <span className={css.searchMeta} role="status">
        {query.trim() ? (matches.length === 0 ? ui('reader.searchNoMatches') : `${(cursor % matches.length) + 1} / ${matches.length}`) : ''}
      </span>
      <button type="button" className={css.textButton} disabled={matches.length === 0} title={ui('reader.searchPrevTitle')} onClick={() => step(-1)}>↑</button>
      <button type="button" className={css.textButton} disabled={matches.length === 0} title={ui('reader.searchNextTitle')} onClick={() => step(1)}>↓</button>
      <button type="button" className={css.textButton} onClick={onClose}>×</button>
    </div>
  );
});

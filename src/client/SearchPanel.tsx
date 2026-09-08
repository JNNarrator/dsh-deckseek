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
  const row = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => searchMatches(index, query), [index, query]);
  const active = matches.length === 0 ? null : matches[cursor % matches.length]!;
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);
  useEffect(() => {
    input.current?.focus();
    // Inserting the panel shifts the flow and the browser's scroll anchoring
    // compensates after this commit; wait two frames, then nudge the
    // conversation scroller only (never the host app's outer page scroll).
    let frame2 = 0;
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        const container = root.current;
        const rowEl = row.current;
        if (!container || !rowEl) return;
        const scroller = container.closest<HTMLElement>('[data-conversation-scroll]') ?? container;
        const clipped = rowEl.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
        if (clipped < 0) scroller.scrollTop += clipped;
      });
    });
    return () => { cancelAnimationFrame(frame1); cancelAnimationFrame(frame2); };
  }, []);
  useEffect(() => {
    const container = root.current;
    if (!container || !active) return;
    const owner = Array.from(container.querySelectorAll<HTMLElement>('[data-reader-key]'))
      .find(element => element.dataset.readerKey === active.key);
    if (!owner) return;
    // The owning message can be a huge article (process records included).
    // Descend to the smallest element that still contains the hit so the jump
    // and the flash always land on something the user can actually see.
    const needle = query.trim().toLowerCase();
    let target: HTMLElement = owner;
    for (;;) {
      const child = Array.from(target.children)
        .filter((node): node is HTMLElement => node instanceof HTMLElement && !!node.textContent && node.textContent.toLowerCase().includes(needle))[0];
      if (!child) break;
      target = child;
    }
    // Scroll the conversation port itself; scrollIntoView would also drag the
    // host app's outer page scroller and displace the whole shell.
    const scroller = container.closest<HTMLElement>('[data-conversation-scroll]') ?? container;
    const port = scroller.getBoundingClientRect();
    const box = target.getBoundingClientRect();
    scroller.scrollTop += box.top - port.top - Math.max(24, (port.height - box.height) / 2);
    target.classList.add(css.searchHit);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => target.classList.remove(css.searchHit), 2000);
  }, [active, root, query]);

  const step = (delta: number) => {
    if (matches.length > 0) setCursor(value => (value + delta + matches.length) % matches.length);
  };

  return (
    <div ref={row} className={css.searchRow} data-reader-search role="search">
      <input
        ref={input} className={css.searchInput} value={query} autoFocus
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
      <button type="button" className={css.textButton} disabled={matches.length === 0} aria-label={ui('reader.searchPrevTitle')} title={ui('reader.searchPrevTitle')} onClick={() => step(-1)}>↑</button>
      <button type="button" className={css.textButton} disabled={matches.length === 0} aria-label={ui('reader.searchNextTitle')} title={ui('reader.searchNextTitle')} onClick={() => step(1)}>↓</button>
      <button type="button" className={css.textButton} aria-label={ui('reader.searchClose')} title={ui('reader.searchClose')} onClick={onClose}>×</button>
    </div>
  );
});

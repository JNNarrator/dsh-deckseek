import { memo, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { ui } from './locale.js';
import type { RailItem } from './turn-rail.js';
import css from './Reader.module.css';

/**
 * Right-side turn rail, mirroring the native chat's navigation: one mark per
 * turn, the active mark follows the reading position, and a click scrolls the
 * turn into view. Sticky within the reading column; hidden on narrow widths.
 */
export const TurnRail = memo(function TurnRail({ root, items }: {
  root: RefObject<HTMLElement>; items: readonly RailItem[];
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const frame = useRef(0);

  useEffect(() => {
    const content = root.current;
    if (!content) return;
    const scroller = content.closest<HTMLElement>('[data-conversation-scroll]') ?? content;
    const update = () => {
      frame.current = 0;
      const threshold = scroller.getBoundingClientRect().top + 24;
      let current: string | null = null;
      for (const section of Array.from(content.querySelectorAll<HTMLElement>('[data-reader-turn]'))) {
        if (section.getBoundingClientRect().top <= threshold) current = section.dataset.readerTurn ?? null;
        else break;
      }
      setActiveKey(previous => previous === current ? previous : current);
    };
    const onScroll = () => { if (!frame.current) frame.current = requestAnimationFrame(update); };
    update();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame.current);
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [root, items]);

  if (items.length < 2) return null;

  const jump = (item: RailItem) => {
    const content = root.current;
    if (!content) return;
    for (const section of Array.from(content.querySelectorAll<HTMLElement>('[data-reader-turn]'))) {
      if (section.dataset.readerTurn === String(item.turn)) {
        section.scrollIntoView({ block: 'start', behavior: 'smooth' });
        setActiveKey(item.key);
        break;
      }
    }
  };

  return (
    <nav className={css.rail} aria-label={ui('rail.label')}>
      {items.map(item => {
        const tip = item.label ? `${ui('rail.jump', { turn: item.turn })} · ${item.label}` : ui('rail.jump', { turn: item.turn });
        return (
          <button
            key={item.key}
            type="button"
            className={css.railMark}
            data-active={item.key === activeKey || undefined}
            title={tip}
            aria-label={tip}
            onClick={() => jump(item)}
          />
        );
      })}
    </nav>
  );
});

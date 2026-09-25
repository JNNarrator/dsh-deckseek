import { memo } from 'react';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type {} from '@deepseek-ai/dsh-client-ui-settings/client';
import { SKIN_IDS, WORK_DETAIL_IDS } from '../skin.js';
import { skinHint, skinName, ui, workDetailHint, workDetailName } from './locale.js';
import type { DeckSeekSectionInjected } from './types.js';
import css from './DeckSeekSection.module.css';

export type DeckSeekSectionProps = PropsRuntime<'settings.section'> & DeckSeekSectionInjected;

export const DeckSeekSection = memo(function DeckSeekSection({
  useSkin, useWritable, setSkin, useWorkDetail, setWorkDetail,
}: DeckSeekSectionProps) {
  const skin = useSkin();
  const workDetail = useWorkDetail();
  const writable = useWritable();
  return <section className={css.section}>
    <h2 className={css.title}>{ui('settings.title')}</h2>
    <p className={css.subtitle}>{ui('settings.subtitle')}</p>
    <h3 className={css.label}>{ui('settings.appearance')}</h3>
    <div className={css.tiles} role="radiogroup" aria-label={ui('settings.appearance')}>
      {SKIN_IDS.map(id => <button key={id} type="button" role="radio" aria-checked={skin === id}
        data-skin={id} data-selected={skin === id || undefined} disabled={!writable}
        className={css.tile} onClick={() => { setSkin(id); }}>
        <span className={css.tileHead}>
          <span className={css.tileName}>{skinName(id)}</span>
          <span className={css.check} aria-hidden="true">✓</span>
        </span>
        <span className={css.tileHint}>{skinHint(id)}</span>
        <span className={css.preview} aria-hidden="true" data-preview={id}>
          <span className={css.pvUser} /><span className={css.pvCard} /><span className={css.pvAnswer} />
        </span>
      </button>)}
    </div>
    <h3 className={css.label}>{ui('settings.workDetail')}</h3>
    <p className={css.labelHint}>{ui('settings.workDetail.hint')}</p>
    <div className={css.tiles} data-work-detail role="radiogroup" aria-label={ui('settings.workDetail')}>
      {WORK_DETAIL_IDS.map(id => <button key={id} type="button" role="radio" aria-checked={workDetail === id}
        data-work-detail-option={id} data-selected={workDetail === id || undefined} disabled={!writable}
        className={css.tile} onClick={() => { setWorkDetail(id); }}>
        <span className={css.tileHead}>
          <span className={css.tileName}>{workDetailName(id)}</span>
          <span className={css.check} aria-hidden="true">✓</span>
        </span>
        <span className={css.tileHint}>{workDetailHint(id)}</span>
      </button>)}
    </div>
    {!writable && <p className={css.readonly} role="status">{ui('settings.readonly')}</p>}
  </section>;
});
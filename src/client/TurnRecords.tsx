import { memo } from 'react';
import { turnProcessLabel, turnTailStats, type TurnProcessData, type TurnTailData } from './turn-records.js';
import css from './Reader.module.css';

/**
 * Reading-view adapters for record kinds the native chat renders with its own
 * components. Each stays deliberately compact: the reading view folds process
 * detail away and keeps the final answer, so these rows summarize rather than
 * replicate the native chrome.
 */

/** System-prompt record: collapsed disclosure with the model-facing text. */
export const SystemPromptRow = memo(function SystemPromptRow({ text }: { text: string }) {
  return (
    <details className={css.systemPrompt} data-reader-anchor>
      <summary>系统提示词</summary>
      <pre className={css.systemPromptBody}>{text}</pre>
    </details>
  );
});

/** Turn-process record: one-line summary of the folded process evidence. */
export const TurnProcessMeta = memo(function TurnProcessMeta({ data }: { data: TurnProcessData }) {
  return <p className={css.turnProcess} data-reader-anchor>执行过程 · {turnProcessLabel(data)}</p>;
});

/** Turn-tail record: compact usage/time stats footer; null when nothing to show. */
export const TurnTailStats = memo(function TurnTailStats({ data }: { data: TurnTailData }) {
  const stats = turnTailStats(data);
  if (stats === null) return null;
  return <p className={css.turnTail} data-reader-anchor>{stats}</p>;
});

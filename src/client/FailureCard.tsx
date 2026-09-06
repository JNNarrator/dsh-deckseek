import { memo } from 'react';
import { JsonBlock } from '@deepseek-ai/dsh-client-ui-primitives';
import { truncatedJsonLabel } from './primitive-labels.js';
import css from './Reader.module.css';

/**
 * Consistent failure card for record rows that end in an error
 * (failed tools, failed commands, turn errors). Shows a title, the
 * failure reason, an optional short code, a hint line telling the user
 * where the full details live, and an expandable raw record.
 */
export const FailureCard = memo(function FailureCard({
  title, message, detail, code, note = '详情保留在执行记录中。', raw,
}: {
  title: string
  message?: string
  detail?: string
  code?: string
  note?: string
  raw?: unknown
}) {
  return (
    <div className={css.failure} role="alert" data-reader-anchor>
      <strong>{title}</strong>
      {message !== undefined && <p>{message}</p>}
      {detail !== undefined && <p className={css.failureDetail}>{detail}</p>}
      {code !== undefined && <code>{code}</code>}
      <p className={css.failureNote}>{note}</p>
      {raw !== undefined && <details className={css.detail}><summary>查看原始记录</summary>
        <JsonBlock label="原始记录" payload={raw as Record<string, unknown>} truncatedLabel={truncatedJsonLabel} />
      </details>}
    </div>
  );
});

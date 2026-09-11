import { memo } from 'react';
import { ui } from './locale.js';
import css from './Reader.module.css';

/**
 * Consistent failure card for record rows that end in an error
 * (failed tools, failed commands, turn errors). Shows a title, the
 * failure reason, an optional short code, an optional hint line telling the
 * user where the full details live, and an expandable raw record.
 */
export const FailureCard = memo(function FailureCard({
  title, message, detail, code, note, raw,
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
      <div className={css.failureHead}>
        <strong>{title}</strong>
        {code !== undefined && <code>{code}</code>}
      </div>
      {message !== undefined && <p>{message}</p>}
      {detail !== undefined && <p className={css.failureDetail}>{detail}</p>}
      {note !== undefined && <p className={css.failureNote}>{note}</p>}
      {raw !== undefined && <details className={css.detail}><summary>{ui('viewRawRecord')}</summary>
        <pre className={css.rawJson}>{JSON.stringify(raw, null, 2)}</pre>
      </details>}
    </div>
  );
});

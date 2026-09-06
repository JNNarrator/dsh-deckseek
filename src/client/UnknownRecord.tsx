import { memo, useCallback, useState } from 'react';
import { JsonBlock, writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives';
import { pickPreviewText, summarizeFields } from './unknown-record.js';
import { ui, unknownKindLabel } from './locale.js';
import { truncatedJsonLabel } from './primitive-labels.js';
import css from './Reader.module.css';

/**
 * Fallback for record kinds the reading view does not render natively
 * (unknown surface events, future kinds). Shows a friendly title, a content
 * preview when the payload is text-like, a compact field summary otherwise,
 * a copy action, and the full raw record on demand.
 */
export const UnknownRecord = memo(function UnknownRecord({ kind, data }: { kind: string; data: unknown }) {
  const [copied, setCopied] = useState(false);
  const preview = pickPreviewText(data);
  const summary = summarizeFields(data, count => ui('unknown.arrayItems', { count }));
  const raw = JSON.stringify(data, null, 2);
  const copy = useCallback(async () => {
    try {
      await writeClipboard(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable — the record stays reachable via JsonBlock.
    }
  }, [raw]);
  return (
    <div className={css.unknown} data-reader-anchor data-unknown-kind={kind}>
      <p>
        <strong>{unknownKindLabel(kind)}</strong>
        <span className={css.unknownKind}>{kind}</span>
      </p>
      {preview !== null && <pre className={css.unknownPreview}>{preview}</pre>}
      {preview === null && summary !== '' && <p className={css.unknownSummary}>{summary}</p>}
      <div className={css.unknownActions}>
        <JsonBlock label={ui('viewRawRecord')} payload={data as Record<string, unknown>} truncatedLabel={truncatedJsonLabel} />
        <button type="button" className={css.textButton} onClick={copy}>{copied ? ui('unknown.copied') : ui('unknown.copy')}</button>
      </div>
    </div>
  );
});

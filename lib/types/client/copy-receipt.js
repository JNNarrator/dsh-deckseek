import { useCallback, useEffect, useRef, useState } from 'react';
import { writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives';
import { ui } from './locale.js';
const RECEIPT_MS = 2000;
/**
 * Unified copy feedback: writes to the clipboard and shows a transient
 * `role="status"` receipt (success or failure) that clears itself. The timer
 * is cleaned up on unmount so a short-lived record card never leaves a
 * dangling timeout behind.
 */
export function useCopyReceipt(duration = RECEIPT_MS) {
    const [receipt, setReceipt] = useState('');
    const timer = useRef(null);
    useEffect(() => () => {
        if (timer.current)
            clearTimeout(timer.current);
    }, []);
    const copy = useCallback(async (text) => {
        let accepted = false;
        try {
            accepted = await writeClipboard(text);
        }
        catch {
            accepted = false;
        }
        setReceipt(accepted ? ui('copy.done') : ui('copy.failed'));
        if (timer.current)
            clearTimeout(timer.current);
        timer.current = setTimeout(() => setReceipt(''), duration);
    }, [duration]);
    return { receipt, copy };
}
//# sourceMappingURL=copy-receipt.js.map
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component, Fragment, memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { JsonBlock, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives';
import { McpAppFrame } from './McpAppFrame.js';
import { markdownLabels, truncatedJsonLabel } from './primitive-labels.js';
import { ui } from './locale.js';
import { useStreamingText } from './streaming.js';
import { MotionMarkdown, MotionPlainText } from './word-motion.js';
import { useLiveAnnounce } from './announce.js';
import { useCopyReceipt } from './copy-receipt.js';
import css from './Reader.module.css';
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
export class BlockBoundary extends Component {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() {
        return this.state.failed ? _jsx("div", { className: css.notice, children: ui('block.unavailable') }) : this.props.children;
    }
}
export const ImageBlock = memo(function ImageBlock({ attachment, loadImage }) {
    const [attempt, setAttempt] = useState(0);
    const [url, setUrl] = useState(null);
    const [error, setError] = useState(false);
    const [decoded, setDecoded] = useState(false);
    const dialog = useRef(null);
    const opener = useRef(null);
    useEffect(() => {
        let active = true;
        let owned = null;
        const timeout = setTimeout(() => { if (active) {
            setError(true);
            active = false;
        } }, 20000);
        setError(false);
        setDecoded(false);
        setUrl(null);
        void loadImage(attachment).then(result => {
            if (!active)
                return;
            clearTimeout(timeout);
            if (!IMAGE_TYPES.has(result.mediaType))
                throw new Error('Unsupported image media type');
            const bytes = Uint8Array.from(result.data);
            owned = URL.createObjectURL(new Blob([bytes.buffer], { type: result.mediaType }));
            setUrl(owned);
        }).catch(() => { clearTimeout(timeout); if (active)
            setError(true); });
        return () => { active = false; clearTimeout(timeout); if (owned)
            URL.revokeObjectURL(owned); };
    }, [attachment.attachmentId, attempt, loadImage]);
    const width = Number.isFinite(attachment.width) && attachment.width > 0 ? attachment.width : 4;
    const height = Number.isFinite(attachment.height) && attachment.height > 0 ? attachment.height : 3;
    return _jsxs("figure", { className: css.imageFigure, "data-reader-image": true, "data-image-state": error ? 'error' : decoded ? 'ready' : 'loading', children: [_jsxs("div", { className: css.imageFrame, style: { aspectRatio: `${width} / ${height}` }, children: [!error && url && _jsx("button", { ref: opener, type: "button", className: css.imageOpen, "aria-label": attachment.name ? ui('image.zoomWithName', { name: attachment.name }) : ui('image.zoom'), onClick: () => dialog.current?.showModal(), children: _jsx("img", { src: url, alt: attachment.name ?? ui('image.alt'), width: width, height: height, onLoad: () => setDecoded(true), onError: () => setError(true), "data-ready": decoded }) }), (!decoded || error) && _jsxs("div", { className: css.imagePlaceholder, children: [_jsx("span", { children: error ? ui('image.failed') : ui('image.loading') }), error && _jsx("button", { type: "button", className: css.textButton, onClick: () => setAttempt(value => value + 1), children: ui('image.retry') })] })] }), attachment.name && _jsx("figcaption", { children: attachment.name }), _jsxs("dialog", { ref: dialog, className: css.imageDialog, "aria-label": ui('image.preview'), onClose: () => opener.current?.focus(), onClick: event => { if (event.target === dialog.current)
                    dialog.current?.close(); }, children: [_jsx("button", { type: "button", autoFocus: true, className: css.dialogClose, "aria-label": ui('image.closePreview'), onClick: () => dialog.current?.close(), children: "\u00D7" }), url && _jsx("img", { src: url, alt: attachment.name ?? ui('image.alt') })] })] });
});
export function contentBlocks(content) {
    return content.map(block => {
        if (block.type === 'text')
            return { kind: 'text', text: block.text };
        if (block.type === 'image')
            return { kind: 'image', attachment: block.attachment };
        return { kind: 'other', block };
    });
}
function ReadingMarkdown({ text, streaming, holdFormatting, startedAt, interrupted = false, liveText = false, kind = 'body' }) {
    const root = useRef(null);
    const presentation = useStreamingText(text, streaming, { startedAt, interrupted: interrupted || !liveText, selected: holdFormatting });
    const announced = useLiveAnnounce(presentation.text);
    // Native Markdown changes block keys for its full final parse. Keep the last
    // committed mode while this answer is selected, then finish formatting on
    // deselection. Business status and the source text still update normally.
    const committedMode = useRef(streaming);
    const effectiveMode = holdFormatting ? committedMode.current : presentation.formatStreaming;
    useLayoutEffect(() => { committedMode.current = effectiveMode; }, [effectiveMode]);
    return _jsxs("div", { ref: root, className: css.readingText, "data-reader-text": true, "data-reader-text-kind": kind, "data-received-length": text.length, "data-shown-length": presentation.text.length, "data-presentation-pending": presentation.pending || undefined, "data-motion-style": "opacity-blur", "data-ud-motion": "reader-text-arrival", "data-ud-motion-type": "reveal", "data-ud-motion-no-flash": "true", children: [_jsx(MotionMarkdown, { text: presentation.text, streaming: effectiveMode, enabled: liveText && presentation.reveal && effectiveMode, revision: presentation.revision }), _jsx("span", { className: css.srOnly, role: "log", "aria-live": "polite", children: announced.join('\n') })] });
}
function ReadingReasoning({ text, streaming, holdFormatting, startedAt, interrupted = false, liveText = false }) {
    const presentation = useStreamingText(text, streaming, { startedAt, interrupted: interrupted || !liveText, selected: holdFormatting });
    return _jsx("div", { className: css.readingText, "data-reader-text": true, "data-reader-text-kind": "reasoning", "data-received-length": text.length, "data-shown-length": presentation.text.length, "data-presentation-pending": presentation.pending || undefined, "data-motion-style": "opacity-blur", "data-ud-motion": "reader-text-arrival", "data-ud-motion-type": "reveal", "data-ud-motion-no-flash": "true", children: _jsx(MotionPlainText, { text: presentation.text, enabled: liveText && presentation.reveal, revision: presentation.revision }) });
}
function fallback(block, streaming, source, loadImage, holdFormatting, presentation) {
    switch (block.kind) {
        case 'text': return source === 'user' ? _jsx(MarkdownText, { text: block.text, labels: markdownLabels }) : _jsx(ReadingMarkdown, { text: block.text, streaming: streaming, holdFormatting: holdFormatting, ...presentation });
        case 'image': return _jsx(ImageBlock, { attachment: block.attachment, loadImage: loadImage });
        case 'reasoning': return _jsx(ReadingReasoning, { text: block.text, streaming: streaming, holdFormatting: holdFormatting, ...presentation });
        case 'tool-call': return _jsx(JsonBlock, { label: ui('tool.argsLabel', { name: block.name }), payload: block.argsRaw, truncatedLabel: truncatedJsonLabel });
        case 'other': {
            const raw = block.block;
            if (raw && typeof raw === 'object') {
                const item = raw;
                if ((item.type === 'mcp-app' || item.type === 'mcpapp' || item.type === 'ui') && typeof item.html === 'string') {
                    return _jsx(McpAppFrame, { html: item.html, title: typeof item.title === 'string' ? item.title : undefined });
                }
            }
            return _jsxs("div", { className: css.unknown, children: [_jsx("p", { children: ui('block.unsupported') }), _jsx(JsonBlock, { label: ui('viewRawContent'), payload: block.block, truncatedLabel: truncatedJsonLabel })] });
        }
    }
}
export const Blocks = memo(function Blocks({ blocks, streaming = false, source = 'assistant', holdFormatting = false, startedAt, interrupted, liveText, renderSlotChain, loadImage }) {
    return _jsx("div", { className: css.blocks, "data-streaming": streaming || undefined, "aria-busy": streaming || undefined, children: blocks.map((block, index) => _jsx(BlockBoundary, { children: _jsx(Fragment, { children: renderSlotChain('dsh-deckseek.block', { block, streaming, source }, { fallback: fallback(block, streaming, source, loadImage, holdFormatting, { startedAt, interrupted, liveText }) }) }) }, block.kind === 'image' ? `image:${block.attachment.attachmentId}:${index}` : `${index}:${block.kind}`)) });
});
export function CopyAnswer({ blocks }) {
    const { receipt, copy } = useCopyReceipt();
    const text = blocks.filter((block) => block.kind === 'text').map(block => block.text).join('\n\n');
    if (!text.trim())
        return null;
    return _jsxs("div", { className: css.answerActions, children: [_jsx("button", { type: "button", className: css.iconButton, "aria-label": ui('copy.answer'), title: ui('copy.answer'), onClick: () => void copy(text), children: _jsxs("svg", { viewBox: "0 0 16 16", width: "16", height: "16", "aria-hidden": "true", children: [_jsx("rect", { x: "5", y: "5", width: "8", height: "8", rx: "1.5" }), _jsx("path", { d: "M3 10H2.8A.8.8 0 0 1 2 9.2V2.8a.8.8 0 0 1 .8-.8h6.4a.8.8 0 0 1 .8.8V3" })] }) }), _jsx("span", { role: "status", className: css.meta, children: receipt })] });
}
//# sourceMappingURL=Blocks.js.map
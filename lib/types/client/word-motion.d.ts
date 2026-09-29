import type { MarkdownFileMentions } from './markdown/MarkdownText.js';
/** Native Think is literal text, not Markdown. Spans never alter its bytes. */
export declare function MotionPlainText({ text, enabled, revision }: {
    text: string;
    enabled: boolean;
    revision: number;
}): import("react").JSX.Element;
/** Native DSH Markdown semantics with a stable text-leaf animation hook. */
export declare function MotionMarkdown({ text, streaming, enabled, revision, fileMentions }: {
    text: string;
    streaming: boolean;
    enabled: boolean;
    revision: number; /** Produced-file resolver for this turn; absent leaves inline code inert. */
    fileMentions?: MarkdownFileMentions | undefined;
}): import("react").JSX.Element;
//# sourceMappingURL=word-motion.d.ts.map
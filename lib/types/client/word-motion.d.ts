/** Native Think is literal text, not Markdown. Spans never alter its bytes. */
export declare function MotionPlainText({ text, enabled, revision }: {
    text: string;
    enabled: boolean;
    revision: number;
}): import("react").JSX.Element;
/** Native DSH Markdown semantics with a stable text-leaf animation hook. */
export declare function MotionMarkdown({ text, streaming, enabled, revision }: {
    text: string;
    streaming: boolean;
    enabled: boolean;
    revision: number;
}): import("react").JSX.Element;
//# sourceMappingURL=word-motion.d.ts.map
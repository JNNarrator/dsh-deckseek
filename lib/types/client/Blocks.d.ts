import { Component } from 'react';
import type { ReactNode } from 'react';
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
import type { AssistantBlock, UserMessageNode } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { BlockRenderProps, ReaderBlockOwner } from './types.js';
export declare class BlockBoundary extends Component<{
    children: ReactNode;
}, {
    failed: boolean;
}> {
    state: {
        failed: boolean;
    };
    static getDerivedStateFromError(): {
        failed: boolean;
    };
    render(): string | number | boolean | import("react").JSX.Element | Iterable<ReactNode> | null | undefined;
}
export declare const ImageBlock: import("react").MemoExoticComponent<({ attachment, loadImage }: {
    attachment: ImageAttachmentRef;
    loadImage: BlockRenderProps["loadImage"];
}) => import("react").JSX.Element>;
export declare function contentBlocks(content: UserMessageNode['content']): AssistantBlock[];
type TextPresentation = {
    startedAt?: number;
    interrupted?: boolean;
    liveText?: boolean;
};
export declare const Blocks: import("react").MemoExoticComponent<({ blocks, streaming, source, holdFormatting, startedAt, interrupted, liveText, renderSlotChain, loadImage }: BlockRenderProps & TextPresentation & {
    blocks: readonly AssistantBlock[];
    streaming?: boolean;
    source?: ReaderBlockOwner["source"];
    holdFormatting?: boolean;
}) => import("react").JSX.Element>;
export declare function CopyAnswer({ blocks }: {
    blocks: readonly AssistantBlock[];
}): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=Blocks.d.ts.map
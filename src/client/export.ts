import type { AssistantBlock, UserMessageNode } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';
import { ui } from './locale.js';

/**
 * Markdown export for the reading view: user prompts and assistant answers in
 * display order, extracted with the same walk the search index uses — so the
 * file mirrors what the reading view shows, with the folded process (tools,
 * reasoning, compactions) left out and only the answer text kept.
 */

function contentText(content: UserMessageNode['content']): string {
  return content
    .map(item => item.type === 'text' && typeof (item as { text?: unknown }).text === 'string'
      ? (item as { text: string }).text
      : '')
    .filter(Boolean)
    .join('\n\n');
}

function blocksText(blocks: readonly AssistantBlock[]): string {
  return blocks
    .filter((block): block is Extract<AssistantBlock, { kind: 'text' }> => block.kind === 'text')
    .map(block => block.text)
    .join('\n\n');
}

export function buildExportMarkdown(order: readonly string[], get: (key: string) => ChatConversationViewNode | undefined, now = new Date()): string {
  const sections: string[] = [];
  // Assistant steps stream in pieces (narration, then the final answer): run
  // them together under one heading so a single turn exports as one answer.
  let lastLabel: string | null = null;
  const push = (label: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (lastLabel === label && sections.length > 0) sections[sections.length - 1] += `\n\n${trimmed}`;
    else sections.push(`## ${label}\n\n${trimmed}`);
    lastLabel = label;
  };
  for (const key of order) {
    const node = get(key);
    if (!node || node.visibility === 'hidden') continue;
    if (node.kind === 'user' || node.kind === 'steering') {
      const content = (node.data as { content?: UserMessageNode['content'] }).content ?? [];
      push(node.kind === 'steering' ? ui('export.steering') : ui('export.user'), contentText(content));
    } else if (node.kind === 'assistant-step') {
      const blocks = (node.data as { blocks?: readonly AssistantBlock[] }).blocks ?? [];
      push(ui('export.assistant'), blocksText(blocks));
    }
  }
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return [`# ${ui('export.heading')} · ${stamp}`, ...sections].join('\n\n');
}

/** Download filename for the export, safe across filesystems (no separators). */
export function exportFileName(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `deckseek-export-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.md`;
}

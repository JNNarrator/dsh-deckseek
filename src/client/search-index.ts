import type { AssistantBlock, UserMessageNode } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';

/** One searchable text entry for the reading view, in display order. */
export interface SearchEntry {
  readonly key: string
  readonly kind: 'user' | 'assistant'
  readonly text: string
  readonly turn: number | undefined
}

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

function turnOf(node: ChatConversationViewNode): number | undefined {
  const location = node.location;
  if (location.kind === 'turn' || location.kind === 'step') return location.turn;
  return undefined;
}

/** Collect searchable user/assistant text from a chat snapshot, in display order. */
export function buildSearchIndex(order: readonly string[], get: (key: string) => ChatConversationViewNode | undefined): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const key of order) {
    const node = get(key);
    if (!node || node.visibility === 'hidden') continue;
    if (node.kind === 'user' || node.kind === 'steering') {
      const content = (node.data as { content?: UserMessageNode['content'] }).content ?? [];
      const text = contentText(content);
      if (text.trim()) entries.push({ key, kind: 'user', text, turn: turnOf(node) });
    } else if (node.kind === 'assistant-step') {
      const blocks = (node.data as { blocks?: readonly AssistantBlock[] }).blocks ?? [];
      const text = blocksText(blocks);
      if (text.trim()) entries.push({ key, kind: 'assistant', text, turn: turnOf(node) });
    }
  }
  return entries;
}

/** One match: the owning node key, hit count, and a snippet around the first hit. */
export interface SearchMatch {
  readonly key: string
  readonly count: number
  readonly snippet: string
}

const SNIPPET_RADIUS = 24;

/** Case-insensitive substring matches with a snippet around the first hit. */
export function searchMatches(entries: readonly SearchEntry[], query: string): SearchMatch[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const matches: SearchMatch[] = [];
  for (const entry of entries) {
    const haystack = entry.text.toLowerCase();
    let count = 0;
    let first = -1;
    let from = 0;
    for (;;) {
      const index = haystack.indexOf(needle, from);
      if (index === -1) break;
      if (first === -1) first = index;
      count += 1;
      from = index + needle.length;
    }
    if (count === 0) continue;
    const start = Math.max(0, first - SNIPPET_RADIUS);
    const end = Math.min(entry.text.length, first + needle.length + SNIPPET_RADIUS);
    const snippet = entry.text.slice(start, end).replace(/\s+/g, ' ').trim();
    matches.push({ key: entry.key, count, snippet });
  }
  return matches;
}

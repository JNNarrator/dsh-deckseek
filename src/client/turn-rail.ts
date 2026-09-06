import type { UserMessageNode } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';
import type { ReaderGroup } from './projection.js';

/** One right-rail mark: the turn section to jump to and a short prompt preview. */
export interface RailItem {
  readonly key: string
  readonly turn: number
  readonly label: string
}

function promptOf(node: ChatConversationViewNode | undefined): string {
  if (!node || (node.kind !== 'user' && node.kind !== 'steering')) return '';
  const content = (node.data as { content?: UserMessageNode['content'] }).content ?? [];
  return content
    .map(item => item.type === 'text' && typeof (item as { text?: unknown }).text === 'string'
      ? (item as { text: string }).text
      : '')
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Right-rail marks for every turn group, in display order, with prompt previews. */
export function buildRailItems(groups: readonly ReaderGroup[], get: (key: string) => ChatConversationViewNode | undefined): RailItem[] {
  const items: RailItem[] = [];
  for (const group of groups) {
    if (group.turn === null) continue;
    let label = '';
    for (const key of group.keys) {
      label = promptOf(get(key));
      if (label) break;
    }
    items.push({ key: group.key, turn: group.turn, label: label.length > 28 ? `${label.slice(0, 27)}…` : label });
  }
  return items;
}

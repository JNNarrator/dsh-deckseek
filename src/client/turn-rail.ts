import type { UserMessageNode } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';

/** One right-rail row: a user message to jump to and its short title. */
export interface RailItem {
  readonly key: string
  readonly turn: number | null
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

/**
 * Right-rail rows for every user/steering message in display order: one row
 * per message with the message text as its title. Long titles are trimmed;
 * the row itself ellipsizes within the rail.
 */
export function buildRailItems(order: readonly string[], get: (key: string) => ChatConversationViewNode | undefined): RailItem[] {
  const items: RailItem[] = [];
  for (const key of order) {
    const node = get(key);
    if (!node || node.visibility === 'hidden') continue;
    if (node.kind !== 'user' && node.kind !== 'steering') continue;
    const turn = node.location.kind === 'turn' || node.location.kind === 'step' ? node.location.turn.turn : null;
    const label = promptOf(node);
    items.push({ key, turn, label: label.length > 64 ? `${label.slice(0, 63)}…` : label });
  }
  return items;
}

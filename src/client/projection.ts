import type { AssistantBlock, ToolCallBlock, TurnLocation } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { AssistantChatData, ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';
import { executionFacts } from './tool-activity.js';
import { currentLocale, ui, uiIn, type UiLang } from './locale.js';

export interface ReaderGroup { key: string; turn: number | null; keys: readonly string[] }
export interface TurnBoundary { status: 'open' | 'closed' | 'unknown'; reason: string | null; latestStep: number; closingStep: number | null }

// Run on structural publication, not on each text delta. Node seats subscribe by key.
export function groupNodes(order: readonly string[], get: (key: string) => ChatConversationViewNode | undefined): ReaderGroup[] {
  const groups: ReaderGroup[] = [];
  const seenTurns = new Set<number>();
  for (const key of order) {
    const node = get(key);
    if (!node || node.visibility === 'hidden') continue;
    const turn = node.location.kind === 'step' || node.location.kind === 'turn' ? node.location.turn.turn : null;
    const previous = groups.at(-1);
    if (turn !== null && previous?.turn === turn) {
      (previous.keys as string[]).push(key);
    } else {
      groups.push({ key: turn === null ? `node:${key}` : seenTurns.has(turn) ? `turn:${turn}:${key}` : `turn:${turn}`, turn, keys: [key] });
      if (turn !== null) seenTurns.add(turn);
    }
  }
  return groups;
}

export function boundaryOf(turn: TurnLocation | undefined): TurnBoundary {
  return {
    status: turn?.status ?? 'unknown',
    reason: turn?.end?.data.reason.kind ?? null,
    latestStep: turn?.steps.at(-1)?.step ?? -1,
    closingStep: turn?.data.get('turn-tail')?.closing?.step ?? null,
  };
}

export function isEarlierNarration(data: AssistantChatData, boundary: TurnBoundary): boolean {
  // New body text, a tool call, or a settled step is not a completed turn.
  if (data.status !== 'settled' || boundary.status !== 'closed' || boundary.reason !== 'completed') return false;
  if (data.blocks.some(block => block.kind === 'image' || block.kind === 'other')) return false;
  return boundary.closingStep !== null && data.step < boundary.closingStep;
}

export function processExpanded(choice: boolean | undefined, boundary: TurnBoundary): boolean {
  return choice ?? !(boundary.status === 'closed' && boundary.reason === 'completed');
}

/** Reading while running must not pin the process open after completion. */
export function processChoiceKey(groupKey: string, boundary: TurnBoundary): string {
  return `${groupKey}:${boundary.status}:${boundary.reason ?? 'pending'}`;
}

/** A body-only assistant step is not a thinking/process disclosure. */
export function hasProcessContent(node: ChatConversationViewNode | undefined, boundary: TurnBoundary): boolean {
  if (!node || node.visibility === 'hidden') return false;
  if (node.kind === 'assistant-step') {
    const data = node.data as AssistantChatData;
    return data.blocks.some(block => block.kind === 'reasoning' && block.text.trim() !== '')
      || (isEarlierNarration(data, boundary) && hasVisibleBody(data.blocks));
  }
  return node.kind === 'context' || node.kind === 'model-retry'
    || node.kind === 'command' || node.kind === 'manual-compaction';
}

export function hasVisibleBody(blocks: readonly AssistantBlock[]): boolean {
  return blocks.some(block => block.kind === 'image' || block.kind === 'other' || (block.kind === 'text' && block.text.trim() !== ''));
}

/** Keep native block order. In particular, never lift a later Think above text. */
export function assistantSegments(blocks: readonly AssistantBlock[]): { kind: 'reasoning' | 'body'; start: number; blocks: AssistantBlock[] }[] {
  const segments: ReturnType<typeof assistantSegments> = [];
  let previous: ReturnType<typeof assistantSegments>[number] | undefined;
  blocks.forEach((block, index) => {
    if (block.kind === 'tool-call') { previous = undefined; return; }
    const kind = block.kind === 'reasoning' ? 'reasoning' : 'body';
    if (previous?.kind === kind) previous.blocks.push(block);
    else {
      previous = { kind, start: index, blocks: [block] };
      segments.push(previous);
    }
  });
  return segments;
}

export function toolFailed(block: ToolCallBlock): boolean {
  const { exitCode, signal } = executionFacts(block);
  return ('kind' in block && block.isError) || !!signal || (exitCode !== undefined && exitCode !== 0) || block.subCalls.some(toolFailed);
}

export function toolName(block: ToolCallBlock): string {
  return 'kind' in block ? block.call?.name ?? ui('tool.others') : block.name;
}

export function terminalLabel(reason: string | null, lang: UiLang = currentLocale()): string | null {
  switch (reason) {
    case 'completed': return null;
    case 'aborted': case 'interrupted': return uiIn(lang, 'terminal.stopped');
    case 'blocked': return uiIn(lang, 'terminal.blocked');
    case 'max-tokens': return uiIn(lang, 'terminal.maxTokens');
    case 'error': return uiIn(lang, 'terminal.error');
    case null: return null;
    default: return uiIn(lang, 'terminal.unknown', { reason });
  }
}

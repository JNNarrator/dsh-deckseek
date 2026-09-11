import type { AssistantBlock, ToolCallBlock, TurnLocation } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { ReaderGroup } from './projection.js';
import { currentLocale, uiIn, type UiLang } from './locale.js';

export type ToolDraft = Extract<AssistantBlock, { kind: 'tool-call' }>;
export type ToolPhase = 'preparing' | 'running' | 'returned' | 'succeeded' | 'failed' | 'interrupted';
export type ToolCategory = 'write' | 'read' | 'terminal' | 'search' | 'web' | 'other';
export interface ToolActivityEntry {
  kind: 'tool'; key: string; callId: string; step: number; order: number;
  draft?: ToolDraft; block?: ToolCallBlock;
}
export type ReaderFlowEntry = ToolActivityEntry | { kind: 'node'; key: string; nodeKey: string; order: number };

/** Public Step data includes tool-only model output before a chat node exists. */
export function readerFlow(group: ReaderGroup, turn: TurnLocation | undefined, get: (key: string) => ChatConversationViewNode | undefined): ReaderFlowEntry[] {
  const flow: ReaderFlowEntry[] = [];
  const calls = new Map<string, ToolActivityEntry>();
  const assistantOrder = new Map<number, number>();
  for (const key of group.keys) {
    const node = get(key);
    if (!node || node.visibility === 'hidden') continue;
    const step = node.location.kind === 'step' ? node.location.step.step : 0;
    if (node.kind === 'tool-call') {
      const block = (node.data as { root: ToolCallBlock }).root;
      calls.set(block.callId, { kind: 'tool', key: `reader-tool:${block.callId}`, callId: block.callId, step, block, order: node.anchorSeq });
    } else {
      flow.push({ kind: 'node', key, nodeKey: key, order: node.anchorSeq });
      if (node.kind === 'assistant-step') assistantOrder.set(step, node.anchorSeq);
    }
  }
  for (const step of turn?.steps ?? []) {
    const data = step.data.get('assistant-step');
    let index = 0;
    for (const draft of data?.blocks ?? []) {
      if (draft.kind !== 'tool-call' || !draft.callId) continue;
      const previous = calls.get(draft.callId);
      calls.set(draft.callId, previous ? { ...previous, draft } : {
        kind: 'tool', key: `reader-tool:${draft.callId}`, callId: draft.callId, step: step.step, draft,
        order: (assistantOrder.get(step.step) ?? step.start?.seq ?? 0) + .01 + index++ / 10000,
      });
    }
  }
  flow.push(...calls.values());
  return flow.sort((left, right) => left.order - right.order);
}

export function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
export function stringValue(record: Record<string, unknown> | null, ...keys: string[]): string | undefined {
  for (const key of keys) if (typeof record?.[key] === 'string' && record[key]) return record[key] as string;
  return undefined;
}

/** Read only top-level JSON string values, including an unfinished final string.
 * This never executes input or mistakes escaped/nested content for a path field. */
export function inputFields(raw: string): Record<string, unknown> {
  try { return objectValue(JSON.parse(raw)) ?? {}; } catch { /* an in-flight argument is normally incomplete */ }
  const fields: Record<string, unknown> = Object.create(null);
  const prefix = raw.slice(0, 262144);
  let depth = 0;
  let key: string | undefined;
  for (let index = 0; index < prefix.length; index++) {
    const char = prefix[index];
    if (char === '{' || char === '[') { depth++; continue; }
    if (char === '}' || char === ']') { depth--; continue; }
    if (char !== '"') continue;
    const start = index;
    let closed = false;
    for (index++; index < prefix.length; index++) {
      if (prefix[index] === '\\') { index++; continue; }
      if (prefix[index] === '"') { closed = true; break; }
    }
    if (depth !== 1) continue;
    const token = prefix.slice(start, closed ? index + 1 : prefix.length);
    let value: string;
    try { value = JSON.parse(token); } catch {
      if (closed) continue;
      // Strip only an unfinished trailing escape/unicode escape, not content.
      let body = token.slice(1);
      const unicode = /(?<!\\)(?:\\\\)*\\u[\da-f]{0,3}$/i.exec(body);
      if (unicode) body = body.slice(0, unicode.index) + unicode[0].replace(/\\u[\da-f]{0,3}$/i, '');
      let slashes = 0; for (let end = body.length - 1; end >= 0 && body[end] === '\\'; end--) slashes++;
      if (slashes % 2) body = body.slice(0, -1);
      try { value = JSON.parse(`"${body}"`); } catch { continue; }
    }
    if (closed && /^\s*:/.test(prefix.slice(index + 1))) key = value;
    else if (key !== undefined) { fields[key] = value; key = undefined; }
  }
  return fields;
}

export function toolIdentity(entry: Pick<ToolActivityEntry, 'block' | 'draft'>) {
  const block = entry.block;
  return {
    name: block ? 'kind' in block ? block.call?.name ?? entry.draft?.name ?? uiIn(currentLocale(), 'tool.others') : block.name : entry.draft?.name ?? uiIn(currentLocale(), 'tool.others'),
    raw: block ? 'kind' in block ? block.call?.argsRaw ?? entry.draft?.argsRaw ?? '' : block.argsRaw : entry.draft?.argsRaw ?? '',
  };
}

export function executionFacts(block: ToolCallBlock | undefined): { exitCode?: number; signal?: string } {
  if (!block || !('kind' in block)) return {};
  const meta = objectValue(block.meta);
  const code = meta?.exitCode ?? meta?.exit_code;
  const text = block.content.length === 1 && block.content[0]?.type === 'text' ? block.content[0].text : '';
  const exit = /\n\[exit code: (\d+)\]$/.exec(text);
  const signal = /\n\[killed by signal: ([^\]\n]+)\]$/.exec(text);
  const parsedCode = exit?.[1] === undefined ? undefined : Number(exit[1]);
  return {
    exitCode: typeof code === 'number' && Number.isFinite(code) ? code : parsedCode,
    signal: stringValue(meta, 'signal') ?? signal?.[1],
  };
}

export function activityPhase(entry: Pick<ToolActivityEntry, 'block' | 'draft'>, turnClosed = false): ToolPhase {
  if (!entry.block) return turnClosed ? 'interrupted' : 'preparing';
  if (!('kind' in entry.block)) return turnClosed ? 'interrupted' : 'running';
  const facts = executionFacts(entry.block);
  if (entry.block.isError || facts.signal || (facts.exitCode !== undefined && facts.exitCode !== 0)
    || entry.block.subCalls.some(block => activityPhase({ block }, turnClosed) === 'failed')) return 'failed';
  if (facts.exitCode === 0) return 'succeeded';
  return 'returned';
}

export function activitySummary(entry: Pick<ToolActivityEntry, 'block' | 'draft'>, lang: UiLang = currentLocale()) {
  const { name, raw } = toolIdentity(entry);
  const args = inputFields(raw);
  const target = stringValue(args, 'file_path', 'path', 'filename', 'filePath');
  const command = stringValue(args, 'command', 'cmd', 'script');
  const description = stringValue(args, 'description');
  const file = target?.split(/[/\\]/).at(-1);
  const category: ToolCategory = /^(write|edit|apply_patch|patch|str_replace_editor)$/.test(name) ? 'write'
    : /^(read|read_file)$/.test(name) ? 'read'
    : /^(bash|shell|terminal|terminal_send|exec_command|pwsh)$/.test(name) ? 'terminal'
    : /^(grep|glob|find|search)$/.test(name) ? 'search'
    : /^(web_search|web_fetch|web_open)$/.test(name) ? 'web' : 'other';
  const title = category === 'write' ? `${name === 'write' ? uiIn(lang, 'tool.write') : uiIn(lang, 'tool.edit')}${file ? ` ${file}` : name === 'apply_patch' ? uiIn(lang, 'tool.patch') : uiIn(lang, 'tool.file')}`
    : category === 'read' ? `${uiIn(lang, 'tool.read')}${file ? ` ${file}` : uiIn(lang, 'tool.file')}`
    : category === 'terminal' ? description || uiIn(lang, 'tool.runCommand')
    : category === 'search' ? name === 'glob' ? uiIn(lang, 'tool.findFiles') : uiIn(lang, 'tool.searchContent')
    : category === 'web' ? name === 'web_search' ? uiIn(lang, 'tool.searchWeb') : uiIn(lang, 'tool.readWeb')
    : name;
  return { name, raw, args, category, title, target: target ?? command ?? stringValue(args, 'query', 'pattern', 'url'), command,
    cwd: stringValue(args, 'workdir', 'cwd'), content: stringValue(args, 'content', 'new_string', 'newText', 'file_text') };
}

export function preparingLabel(name: string, lang: UiLang = currentLocale()): string {
  return /^(write|edit|apply_patch)$/.test(name) ? uiIn(lang, 'tool.prepareWrite') : /^(bash|shell|exec_command|pwsh)$/.test(name) ? uiIn(lang, 'tool.prepareTerminal') : uiIn(lang, 'tool.prepareInput');
}

/** First non-empty text payload of a failed tool result, clamped for inline preview. */
export function toolFailureText(block: ToolCallBlock): string | null {
  if (!('kind' in block) || !Array.isArray(block.content)) return null;
  for (const item of block.content) {
    if (item.type !== 'text') continue;
    const text = item.text.trim().replace(/\n\[(?:exit code|killed by signal)[^\n]*\]$/, '').trim();
    if (text) return text.length > 240 ? `${text.slice(0, 239)}…` : text;
  }
  return null;
}

/** Exit-code and signal line for a failed tool, or null when the result carries neither. */
export function toolFailureFacts(block: ToolCallBlock, lang: UiLang = currentLocale()): string | null {
  const facts = executionFacts(block);
  const parts: string[] = [];
  if (facts.exitCode !== undefined) parts.push(uiIn(lang, 'failure.exitCode', { code: facts.exitCode }));
  if (facts.signal) parts.push(uiIn(lang, 'failure.signal', { signal: facts.signal }));
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * Title for a failed tool's card: the generic failure title plus the tool name
 * when the call declared one, so the name never needs a line of its own.
 */
export function toolFailureTitle(block: ToolCallBlock, lang: UiLang = currentLocale()): string {
  const title = uiIn(lang, 'failure.toolTitle');
  const name = 'kind' in block ? block.call?.name : block.name;
  return name ? `${title} · ${name}` : title;
}

/** Category-aware tool state label: start (preparing/running) and end (succeeded/returned) per tool family. */
export function toolStateLabel(category: ToolCategory, phase: ToolPhase, lang: UiLang = currentLocale()): string {
  if (phase === 'preparing' || phase === 'running') return uiIn(lang, `tool.state.${category}Running`);
  if (phase === 'succeeded' || phase === 'returned') return uiIn(lang, `tool.state.${category}Done`);
  if (phase === 'failed') return uiIn(lang, 'tool.phaseFailed');
  if (phase === 'interrupted') return uiIn(lang, 'tool.phaseInterrupted');
  return uiIn(lang, 'tool.state.otherRunning');
}

/** Line counts per distinct line, for multiset line differences. */
function lineCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  if (text === '') return counts;
  for (const line of text.split('\n')) counts.set(line, (counts.get(line) ?? 0) + 1);
  return counts;
}

/**
 * Line-level +added/-removed counts over diff hunks (per-hunk multiset line
 * difference) — the numbers the native write/edit rows show as "+N -M".
 * @returns null when the hunks carry no line changes.
 */
export function diffStat(hunks: readonly { oldText: string | null; newText: string }[]): { added: number; removed: number } | null {
  let added = 0;
  let removed = 0;
  for (const hunk of hunks) {
    const before = lineCounts(hunk.oldText ?? '');
    const after = lineCounts(hunk.newText);
    for (const [line, count] of after) {
      const extra = count - (before.get(line) ?? 0);
      if (extra > 0) added += extra;
    }
    for (const [line, count] of before) {
      const extra = count - (after.get(line) ?? 0);
      if (extra > 0) removed += extra;
    }
  }
  return added > 0 || removed > 0 ? { added, removed } : null;
}

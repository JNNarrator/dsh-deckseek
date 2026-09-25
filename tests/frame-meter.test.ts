import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-conversation/client';
import { activityPhrase, activityRanks, collapsedSummary, dominantCategory, frameMeterLabel, liveFrameLabel, liveFramePhase, railTurns, turnCounts } from '../src/client/frame-meter.ts';
import type { ReaderFlowEntry } from '../src/client/tool-activity.ts';
import { uiIn } from '../src/client/locale.ts';

function settled(name: string, args: Record<string, unknown>, isError = false): ToolCallBlock {
  return {
    kind: 'tool-result', call: { name, argsRaw: JSON.stringify(args) }, callId: `c-${name}-${JSON.stringify(args)}`,
    time: 1, callTime: 0, content: [], isError, subCalls: [],
  } as unknown as ToolCallBlock;
}

function call(name: string, args: Record<string, unknown>, isError = false): ReaderFlowEntry {
  return { kind: 'tool', key: `reader-tool:${name}`, callId: 'c', step: 1, order: 0, block: settled(name, args, isError) };
}

test('counts read tool calls, distinct files and failures off one turn', () => {
  const flow: ReaderFlowEntry[] = [
    call('read', { file_path: '/w/a.ts' }),
    call('read', { file_path: '/w/a.ts' }),
    call('edit', { file_path: '/w/b.ts' }),
    call('bash', { command: 'ls' }, true),
  ];
  assert.deepEqual(turnCounts(flow), { tools: 4, files: 2, failed: 1 });
});

test('a turn with no tool calls carries no fold summary', () => {
  assert.equal(collapsedSummary(turnCounts([])), null);
});

test('the fold summary names what it counted, and drops empty parts', () => {
  assert.equal(collapsedSummary({ tools: 4, files: 2, failed: 1 }), '4 次工具调用 · 2 个文件 · 1 次失败');
  assert.equal(collapsedSummary({ tools: 3, files: 0, failed: 0 }), '3 次工具调用');
});

test('the fold summary follows the requested language', () => {
  assert.equal(collapsedSummary({ tools: 3, files: 1, failed: 0 }, 'en'), '3 tool calls · 1 file');
});

test('English counts one call in the singular', () => {
  assert.equal(collapsedSummary({ tools: 1, files: 0, failed: 0 }, 'en'), '1 tool call');
  assert.equal(collapsedSummary({ tools: 1, files: 1, failed: 1 }, 'en'), '1 tool call · 1 file · 1 failed');
});

test('the window bar reports loaded turns and the newest turn’s steps', () => {
  assert.equal(frameMeterLabel(12, 34, false), '12 轮 · 最新一轮 34 步');
  assert.equal(frameMeterLabel(12, 0, false), '12 轮');
  assert.equal(frameMeterLabel(0, 0, false), null);
});

test('unloaded history is marked as a floor, not a total', () => {
  assert.equal(frameMeterLabel(12, 5, true), '12+ 轮 · 最新一轮 5 步');
});

test('English counts one turn and one step in the singular', () => {
  // A real session's window bar read "1 turns · last turn 2 steps".
  assert.equal(frameMeterLabel(1, 2, false, 'en'), '1 turn · last turn 2 steps');
  assert.equal(frameMeterLabel(1, 1, false, 'en'), '1 turn · last turn 1 step');
  assert.equal(frameMeterLabel(3, 1, false, 'en'), '3 turns · last turn 1 step');
  // `1+` already means more than one loaded turn, so it keeps the plural.
  assert.equal(frameMeterLabel(1, 1, true, 'en'), '1+ turns · last turn 1 step');
  assert.equal(frameMeterLabel(1, 1, false, 'zh'), '1 轮 · 最新一轮 1 步');
});

test('the turn count comes off the marks the rail can draw', () => {
  // Measured in the host after paging: the first user message was outside the
  // loaded window, so the rail drew 3 marks while the bar — counting turn
  // groups — said 4. The number beside the rail counts what the rail holds.
  const items = [{ turn: 2 }, { turn: 3 }, { turn: 4 }];
  assert.deepEqual(railTurns(items), { count: 3, latest: 4 });
});

test('the rail turn count is distinct turns and follows the newest anchor', () => {
  // A steering message shares its turn, so two marks in one turn stay one turn.
  assert.deepEqual(railTurns([{ turn: 1 }, { turn: 1 }, { turn: 2 }]), { count: 2, latest: 2 });
  // A message with no turn behind it draws a mark but is not a turn.
  assert.deepEqual(railTurns([{ turn: null }, { turn: 5 }]), { count: 1, latest: 5 });
  assert.deepEqual(railTurns([]), { count: 0, latest: null });
  assert.deepEqual(railTurns([{ turn: null }]), { count: 0, latest: null });
  // Turn numbers arrive in display order, but the newest is the largest.
  assert.deepEqual(railTurns([{ turn: 9 }, { turn: 2 }]), { count: 2, latest: 9 });
});

test('a folded turn is ranked by family, most-used first', () => {
  const flow: ReaderFlowEntry[] = [
    call('read', { file_path: '/w/a.ts' }),
    call('read', { file_path: '/w/b.ts' }),
    call('read', { file_path: '/w/c.ts' }),
    call('edit', { file_path: '/w/a.ts' }),
    call('grep', { pattern: 'x' }),
  ];
  assert.deepEqual(activityRanks(flow), [
    { category: 'read', count: 3 },
    { category: 'write', count: 1 },
    { category: 'search', count: 1 },
  ]);
  assert.equal(dominantCategory(activityRanks(flow)), 'read');
});

test('equal families break in a fixed order so the phrase does not drift', () => {
  // One of each: a tie on every count, so only CATEGORY_ORDER decides.
  const flow: ReaderFlowEntry[] = [
    call('read', { file_path: '/w/a.ts' }),
    call('edit', { file_path: '/w/b.ts' }),
    call('bash', { command: 'ls' }),
    call('grep', { pattern: 'x' }),
    call('web_search', { query: 'q' }),
    call('mcp__thing__do', { arg: 1 }),
  ];
  const ranks = activityRanks(flow);
  assert.deepEqual(ranks.map(r => r.category), ['terminal', 'write', 'read', 'search', 'web', 'other']);
  // Re-ordering the input must not re-order the phrase.
  assert.deepEqual(activityRanks([...flow].reverse()).map(r => r.category), ranks.map(r => r.category));
});

test('the phrase names the two families that did the most, in each language', () => {
  const flow: ReaderFlowEntry[] = [
    call('bash', { command: 'ls' }),
    call('bash', { command: 'pwd' }),
    call('read', { file_path: '/w/a.ts' }),
    call('grep', { pattern: 'x' }),
  ];
  // Three distinct families, so all three are named and joined with the list
  // comma. The plugin's settled labels are `运行了X`, not `已X`, so the shared
  // prefix finds nothing to elide here — the elision case is tested below.
  assert.equal(activityPhrase(flow), '运行了命令，读取了文件，搜索了代码');
  assert.equal(activityPhrase(flow, 'en'), 'ran commands, read files, searched code');
});

test('a fourth family collapses to "等" rather than being named', () => {
  const flow: ReaderFlowEntry[] = [
    call('bash', { command: 'ls' }),
    call('read', { file_path: '/w/a.ts' }),
    call('grep', { pattern: 'x' }),
    call('web_search', { query: 'q' }),
    call('mcp__thing__do', { arg: 1 }),
  ];
  // One call per family, so every count ties at 1 and the order falls back to
  // CATEGORY_ORDER — which puts `other` last. The three named families are the
  // first three of that order; `web` and `other` become `等`.
  assert.equal(activityPhrase(flow), '运行了命令，读取了文件，搜索了代码等');
  assert.equal(activityPhrase(flow, 'en'), 'ran commands, read files, searched code, etc.');
});

test('exactly three families are named in full, with no "等"', () => {
  const flow: ReaderFlowEntry[] = [
    call('bash', { command: 'ls' }),
    call('read', { file_path: '/w/a.ts' }),
    call('grep', { pattern: 'x' }),
  ];
  assert.equal(activityPhrase(flow), '运行了命令，读取了文件，搜索了代码');
  assert.equal(activityPhrase(flow, 'en'), 'ran commands, read files, searched code');
});

test('no settled label needs the host\'s prefix or casing refinements', () => {
  // The host's `processTitle` elides a shared leading `已` from later items and
  // lowercases later items. This plugin copies neither, because neither can fire
  // against its own vocabulary — and that is a property of the labels, not of
  // the join helper, so it has to be asserted on the labels themselves.
  //
  // If someone ever relabels a family to `已读取文件` (repeating the prefix) or
  // `Read files` (sentence case), the phrase would silently start reading wrong
  // in a way no other test here would catch. That is what this guards.
  const categories = ['terminal', 'write', 'read', 'search', 'web', 'other'] as const;
  for (const category of categories) {
    assert.equal(uiIn('zh', `frame.activity.${category}`).startsWith('已'), false, `zh ${category} must not start with 已`);
    const en = uiIn('en', `frame.activity.${category}`);
    assert.equal(en.charAt(0), en.charAt(0).toLowerCase(), `en ${category} must not be sentence-cased`);
  }
});

test('one family stands alone, and a turn with no calls has no phrase', () => {
  assert.equal(activityPhrase([call('bash', { command: 'ls' })]), '运行了命令');
  assert.equal(activityPhrase([call('bash', { command: 'ls' })], 'en'), 'ran commands');
  assert.equal(activityPhrase([]), null);
  assert.equal(dominantCategory([]), null);
});

test('an unrecognised call still counts as work rather than vanishing from the phrase', () => {
  const flow: ReaderFlowEntry[] = [call('mcp__thing__do', { arg: 1 })];
  assert.deepEqual(activityRanks(flow), [{ category: 'other', count: 1 }]);
  assert.equal(activityPhrase(flow, 'en'), 'called tools');
});

// A preparing call is a draft: the flat `tool-call` shape the model streams
// while it writes arguments, not the settled `tool-result` carrying `call`.
function drafting(name: string, args: Record<string, unknown>): ReaderFlowEntry {
  return { kind: 'tool', key: `reader-tool:${name}`, callId: 'c', step: 1, order: 0, draft: { kind: 'tool-call', name, argsRaw: JSON.stringify(args) } as never };
}

// A started call is a head block: no `kind`, so `activityPhase` reads it as
// running where a `tool-result` reads as settled.
function started(name: string, args: Record<string, unknown>): ReaderFlowEntry {
  return { kind: 'tool', key: `reader-tool:${name}`, callId: 'c', step: 1, order: 0, block: { name, argsRaw: JSON.stringify(args) } as never };
}

test('a call whose arguments have not arrived reads as preparing, not running', () => {
  assert.deepEqual(liveFramePhase([drafting('read', { file_path: '/w/a.ts' })]), { phase: 'prepare', category: 'read' });
  assert.deepEqual(liveFramePhase([started('read', { file_path: '/w/a.ts' })]), { phase: 'running', category: 'read' });
  assert.equal(liveFrameLabel([drafting('bash', { command: 'ls' })]), '准备运行命令');
  assert.equal(liveFrameLabel([drafting('bash', { command: 'ls' })], 'en'), 'preparing to run commands');
  assert.equal(liveFrameLabel([started('bash', { command: 'ls' })]), '正在运行命令');
  assert.equal(liveFrameLabel([started('bash', { command: 'ls' })], 'en'), 'running commands');
});

test('the live label follows the newest unfinished call, not the whole flow', () => {
  // An earlier settled read must not name the phase: the turn is on the write.
  const flow: ReaderFlowEntry[] = [call('read', { file_path: '/w/a.ts' }), drafting('write', { file_path: '/w/b.ts' })];
  assert.deepEqual(liveFramePhase(flow), { phase: 'prepare', category: 'write' });
  assert.equal(liveFrameLabel(flow, 'en'), 'preparing to edit files');
});

test('a settled group has no live phase, and neither does an empty one', () => {
  // `liveToolEntry` only ever finds unfinished calls, so a turn whose calls have
  // all returned names no live family: the settled phrase is the header's job.
  assert.equal(liveFramePhase([call('read', { file_path: '/w/a.ts' })]), null);
  assert.equal(liveFramePhase([]), null);
  assert.equal(liveFrameLabel([]), null);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AssistantBlock, ToolCallBlock, TurnLocation } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { AssistantChatData, ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';
import { assistantSegments, boundaryOf, groupNodes, hasProcessContent, hasVisibleBody, isEarlierNarration, processChoiceKey, processExpanded, terminalLabel, toolFailed, turnStructure } from '../src/client/projection.ts';
import type { TurnBoundary } from '../src/client/projection.ts';
import { WORK_DETAIL_IDS, workDetailPolicy, type WorkDetailId } from '../src/skin.ts';
import { activityPhase, activitySummary, inputFields, readerFlow } from '../src/client/tool-activity.ts';
import { hasInterleavedInput } from '../src/client/projection.ts';

const text: AssistantBlock = { kind: 'text', text: '前序说明或回答：不能靠关键词判断。' };
function assistant(values: Partial<AssistantChatData> = {}): AssistantChatData {
  return { status: 'settled', turn: 1, step: 0, blocks: [text], time: 1, ...values };
}
const active: TurnBoundary = { status: 'open', reason: null, latestStep: 2, closingStep: null };
const completed: TurnBoundary = { ...active, status: 'closed', reason: 'completed', closingStep: 2 };
/** The level in force for a call: most tests read the plugin's default. */
const at = (level: WorkDetailId) => workDetailPolicy(level);
const standard = at('standard');

test('reasoning and body retain original order, content and identities across streaming appends', () => {
  const first: AssistantBlock = { kind: 'reasoning', text: '**原始标点**\n  原始空格\n' };
  const later: AssistantBlock = { kind: 'reasoning', text: '正文之后的思考' };
  const segments = assistantSegments([first, text, later]);
  assert.deepEqual(segments.map(part => [part.kind, part.start]), [['reasoning', 0], ['body', 1], ['reasoning', 2]]);
  assert.deepEqual(segments.flatMap(part => part.blocks), [first, text, later]);
  assert.equal(segments[0].blocks[0], first);
  const append = assistantSegments([first, text, later, { kind: 'text', text: '最终正文' }]);
  assert.deepEqual(append.slice(0, 3), segments);
});

test('a settled step alone never means final or disposable', () => {
  assert.equal(isEarlierNarration(assistant(), { ...active, latestStep: 0 }), false);
  assert.equal(isEarlierNarration(assistant(), { ...active, status: 'unknown' }), false);
  assert.equal(isEarlierNarration(assistant({ status: 'running' }), active), false);
  assert.equal(isEarlierNarration(assistant(), active), false);
});

test('process stays open through body output and later steps until successful turn completion', () => {
  assert.equal(processExpanded(undefined, active, standard), true);
  assert.equal(processExpanded(undefined, { ...active, latestStep: 7 }, standard), true);
  assert.equal(processExpanded(undefined, completed, standard), false);
  assert.equal(processExpanded(undefined, { ...active, status: 'unknown' }, standard), true);
  for (const reason of ['error', 'aborted', 'interrupted', 'blocked', 'max-tokens', 'future-terminal']) {
    assert.equal(processExpanded(undefined, { ...completed, reason }, standard), true, reason);
  }
});

test('deliberate process expansion or collapse overrides the automatic lifecycle', () => {
  assert.equal(processExpanded(true, completed, standard), true);
  assert.equal(processExpanded(false, active, standard), false);
  assert.equal(processExpanded(false, { ...completed, reason: 'error' }, standard), false);
});

test('reading during a run does not keep the completed process open; reopening after completion is deliberate', () => {
  const choices: Record<string, boolean> = {};
  choices[processChoiceKey('turn:1', active)] = true;
  assert.equal(processExpanded(choices[processChoiceKey('turn:1', completed)], completed, standard), false);
  assert.equal(processChoiceKey('turn:1', active), processChoiceKey('turn:1', { ...active, latestStep: 9 }));
  choices[processChoiceKey('turn:1', completed)] = true;
  assert.equal(processExpanded(choices[processChoiceKey('turn:1', completed)], completed, standard), true);
  assert.equal(processExpanded(choices[processChoiceKey('turn:2', completed)], completed, standard), false);
});

test('the work-details level decides whether a completed turn folds, and only verbose leaves it open', () => {
  // compact/standard/detailed all fold a normally completed turn ...
  for (const level of ['compact', 'standard', 'detailed'] as const) {
    assert.equal(processExpanded(undefined, completed, at(level)), false, level);
  }
  // ... and only verbose starts it open.
  assert.equal(processExpanded(undefined, completed, at('verbose')), true);
  // An unfinished turn is always open, whatever the level: work in flight must
  // not be hidden. An exception is a failure, not a normal completion.
  for (const level of WORK_DETAIL_IDS) {
    assert.equal(processExpanded(undefined, active, at(level)), true, level);
    assert.equal(processExpanded(undefined, { ...completed, reason: 'error' }, at(level)), true, level);
  }
});

test('an explicit reader choice outranks the work-details level', () => {
  assert.equal(processExpanded(true, completed, at('compact')), true);
  assert.equal(processExpanded(false, active, at('verbose')), false);
});

test('grouping separates a folded turn from one whose rows sit in the flow', () => {
  assert.equal(turnStructure(at('compact')), 'folded');
  assert.equal(turnStructure(at('standard')), 'folded');
  assert.equal(turnStructure(at('detailed')), 'folded');
  assert.equal(turnStructure(at('verbose')), 'flat');
  // A flat structure has no fold to close, even on a completed turn.
  assert.equal(processExpanded(undefined, completed, at('verbose')), true);
});

test('every documented level resolves to a policy and the legacy names map onto it', () => {
  for (const level of WORK_DETAIL_IDS) {
    const policy = workDetailPolicy(level);
    assert.equal(typeof policy.foldCompletedTurns, 'boolean', level);
    assert.equal(typeof policy.groupProcess, 'boolean', level);
    assert.equal(typeof policy.liveProcessDetail, 'boolean', level);
    assert.equal(typeof policy.settledReasoningPreview, 'boolean', level);
  }
  assert.deepEqual(workDetailPolicy('verbose'), { level: 'verbose', foldCompletedTurns: false, groupProcess: false, liveProcessDetail: false, settledReasoningPreview: true });
  assert.deepEqual(workDetailPolicy('compact'), { level: 'compact', foldCompletedTurns: true, groupProcess: true, liveProcessDetail: false, settledReasoningPreview: false });
});

test('body-only steps do not advertise empty thinking, while real reasoning and earlier progress remain accessible', () => {
  const node = (data: AssistantChatData) => ({ kind: 'assistant-step', visibility: 'visible', data }) as ChatConversationViewNode;
  const closing = node(assistant({ step: 2 }));
  assert.equal(hasProcessContent(closing, active), false);
  assert.equal(hasProcessContent(closing, completed), false);
  assert.equal(hasProcessContent(node(assistant({ step: 2, blocks: [{ kind: 'reasoning', text: '' }, text] })), completed), false);
  assert.equal(hasProcessContent(node(assistant({ step: 2, blocks: [{ kind: 'reasoning', text: '真实思考' }, text] })), active), true);
  assert.equal(hasProcessContent(node(assistant({ step: 1 })), completed), true);
  assert.equal(hasProcessContent({ ...closing, visibility: 'hidden' }, completed), false);
});

test('a turn trigger counts as process content because it cannot be summarized away', () => {
  const trigger = { kind: 'turn-trigger', visibility: 'visible', data: {} } as unknown as ChatConversationViewNode;
  assert.equal(hasProcessContent(trigger, completed), true);
  assert.equal(hasProcessContent({ ...trigger, visibility: 'hidden' }, completed), false);
});

test('completed turns preserve the public closing message, even with a later nontext step', () => {
  assert.equal(isEarlierNarration(assistant({ step: 2 }), completed), false);
  assert.equal(isEarlierNarration(assistant({ step: 1 }), { ...completed, closingStep: 1 }), false);
  assert.equal(isEarlierNarration(assistant({ step: 0 }), { ...completed, closingStep: 1 }), true);
  assert.equal(isEarlierNarration(assistant(), { ...completed, closingStep: null }), false);
});

test('all abnormal and unknown terminal states preserve generated prefixes', () => {
  for (const reason of ['error', 'aborted', 'interrupted', 'blocked', 'max-tokens', 'future-terminal']) {
    assert.equal(isEarlierNarration(assistant(), { ...completed, reason }), false, reason);
    assert.ok(terminalLabel(reason), reason);
  }
  assert.equal(isEarlierNarration(assistant({ status: 'interrupted' }), completed), false);
  assert.equal(terminalLabel('completed'), null);
});

test('images, future modalities, and mixed body blocks never disappear into process', () => {
  const unknown: AssistantBlock = { kind: 'other', block: { type: 'mcp-app', html: '<script>window.bad=true</script>' } };
  const image: AssistantBlock = { kind: 'image', attachment: { attachmentId: 'test-attachment' as never, width: 100, height: 100, mediaType: 'image/png', bytes: 10 } };
  for (const blocks of [[unknown], [text, unknown], [image], [text, image]]) {
    assert.equal(isEarlierNarration(assistant({ blocks }), completed), false);
    assert.equal(hasVisibleBody(blocks), true);
  }
  assert.equal(hasVisibleBody([{ kind: 'reasoning', text: 'private display trace' }]), false);
});

test('classification never inspects wording', () => {
  for (const value of ['Final answer:', '正在处理', '请你确认再继续', 'All done', 'Think']) {
    assert.equal(isEarlierNarration(assistant({ step: 2, blocks: [{ kind: 'text', text: value }] }), completed), false);
  }
});

test('structural grouping retains keys and source order and excludes host-hidden rows', () => {
  const turn = { turn: 1, status: 'open', steps: [] } as unknown as TurnLocation;
  const node = (key: string, kind: string, location: ChatConversationViewNode['location'], visibility: 'visible' | 'hidden' = 'visible'): ChatConversationViewNode => ({ key, id: key, kind, target: 'chat', data: {}, anchorSeq: Number(key), visibility, location });
  const nodes = [node('1', 'user', { kind: 'unresolved' }), node('2', 'assistant-step', { kind: 'turn', turn }), node('3', 'tool-call', { kind: 'turn', turn }), node('4', 'context', { kind: 'turn', turn }, 'hidden'), node('5', 'custom', { kind: 'unresolved' })];
  const byKey = new Map(nodes.map(row => [row.key, row]));
  const result = groupNodes(nodes.map(row => row.key), key => byKey.get(key));
  assert.deepEqual(result.map(group => group.keys), [['1'], ['2', '3'], ['5']]);
  assert.deepEqual(result.flatMap(group => group.keys), ['1', '2', '3', '5']);
  assert.equal(result[1]?.key, groupNodes([...nodes.map(row => row.key), 'missing'], key => byKey.get(key))[1]?.key);
});

test('missing historical boundaries remain explicit uncertainty', () => {
  const boundary = boundaryOf(undefined);
  assert.deepEqual(boundary, { status: 'unknown', reason: null, latestStep: -1, closingStep: null });
  assert.equal(isEarlierNarration(assistant(), boundary), false);
});

test('a failed child tool is not hidden by a successful parent summary', () => {
  const failed = { kind: 'tool-result', isError: true, content: [], subCalls: [] } as unknown as ToolCallBlock;
  const parent = { kind: 'tool-result', isError: false, content: [], subCalls: [failed] } as unknown as ToolCallBlock;
  assert.equal(toolFailed(parent), true);
});

test('tool input is visible before execution, including native-hidden tool-only steps', () => {
  const draft = { kind: 'tool-call' as const, callId: 'draft-call', name: 'write', argsRaw: '{"file_path":"/work/view.html","content":"<html>\\n' };
  const data = assistant({ status: 'running', blocks: [draft] });
  const turn = { turn: 1, steps: [{ step: 0, start: { seq: 1 }, data: { get: () => data } }] } as unknown as TurnLocation;
  const group = { key: 'turn:1', turn: 1, keys: [] };
  const pending = readerFlow(group, turn, () => undefined);
  assert.equal(pending.length, 1);
  assert.equal(pending[0]?.kind, 'tool');
  if (pending[0]?.kind !== 'tool') throw new Error('missing tool');
  assert.equal(activityPhase(pending[0]), 'preparing');
  assert.equal(activitySummary(pending[0]).title, '写入 view.html');
  assert.equal(activitySummary(pending[0]).content, '<html>\n');
  const block = { callId: draft.callId, name: 'write', argsRaw: draft.argsRaw, subCalls: [] } as unknown as ToolCallBlock;
  const node = { key: 'tool-native', kind: 'tool-call', visibility: 'visible', anchorSeq: 10, data: { root: block }, location: { kind: 'step', step: { step: 0 } } } as unknown as ChatConversationViewNode;
  const running = readerFlow({ ...group, keys: [node.key] }, turn, () => node);
  assert.equal(running.length, 1);
  assert.equal(running[0]?.key, pending[0].key, 'one call keeps the same React key at execution');
});

test('partial argument parsing respects JSON nesting, escapes and unfinished unicode', () => {
  const source = JSON.stringify({ file_path: '/work/真实.html', content: '"file_path":"fake"\n你好😀', nested: { file_path: 'also fake' } });
  for (let cut = source.indexOf('content') + 10; cut <= source.length; cut++) {
    const fields = inputFields(source.slice(0, cut));
    assert.equal(fields.file_path, '/work/真实.html');
    if (typeof fields.content === 'string') assert.ok('"file_path":"fake"\n你好😀'.startsWith(fields.content));
  }
  assert.equal(inputFields('{"content":"start\\u4f').content, 'start');
  assert.equal(inputFields('{"content":"slash\\\\').content, 'slash\\');
  assert.equal(inputFields('{"nested":{"file_path":"fake"},"file_path":"real').file_path, 'real');
});

test('a nonzero terminal exit is a failure even when the tool transport is non-error', () => {
  const block = { kind: 'tool-result', isError: false, content: [], meta: { exitCode: 7 }, subCalls: [] } as unknown as ToolCallBlock;
  assert.equal(toolFailed(block), true);
  assert.equal(activityPhase({ block }), 'failed');
  assert.equal(activityPhase({ block: { ...block, meta: null } as ToolCallBlock }), 'returned');
  assert.equal(activityPhase({}, true), 'interrupted');
});

/** A minimal node of the given kind, already settled and visible. */
function kindNode(index: number, kind: string): ChatConversationViewNode {
  return {
    key: `k${index}`, kind, visibility: 'visible', anchorSeq: index,
    data: { status: 'settled', turn: 1, step: 0, blocks: [], time: index },
    location: { kind: 'turn', turn: { turn: 1 } },
  } as unknown as ChatConversationViewNode;
}

test('a later human input is interleaved; the opening one is not', () => {
  const nodes = new Map([
    ['a', kindNode(0, 'user')],
    ['b', kindNode(1, 'tool-call')],
    ['c', kindNode(2, 'assistant-step')],
  ]);
  const get = (key: string) => nodes.get(key);
  // The opening user message is the turn's premise, not an interruption.
  assert.equal(hasInterleavedInput(['a', 'b', 'c'], get), false);
  // A second human input inside the process is what must stay readable.
  nodes.set('d', kindNode(3, 'user'));
  assert.equal(hasInterleavedInput(['a', 'b', 'c', 'd'], get), true);
  // Steering counts as speaking again.
  nodes.delete('d');
  nodes.set('e', kindNode(4, 'steering'));
  assert.equal(hasInterleavedInput(['a', 'b', 'e'], get), true);
  // A trigger reads as a message, so it counts too — but only after the opening.
  assert.equal(hasInterleavedInput(['f', 'b'], key => key === 'f' ? kindNode(5, 'turn-trigger') : get(key)), false);
  assert.equal(hasInterleavedInput(['f', 'b', 'e'], key => key === 'f' ? kindNode(5, 'turn-trigger') : get(key)), true);
});

test('a hidden later input does not force the fold open', () => {
  const nodes = new Map([
    ['a', kindNode(0, 'user')],
    ['b', kindNode(1, 'tool-call')],
    ['c', { ...kindNode(2, 'user'), visibility: 'hidden' } as ChatConversationViewNode],
  ]);
  assert.equal(hasInterleavedInput(['a', 'b', 'c'], key => nodes.get(key)), false);
});

test('a group with no input at all is never interleaved', () => {
  const nodes = new Map([['b', kindNode(1, 'tool-call')], ['c', kindNode(2, 'assistant-step')]]);
  assert.equal(hasInterleavedInput(['b', 'c'], key => nodes.get(key)), false);
});

test('interleaved input forces the fold open at every level, but a reader choice still wins', () => {
  const at = (level: WorkDetailId) => workDetailPolicy(level);
  // Every folding level would otherwise start a completed turn closed.
  for (const level of WORK_DETAIL_IDS) {
    if (level === 'verbose') continue;
    assert.equal(processExpanded(undefined, completed, at(level)), false, level);
    assert.equal(processExpanded(undefined, completed, at(level), true), true, level);
  }
  // The floor is not a policy the reader chose, so their own toggle overrides it.
  assert.equal(processExpanded(false, completed, at('standard'), true), false);
  assert.equal(processExpanded(true, active, at('standard'), true), true);
});

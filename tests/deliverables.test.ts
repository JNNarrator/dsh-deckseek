import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-conversation/client';
import { basename, createProducedFileMentions, dirname, getTurnDeliverables, showDeliverablesRow, visibleDeliverables } from '../src/client/deliverables.js';
import type { ReaderFlowEntry } from '../src/client/tool-activity.js';

function settled(name: string, args: Record<string, unknown>, isError = false): ToolCallBlock {
  return {
    kind: 'tool-result', call: { name, argsRaw: JSON.stringify(args) }, callId: `c-${name}`,
    time: 1, callTime: 0, content: [], isError, subCalls: [],
  } as unknown as ToolCallBlock;
}

function tool(name: string, args: Record<string, unknown>, isError = false): ReaderFlowEntry {
  return { kind: 'tool', key: `k-${name}`, callId: `c-${name}`, step: 1, order: 0, block: settled(name, args, isError) };
}

/** A turn whose recorded deliverables are whatever the test says. */
function reporting(produced: unknown): never {
  return { data: { get: (kind: string) => kind === 'deliverables' ? { produced } : undefined } } as never;
}

test('basename and dirname handle trailing separators and both slash styles', () => {
  assert.equal(basename('/w/proj/src/a.ts'), 'a.ts');
  assert.equal(basename('/w/proj/src/'), 'src');
  assert.equal(basename('C:\\w\\proj\\a.ts'), 'a.ts');
  assert.equal(basename('a.ts'), 'a.ts');
  assert.equal(dirname('/w/proj/src/a.ts'), '/w/proj/src');
  assert.equal(dirname('a.ts'), '.');
  assert.equal(dirname('/w/proj/src/'), '/w/proj');
  // A file at the root has no meaningful parent to show, so it degrades to the
  // workspace root — inherited from upstream, and only reachable for a file
  // that no session writes.
  assert.equal(dirname('/a.ts'), '.');
});

test('the produced row waits for the turn to close', () => {
  assert.equal(showDeliverablesRow('closed', ['/a.ts']), true);
  assert.equal(showDeliverablesRow('open', ['/a.ts']), false, 'a live write has not finished producing anything');
  assert.equal(showDeliverablesRow('unknown', ['/a.ts']), false);
  assert.equal(showDeliverablesRow('closed', []), false);
});

test('reported deliverables win, and their order is the order reported', () => {
  const paths = getTurnDeliverables(reporting([{ path: '/w/b.ts' }, { path: '/w/a.ts' }, { path: '/w/b.ts' }]), [tool('write', { file_path: '/w/ignored.ts' })]);
  assert.deepEqual(paths, ['/w/b.ts', '/w/a.ts'], 'the flow walk is a fallback, not a second opinion');
});

test('a malformed reported entry is skipped rather than turned into a path', () => {
  const paths = getTurnDeliverables(reporting([{ path: '  ' }, { path: 7 }, null, { path: '/w/a.ts' }]), []);
  assert.deepEqual(paths, ['/w/a.ts']);
});

test('without reported deliverables the successful write calls are walked', () => {
  const paths = getTurnDeliverables(undefined, [
    tool('read', { path: '/w/read.ts' }),
    tool('write', { file_path: '/w/written.ts' }),
    tool('edit', { path: '/w/edited.ts' }),
    tool('apply_patch', { path: '/w/patched.ts' }),
    tool('bash', { command: 'rm -rf /' }),
  ]);
  assert.deepEqual(paths, ['/w/written.ts', '/w/edited.ts', '/w/patched.ts']);
});

test('a failed write names no file', () => {
  const paths = getTurnDeliverables(undefined, [tool('write', { file_path: '/w/written.ts' }, true)]);
  assert.deepEqual(paths, [], 'the call wrote nothing, so the row must not offer it');
});

test('the editor tool counts only the commands that write', () => {
  const paths = getTurnDeliverables(undefined, [
    tool('str_replace_editor', { command: 'view', path: '/w/viewed.ts' }),
    tool('str_replace_editor', { command: 'create', path: '/w/created.ts' }),
    tool('str_replace_editor', { command: 'str_replace', path: '/w/replaced.ts' }),
    tool('str_replace_editor', { command: 'insert', path: '/w/inserted.ts' }),
  ]);
  assert.deepEqual(paths, ['/w/created.ts', '/w/replaced.ts', '/w/inserted.ts']);
});

test('a call that has not settled yet names no file', () => {
  // A draft-only entry means the call never produced a result. The row only
  // exists once the turn closed, and a closed turn's calls are settled, so a
  // draft here is not a partial answer — it is a call this walk cannot speak for.
  const draftOnly = { kind: 'tool', key: 'k', callId: 'c', step: 1, order: 0, draft: { name: 'write', argsRaw: '{"file_path":"/w/partial.ts"}' } } as never;
  assert.deepEqual(getTurnDeliverables(undefined, [draftOnly]), []);
});

test('a call still being prepared carries its path in the call block itself', () => {
  // 0.1.7's preparing stage is a block without `kind`, so `toolIdentity` reads
  // the name and arguments off the block rather than off a frozen `call`.
  const preparing = { kind: 'tool', key: 'k', callId: 'c', step: 1, order: 0, block: { name: 'write', argsRaw: '{"file_path":"/w/preparing.ts"}' } } as never;
  assert.deepEqual(getTurnDeliverables(undefined, [preparing]), ['/w/preparing.ts']);
});

test('a token resolves to the file it names, exactly or by a unique file name', () => {
  const mentions = createProducedFileMentions(['/w/proj/src/a.ts', '/w/proj/src/b.ts'], () => {});
  assert.equal(mentions.resolve('/w/proj/src/a.ts')?.title, '/w/proj/src/a.ts', 'an authored full path resolves as itself');
  assert.equal(mentions.resolve('a.ts')?.title, '/w/proj/src/a.ts', 'a unique file name resolves to its one file');
  assert.equal(mentions.resolve('nope.ts'), undefined, 'an unknown token stays inert code');
  assert.equal(mentions.resolve('a.ts\nb.ts'), undefined, 'a token spanning lines is not a file name');
  assert.equal(mentions.resolve(''), undefined);
});

test('an ambiguous file name resolves to nothing at all', () => {
  const mentions = createProducedFileMentions(['/w/one/a.ts', '/w/two/a.ts'], () => {});
  assert.equal(mentions.resolve('a.ts'), undefined, 'opening the wrong file is worse than opening none');
  assert.equal(mentions.resolve('/w/two/a.ts')?.title, '/w/two/a.ts', 'the full path is still unambiguous');
});

test('the opener is called with the resolved path, and the label carries it', () => {
  const opened: string[] = [];
  const mentions = createProducedFileMentions(['/w/proj/src/a.ts'], path => opened.push(path));
  const mention = mentions.resolve('a.ts')!;
  mention.open();
  assert.deepEqual(opened, ['/w/proj/src/a.ts']);
  assert.equal(mention.title, '/w/proj/src/a.ts');
  assert.match(mention.label, /\/w\/proj\/src\/a\.ts/, 'the accessible label names the file it opens');
});

test('the chip cap shows at most that many and counts the rest', () => {
  const two = ['/w/a.ts', '/w/b.ts'];
  assert.deepEqual(visibleDeliverables(two), { shown: two, hidden: 0 });
  assert.deepEqual(visibleDeliverables([]), { shown: [], hidden: 0 });
  const eight = Array.from({ length: 8 }, (_, index) => `/w/f${index}.ts`);
  assert.deepEqual(visibleDeliverables(eight), { shown: eight, hidden: 0 }, 'exactly at the cap, nothing is hidden');
  const twelve = Array.from({ length: 12 }, (_, index) => `/w/f${index}.ts`);
  const capped = visibleDeliverables(twelve);
  assert.equal(capped.shown.length, 8);
  assert.equal(capped.hidden, 4, 'the count is what the cap hides, not how many there are');
  assert.equal(visibleDeliverables(twelve, 3).hidden, 9, 'the cap is a parameter of the rule, not a constant inside it');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterCommands, fuzzyScore, groupCommands, type ReaderCommand } from '../src/client/commands.ts';

/** A command that records nothing; only its text matters here. */
function command(id: string, label: string, group = 'g', keywords?: string): ReaderCommand {
  return { id, label, group, keywords, run: () => {} };
}

test('an empty query keeps the declared order', () => {
  const list = [command('a', 'zd'), command('b', 'ab'), command('c', 'cd')];
  assert.deepEqual(filterCommands(list, '').map(c => c.id), ['a', 'b', 'c']);
  assert.deepEqual(filterCommands(list, '   ').map(c => c.id), ['a', 'b', 'c']);
});

test('a query matches an ordered subsequence, not just a substring', () => {
  // `exp` never appears literally in the Chinese label, so a substring matcher
  // would find nothing where a reader expects the export command.
  assert.deepEqual(filterCommands([command('export', '导出为 Markdown')], 'Markdown').map(c => c.id), ['export']);
  assert.deepEqual(filterCommands([command('skin', '皮肤：木纹')], '木纹').map(c => c.id), ['skin']);
  assert.deepEqual(filterCommands([command('skin', '皮肤：木纹')], '纹木').map(c => c.id), []);
});

test('keywords let an identifier find a translated label', () => {
  const keyworded = command('skin-soft', '皮肤：软卡', 'g', 'skin soft');
  assert.deepEqual(filterCommands([keyworded], 'soft').map(c => c.id), ['skin-soft']);
  assert.deepEqual(filterCommands([keyworded], '皮肤').map(c => c.id), ['skin-soft']);
  assert.deepEqual(filterCommands([command('x', '导出')], 'soft').map(c => c.id), []);
});

test('a contiguous match outranks a scattered one', () => {
  const scattered = command('scattered', '关掉页面');
  const contiguous = command('contiguous', '关闭面板');
  const ranked = filterCommands([scattered, contiguous], '关闭');
  assert.equal(ranked[0]?.id, 'contiguous');
});

test('a match at the start outranks a match in the middle', () => {
  assert.ok((fuzzyScore('abc', 'ab') ?? 0) > (fuzzyScore('zzabc', 'ab') ?? 0));
  // Ties keep the declared order, so a palette never reshuffles under the
  // reader's finger between two keystrokes.
  const list = [command('first', 'abc'), command('second', 'abc')];
  assert.deepEqual(filterCommands(list, 'abc').map(c => c.id), ['first', 'second']);
});

test('the limit caps a long list', () => {
  const list = Array.from({ length: 60 }, (_value, index) => command(`c${index}`, '命令'));
  assert.equal(filterCommands(list, '').length, 40);
  assert.equal(filterCommands(list, '', 5).length, 5);
});

test('grouping folds a group that filtering split apart', () => {
  const list = [
    command('a1', '甲一', '甲'),
    command('b1', '乙一', '乙'),
    command('a2', '甲二', '甲'),
  ];
  const groups = groupCommands(list);
  assert.deepEqual(groups.map(entry => entry.group), ['甲', '乙']);
  assert.deepEqual(groups[0]!.commands.map(c => c.id), ['a1', 'a2'], 'a group keeps the order its commands arrived in');
  assert.deepEqual(groupCommands([]), []);
});

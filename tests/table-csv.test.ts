import { test } from 'node:test';
import assert from 'node:assert/strict';
import type * as Md from 'mdast';
import { tableToCsv } from '../src/client/table-csv.ts';

function cell(text: string): Md.TableCell {
  return { type: 'tableCell', children: [{ type: 'text', value: text }] };
}

function row(...cells: Md.TableCell[]): Md.TableRow {
  return { type: 'tableRow', children: cells };
}

function table(rowsOfCells: string[][]): Md.Table {
  return {
    type: 'table',
    align: rowsOfCells[0]!.map(() => null),
    children: rowsOfCells.map(cells => row(...cells.map(cell))),
  };
}

test('tableToCsv emits header and rows joined by CRLF', () => {
  assert.equal(
    tableToCsv(table([['工具', '状态'], ['edit', '失败'], ['glob', '完成']])),
    '工具,状态\r\nedit,失败\r\nglob,完成',
  );
});

test('tableToCsv quotes cells with commas, quotes or newlines', () => {
  assert.equal(
    tableToCsv(table([['a,b', 'say "hi"', 'x\ny']])),
    '"a,b","say ""hi""","x\ny"',
  );
});

test('tableToCsv flattens inline code cells', () => {
  const tableNode: Md.Table = {
    type: 'table', align: [null],
    children: [{ type: 'tableRow', children: [{ type: 'tableCell', children: [{ type: 'inlineCode', value: 'const x = 1' }] }] }],
  };
  assert.equal(tableToCsv(tableNode), 'const x = 1');
});
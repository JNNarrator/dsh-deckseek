import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shortCwd } from '../src/client/frame-path.js';

test('a deep path keeps its last two segments and marks the cut', () => {
  assert.equal(shortCwd('/Users/name/Documents/workspace/project'), '…/workspace/project');
});

test('a short path is kept verbatim, so it still reads as absolute', () => {
  assert.equal(shortCwd('/home/app'), '/home/app');
  assert.equal(shortCwd('project'), 'project');
});

test('a trailing separator does not change the reading', () => {
  assert.equal(shortCwd('/Users/name/workspace/project/'), '…/workspace/project');
});

test('windows separators shorten the same way', () => {
  assert.equal(shortCwd('C:\\Users\\name\\workspace\\project'), '…/workspace/project');
});

test('a filesystem root survives, and an unknown workspace is empty', () => {
  assert.equal(shortCwd('/'), '/');
  assert.equal(shortCwd(undefined), '');
  assert.equal(shortCwd(''), '');
});

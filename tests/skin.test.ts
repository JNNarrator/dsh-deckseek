import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SKIN, SKIN_IDS, isSkin, parseSkin } from '../src/skin.js';

test('every declared skin parses to itself', () => {
  for (const id of SKIN_IDS) assert.equal(parseSkin(id), id);
});

test('unknown and missing values fall back to the default skin', () => {
  assert.equal(parseSkin('neon'), DEFAULT_SKIN);
  assert.equal(parseSkin(undefined), DEFAULT_SKIN);
  assert.equal(parseSkin(null), DEFAULT_SKIN);
  assert.equal(parseSkin(3), DEFAULT_SKIN);
  assert.equal(parseSkin({ skin: 'paper' }), DEFAULT_SKIN);
});

test('the default is one of the declared skins', () => {
  assert.ok(SKIN_IDS.includes(DEFAULT_SKIN));
});

test('isSkin narrows only declared skins', () => {
  assert.equal(isSkin('terminal'), true);
  assert.equal(isSkin('Terminal'), false);
  assert.equal(isSkin(''), false);
});

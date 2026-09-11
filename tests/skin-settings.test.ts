import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SKIN } from '../src/skin.js';
import { DeckSeekSettingsSchema } from '../src/skin-settings.js';

test('an empty section resolves to the default skin', () => {
  assert.equal(DeckSeekSettingsSchema({}).skin, DEFAULT_SKIN);
});

test('a declared skin passes through', () => {
  assert.equal(DeckSeekSettingsSchema({ skin: 'terminal' }).skin, 'terminal');
  assert.equal(DeckSeekSettingsSchema({ skin: 'paper' }).skin, 'paper');
});

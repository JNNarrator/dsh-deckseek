import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SKIN, DEFAULT_WORK_DETAIL, DECKSEEK_SETTINGS_NAMESPACE, SKIN_FIELD, WORK_DETAIL_FIELD } from '../src/skin.js';
import { DeckSeekConfigSchema, DeckSeekSettingsSchema } from '../src/skin-settings.js';
import { Config, name } from '../src/dsh-deckseek.js';

test('an empty section resolves to the default skin', () => {
  assert.equal(DeckSeekSettingsSchema({}).skin, DEFAULT_SKIN);
});

test('a declared skin passes through', () => {
  assert.equal(DeckSeekSettingsSchema({ skin: 'terminal' }).skin, 'terminal');
  assert.equal(DeckSeekSettingsSchema({ skin: 'paper' }).skin, 'paper');
});

/**
 * The shape the 0.1.7 settings host derives from a plugin's exported `Config`.
 *
 * `ctx.settings.describe()` builds the served form with the host's own
 * `volatileForm(schema)`: it keeps `schema` when the node itself is volatile,
 * otherwise it recurses into an object's dict and keeps only the volatile
 * children, returning `undefined` when none are left. `describe()` treats that
 * `undefined` as "this entry has no settings" and drops the namespace
 * entirely. Mirroring the walk here keeps the assertion on the plugin's
 * declaration rather than on harness internals, while still failing for the
 * exact reason the host would drop the section.
 */
function liveFields(schema: unknown): string[] | undefined {
  const node = schema as { dict?: Record<string, { meta?: { volatile?: boolean } }>; meta?: { volatile?: boolean } };
  if (node.meta?.volatile) return ['<self>'];
  if (node.dict === undefined) return undefined;
  const kept = Object.entries(node.dict).filter(([, child]) => liveFields(child) !== undefined);
  return kept.length === 0 ? undefined : kept.map(([key]) => key);
}

test('the exported Config is live, so the host serves the namespace', () => {
  // Regression: a Config without a single `.volatile()` field makes
  // `volatileForm` return undefined. The section then never reaches the
  // browser, so `configForms.get()` stays at `status: 'loading'` with
  // `writable: false` forever: every tile renders `disabled` and the section
  // shows its readonly notice, while any write is refused with
  // `Plugin entry "dsh-deckseek" has no volatile fields`.
  assert.deepEqual(liveFields(Config), [SKIN_FIELD, WORK_DETAIL_FIELD]);
});

test('the live Config is what the entry exports', () => {
  assert.equal(Config, DeckSeekConfigSchema);
});

test('the durable envelope stays plain', () => {
  // The two schemas keep distinct roles: the durable one is the wire envelope
  // the browser validates against, and only the live one carries markers.
  assert.equal(liveFields(DeckSeekSettingsSchema), undefined);
  assert.equal(DeckSeekSettingsSchema.dict?.[SKIN_FIELD]?.meta?.volatile, undefined);
});

test('the settings namespace is this entry id', () => {
  assert.equal(name, DECKSEEK_SETTINGS_NAMESPACE);
});

test('the live Config keeps the shipped parse behaviour', () => {
  const plain = (input: Record<string, unknown>): Record<string, unknown> => {
    const out = DeckSeekConfigSchema(input) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(out).map(([key, value]) => [key, (value as { get: () => unknown }).get()]));
  };
  assert.deepEqual(plain({}), { [SKIN_FIELD]: DEFAULT_SKIN, [WORK_DETAIL_FIELD]: DEFAULT_WORK_DETAIL });
  assert.deepEqual(plain({ [SKIN_FIELD]: 'terminal' }), { [SKIN_FIELD]: 'terminal', [WORK_DETAIL_FIELD]: DEFAULT_WORK_DETAIL });
  // A legacy host spelling round-trips unchanged rather than being rewritten.
  assert.deepEqual(plain({ [WORK_DETAIL_FIELD]: 'normal' }), { [SKIN_FIELD]: DEFAULT_SKIN, [WORK_DETAIL_FIELD]: 'normal' });
  // `.loose()` keeps a value this build does not name from failing validation.
  assert.deepEqual(plain({ [WORK_DETAIL_FIELD]: 'future-x' }), { [SKIN_FIELD]: DEFAULT_SKIN, [WORK_DETAIL_FIELD]: DEFAULT_WORK_DETAIL });
});

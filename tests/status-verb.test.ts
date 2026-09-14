import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATUS_VERB_IDS, pickStatusVerb, preambleLabel } from '../src/client/status-verb.js';
import { en, zh } from '../src/client/locale.js';
import type { UiKey } from '../src/client/locale.js';

const verbKey = (id: string): UiKey => `status.verb.${id}` as UiKey;

test('every verb id resolves in both dictionaries', () => {
  for (const id of STATUS_VERB_IDS) {
    assert.equal(typeof zh[verbKey(id)], 'string', `zh is missing status.verb.${id}`);
    assert.equal(typeof en[verbKey(id)], 'string', `en is missing status.verb.${id}`);
  }
});

test('a turn keeps its verb, whatever renders it', () => {
  // The header and the dock render the status line for one turn separately, and
  // a streaming turn re-renders constantly: the pick must not move.
  for (const key of ['turn-a', 'turn-b', '', 'a'.repeat(120)]) {
    assert.equal(pickStatusVerb(key, 'zh'), pickStatusVerb(key, 'zh'));
  }
});

test('the pool is walked rather than collapsed onto one verb', () => {
  const seen = new Set(Array.from({ length: 200 }, (_, index) => pickStatusVerb(`turn-${index}`, 'zh')));
  assert.ok(seen.size > 1, `expected more than one verb, saw ${[...seen].join(', ')}`);
  assert.ok(seen.size <= STATUS_VERB_IDS.length);
});

test('the verb reads in the requested language and closes with the working ellipsis', () => {
  const zhPool = STATUS_VERB_IDS.map(id => `${zh[verbKey(id)]}…`);
  const enPool = STATUS_VERB_IDS.map(id => `${en[verbKey(id)]}…`);
  for (const key of ['turn-a', 'turn-b', 'turn-c']) {
    assert.ok(zhPool.includes(pickStatusVerb(key, 'zh')), `zh pick escaped the pool: ${pickStatusVerb(key, 'zh')}`);
    assert.ok(enPool.includes(pickStatusVerb(key, 'en')), `en pick escaped the pool: ${pickStatusVerb(key, 'en')}`);
  }
});

test('the working verbs never collide with the phase labels they stand in for', () => {
  // status.delving is the sentence the verb replaces; status.thinkingName is the
  // reasoning phase, which must keep its own wording.
  const phase = [zh['status.delving'], zh['status.thinkingName'], en['status.delving'], en['status.thinkingName']];
  for (const id of STATUS_VERB_IDS) {
    for (const lang of [zh, en]) {
      assert.ok(!phase.includes(`${lang[verbKey(id)]}…`), `verb ${id} duplicates a phase label`);
    }
  }
});

test('a turn-less group is labelled as the preamble, never with a phase', () => {
  // Measured in the host: on a finished session the first line of the reading
  // page read "In progress", because the preamble group fell through the phase
  // logic to its fallback.
  assert.equal(preambleLabel(null, 'zh'), '会话起始记录');
  assert.equal(preambleLabel(null, 'en'), 'Session preamble');
  for (const turn of [0, 1, 7]) assert.equal(preambleLabel(turn, 'zh'), null, 'a turn-backed group owns its own label');
});

test('the preamble label claims no phase in either language', () => {
  const phase = [
    zh['status.process'], zh['status.delving'], zh['status.thinkingName'], zh['status.waiting'],
    en['status.process'], en['status.delving'], en['status.thinkingName'], en['status.waiting'],
  ];
  for (const lang of ['zh', 'en'] as const) {
    assert.ok(!phase.includes(preambleLabel(null, lang)!), `${lang} preamble label reads as a phase`);
  }
});

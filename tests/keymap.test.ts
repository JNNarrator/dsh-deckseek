import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockScrollDelta, isTypingTarget, readerKeyAction, type KeyContext, type KeyInput } from '../src/client/keymap.ts';

/** A keystroke with everything unset but what the case names. */
function key(keyName: string, overrides: Partial<KeyInput> = {}): KeyInput {
  return { key: keyName, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...overrides };
}

const idle: KeyContext = { typing: false, panel: 'none' };

test('the command keys work with either modifier and from inside a text field', () => {
  assert.deepEqual(readerKeyAction(key('k', { ctrlKey: true }), idle), { kind: 'palette' });
  assert.deepEqual(readerKeyAction(key('K', { metaKey: true }), idle), { kind: 'palette' });
  assert.deepEqual(readerKeyAction(key('f', { ctrlKey: true }), idle), { kind: 'search' });
  // The composer holds focus most of the time a reader presses these, so a
  // palette that only opened from the page body would be unusable.
  assert.deepEqual(readerKeyAction(key('k', { ctrlKey: true }), { typing: true, panel: 'none' }), { kind: 'palette' });
});

test('a shifted command key belongs to the browser, not to this layer', () => {
  assert.equal(readerKeyAction(key('f', { ctrlKey: true, shiftKey: true }), idle), null);
  assert.equal(readerKeyAction(key('k', { ctrlKey: true, shiftKey: true }), idle), null);
  assert.equal(readerKeyAction(key('k', { ctrlKey: true, altKey: true }), idle), null);
});

test('bare letters are commands only outside a text field', () => {
  assert.deepEqual(readerKeyAction(key('j'), idle), { kind: 'scroll', by: 1 });
  assert.deepEqual(readerKeyAction(key('k'), idle), { kind: 'scroll', by: -1 });
  assert.deepEqual(readerKeyAction(key('g'), idle), { kind: 'edge', to: 'top' });
  assert.deepEqual(readerKeyAction(key('G'), idle), { kind: 'edge', to: 'bottom' });
  assert.deepEqual(readerKeyAction(key('/'), idle), { kind: 'search' });
  assert.deepEqual(readerKeyAction(key('?'), idle), { kind: 'help' });
  for (const typed of ['j', 'k', 'g', 'G', '/', '?']) {
    assert.equal(readerKeyAction(key(typed), { typing: true, panel: 'none' }), null, `${typed} must be text in a field`);
  }
});

test('inside an open panel the reader keys are not read', () => {
  const inPalette: KeyContext = { typing: true, panel: 'palette' };
  // j/k and g/G belong to the panel that is open, not to the page behind it —
  // and the palette's own field is where those letters go.
  for (const typed of ['j', 'k', 'g', 'G', '/', '?', 'q']) {
    assert.equal(readerKeyAction(key(typed), inPalette), null, `${typed} must not reach the page behind a panel`);
  }
});

test('q closes a panel that is not holding a text field', () => {
  // The shortcut sheet puts focus on a button, not a field, so there is no
  // text for `q` to be and it stays a way out — the reference TUIs' habit.
  assert.deepEqual(readerKeyAction(key('q'), { typing: false, panel: 'help' }), { kind: 'dismiss' });
  // ...but a bare key must not close a panel the reader is typing into.
  assert.equal(readerKeyAction(key('q'), { typing: true, panel: 'search' }), null);
});

test('Escape unwinds a panel but is left alone when there is none', () => {
  assert.deepEqual(readerKeyAction(key('Escape'), { typing: true, panel: 'search' }), { kind: 'dismiss' });
  assert.deepEqual(readerKeyAction(key('Escape'), { typing: true, panel: 'palette' }), { kind: 'dismiss' });
  // Nothing of ours is open: the host and the browser may still want it.
  assert.equal(readerKeyAction(key('Escape'), idle), null);
});

test('keys this view does not own pass straight through', () => {
  for (const foreign of ['Enter', 'ArrowDown', 'Tab', 'a', '1', 'Alt', 'F5']) {
    assert.equal(readerKeyAction(key(foreign), idle), null, `${foreign} is not ours`);
  }
  // The host navigates turns with Alt+arrows; the layer must not shadow them.
  assert.equal(readerKeyAction(key('ArrowUp', { altKey: true }), idle), null);
});

test('isTypingTarget recognises the fields a reader types into', () => {
  assert.equal(isTypingTarget({ tagName: 'INPUT' } as unknown as EventTarget), true);
  assert.equal(isTypingTarget({ tagName: 'TEXTAREA' } as unknown as EventTarget), true);
  assert.equal(isTypingTarget({ tagName: 'SELECT' } as unknown as EventTarget), true);
  assert.equal(isTypingTarget({ tagName: 'BUTTON' } as unknown as EventTarget), false);
  assert.equal(isTypingTarget({ tagName: 'DIV', isContentEditable: true } as unknown as EventTarget), true);
  assert.equal(isTypingTarget({ tagName: 'DIV', isContentEditable: false } as unknown as EventTarget), false);
  assert.equal(isTypingTarget(null), false);
  assert.equal(isTypingTarget(window as unknown as EventTarget), false);
});

test('a scroll step follows the viewport but stays within reach', () => {
  assert.equal(blockScrollDelta(400), 100);
  // A short window still gets a legible step rather than a nudge...
  assert.equal(blockScrollDelta(120), 80);
  // ...and a very tall one is capped, so j never skips the reader's place.
  assert.equal(blockScrollDelta(4000), 240);
  assert.equal(blockScrollDelta(0), 80);
});

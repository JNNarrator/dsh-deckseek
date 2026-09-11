import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';
import { buildExportMarkdown, exportFileName } from '../src/client/export.ts';

function node(key: string, kind: string, data: unknown, visibility = 'visible'): ChatConversationViewNode {
  return { key, kind, target: 'chat', anchorSeq: 1, visibility, location: { kind: 'unresolved' }, data } as unknown as ChatConversationViewNode;
}

const user = (key: string, text: string, visibility?: string) => node(key, 'user', { content: [{ type: 'text', text }] }, visibility);
const assistant = (key: string, blocks: unknown[]) => node(key, 'assistant-step', { blocks });

const FIXED = new Date(2026, 8, 8, 9, 5);

test('export keeps user and assistant text in display order under localized headings', () => {
  const md = buildExportMarkdown(['u1', 'a1'], key => key === 'u1'
    ? user('u1', '如何优化缓存？')
    : assistant('a1', [{ kind: 'text', text: '答案是分两层。' }]), FIXED);
  assert.ok(md.startsWith('# DeckSeek 会话导出 · 2026-09-08 09:05\n\n'), md);
  assert.ok(md.includes('## 用户\n\n如何优化缓存？'));
  assert.ok(md.includes('## 求索\n\n答案是分两层。'));
  assert.ok(md.indexOf('如何优化缓存') < md.indexOf('答案是分两层'));
});

test('consecutive assistant steps merge under one heading; non-text blocks stay out', () => {
  const md = buildExportMarkdown(['u1', 'a1', 'a2'], key => ({
    u1: user('u1', '继续'),
    a1: assistant('a1', [{ kind: 'reasoning', text: '内部思考' }, { kind: 'text', text: '第一段。' }]),
    a2: assistant('a2', [{ kind: 'tool-call', name: 'read' }, { kind: 'text', text: '第二段。' }]),
  })[key], FIXED);
  assert.equal(md.split('## 求索').length - 1, 1);
  assert.ok(md.includes('第一段。\n\n第二段。'));
  assert.ok(!md.includes('内部思考'));
  assert.ok(!md.includes("'read'"));
});

test('steering messages get their own label and hidden nodes are skipped', () => {
  const md = buildExportMarkdown(['s1', 'h1', 'a1'], key => ({
    s1: node('s1', 'steering', { content: [{ type: 'text', text: '等一下，先看日志' }] }),
    h1: user('h1', '不该出现', 'hidden'),
    a1: assistant('a1', [{ kind: 'text', text: '好的。' }]),
  })[key], FIXED);
  assert.ok(md.includes('## 用户 · 补充消息\n\n等一下，先看日志'));
  assert.ok(!md.includes('不该出现'));
  assert.ok(md.includes('## 求索\n\n好的。'));
});

test('an empty session exports just the heading, and the filename is filesystem-safe', () => {
  assert.equal(buildExportMarkdown([], () => undefined, FIXED), '# DeckSeek 会话导出 · 2026-09-08 09:05');
  assert.equal(exportFileName(FIXED), 'deckseek-export-20260908-0905.md');
});

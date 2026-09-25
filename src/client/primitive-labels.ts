import type {
  CodeToolbarLabels,
  DiffBlockLabels,
  JsonTreeLabels,
  MarkdownLabels,
  ReadBlockLabels,
  SearchBlockLabels,
  TerminalBlockLabels,
  WebBlockLabels,
} from '@deepseek-ai/dsh-client-ui-primitives';
import { ui } from './locale.js';

/**
 * Shared code-card toolbar copy. 0.1.7 lifted these three labels out of the
 * individual blocks into `CodeToolbarLabels`, which `ReadBlockLabels` and
 * `DiffBlockLabels` now extend — so a code card, a file read, and a diff all
 * carry the same language fallback and wrapping actions.
 */
const codeToolbarLabels: CodeToolbarLabels = {
  codeLabel: ui('code.block'), wrapLabel: ui('code.wrap'), unwrapLabel: ui('code.unwrap'),
};

export const markdownLabels: MarkdownLabels = {
  code: { copyLabel: ui('code.copy'), copiedLabel: ui('code.copied'), toolbarLabels: codeToolbarLabels },
  footnotes: ui('footnotes'),
};

export const readBlockLabels: ReadBlockLabels = {
  ...codeToolbarLabels,
  window: (shown, total) => ui('read.window', { shown, total }),
  copy: ui('code.copy'), copied: ui('code.copied'), collapseAria: ui('read.collapseAria'),
  expandAria: hidden => ui('read.expandAria', { hidden }), collapse: ui('read.collapse'), expand: hidden => ui('read.expandAria', { hidden }),
};

export const terminalBlockLabels: TerminalBlockLabels = {
  signal: signal => ui('terminal.signal', { signal }), exitCode: code => ui('terminal.exitCode', { code }),
  noExitCode: ui('terminal.noExitCode'),
  running: ui('terminal.running'), failed: ui('terminal.failed'), done: ui('terminal.done'), copy: ui('code.copy'), copied: ui('code.copied'),
  noOutput: ui('terminal.noOutput'), collapseAria: ui('terminal.collapseAria'), collapse: ui('read.collapse'),
  expandAria: hidden => ui('read.expandAria', { hidden }), expand: hidden => ui('read.expandAria', { hidden }),
};

export const diffBlockLabels: DiffBlockLabels = {
  ...codeToolbarLabels,
  copy: ui('code.copy'), copied: ui('code.copied'), collapseAria: ui('diff.collapseAria'), collapse: ui('read.collapse'),
  expandAria: hidden => ui('read.expandAria', { hidden }), expand: hidden => ui('read.expandAria', { hidden }),
};

export const searchBlockLabels: SearchBlockLabels = {
  pathsSummary: (shown, total, truncated) => ui('search.pathsSummary', { shown, total, truncated: truncated ? ui('search.truncated') : '' }),
  matchesSummary: (shown, total, files, truncated) => ui('search.matchesSummary', { shown, total, files, truncated: truncated ? ui('search.truncated') : '' }),
  copy: ui('code.copy'), copied: ui('code.copied'), noResults: ui('search.noResults'), collapseAria: ui('search.collapseAria'), collapse: ui('read.collapse'),
  expandAria: hidden => ui('read.expandAria', { hidden }), expand: hidden => ui('read.expandAria', { hidden }),
};

export const webBlockLabels: WebBlockLabels = {
  noResults: ui('web.noResults'), sourcesTruncated: ui('web.sourcesTruncated'), http: ui('web.http'), contentTruncated: ui('web.contentTruncated'),
  markdown: markdownLabels,
};

export const jsonTreeLabels: JsonTreeLabels = {
  copyValue: ui('json.copyValue'), copyJson: ui('json.copyJson'), copyPath: ui('json.copyPath'), copyPrettyJson: ui('json.copyPrettyJson'),
  copyCompactJson: ui('json.copyCompactJson'), copied: ui('code.copied'), copyFailed: ui('json.copyFailed'), collapseNode: ui('json.collapseNode'),
  expandNode: ui('json.expandNode'), copyButtonTitle: action => action,
};

export const truncatedJsonLabel = (total: number): string => ui('truncate.label', { count: total });

/** Label for a block the renderer does not recognize, shown instead of dropping it. */
export const unknownBlockLabel = (): string => ui('block.unknown');

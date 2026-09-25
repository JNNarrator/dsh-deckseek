import { ui } from './locale.js';
/**
 * Shared code-card toolbar copy. 0.1.7 lifted these three labels out of the
 * individual blocks into `CodeToolbarLabels`, which `ReadBlockLabels` and
 * `DiffBlockLabels` now extend — so a code card, a file read, and a diff all
 * carry the same language fallback and wrapping actions.
 */
const codeToolbarLabels = {
    codeLabel: ui('code.block'), wrapLabel: ui('code.wrap'), unwrapLabel: ui('code.unwrap'),
};
export const markdownLabels = {
    code: { copyLabel: ui('code.copy'), copiedLabel: ui('code.copied'), toolbarLabels: codeToolbarLabels },
    footnotes: ui('footnotes'),
};
export const readBlockLabels = {
    ...codeToolbarLabels,
    window: (shown, total) => ui('read.window', { shown, total }),
    copy: ui('code.copy'), copied: ui('code.copied'), collapseAria: ui('read.collapseAria'),
    expandAria: hidden => ui('read.expandAria', { hidden }), collapse: ui('read.collapse'), expand: hidden => ui('read.expandAria', { hidden }),
};
export const terminalBlockLabels = {
    signal: signal => ui('terminal.signal', { signal }), exitCode: code => ui('terminal.exitCode', { code }),
    noExitCode: ui('terminal.noExitCode'),
    running: ui('terminal.running'), failed: ui('terminal.failed'), done: ui('terminal.done'), copy: ui('code.copy'), copied: ui('code.copied'),
    noOutput: ui('terminal.noOutput'), collapseAria: ui('terminal.collapseAria'), collapse: ui('read.collapse'),
    expandAria: hidden => ui('read.expandAria', { hidden }), expand: hidden => ui('read.expandAria', { hidden }),
};
export const diffBlockLabels = {
    ...codeToolbarLabels,
    copy: ui('code.copy'), copied: ui('code.copied'), collapseAria: ui('diff.collapseAria'), collapse: ui('read.collapse'),
    expandAria: hidden => ui('read.expandAria', { hidden }), expand: hidden => ui('read.expandAria', { hidden }),
};
export const searchBlockLabels = {
    pathsSummary: (shown, total, truncated) => ui('search.pathsSummary', { shown, total, truncated: truncated ? ui('search.truncated') : '' }),
    matchesSummary: (shown, total, files, truncated) => ui('search.matchesSummary', { shown, total, files, truncated: truncated ? ui('search.truncated') : '' }),
    copy: ui('code.copy'), copied: ui('code.copied'), noResults: ui('search.noResults'), collapseAria: ui('search.collapseAria'), collapse: ui('read.collapse'),
    expandAria: hidden => ui('read.expandAria', { hidden }), expand: hidden => ui('read.expandAria', { hidden }),
};
export const webBlockLabels = {
    noResults: ui('web.noResults'), sourcesTruncated: ui('web.sourcesTruncated'), http: ui('web.http'), contentTruncated: ui('web.contentTruncated'),
    markdown: markdownLabels,
};
export const jsonTreeLabels = {
    copyValue: ui('json.copyValue'), copyJson: ui('json.copyJson'), copyPath: ui('json.copyPath'), copyPrettyJson: ui('json.copyPrettyJson'),
    copyCompactJson: ui('json.copyCompactJson'), copied: ui('code.copied'), copyFailed: ui('json.copyFailed'), collapseNode: ui('json.collapseNode'),
    expandNode: ui('json.expandNode'), copyButtonTitle: action => action,
};
export const truncatedJsonLabel = (total) => ui('truncate.label', { count: total });
/** Label for a block the renderer does not recognize, shown instead of dropping it. */
export const unknownBlockLabel = () => ui('block.unknown');
//# sourceMappingURL=primitive-labels.js.map
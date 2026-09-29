/**
 * CSS Modules for this plugin's sheets.
 *
 * Rolldown 1.2 removed its bundled CSS support, so the plugin brings its own
 * transform. It is deliberately narrow — it handles what these sheets use and
 * nothing else — but it is *structural*: it walks the sheet with a context
 * stack and applies each rewrite only where that rewrite is legal.
 *
 * That precision is not decoration. The first version of this file renamed
 * names by bare-word substitution over the whole sheet, which turned
 * `flex-direction: column` into `flex-direction: _ekqmtO_column` — an invalid
 * value, so the browser dropped the declaration and **every flex column in the
 * reading view became a flex row**. The view still "worked", it just laid every
 * turn out side by side at one character wide. Nothing caught it: the bundle
 * built, the tests passed (their CSS loader is a stub), and the source-level
 * sheet contract reads the source, not the transform's output. The lesson is in
 * `tests/css-modules.test.ts`, which now checks the transform's own output.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** Remove `/* … *\/` comments so the walk only sees live CSS. */
export function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Escape every `:global(<balanced>)` body out of the sheet, returning the sheet
 * with opaque placeholders plus the bodies to splice back verbatim.
 *
 * @param css - comment-free sheet.
 * @returns the masked sheet and its escaped bodies, in placeholder order.
 */
function maskGlobals(css) {
  const bodies = [];
  let out = '';
  let index = 0;
  while (index < css.length) {
    const at = css.indexOf(':global(', index);
    if (at === -1) {
      out += css.slice(index);
      break;
    }
    out += css.slice(index, at);
    let depth = 0;
    let cursor = at + ':global'.length;
    for (; cursor < css.length; cursor += 1) {
      const char = css[cursor];
      if (char === '(') depth += 1;
      else if (char === ')') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    bodies.push(css.slice(at + ':global('.length, cursor));
    out += `\u0000g${bodies.length - 1}\u0000`;
    index = cursor + 1;
  }
  return { masked: out, bodies };
}

/** Splice masked global bodies back in, unhashed. */
function restoreGlobals(css, bodies) {
  return css.replace(/\u0000g(\d+)\u0000/g, (_match, id) => bodies[Number(id)]);
}

/** At-rules whose block holds further rules rather than declarations. */
const RULE_HOLDING = new Set(['media', 'supports', 'container', 'layer', 'scope', 'starting-style', 'document']);

/**
 * Rewrite one selector, renaming the class names it selects on.
 *
 * Only ever called on selector text: renaming a class name inside a
 * declaration value is what produced `flex-direction: _hashed_column`.
 *
 * @param selector - selector text, with `:global()` bodies already masked out.
 * @param rename - class name → scoped name.
 * @returns the selector with local classes renamed.
 */
function scopeSelector(selector, rename) {
  return selector.replace(/\.(-?[A-Za-z_][A-Za-z0-9_-]*)/g, (_match, name) => `.${rename(name)}`);
}

/**
 * Rewrite the `animation` / `animation-name` values of one declaration block.
 *
 * A keyframe name reaching an `animation` shorthand is the one place a name
 * appears in a value, so it is the one place this transform touches values.
 * The timing tokens (`var(--think-shimmer)` and friends) are left alone —
 * CSS Modules hashes the name even when the timing lives in a custom property.
 *
 * @param declarations - declaration text.
 * @param keyframe - keyframe name → scoped name.
 * @returns the declarations with animation names rescoped.
 */
function scopeAnimationValues(declarations, keyframe) {
  if (keyframe.size === 0) return declarations;
  return declarations.replace(/(^|;|\{)([^;{}]*)/g, (whole, lead, body) => {
    const match = /^\s*(animation|animation-name)\s*:\s*([\s\S]*)$/.exec(body);
    if (match === null) return whole;
    let value = match[2];
    for (const [name, scoped] of keyframe) {
      value = value.replace(new RegExp(`(?<![\\w-])${name}(?![\\w-])`, 'g'), scoped);
    }
    return `${lead}${body.slice(0, body.length - match[2].length)}${value}`;
  });
}

/**
 * Transform one sheet into a scoped sheet plus its export map.
 *
 * @param css - the raw sheet.
 * @param prefix - scope prefix derived from the sheet's path.
 * @returns the scoped CSS and the original→scoped name map.
 */
export function scopeCss(css, prefix) {
  const { masked, bodies } = maskGlobals(stripComments(css));
  const map = new Map();
  const keyframe = new Map();
  const rename = name => {
    const existing = map.get(name);
    if (existing !== undefined) return existing;
    const next = `${prefix}${name}`;
    map.set(name, next);
    return next;
  };
  const renameKeyframe = name => {
    const existing = keyframe.get(name);
    if (existing !== undefined) return existing;
    const next = rename(name);
    keyframe.set(name, next);
    return next;
  };

  // The walk emits pieces tagged by what they are; the animation rewriting is
  // applied afterwards, because a keyframe name is only known once its
  // `@keyframes` has been reached — and `.railTip` uses `railTipIn` above the
  // rule that defines it.
  const pieces = [];
  let pending = '';
  const stack = [];
  const context = () => stack.at(-1) ?? 'rules';
  const emit = (text, kind) => pieces.push({ text, kind });

  for (let index = 0; index < masked.length; index += 1) {
    const char = masked[index];
    if (char === '{') {
      const prelude = pending;
      pending = '';
      const trimmed = prelude.trimStart();
      if (trimmed.startsWith('@')) {
        const at = /^@(-?[a-zA-Z-]+)/.exec(trimmed)?.[1]?.toLowerCase() ?? '';
        if (at === 'keyframes' || at === '-webkit-keyframes') {
          emit(prelude.replace(/^(\s*@(?:-webkit-)?keyframes\s+)(-?[A-Za-z_][A-Za-z0-9_-]*)/, (_m, lead, name) => `${lead}${renameKeyframe(name)}`) + '{', 'verbatim');
          stack.push('decls');
        } else if (RULE_HOLDING.has(at)) {
          emit(`${prelude}{`, 'verbatim');
          stack.push('rules');
        } else {
          emit(`${prelude}{`, 'verbatim');
          stack.push('decls');
        }
      } else {
        emit(`${scopeSelector(prelude, rename)}{`, 'verbatim');
        stack.push('decls');
      }
      continue;
    }
    if (char === '}') {
      emit(pending, context() === 'decls' ? 'decls' : 'verbatim');
      pending = '';
      emit('}', 'verbatim');
      stack.pop();
      continue;
    }
    pending += char;
  }
  emit(pending, 'verbatim');

  const out = pieces
    .map(piece => piece.kind === 'decls' ? scopeAnimationValues(piece.text, keyframe) : piece.text)
    .join('');
  return { css: restoreGlobals(out, bodies), map };
}

/** Inject each sheet once, keyed by scope prefix, and export the name map. */
export function cssModuleCode(id, scoped, map) {
  const entries = [...map].map(([from, to]) => `\t${JSON.stringify(from)}: ${JSON.stringify(to)},`).join('\n');
  return [
    `const sheetId = ${JSON.stringify(id)};`,
    `const text = ${JSON.stringify(scoped)};`,
    `if (typeof document !== 'undefined' && !document.querySelector('style[data-deckseek-sheet="' + sheetId + '"]')) {`,
    `\tconst tag = document.createElement('style');`,
    `\ttag.setAttribute('data-deckseek-sheet', sheetId);`,
    `\ttag.textContent = text;`,
    `\tdocument.head.appendChild(tag);`,
    `}`,
    `export default {\n${entries}\n};`,
  ].join('\n');
}

/**
 * Virtual-id prefix keeping sheets away from tsdown's own CSS pipeline. The
 * suffix matters: a resolved id that still ended in `.module.css` is claimed by
 * `@tsdown/css`, which then tries to parse the generated JavaScript as CSS.
 */
export const VIRTUAL = '\0deckseek-css:';
export const VIRTUAL_SUFFIX = '?module-sheet';

/** Rolldown plugin binding `*.module.css` to the transform above. */
export function cssModules() {
  return {
    name: 'deckseek-css-modules',
    resolveId(source, importer) {
      if (!source.endsWith('.module.css')) return null;
      return VIRTUAL + resolve(importer ? dirname(importer) : '.', source) + VIRTUAL_SUFFIX;
    },
    load(id) {
      if (!id.startsWith(VIRTUAL)) return null;
      const file = id.slice(VIRTUAL.length, -VIRTUAL_SUFFIX.length);
      const prefix = `_${createHash('sha256').update(file).digest('base64url').slice(0, 6)}_`;
      const { css, map } = scopeCss(readFileSync(file, 'utf8'), prefix);
      return cssModuleCode(file, css, map);
    },
  };
}

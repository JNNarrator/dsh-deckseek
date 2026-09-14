/**
 * The terminal skin's idle mark: three stacked records, drawn as braille dots.
 *
 * Braille is the one dot-matrix alphabet a terminal already has — one character
 * carries a 2x4 dot cell, so a mark costs a quarter of the rows a block-art logo
 * would and normalises to whatever monospace the reader is set in. Two of the
 * reference TUIs draw their product mark this way (Codewhale's idle screen,
 * grok-build's welcome logo), which is why the mechanism is borrowed even though
 * the mark itself is ours: a deck of records, the front one carrying a line of
 * "text". See docs/design/terminal-skin-v3.md.
 *
 * Every line is exactly {@link EMPTY_MARK_COLUMNS} cells, so the shape survives
 * a font that renders braille at double width: the mark widens as a whole rather
 * than shearing. `tests/empty-mark.test.ts` holds both invariants.
 */
export const EMPTY_MARK_COLUMNS = 15;

export const EMPTY_MARK = [
  '⠀⠀⠀⠀⠤⠤⠤⠤⠤⠤⠤⠀⠀⠀⠀',
  '⠀⠀⠀⠃⣀⣀⣀⣀⣀⣀⣀⠘⠀⠀⠀',
  '⠀⠀⠀⡀⠒⠒⠒⠒⠒⠒⠒⢀⠀⠀⠀',
  '⠀⠀⠀⠁⠤⠤⠤⠤⠤⠤⠤⠈⠀⠀⠀',
  '⠀⠀⠀⡄⠉⢩⣭⣭⠉⠉⠉⢠⠀⠀⠀',
  '⠀⠀⠀⠀⠒⠚⠛⠛⠒⠒⠒⠀⠀⠀⠀',
].join('\n');

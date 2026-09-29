import { type ReaderCommand } from './commands.js';
/**
 * The reading view's command palette.
 *
 * Everything it can do is also reachable without it — the palette is the
 * discoverable index, not the only door: each entry carries the keystroke that
 * runs it directly where one exists. It filters as you type, walks with the
 * arrow keys, and closes before running so the command's own focus lands on a
 * page with no palette in the way.
 */
export declare function CommandPalette({ commands, onClose }: {
    commands: readonly ReaderCommand[];
    onClose: () => void;
}): import("react").JSX.Element;
//# sourceMappingURL=CommandPalette.d.ts.map
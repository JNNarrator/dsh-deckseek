import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { filterCommands, groupCommands } from './commands.js';
import { ui } from './locale.js';
import css from './Reader.module.css';
/**
 * The reading view's command palette.
 *
 * Everything it can do is also reachable without it — the palette is the
 * discoverable index, not the only door: each entry carries the keystroke that
 * runs it directly where one exists. It filters as you type, walks with the
 * arrow keys, and closes before running so the command's own focus lands on a
 * page with no palette in the way.
 */
export function CommandPalette({ commands, onClose }) {
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const input = useRef(null);
    const list = useMemo(() => filterCommands(commands, query), [commands, query]);
    const groups = useMemo(() => groupCommands(list), [list]);
    // Focus goes to the field, not the list: a palette is typed into first.
    useEffect(() => { input.current?.focus(); }, []);
    // A new query re-ranks the list, so the highlight returns to the best match
    // rather than staying on whatever index the previous list happened to hold.
    useEffect(() => { setActive(0); }, [query]);
    const run = useCallback((command) => {
        if (!command)
            return;
        onClose();
        command.run();
    }, [onClose]);
    const onKeyDown = (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive(index => list.length === 0 ? 0 : (index + 1) % list.length);
        }
        else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive(index => list.length === 0 ? 0 : (index - 1 + list.length) % list.length);
        }
        else if (event.key === 'Enter') {
            event.preventDefault();
            run(list[active]);
        }
    };
    // The highlighted row is found by id, not by walking the group headings, so
    // the flat index the arrow keys move stays in step with the grouped render.
    const activeId = list[active]?.id;
    return _jsx("div", { className: css.paletteScrim, onMouseDown: event => { if (event.target === event.currentTarget)
            onClose(); }, children: _jsxs("div", { className: css.palette, role: "dialog", "aria-modal": "true", "aria-label": ui('palette.title'), "data-reader-palette": true, onKeyDown: onKeyDown, children: [_jsxs("div", { className: css.paletteField, children: [_jsx("span", { className: css.palettePrompt, "aria-hidden": "true", children: ">" }), _jsx("input", { ref: input, className: css.paletteInput, value: query, onChange: event => setQuery(event.target.value), placeholder: ui('palette.placeholder'), "aria-label": ui('palette.placeholder'), "aria-controls": "dsh-deckseek-palette-list", "aria-expanded": "true", role: "combobox", autoComplete: "off", spellCheck: false })] }), list.length === 0
                    ? _jsx("p", { className: css.paletteEmpty, children: ui('palette.empty') })
                    : _jsx("div", { className: css.paletteList, id: "dsh-deckseek-palette-list", role: "listbox", "aria-label": ui('palette.title'), children: groups.map(group => _jsxs("div", { className: css.paletteGroup, children: [_jsx("p", { className: css.paletteGroupLabel, "aria-hidden": "true", children: group.group }), group.commands.map(command => _jsxs("button", { type: "button", role: "option", "aria-selected": command.id === activeId, className: css.paletteItem, "data-active": command.id === activeId || undefined, onMouseEnter: () => setActive(list.indexOf(command)), onClick: () => run(command), children: [_jsx("span", { className: css.paletteLabel, children: command.label }), command.hint !== undefined && _jsx("kbd", { className: css.paletteHint, children: command.hint })] }, command.id))] }, group.group)) }), _jsx("p", { className: css.paletteNote, "aria-hidden": "true", children: ui('help.note.palette') })] }) });
}
//# sourceMappingURL=CommandPalette.js.map
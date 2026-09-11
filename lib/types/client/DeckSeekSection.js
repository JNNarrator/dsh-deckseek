import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import { SKIN_IDS } from '../skin.js';
import { skinHint, skinName, ui } from './locale.js';
import css from './DeckSeekSection.module.css';
export const DeckSeekSection = memo(function DeckSeekSection({ useSkin, useWritable, setSkin }) {
    const skin = useSkin();
    const writable = useWritable();
    return _jsxs("section", { className: css.section, children: [_jsx("h2", { className: css.title, children: ui('settings.title') }), _jsx("p", { className: css.subtitle, children: ui('settings.subtitle') }), _jsx("h3", { className: css.label, children: ui('settings.appearance') }), _jsx("div", { className: css.tiles, role: "radiogroup", "aria-label": ui('settings.appearance'), children: SKIN_IDS.map(id => _jsxs("button", { type: "button", role: "radio", "aria-checked": skin === id, "data-skin": id, "data-selected": skin === id || undefined, disabled: !writable, className: css.tile, onClick: () => { setSkin(id); }, children: [_jsxs("span", { className: css.tileHead, children: [_jsx("span", { className: css.tileName, children: skinName(id) }), _jsx("span", { className: css.check, "aria-hidden": "true", children: "\u2713" })] }), _jsx("span", { className: css.tileHint, children: skinHint(id) }), _jsxs("span", { className: css.preview, "aria-hidden": "true", "data-preview": id, children: [_jsx("span", { className: css.pvUser }), _jsx("span", { className: css.pvCard }), _jsx("span", { className: css.pvAnswer })] })] }, id)) }), !writable && _jsx("p", { className: css.readonly, role: "status", children: ui('settings.readonly') })] });
});
//# sourceMappingURL=DeckSeekSection.js.map
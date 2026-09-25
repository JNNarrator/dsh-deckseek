import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { DisclosureRow } from '@deepseek-ai/dsh-client-ui-primitives';
import { AgentGlyph, BranchGlyph, GlobeGlyph, GoalGlyph, PluginGlyph, QueueGlyph, ScheduleGlyph, TriggerGlyph } from '../icons.js';
import { NoticeBody } from './ContextBody.js';
import css from './ContextInjectionRow.module.css';
import triggerCss from './TurnTriggerRow.module.css';
const TRIGGER_FAMILIES = [
    'request', 'goal', 'agent', 'team', 'subagent', 'github', 'webhook', 'schedule', 'job', 'plugin',
];
/**
 * The glyph for each family. Deliberately a plain record rather than a lookup
 * built at module load: an unknown family must not be able to throw, and the
 * fallback below is the only glyph that has to exist.
 */
const TriggerGlyphS = {
    request: TriggerGlyph,
    goal: GoalGlyph,
    agent: AgentGlyph,
    team: AgentGlyph,
    subagent: AgentGlyph,
    github: BranchGlyph,
    webhook: GlobeGlyph,
    schedule: ScheduleGlyph,
    job: QueueGlyph,
    plugin: PluginGlyph,
};
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value
        : {};
}
function field(source, key) {
    return typeof source[key] === 'string' ? source[key] : '';
}
/**
 * Resolve a waking message's source family.
 *
 * An unrecognised `kind` is attributed to `request`, the neutral family, rather
 * than being hidden: the harness's own `turnTriggerDetails` does the same, and
 * the alternative — dropping the row — would make a turn appear to have started
 * on its own. Nothing here reads success or failure out of the source, because
 * the durable record does not carry it.
 * @param node - durable trigger context, including the original notification body.
 * @returns the family whose title and glyph the row presents.
 */
export function triggerFamily(node) {
    const source = record(node.source);
    switch (field(source, 'kind')) {
        case 'goal': return 'goal';
        case 'agent-message': return 'agent';
        case 'team-message': return 'team';
        case 'subagent-settled': return 'subagent';
        case 'webhook': return field(source, 'provider') === 'github' ? 'github' : 'webhook';
        case 'schedule': return 'schedule';
        case 'tool-jobs': return 'job';
        case 'cordis-host-runner': return 'plugin';
        default: return 'request';
    }
}
/**
 * The dictionary key holding each family's title.
 *
 * Spelled out rather than built as `\`trigger.${family}\`` so the mapping stays
 * checked against the plugin dictionary: a dynamic key would silently resolve
 * to a missing entry, and a missing entry renders the key itself.
 */
const TRIGGER_TITLES = {
    request: 'trigger.request',
    goal: 'trigger.goal',
    agent: 'trigger.agent',
    team: 'trigger.team',
    subagent: 'trigger.subagent',
    github: 'trigger.github',
    webhook: 'trigger.webhook',
    schedule: 'trigger.schedule',
    job: 'trigger.job',
    plugin: 'trigger.plugin',
};
/** The dictionary key holding a family's title. */
export function triggerTitleKey(family) {
    return TRIGGER_TITLES[family];
}
/** Whether a string names a family this row can present. */
export function isTriggerFamily(value) {
    return TRIGGER_FAMILIES.includes(value);
}
/** The name a producer recorded, or null when the durable source names none. */
export function triggerSourceName(node) {
    const source = record(node.source);
    for (const key of ['label', 'name', 'id']) {
        const value = field(source, key);
        if (value !== '')
            return value;
    }
    return null;
}
/**
 * Render a non-human message that began a turn.
 *
 * A trigger is the first thing in a turn and the only durable record of why the
 * turn exists, so the reading view keeps it even when process detail is folded
 * away. It is collapsed by default — the title alone answers "why did this turn
 * start" for the common cases — and expands to the notification body, prefixed
 * by the harness's own explanation of what the row is.
 * @param props - Durable trigger content, its source, and the locale seat.
 * @returns A collapsed trigger notice, expandable to the notification body.
 */
export function TurnTriggerRow({ node, title, explanation, t }) {
    const [open, setOpen] = useState(false);
    const family = triggerFamily(node);
    const FamilyGlyph = TriggerGlyphS[family];
    const source = triggerSourceName(node);
    return (_jsx("div", { "data-trigger-family": family, children: _jsx(DisclosureRow, { className: css.root, icon: _jsx(FamilyGlyph, { size: 14 }), chevronClassName: css.chevron, title: title, collapsedContent: source === null ? undefined : (_jsxs(_Fragment, { children: [_jsx("span", { className: css.sep, "aria-hidden": true }), _jsx("span", { className: css.source, "data-trigger-source": true, children: source })] })), keepContentWhenOpen: true, open: open, expandable: true, expandOnRowClick: true, onToggle: () => { setOpen(value => !value); }, children: _jsxs("div", { className: css.body, "data-turn-trigger-body": true, children: [_jsx("p", { className: triggerCss.explanation, children: explanation }), _jsx(NoticeBody, { content: node.content, source: node.source, t: t })] }) }) }));
}
//# sourceMappingURL=TurnTriggerRow.js.map
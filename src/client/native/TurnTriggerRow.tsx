import { useState } from 'react'
import type { ContextMessageNode } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { DisclosureRow } from '@deepseek-ai/dsh-client-ui-primitives'
import { AgentGlyph, BranchGlyph, GlobeGlyph, GoalGlyph, PluginGlyph, QueueGlyph, ScheduleGlyph, TriggerGlyph } from '../icons.js'
import { NoticeBody } from './ContextBody.js'
import css from './ContextInjectionRow.module.css'
import triggerCss from './TurnTriggerRow.module.css'

/**
 * Source families a waking message can come from.
 *
 * These are the durable `source.kind` values the harness records, plus the one
 * split that matters to a reader: a webhook from GitHub is reported as a
 * webhook at the event level but reads completely differently from an arbitrary
 * caller, so `github` is its own family rather than an alias of `webhook`.
 */
export type TriggerFamily =
  | 'request' | 'goal' | 'agent' | 'team' | 'subagent'
  | 'github' | 'webhook' | 'schedule' | 'job' | 'plugin'

const TRIGGER_FAMILIES: readonly TriggerFamily[] = [
  'request', 'goal', 'agent', 'team', 'subagent', 'github', 'webhook', 'schedule', 'job', 'plugin',
]

/**
 * The glyph for each family. Deliberately a plain record rather than a lookup
 * built at module load: an unknown family must not be able to throw, and the
 * fallback below is the only glyph that has to exist.
 */
const TriggerGlyphS: Record<TriggerFamily, typeof TriggerGlyph> = {
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
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function field(source: Record<string, unknown>, key: string): string {
  return typeof source[key] === 'string' ? source[key] : ''
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
export function triggerFamily(node: ContextMessageNode): TriggerFamily {
  const source = record(node.source)
  switch (field(source, 'kind')) {
    case 'goal': return 'goal'
    case 'agent-message': return 'agent'
    case 'team-message': return 'team'
    case 'subagent-settled': return 'subagent'
    case 'webhook': return field(source, 'provider') === 'github' ? 'github' : 'webhook'
    case 'schedule': return 'schedule'
    case 'tool-jobs': return 'job'
    case 'cordis-host-runner': return 'plugin'
    default: return 'request'
  }
}

/** The dictionary key holding a family's title, as written in the plugin dictionary. */
export type TriggerTitleKey =
  | 'trigger.request' | 'trigger.goal' | 'trigger.agent' | 'trigger.team' | 'trigger.subagent'
  | 'trigger.github' | 'trigger.webhook' | 'trigger.schedule' | 'trigger.job' | 'trigger.plugin'

/**
 * The dictionary key holding each family's title.
 *
 * Spelled out rather than built as `\`trigger.${family}\`` so the mapping stays
 * checked against the plugin dictionary: a dynamic key would silently resolve
 * to a missing entry, and a missing entry renders the key itself.
 */
const TRIGGER_TITLES: Record<TriggerFamily, TriggerTitleKey> = {
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
}

/** The dictionary key holding a family's title. */
export function triggerTitleKey(family: TriggerFamily): TriggerTitleKey {
  return TRIGGER_TITLES[family]
}

/** Whether a string names a family this row can present. */
export function isTriggerFamily(value: string): value is TriggerFamily {
  return (TRIGGER_FAMILIES as readonly string[]).includes(value)
}

/** The name a producer recorded, or null when the durable source names none. */
export function triggerSourceName(node: ContextMessageNode): string | null {
  const source = record(node.source)
  for (const key of ['label', 'name', 'id'] as const) {
    const value = field(source, key)
    if (value !== '') return value
  }
  return null
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
export function TurnTriggerRow({ node, title, explanation, t }: {
  node: ContextMessageNode
  /** The localized family title, resolved by the caller from the plugin dictionary. */
  title: string
  /** The localized explanation that this notice began the turn. */
  explanation: string
  /**
   * Host locale seat, passed only by seats that hold one. The reading view's
   * `MainNode` deliberately does not, so the body falls back to the plugin's
   * own labels rather than the whole row being unavailable there.
   */
  t?: TranslateNS<'chat'>
}) {
  const [open, setOpen] = useState(false)
  const family = triggerFamily(node)
  const FamilyGlyph = TriggerGlyphS[family]
  const source = triggerSourceName(node)

  return (
    // The family rides the wrapper, not just the expanded body: a collapsed row
    // is the common case, and "who woke this turn" is the one fact the row
    // exists to carry. Leaving it on the body alone would make the family
    // readable only after expanding, and invisible to anything selecting rows.
    <div data-trigger-family={family}>
      <DisclosureRow
        className={css.root}
        icon={<FamilyGlyph size={14} />}
        chevronClassName={css.chevron}
        title={title}
        collapsedContent={source === null ? undefined : (
          <>
            <span className={css.sep} aria-hidden />
            <span className={css.source} data-trigger-source>{source}</span>
          </>
        )}
        keepContentWhenOpen
        open={open}
        expandable
        expandOnRowClick
        onToggle={() => { setOpen(value => !value) }}
      >
        <div className={css.body} data-turn-trigger-body>
          <p className={triggerCss.explanation}>{explanation}</p>
          <NoticeBody content={node.content} source={node.source} t={t} />
        </div>
      </DisclosureRow>
    </div>
  )
}
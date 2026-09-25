/**
 * Reading-view glyph bindings.
 *
 * DSH 0.1.7 replaced every shared product glyph with a size-neutral weight pair:
 * `*Regular` draws the one-pixel artwork, `*Medium` draws the same paths at
 * 1.3px, and the rendered edge moved onto the `size` prop. Each glyph's former
 * numeric suffix survives as its own default size, so the bindings below keep
 * the pre-0.1.7 rendering exactly — no call site needs an explicit `size`.
 *
 * This module is the single place that names a host weight, so the next host
 * rename is one edit instead of a sweep across the view.
 *
 * Weight policy: `Regular` everywhere. `Medium` is the host's
 * deliberate-emphasis weight — it is reserved for new-Session controls,
 * settings navigation, and appearance choices. The reading view carries no
 * glyph that warrants it: its own controls are labelled buttons, and every
 * glyph here is row furniture that identifies a record rather than an action.
 *
 * Names are the reading view's own vocabulary, not the host's glyph names, so
 * a host rename never reaches a call site.
 */
import type { ToolCategory } from './tool-activity.js';
import type { ComponentType } from 'react';
export { 
/** Terminal/command tool family. */
IconApiOutlineRegular as TerminalGlyph, 
/** Browse/read tool family and inline file references. */
IconBrowseOutlineRegular as BrowseGlyph, 
/** Injected (non-recall) context, as opposed to a recalled session. */
IconContextInjectionOutlineRegular as ContextGlyph, 
/** Edit/write tool family. */
IconEditOutlineRegular as EditGlyph, 
/** Closed-folder inline reference. */
IconFolderCloseRegular as FolderGlyph, 
/** Search/grep/glob and web tool families. */
IconSearchOutlineRegular as SearchGlyph, 
/** Skill tool. */
IconSkillOutlineRegular as SkillGlyph, 
/**
 * Turn-trigger source families. A waking message is neither a tool call nor
 * an action, so it borrows the family glyph its source already reads as
 * rather than a single generic notice icon: a schedule and a GitHub webhook
 * are both "not a human", but only one of them is recurring.
 */
IconGoalOutlineRegular as GoalGlyph, IconPaperPlaneOutlineRegular as AgentGlyph, IconBranchOutlineRegular as BranchGlyph, IconGlobeOutlineRegular as GlobeGlyph, IconAlarmClockOutlineRegular as ScheduleGlyph, IconQueueOutlineRegular as QueueGlyph, IconCordisPluginOutlineRegular as PluginGlyph, IconContextInjectionOutlineRegular as TriggerGlyph, 
/** Generic tool family, and the fallback for any unclassified call. */
IconSparkleRegular as ToolGlyph, 
/** The author of a user turn. */
IconUserOutlineRegular as UserGlyph, } from '@deepseek-ai/dsh-client-ui-primitives';
/**
 * The glyph a folded turn's header carries, by the family that did its most
 * work. Reuses the row vocabulary above so a header and a row for the same call
 * read as the same thing; `other` falls to the generic tool glyph, exactly as
 * an unclassified row does.
 */
export declare const ACTIVITY_GLYPHS: Record<ToolCategory, ComponentType<{
    className?: string;
}>>;
//# sourceMappingURL=icons.d.ts.map
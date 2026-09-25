import type { Context } from '@deepseek-ai/cordis';
export declare const name = "dsh-deckseek";
export declare const inject: string[];
/**
 * The plugin's own config schema, which is also its settings section.
 *
 * 0.1.7 derives a plugin's settings namespace from its profile entry id and
 * reads the schema off `entry.fiber.runtime.Config`, replacing the old
 * imperative `ctx.settings.register(namespace, schema)` call. The namespace is
 * therefore this entry's id — {@link DECKSEEK_SETTINGS_NAMESPACE}.
 *
 * This must be the *volatile* schema, not the durable envelope: the host
 * derives the served form with `volatileForm(schema)` and drops any namespace
 * whose schema has no volatile field. See {@link DeckSeekConfigSchema}.
 */
export declare const Config: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
    skin: import("@deepseek-ai/schemastery").default<"paper" | "soft" | "terminal", "paper" | "soft" | "terminal", "volatile-defined">;
    workDetail: import("@deepseek-ai/schemastery").default<"compact" | "standard" | "detailed" | "verbose" | "normal" | "expanded", "compact" | "standard" | "detailed" | "verbose" | "normal" | "expanded", "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    skin: import("@deepseek-ai/schemastery").default<"paper" | "soft" | "terminal", "paper" | "soft" | "terminal", "volatile-defined">;
    workDetail: import("@deepseek-ai/schemastery").default<"compact" | "standard" | "detailed" | "verbose" | "normal" | "expanded", "compact" | "standard" | "detailed" | "verbose" | "normal" | "expanded", "volatile-defined">;
}>>, "plain">;
export declare function apply(ctx: Context): void;
//# sourceMappingURL=dsh-deckseek.d.ts.map
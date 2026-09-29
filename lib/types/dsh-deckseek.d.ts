import type { Context } from '@deepseek-ai/cordis';
import { type RevealRequestLike, type RevealResponseLike, type WorkspaceRegistry } from './reveal-path.js';
/**
 * The only host services this plugin uses beyond settings.
 *
 * Declared here rather than pulled from a host package: the plugin needs two
 * members of them, and a dependency on the whole contract would tie the plugin
 * to a host version for no gain. Both are resolved lazily, so a deployment that
 * provides neither still loads and simply loses the reveal route.
 */
declare module '@deepseek-ai/cordis' {
    interface Context {
        webServer?: {
            register: (route: {
                kind: 'exact' | 'prefix';
                path: string;
                handler: (req: RevealRequestLike, res: RevealResponseLike) => void | Promise<void>;
            }) => () => void;
        };
        workspaceRegistry?: WorkspaceRegistry;
    }
}
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
    skin: import("@deepseek-ai/schemastery").default<"terminal" | "soft", "terminal" | "soft", "volatile-defined">;
    texture: import("@deepseek-ai/schemastery").default<"soft" | "off" | "crt", "soft" | "off" | "crt", "volatile-defined">;
    workDetail: import("@deepseek-ai/schemastery").default<"compact" | "standard" | "detailed" | "verbose" | "normal" | "expanded", "compact" | "standard" | "detailed" | "verbose" | "normal" | "expanded", "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    skin: import("@deepseek-ai/schemastery").default<"terminal" | "soft", "terminal" | "soft", "volatile-defined">;
    texture: import("@deepseek-ai/schemastery").default<"soft" | "off" | "crt", "soft" | "off" | "crt", "volatile-defined">;
    workDetail: import("@deepseek-ai/schemastery").default<"compact" | "standard" | "detailed" | "verbose" | "normal" | "expanded", "compact" | "standard" | "detailed" | "verbose" | "normal" | "expanded", "volatile-defined">;
}>>, "plain">;
export declare function apply(ctx: Context): void;
//# sourceMappingURL=dsh-deckseek.d.ts.map
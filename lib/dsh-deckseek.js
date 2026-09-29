import { spawn } from "node:child_process";
import { realpath, stat } from "node:fs/promises";
import z from "@deepseek-ai/schemastery";
//#region src/skin.ts
/**
* Reading-skin contract shared by the Host settings schema and the browser.
* Deliberately zero imports: the client bundle must not pull the settings
* schema (and schemastery with it) in just to name a skin.
*/
/**
* Skin identifiers accepted by the settings document, in the order the
* settings page offers them. Terminal leads: it is the skin this plugin is
* now maintained around, and the shipped default.
*/
const SKIN_IDS = ["terminal", "soft"];
/** Skin used when the settings document carries no override or an unknown one. */
const DEFAULT_SKIN = "terminal";
/** Field carrying the selected skin inside that namespace. */
const SKIN_FIELD = "skin";
/**
* Screen-texture levels for the terminal skin's window.
*
* Off by default, and deliberately so: a texture that is on when nobody asked
* for it stops being a skin detail and becomes an atmosphere the reader has to
* fight. Every level here is static — scanlines, a vignette and a glow are
* painted, never animated — so this setting can never contradict the motion
* contract.
*/
const SCREEN_TEXTURE_IDS = [
	"off",
	"soft",
	"crt"
];
/** Field carrying the selected texture inside the settings namespace. */
const TEXTURE_FIELD = "texture";
/**
* How much of a Turn's process the reader shows at rest. Mirrors the host's
* `TRANSCRIPT_VIEW_MODES` so one preference means the same thing in either
* conversation view; renderers never compare this enum, they read the booleans
* of {@link WorkDetailPolicy} derived from it.
*/
const WORK_DETAIL_IDS = [
	"compact",
	"standard",
	"detailed",
	"verbose"
];
/** Field carrying the selected work-details level inside the namespace. */
const WORK_DETAIL_FIELD = "workDetail";
/** Work-details level used when the settings document carries no override. */
const DEFAULT_WORK_DETAIL = "standard";
/**
* Values the durable field accepts but never offers: the host's two-mode
* generation saved `normal` for standard and `expanded` for detailed. Reading
* them keeps an existing host preference intact instead of silently resetting.
*/
const LEGACY_WORK_DETAIL_IDS = ["normal", "expanded"];
/** Every value the durable field accepts. */
const WORK_DETAIL_SETTING_VALUES = [...WORK_DETAIL_IDS, ...LEGACY_WORK_DETAIL_IDS];
z.object({
	[SKIN_FIELD]: z.union([...SKIN_IDS]).default(DEFAULT_SKIN).loose(),
	[TEXTURE_FIELD]: z.union([...SCREEN_TEXTURE_IDS]).default("off"),
	[WORK_DETAIL_FIELD]: z.union([...WORK_DETAIL_SETTING_VALUES]).default(DEFAULT_WORK_DETAIL).loose()
});
/**
* The plugin's own config schema, which is also its settings section.
*
* This is the volatile twin of {@link DeckSeekSettingsSchema}: same fields,
* same defaults, but every field marked volatile so the settings system can
* actually serve and write it. The durable schema stays plain because it is
* also the wire envelope the browser validates against.
*/
const DeckSeekConfigSchema = z.object({
	[SKIN_FIELD]: z.union([...SKIN_IDS]).default(DEFAULT_SKIN).loose().volatile(),
	[TEXTURE_FIELD]: z.union([...SCREEN_TEXTURE_IDS]).default("off").volatile(),
	[WORK_DETAIL_FIELD]: z.union([...WORK_DETAIL_SETTING_VALUES]).default(DEFAULT_WORK_DETAIL).loose().volatile()
});
//#endregion
//#region src/reveal-path.ts
/**
* "Show this file in the OS file manager", bounded to the session's own root.
*
* The one capability in this plugin that starts a process on the user's machine,
* so the shape of the check matters more than the feature does. Two rules hold it
* shut, and both are enforced by the SERVER, never by what the caller claims:
*
*  1. The root is derived from the session id through the host's own workspace
*     registry. A request cannot name a root, only a session.
*  2. The target is resolved with `realpath` and compared to the resolved root,
*     so a symlink out of the tree is followed and then rejected. A lexical
*     prefix check alone would accept it.
*
* Every failure is a refusal. Nothing here opens a path it cannot account for.
*
* Ported from upstream `2ac5471`, whose version spawned whatever path it was
* given — the difference is the whole reason this module exists.
*/
/** The route this plugin owns. Namespaced by plugin, never by upstream's name. */
const REVEAL_PATH = "/dsh-deckseek/reveal";
const WINDOWS_DRIVE = /^[A-Za-z]:[\\/]/;
/**
* One comparable absolute form of a path, or undefined when it is not absolute.
*
* Lexical only: `.` and `..` are folded here so a traversal is visible to the
* comparison, and a path that climbs past its own root returns undefined rather
* than something that merely looks short. Case is NOT folded — callers compare
* `realpath` output, and the filesystem has already decided the canonical case.
*/
function normalizeAbsolute(value) {
	if (typeof value !== "string" || value.length === 0) return void 0;
	const drive = WINDOWS_DRIVE.test(value);
	const unc = value.startsWith("\\\\");
	if (!drive && !unc && !value.startsWith("/")) return void 0;
	const parts = [];
	for (const part of (drive ? value.slice(2) : value).split(/[\\/]+/)) {
		if (part === "" || part === ".") continue;
		if (part === "..") {
			if (parts.length === 0) return void 0;
			parts.pop();
			continue;
		}
		parts.push(part);
	}
	return `${drive ? `${value.slice(0, 1).toUpperCase()}:` : ""}/${parts.join("/")}`;
}
/**
* The target when it is `root` itself or lives inside it, otherwise undefined.
*
* The boundary is a separator, not a string prefix: `/w/proj2` is not inside
* `/w/proj`, and that is exactly the bug a naive `startsWith` invites.
*/
function withinRoot(root, target) {
	const base = normalizeAbsolute(root);
	const wanted = normalizeAbsolute(target);
	if (base === void 0 || wanted === void 0) return void 0;
	if (wanted === base) return wanted;
	return wanted.startsWith(base.endsWith("/") ? base : `${base}/`) ? wanted : void 0;
}
/**
* How the OS is asked to reveal a file, per platform. `open -R` selects the file
* in Finder rather than opening it; Explorer has `/select,` for the same.
*
* `xdg-open` has no "select" and would OPEN the file, so Linux is deliberately
* not claimed as supported: revealing is not the same as launching, and this
* plugin does not get to decide to run a file.
*/
function systemOpener(platform) {
	if (platform === "darwin") return {
		command: "open",
		args: (path) => ["-R", path]
	};
	if (platform === "win32") return {
		command: "explorer.exe",
		args: (path) => [`/select,${path}`]
	};
}
function respond(res, status, body) {
	res.statusCode = status;
	res.setHeader?.("Content-Type", "application/json");
	res.end(JSON.stringify(body));
}
function refusal(res, warn, status, reason) {
	warn("[dsh-deckseek] reveal refused:", reason);
	respond(res, status, {
		ok: false,
		error: reason
	});
}
/**
* The route object the host registers. Every dependency is injected so the whole
* decision can be driven in a test with a fake registry and a recorded spawn —
* this is the only place in the plugin that runs something, so it is the last
* place that should be testable only through a running harness.
*/
function createRevealRoute(deps) {
	const handler = async (req, res) => {
		if (req.method !== "POST") {
			refusal(res, deps.warn, 405, "the reveal route only accepts POST");
			return;
		}
		let requested;
		let sessionId;
		try {
			const body = await deps.readBody(req);
			const parsed = JSON.parse(body);
			requested = parsed?.path;
			sessionId = parsed?.sessionId;
		} catch (error) {
			refusal(res, deps.warn, 400, `unreadable request body: ${String(error)}`);
			return;
		}
		if (typeof requested !== "string" || typeof sessionId !== "string" || requested.length === 0 || sessionId.length === 0) {
			refusal(res, deps.warn, 400, "the request needs a sessionId and a path");
			return;
		}
		const registry = deps.registry();
		if (registry === void 0) {
			refusal(res, deps.warn, 403, "this deployment has no workspace registry to bound the request with");
			return;
		}
		const root = registry.list().find((workspace) => workspace.sessionIds.includes(sessionId))?.path;
		if (typeof root !== "string" || root.length === 0) {
			refusal(res, deps.warn, 403, `session ${sessionId} belongs to no known workspace`);
			return;
		}
		if (!await deps.exists(requested)) {
			refusal(res, deps.warn, 403, "the requested path does not exist");
			return;
		}
		const realRoot = await deps.realpath(root);
		const realTarget = await deps.realpath(requested);
		const bounded = realRoot === void 0 || realTarget === void 0 ? void 0 : withinRoot(realRoot, realTarget);
		if (bounded === void 0) {
			refusal(res, deps.warn, 403, `the requested path is outside ${root}`);
			return;
		}
		const opener = systemOpener(deps.platform);
		if (opener === void 0) {
			refusal(res, deps.warn, 501, `revealing a file is not supported on ${deps.platform}`);
			return;
		}
		try {
			deps.spawn(opener.command, opener.args(bounded));
		} catch (error) {
			refusal(res, deps.warn, 500, `the opener could not be started: ${String(error)}`);
			return;
		}
		respond(res, 200, { ok: true });
	};
	return {
		kind: "exact",
		path: REVEAL_PATH,
		handler
	};
}
//#endregion
//#region src/dsh-deckseek.ts
/** Read one request body, refusing to buffer an unbounded one. */
function readRequestBody(req) {
	return new Promise((resolve, reject) => {
		const request = req;
		if (typeof request?.on !== "function") {
			resolve("");
			return;
		}
		let body = "";
		request.on("data", (chunk) => {
			body += String(chunk);
			if (body.length > 4096) reject(/* @__PURE__ */ new Error("request body too large"));
		});
		request.on("end", () => resolve(body));
		request.on("error", (error) => reject(error instanceof Error ? error : new Error(String(error))));
	});
}
/** The host implementations behind the route's injected decision. */
function hostDeps(webCtx) {
	return {
		registry: () => webCtx.get?.("workspaceRegistry"),
		realpath: async (path) => {
			try {
				return await realpath(path);
			} catch {
				return;
			}
		},
		exists: async (path) => {
			try {
				await stat(path);
				return true;
			} catch {
				return false;
			}
		},
		spawn: (command, args) => {
			spawn(command, [...args], {
				detached: true,
				stdio: "ignore"
			}).unref();
		},
		readBody: readRequestBody,
		platform: process.platform,
		warn: (message, detail) => {
			console.warn(message, detail ?? "");
		}
	};
}
const name = "dsh-deckseek";
const inject = [];
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
const Config = DeckSeekConfigSchema;
function apply(ctx) {
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber));
	});
	ctx.inject(["webServer"], (webCtx) => {
		webCtx.effect(() => webCtx.webServer.register(createRevealRoute(hostDeps(webCtx))), "dsh-deckseek: /dsh-deckseek/reveal route");
	});
}
//#endregion
export { Config, apply, inject, name };

//# sourceMappingURL=dsh-deckseek.js.map
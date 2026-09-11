# DeckSeek 阅读皮肤 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 dsh-deckseek 加三套可选阅读皮肤（纸面 / 软卡 / 终端），并在 DSH 设置的独立 DeckSeek 页里切换。

**Architecture:** 阅读视图只渲染一份 DOM，皮肤是根元素上的 `data-deckseek-skin` 属性；所有视觉差异写在该属性前缀的 CSS 里，React 不做皮肤分支。皮肤的值来自宿主 settings 服务的一个命名空间，客户端用 `ctx.settingsScope` 订阅，通过注入面的 `useSkin()` 钩子提供给组件。颜色只取宿主 `--dsw-*` token，因此亮暗主题自动适配。

**Tech Stack:** TypeScript、React 18、CSS Modules、Cordis 插件模型、`@deepseek-ai/schemastery`、Node test runner（`node --test` + tsx + happy-dom）。

**Spec:** [docs/design/reading-skins.md](../../design/reading-skins.md)

## Global Constraints

- 版本目标 `0.7.0`：`package.json` 的 `version`、`CHANGELOG.md`、`README.md`/`README.en.md` 的功能描述在最后一个任务里同步。
- 颜色**只能**取自宿主 `--dsw-*` token。唯一例外是投影用的 `rgba(0,0,0,…)`（宿主没有 elevation token）。
- "墨"（图标、色条、状态字形）只能用 `label-*` / `state-*`。表面 token（如 `specific-bubble`）当墨用会隐身。
- `DESIGN.md` 的动效与折叠契约不变：流式揭示、推理跟随的两行步进与缓动、2s 字形 shimmer、28px 视口遮罩、14px/24px 状态标签。
- 文案走插件自带的 `src/client/locale.ts` 双字典（zh/en）。**每次加键必须两个字典同时补齐**（`tests/locale.test.ts` 校验键集一致）。
- 新增依赖：`@deepseek-ai/schemastery`（**dependencies**，`^3.18.2`——宿主半运行时构造 schema）、`@deepseek-ai/dsh-settings` 与 `@deepseek-ai/dsh-client-ui-settings`（**devDependencies**，`0.0.1-rc.1`——纯类型依赖）。三者都要加进 `scripts/link-harness-dependencies.mjs` 的 `shared` 映射。**不要**给后两者加 peerDependencies。
- `lib/` 是**提交进仓库**的构建产物：中间任务只提交源码，避免构建噪声；最后一个任务统一 `npm run build` 并提交 `lib/`。
- `.gitignore` 增加 `.superpowers/`（可视化伴侣的产物，不该入库）。

**验证命令（每个任务都会用到）**

```sh
cd /Users/jiangnan/Documents/workspace/dsh-deckseek
npm run typecheck     # tsc --noEmit
npm test              # 全量：node --import tsx/esm --import ./tests/setup-dom.mjs --test "tests/*.test.ts" "tests/*.test.tsx"
# 单文件（注意：本仓库 Node 版本不接受 `node --test tests/` 目录形式）
node --import tsx/esm --import ./tests/setup-dom.mjs --test tests/skin.test.ts
```

构建（只在最后一个任务执行）：

```sh
DSHX_HARNESS=/Users/jiangnan/Documents/workspace/deepseek-harness npm run build
```

（**两个检出分工不同，混用会炸**：构建适配器 `tools/dshx` 只在旧检出 `workspace/deepseek-harness`，所以 `DSHX_HARNESS` 必须指向它；而构建产物 `lib/` 只在新检出 `~/Documents/deepseek-harness`，所以 `node_modules` 的开发软链必须指向**新检出**——同一批软链拆到两个检出会让 React 变成双实例，报 "Cannot read properties of null (reading 'useState')"。

开工前确认链路：

```sh
readlink node_modules/@deepseek-ai/dsh-client-ui-primitives   # 应指向 ~/Documents/deepseek-harness
npm test                                                       # 开工前基线：101 项，全绿
```）

- 各任务 `Expected:` 行里的测试**绝对条数只是指示**——每完成一个任务都会新增测试，数字必然滚动。真正的验收标准是"本任务新增的测试全绿、且没有回归"。派发时控制器会给出当时的真实基线，不要去凑某个数字，更不要为了对齐数字而增删断言。
- `package-lock.json` 是**被跟踪**的文件。改动 `package.json` 的依赖后它会失配，而本仓库禁止跑 `pnpm install`（会重写软链）。统一在最后一个任务里用 `npm install --package-lock-only` 重建并提交。

## File Structure

新增：

| 文件 | 职责 |
|---|---|
| `src/skin.ts` | 皮肤契约：id 联合、默认值、`isSkin`/`parseSkin`、设置命名空间与字段名。**零 import**，宿主与客户端共用，避免把 schema 拖进客户端 bundle。 |
| `src/skin-settings.ts` | 宿主侧 settings schema（`@deepseek-ai/schemastery`）。 |
| `src/client/DeckSeekSection.tsx` | 设置页组件（三个皮肤磁贴）。 |
| `src/client/DeckSeekSection.module.css` | 设置页样式。 |
| `tests/skin.test.ts` | 皮肤解析单测。 |
| `tests/skin-settings.test.ts` | schema 默认值与透传单测。 |
| `tests/deckseek-section.client.test.tsx` | 设置页渲染与交互测试。 |

修改：

| 文件 | 改动 |
|---|---|
| `src/dsh-deckseek.ts` | 注册 `deckseek` 设置命名空间（当前是空壳 + 一行 log）。 |
| `src/client/index.tsx` | 绑定 scope，定义 `useSkin`/`setSkin`/`useWritable`，注册 `settings.section`，注入面加 `useSkin`。 |
| `src/client/types.ts` | `ReaderInjected` 加 `useSkin`；新增设置页注入面类型。 |
| `src/client/Reader.tsx` | 根元素改为 `data-deckseek-skin`（删掉过期的 `data-dsh-deckseek="0.5.0"`），渲染装饰件并集。 |
| `src/client/Reader.module.css` | `--dsh-card-*` → `--dx-*`，加三块皮肤覆盖。 |
| `src/client/ToolActivity.tsx` | 前导格与状态字形（终端皮肤）。 |
| `src/client/locale.ts` | 设置页文案键 + `skinName`/`skinHint` 两个按 id 取词的辅助函数。 |
| `package.json` | 版本、依赖、`dsh.client.inject`。 |
| `scripts/link-harness-dependencies.mjs` | `shared` 映射加三个包。 |
| `CHANGELOG.md`、`README.md`、`README.en.md` | 版本与功能描述。 |

---

### Task 1: 皮肤契约与解析

**Files:**
- Create: `src/skin.ts`
- Create: `tests/skin.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `SKIN_IDS: readonly ['paper','soft','terminal']`、`type SkinId`、`DEFAULT_SKIN: SkinId`、`DECKSEEK_SETTINGS_NAMESPACE: 'deckseek'`、`SKIN_FIELD: 'skin'`、`isSkin(value: unknown): value is SkinId`、`parseSkin(value: unknown): SkinId`。后续所有任务都从这里取这些名字。

- [ ] **Step 1: 写失败的测试**

`tests/skin.test.ts`：

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SKIN, SKIN_IDS, isSkin, parseSkin } from '../src/skin.js';

test('every declared skin parses to itself', () => {
  for (const id of SKIN_IDS) assert.equal(parseSkin(id), id);
});

test('unknown and missing values fall back to the default skin', () => {
  assert.equal(parseSkin('neon'), DEFAULT_SKIN);
  assert.equal(parseSkin(undefined), DEFAULT_SKIN);
  assert.equal(parseSkin(null), DEFAULT_SKIN);
  assert.equal(parseSkin(3), DEFAULT_SKIN);
  assert.equal(parseSkin({ skin: 'paper' }), DEFAULT_SKIN);
});

test('the default is one of the declared skins', () => {
  assert.ok(SKIN_IDS.includes(DEFAULT_SKIN));
});

test('isSkin narrows only declared skins', () => {
  assert.equal(isSkin('terminal'), true);
  assert.equal(isSkin('Terminal'), false);
  assert.equal(isSkin(''), false);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx/esm --import ./tests/setup-dom.mjs --test tests/skin.test.ts`
Expected: FAIL — `Cannot find module '../src/skin.js'`

- [ ] **Step 3: 写实现**

`src/skin.ts`：

```ts
/**
 * Reading-skin contract shared by the Host settings schema and the browser.
 * Deliberately zero imports: the client bundle must not pull the settings
 * schema (and schemastery with it) in just to name a skin.
 */

/** Skin identifiers accepted by the settings document. */
export const SKIN_IDS = ['paper', 'soft', 'terminal'] as const;

/** One reading skin: editorial flow, cards, or instrument rows. */
export type SkinId = typeof SKIN_IDS[number];

/** Skin used when the settings document carries no override or an unknown one. */
export const DEFAULT_SKIN: SkinId = 'soft';

/** Settings namespace owned by this plugin. */
export const DECKSEEK_SETTINGS_NAMESPACE = 'deckseek';

/** Field carrying the selected skin inside that namespace. */
export const SKIN_FIELD = 'skin';

/**
 * @param value - value crossing the settings or registry boundary.
 * @returns whether the value is one of the declared skins.
 */
export function isSkin(value: unknown): value is SkinId {
  return typeof value === 'string' && (SKIN_IDS as readonly string[]).includes(value);
}

/**
 * @param value - value crossing the settings boundary.
 * @returns the matching skin, or {@link DEFAULT_SKIN} for anything else.
 */
export function parseSkin(value: unknown): SkinId {
  return isSkin(value) ? value : DEFAULT_SKIN;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `node --import tsx/esm --import ./tests/setup-dom.mjs --test tests/skin.test.ts`
Expected: PASS — 4 tests

- [ ] **Step 5: 忽略可视化伴侣产物**

`.gitignore` 追加一行：

```
.superpowers/
```

- [ ] **Step 6: 提交**

```bash
git add src/skin.ts tests/skin.test.ts .gitignore
git commit -m "feat(skin): reading-skin contract and parser"
```

---

### Task 2: 宿主侧设置命名空间

**Files:**
- Create: `src/skin-settings.ts`
- Create: `tests/skin-settings.test.ts`
- Modify: `src/dsh-deckseek.ts`
- Modify: `package.json`
- Modify: `scripts/link-harness-dependencies.mjs`

**Interfaces:**
- Consumes: `DEFAULT_SKIN`、`SKIN_FIELD`、`SKIN_IDS`、`SkinId`（Task 1）
- Produces: `interface DeckSeekSettings { skin: SkinId }`、`DeckSeekSettingsSchema`。客户端 Task 3 用 `DeckSeekSettings` 作为 scope 的泛型参数。

- [ ] **Step 1: 写失败的测试**

`tests/skin-settings.test.ts`：

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SKIN } from '../src/skin.js';
import { DeckSeekSettingsSchema } from '../src/skin-settings.js';

test('an empty section resolves to the default skin', () => {
  assert.equal(DeckSeekSettingsSchema({}).skin, DEFAULT_SKIN);
});

test('a declared skin passes through', () => {
  assert.equal(DeckSeekSettingsSchema({ skin: 'terminal' }).skin, 'terminal');
  assert.equal(DeckSeekSettingsSchema({ skin: 'paper' }).skin, 'paper');
});
```

> 未知值的处理**不在这里断言**：设计文档规定未知值由客户端 `parseSkin` 回退到默认（Task 1 已覆盖）。宿主 schema 若顺带拒绝非法值是加分项，但不作为本任务的验收条件。

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx/esm --import ./tests/setup-dom.mjs --test tests/skin-settings.test.ts`
Expected: FAIL — `Cannot find module '../src/skin-settings.js'`

- [ ] **Step 3: 加依赖并建链**

`package.json`：

- `dependencies` 加 `"@deepseek-ai/schemastery": "^3.18.2"`。

  > **不要写 `workspace:^`**。那是宿主仓库内部的写法（`ui-theme` 用它是因为它自己就在那个 pnpm workspace 里）；本插件在仓库之外分发，消费者 `pnpm install` 时无法解析 `workspace:` 协议。registry 上 `@deepseek-ai/schemastery` 的最新版是 `3.18.2`，与 `vendor/schemastery` 一致。宿主半在模块加载时就要构造 schema 对象，所以这是**运行时**依赖。

- `devDependencies` 加 `"@deepseek-ai/dsh-settings": "0.0.1-rc.1"`、`"@deepseek-ai/dsh-client-ui-settings": "0.0.1-rc.1"`。

  > 这两个包在 registry 上只发布到 `0.0.1-rc.1`。它们**只用于类型**（`ctx.settings` 与 `ctx.settingsScope` 的模块增强），编译时被擦除，`ui-theme` 同样只把它们放在 devDependencies。

- **不要**给这两个包加 `peerDependencies`。它们是纯类型依赖，加进去只会让消费者去解析一个不存在的版本区间而安装失败。

`scripts/link-harness-dependencies.mjs` 的 `shared` 对象里加三行（包名 → 相对检出根的路径）：

```js
'@deepseek-ai/dsh-client-ui-settings': 'packages/client/ui-settings',
'@deepseek-ai/dsh-settings': 'packages/settings/settings',
'@deepseek-ai/schemastery': 'vendor/schemastery',
```

建链（脚本在已有软链指向别的检出时会报 mismatch，所以直接建这三条，不用重跑全量脚本）：

```bash
cd /Users/jiangnan/Documents/workspace/dsh-deckseek
R=/Users/jiangnan/Documents/deepseek-harness
ln -sfn "$R/packages/client/ui-settings"      node_modules/@deepseek-ai/dsh-client-ui-settings
ln -sfn "$R/packages/settings/settings"       node_modules/@deepseek-ai/dsh-settings
ln -sfn "$R/vendor/schemastery"               node_modules/@deepseek-ai/schemastery
ls -l node_modules/@deepseek-ai/ | grep -E "schemastery|dsh-settings"
```

Expected: 三条软链存在且指向 `~/Documents/deepseek-harness`（与其余 30 条同源；指向旧检出会让 React 双实例）。

- [ ] **Step 4: 写 schema**

`src/skin-settings.ts`：

```ts
/** DeckSeek section of the Host user-settings document. */

import z from '@deepseek-ai/schemastery';
import { DEFAULT_SKIN, SKIN_FIELD, SKIN_IDS, type SkinId } from './skin.js';

/** Durable DeckSeek section; also the wire envelope the browser scope validates against. */
export interface DeckSeekSettings {
  /** Selected reading skin. */
  skin: SkinId;
}

/** Durable DeckSeek schema. */
export const DeckSeekSettingsSchema: z<DeckSeekSettings> = z.object({
  [SKIN_FIELD]: z.union([...SKIN_IDS]).default(DEFAULT_SKIN),
});
```

- [ ] **Step 5: 运行确认通过**

Run: `node --import tsx/esm --import ./tests/setup-dom.mjs --test tests/skin-settings.test.ts`
Expected: PASS — 2 tests

- [ ] **Step 6: 注册到宿主**

`src/dsh-deckseek.ts` 整体替换为：

```ts
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-settings';
import { DECKSEEK_SETTINGS_NAMESPACE } from './skin.js';
import { DeckSeekSettingsSchema } from './skin-settings.js';

export const name = 'dsh-deckseek';
export const inject: string[] = [];

// Presentation only: no provider, tool, session-log or permission mutations.
export function apply(ctx: Context): void {
  // Registered only when the deployment composes the settings service; the
  // browser half renders the default skin when the namespace is absent.
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(DECKSEEK_SETTINGS_NAMESPACE, DeckSeekSettingsSchema);
  });
}
```

（原来的 `console.log('[my-plugins/dsh-deckseek] loaded')` 一并删掉。）

- [ ] **Step 7: 类型检查**

Run: `npm run typecheck`
Expected: 退出码 0，无输出

- [ ] **Step 8: 提交**

```bash
git add src/skin-settings.ts tests/skin-settings.test.ts src/dsh-deckseek.ts package.json scripts/link-harness-dependencies.mjs
git commit -m "feat(skin): durable deckseek settings namespace on the host"
```

---

### Task 3: 客户端订阅与注入面

**Files:**
- Modify: `src/client/types.ts`
- Modify: `src/client/index.tsx`

**Interfaces:**
- Consumes: `DECKSEEK_SETTINGS_NAMESPACE`、`DEFAULT_SKIN`、`SKIN_FIELD`、`SkinId`、`parseSkin`（Task 1）；`DeckSeekSettings`（Task 2）
- Produces:
  - `ReaderInjected` 新增 `useSkin: () => SkinId`
  - `interface DeckSeekSectionInjected { useSkin: () => SkinId; useWritable: () => boolean; setSkin: (next: SkinId) => void }`
  - 客户端 `inject` 数组新增 `'settingsScope'`

- [ ] **Step 1: 加注入面类型**

`src/client/types.ts`：`ReaderInjected` 接口内加一行，并在文件末尾追加设置页注入面：

```ts
export interface ReaderInjected {
  loadOlder: () => Promise<void>;
  loadImage: (attachment: ImageAttachmentRef) => Promise<{ data: Uint8Array; mediaType: string }>;
  /** Current reading skin, reactive to the Host settings document. */
  useSkin: () => SkinId;
}

/** Injected face of the DeckSeek settings page. */
export interface DeckSeekSectionInjected {
  /** Current reading skin, reactive to the Host settings document. */
  useSkin: () => SkinId;
  /** Whether the Host document accepts writes; memory-mode deployments never do. */
  useWritable: () => boolean;
  /** Persist one skin choice. */
  setSkin: (next: SkinId) => void;
}
```

文件顶部的 import 区加：

```ts
import type { SkinId } from '../skin.js';
```

- [ ] **Step 2: 绑定 scope 并暴露钩子**

`src/client/index.tsx`：`inject` 数组改为 `['slots', 'sessions', 'settingsScope']`；在 `apply` 内 `const store = createReaderStore();` 之后加：

```ts
const scope = ctx.settingsScope.bind<DeckSeekSettings>({ namespace: DECKSEEK_SETTINGS_NAMESPACE });
// One hook instance shared by the reader view and the settings page, so both
// read the same mirror and re-render on the same notification.
const useSkin = (): SkinId => useSyncExternalStore(
  scope.subscribe,
  () => parseSkin(scope.getSnapshot().value?.skin),
  () => DEFAULT_SKIN,
);
const useWritable = (): boolean => useSyncExternalStore(
  scope.subscribe,
  () => scope.getSnapshot().writable,
  () => false,
);
const setSkin = (next: SkinId): void => { void scope.set(SKIN_FIELD, next); };
```

导入区加：

```ts
import { useSyncExternalStore } from 'react';
import { DEFAULT_SKIN, DECKSEEK_SETTINGS_NAMESPACE, SKIN_FIELD, parseSkin, type SkinId } from '../skin.js';
import type { DeckSeekSettings } from '../skin-settings.js';
import { DeckSeekSection } from './DeckSeekSection.js';
import type { DeckSeekSectionInjected, ReaderInjected } from './types.js';
```

reader 注入面里加 `useSkin`：

```ts
const face: ReaderInjected = {
  loadOlder: async () => { await session().loadOlder(); },
  loadImage: async attachment => { /* 保持原实现不变 */ },
  useSkin,
};
```

并在 `installReaderEntry(ctx);` 之前注册设置页：

```ts
ctx.slots.inject('settings.section', () => ctx.slots.register({
  name: 'settings.section',
  id: 'deckseek',
  order: 30,
  label: () => ui('settings.nav'),
  inject: (): DeckSeekSectionInjected => ({ useSkin, useWritable, setSkin }),
}, DeckSeekSection));
```

> 本步骤会暂时引用尚未创建的 `DeckSeekSection`，Task 4 创建它。为了保持类型检查在每个任务结束时都是绿的，**先把 `DeckSeekSection.tsx` 建成最小空壳**（`export const DeckSeekSection = () => null;`），Task 4 再填内容。

- [ ] **Step 3: 类型检查**

Run: `npm run typecheck`
Expected: 退出码 0。若报 `Property 'settingsScope' does not exist`，检查 `dsh.client.inject`（`package.json`）是否漏了 `@deepseek-ai/dsh-client-ui-settings`。

`package.json` 的 `dsh.client.inject` 加一项：

```json
"@deepseek-ai/dsh-client-ui-settings"
```

- [ ] **Step 4: 跑全量测试确认无回归**

Run: `npm test`
Expected: 101 passing（与改动前一致；此时没有新增测试）

- [ ] **Step 5: 提交**

```bash
git add src/client/types.ts src/client/index.tsx src/client/DeckSeekSection.tsx package.json
git commit -m "feat(skin): bind the deckseek settings scope in the browser half"
```

---

### Task 4: 设置页

**Files:**
- Create: `src/client/DeckSeekSection.tsx`（替换 Task 3 的空壳）
- Create: `src/client/DeckSeekSection.module.css`
- Create: `tests/deckseek-section.client.test.tsx`
- Modify: `src/client/locale.ts`

**Interfaces:**
- Consumes: `DeckSeekSectionInjected`（Task 3）、`SKIN_IDS`（Task 1）
- Produces: `DeckSeekSection` 组件；locale 键 `settings.nav` / `settings.title` / `settings.subtitle` / `settings.appearance` / `settings.readonly` / `settings.skin.<id>` / `settings.skin.<id>.hint`，以及 `skinName(id)`、`skinHint(id)` 辅助函数。

- [ ] **Step 1: 补文案键**

`src/client/locale.ts` 的 `zh` 字典里加：

```ts
'settings.nav': 'DeckSeek',
'settings.title': 'DeckSeek',
'settings.subtitle': '阅读视图的外观与行为。切换即时生效，不用重启。',
'settings.appearance': '阅读区外观',
'settings.readonly': '当前部署不支持持久化设置，外观保持默认。',
'settings.skin.paper': '纸面',
'settings.skin.paper.hint': '排版流：留白分组，字号落差大，不用卡片。',
'settings.skin.soft': '软卡',
'settings.skin.soft.hint': '卡片承载，留白多、字号大，适合久读。',
'settings.skin.terminal': '终端',
'settings.skin.terminal.hint': '行列对齐，等宽高密度，适合盯执行过程。',
```

`en` 字典里加对应英文：

```ts
'settings.nav': 'DeckSeek',
'settings.title': 'DeckSeek',
'settings.subtitle': 'Appearance and behaviour of the reading view. Changes apply immediately.',
'settings.appearance': 'Reading appearance',
'settings.readonly': 'This deployment does not persist settings; the default appearance is used.',
'settings.skin.paper': 'Paper',
'settings.skin.paper.hint': 'Typographic flow: whitespace grouping, strong size contrast, no cards.',
'settings.skin.soft': 'Soft',
'settings.skin.soft.hint': 'Cards, generous whitespace and larger type for long reading.',
'settings.skin.terminal': 'Terminal',
'settings.skin.terminal.hint': 'Aligned rows, monospace and dense, for watching execution.',
```

同文件末尾加两个按 id 取词的辅助函数（`ui()` 的键是静态联合类型，动态拼键逃不过类型检查，所以在这里收口）：

```ts
/** Settings-page name for one reading skin. */
export function skinName(id: SkinId): string {
  if (id === 'paper') return ui('settings.skin.paper');
  if (id === 'terminal') return ui('settings.skin.terminal');
  return ui('settings.skin.soft');
}

/** One-line description for one reading skin. */
export function skinHint(id: SkinId): string {
  if (id === 'paper') return ui('settings.skin.paper.hint');
  if (id === 'terminal') return ui('settings.skin.terminal.hint');
  return ui('settings.skin.soft.hint');
}
```

顶部加 `import type { SkinId } from '../skin.js';`。

- [ ] **Step 2: 写失败的测试**

`tests/deckseek-section.client.test.tsx`：

```tsx
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DeckSeekSection } from '../src/client/DeckSeekSection.js';
import type { SkinId } from '../src/skin.js';

afterEach(cleanup);

function face(skin: SkinId, writable = true) {
  const calls: SkinId[] = [];
  return {
    calls,
    injected: { useSkin: () => skin, useWritable: () => writable, setSkin: (next: SkinId) => { calls.push(next); } },
  };
}

test('renders one radio per skin with the current one checked', () => {
  const { injected } = face('terminal');
  render(<DeckSeekSection useSkin={injected.useSkin} useWritable={injected.useWritable} setSkin={injected.setSkin} />);
  const radios = screen.getAllByRole('radio');
  assert.equal(radios.length, 3);
  const checked = radios.filter(node => node.getAttribute('aria-checked') === 'true');
  assert.equal(checked.length, 1);
  assert.equal(checked[0].getAttribute('data-skin'), 'terminal');
});

test('choosing another tile reports that skin', () => {
  const { injected, calls } = face('soft');
  render(<DeckSeekSection useSkin={injected.useSkin} useWritable={injected.useWritable} setSkin={injected.setSkin} />);
  fireEvent.click(screen.getByRole('radio', { name: /纸面/ }));
  assert.deepEqual(calls, ['paper']);
});

test('a read-only document disables every tile and says so', () => {
  const { injected } = face('soft', false);
  render(<DeckSeekSection useSkin={injected.useSkin} useWritable={injected.useWritable} setSkin={injected.setSkin} />);
  for (const radio of screen.getAllByRole('radio')) assert.equal((radio as HTMLButtonElement).disabled, true);
  assert.ok(screen.getByText(/不支持持久化设置/));
});
```

- [ ] **Step 3: 运行确认失败**

Run: `node --import tsx/esm --import ./tests/setup-dom.mjs --test tests/deckseek-section.client.test.tsx`
Expected: FAIL — 空壳组件渲染不出 radio

- [ ] **Step 4: 写组件**

`src/client/DeckSeekSection.tsx`：

```tsx
import { memo } from 'react';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type {} from '@deepseek-ai/dsh-client-ui-settings/client';
import { SKIN_IDS } from '../skin.js';
import { skinHint, skinName, ui } from './locale.js';
import type { DeckSeekSectionInjected } from './types.js';
import css from './DeckSeekSection.module.css';

export type DeckSeekSectionProps = PropsRuntime<'settings.section'> & DeckSeekSectionInjected;

export const DeckSeekSection = memo(function DeckSeekSection({ useSkin, useWritable, setSkin }: DeckSeekSectionProps) {
  const skin = useSkin();
  const writable = useWritable();
  return <section className={css.section}>
    <h2 className={css.title}>{ui('settings.title')}</h2>
    <p className={css.subtitle}>{ui('settings.subtitle')}</p>
    <h3 className={css.label}>{ui('settings.appearance')}</h3>
    <div className={css.tiles} role="radiogroup" aria-label={ui('settings.appearance')}>
      {SKIN_IDS.map(id => <button key={id} type="button" role="radio" aria-checked={skin === id}
        data-skin={id} data-selected={skin === id || undefined} disabled={!writable}
        className={css.tile} onClick={() => { setSkin(id); }}>
        <span className={css.tileHead}>
          <span className={css.tileName}>{skinName(id)}</span>
          <span className={css.check} aria-hidden="true">✓</span>
        </span>
        <span className={css.tileHint}>{skinHint(id)}</span>
        <span className={css.preview} aria-hidden="true" data-preview={id}>
          <span className={css.pvUser} /><span className={css.pvCard} /><span className={css.pvAnswer} />
        </span>
      </button>)}
    </div>
    {!writable && <p className={css.readonly} role="status">{ui('settings.readonly')}</p>}
  </section>;
});
```

`src/client/DeckSeekSection.module.css`（全部用宿主 token；预览块的差异由 `[data-preview]` 决定）：

```css
.section { display: flex; flex-direction: column; gap: 4px; color: var(--dsw-alias-label-primary); }
.title { margin: 0; font-size: 1.0625rem; line-height: 1.75rem; font-weight: 600; }
.subtitle { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 0.8125rem; line-height: 1.375rem; }
.label { margin: 20px 0 0; color: var(--dsw-alias-label-caption); font-size: 0.75rem; line-height: 1.25rem; font-weight: 600; letter-spacing: 0.04em; }
.tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
@media (max-width: 720px) { .tiles { grid-template-columns: 1fr; } }
.tile { display: flex; flex-direction: column; align-items: stretch; gap: 4px; padding: 11px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 14px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.tile:hover { background: var(--dsw-alias-interactive-bg-hover); }
.tile:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }
.tile[data-selected] { border-color: var(--dsw-alias-state-business-primary); box-shadow: 0 0 0 1px var(--dsw-alias-state-business-primary); background: var(--dsw-alias-interactive-bg-hover); }
.tile:disabled { cursor: default; opacity: 0.6; }
.tileHead { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.tileName { font-size: 0.8125rem; line-height: 1.25rem; font-weight: 600; }
.check { display: none; width: 15px; height: 15px; border-radius: 50%; background: var(--dsw-alias-state-business-primary); color: var(--dsw-alias-label-primary-foreground); font-size: 9px; line-height: 15px; text-align: center; }
.tile[data-selected] .check { display: block; }
.tileHint { color: var(--dsw-alias-label-secondary); font-size: 0.6875rem; line-height: 1.125rem; }
.preview { display: flex; flex-direction: column; gap: 5px; margin-top: 8px; padding: 8px; border-radius: 9px; background: var(--dsw-alias-bg-base); border: 1px solid var(--dsw-alias-border-l1); }
.pvUser { height: 12px; width: 58%; margin-left: auto; border-radius: 6px 6px 2px 6px; background: var(--dsw-specific-bubble); }
.pvCard { height: 22px; border-radius: 6px; background: var(--dsw-alias-interactive-bg-hover); }
.pvAnswer { height: 20px; border-radius: 6px; background: var(--dsw-alias-bg-module-platform); }
/* Paper drops the containers; terminal turns them into separated rows. */
[data-preview='paper'] .pvUser { width: 40%; margin: 0 0 0 2px; border-radius: 3px; background: var(--dsw-alias-label-tertiary); }
[data-preview='paper'] .pvCard, [data-preview='paper'] .pvAnswer { border-radius: 3px; background: var(--dsw-alias-interactive-bg-hover); }
[data-preview='terminal'] .pvUser { border-radius: 3px; background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 8%, transparent); }
[data-preview='terminal'] .pvCard, [data-preview='terminal'] .pvAnswer { border-radius: 3px; background: transparent; border: 0; border-top: 1px solid var(--dsw-alias-border-l1); }
.readonly { margin: 10px 0 0; color: var(--dsw-alias-label-tertiary); font-size: 0.75rem; line-height: 1.25rem; }
```

- [ ] **Step 5: 运行确认通过**

Run: `node --import tsx/esm --import ./tests/setup-dom.mjs --test tests/deckseek-section.client.test.tsx`
Expected: PASS — 3 tests

- [ ] **Step 6: 全量测试 + 类型**

Run: `npm run typecheck && npm test`
Expected: 类型 0 错误；测试 104 passing（101 + 3）

- [ ] **Step 7: 提交**

```bash
git add src/client/DeckSeekSection.tsx src/client/DeckSeekSection.module.css tests/deckseek-section.client.test.tsx src/client/locale.ts
git commit -m "feat(skin): DeckSeek settings page with three skin tiles"
```

---

### Task 5: 阅读视图接收皮肤

**Files:**
- Modify: `src/client/Reader.tsx:326`

**Interfaces:**
- Consumes: `ReaderInjected.useSkin`（Task 3）
- Produces: 阅读区根元素带 `data-deckseek-skin`，后续所有 CSS 任务依赖这个属性。

- [ ] **Step 1: 改根元素**

`src/client/Reader.tsx` 的 `Reader` 组件内，在 `const motionPreference = props.useStore(state => state.motion);` 附近加：

```tsx
const skin = props.useSkin();
```

根元素改为（`data-dsh-deckseek="0.5.0"` 是过期版本号，直接删掉）：

```tsx
return <StreamMotionContext.Provider value={streamMotion}><div ref={root} className={css.root} data-deckseek-skin={skin} data-motion={motion ? 'on' : 'off'}>
```

- [ ] **Step 2: 确认没有别处依赖旧属性**

Run: `grep -rn "dsh-deckseek=" src tests`
Expected: 无输出

- [ ] **Step 3: 类型检查 + 全量测试**

Run: `npm run typecheck && npm test`
Expected: 类型 0 错误；104 passing

- [ ] **Step 4: 提交**

```bash
git add src/client/Reader.tsx
git commit -m "feat(skin): carry the selected skin onto the reading root"
```

---

### Task 6: token 层改名（行为不变）

**Files:**
- Modify: `src/client/Reader.module.css`

**Interfaces:**
- Produces: `--dx-*` token 组（Task 7–10 的全部皮肤规则依赖它们）。

- [ ] **Step 1: 改名，值不动**

`src/client/Reader.module.css` 的 `.root` 里，把 0.6.x 引入的 `--dsh-card-*` 按此表改名（值保持原样，因此这一步**不改变任何观感**）：

| 旧 | 新 |
|---|---|
| `--dsh-card-rail` | `--dx-rail-width` |
| `--dsh-card-radius` | `--dx-radius-card` |
| `--dsh-card-panel-radius` | `--dx-radius-panel` |
| `--dsh-card-chip-radius` | `--dx-radius-chip` |
| `--dsh-card-neutral` | `--dx-rail-neutral` |
| `--dsh-card-subtle` | `--dx-surface-record` |
| `--dsh-card-hairline` | `--dx-border-hairline` |
| `--dsh-card-danger-rail` | `--dx-rail-danger` |
| `--dsh-card-danger-tint` | `--dx-surface-danger` |

全文件替换引用：`grep -n "dsh-card" src/client/Reader.module.css` 应最终无输出。

同时把 `.root` 里那段解释三档卡片的注释改成指向新文档：

```css
/* Reading skins — see docs/design/reading-skins.md. One DOM, three skins
   selected by data-deckseek-skin on this element. Every value below is a
   plugin-level token the skin blocks override; colours come from the host
   theme tokens only, so both themes follow without per-theme rules. */
```

- [ ] **Step 2: 确认改名彻底**

Run: `grep -rn "dsh-card" src/ tests/ docs/design/reading-skins.md`
Expected: 只在 `docs/design/unified-card-system.md`（历史文档）里还有，其余无输出

- [ ] **Step 3: 类型检查 + 全量测试 + 构建**

Run: `npm run typecheck && npm test`
Expected: 类型 0 错误；104 passing（纯改名，无行为变化）

- [ ] **Step 4: 提交**

```bash
git add src/client/Reader.module.css
git commit -m "refactor(skin): rename card tokens to the reading-skin token layer"
```

---

### Task 7: 软卡皮肤（默认）

**Files:**
- Modify: `src/client/Reader.module.css`

**Interfaces:**
- Consumes: `--dx-*`（Task 6）、`data-deckseek-skin`（Task 5）
- Produces: `[data-deckseek-skin='soft']` 覆盖块，作为另外两套皮肤的对照基准。

- [ ] **Step 1: 写软卡覆盖块**

在 `Reader.module.css` 末尾追加。软卡是默认皮肤，所以 `--dx-*` 的**默认值就取软卡值**（写进 `.root`），此块只处理软卡独有的结构规则：

```css
/* Soft — cards carry the hierarchy. The answer card is the heaviest surface,
   record cards are a single neutral tint with no border, and the user card
   keeps the host identity fill with one squared corner. */
.root {
  --dx-radius-card: 16px;
  --dx-radius-panel: 10px;
  --dx-radius-chip: 6px;
  --dx-rail-width: 0px;
  --dx-surface-record: var(--dsw-alias-interactive-bg-hover);
  --dx-surface-answer: var(--dsw-alias-bg-module-platform);
  --dx-border-answer: 1px solid var(--dsw-alias-border-l2);
  --dx-rule: 1px solid var(--dsw-alias-border-l1);
  --dx-gap-block: 12px;
}
/* No left rail in this skin: a card with real volume does not need a colour
   stripe to be read as one. */
[data-deckseek-skin='soft'] .toolActivity,
[data-deckseek-skin='soft'] .reasonCard,
[data-deckseek-skin='soft'] .unknown,
[data-deckseek-skin='soft'] .systemPrompt,
[data-deckseek-skin='soft'] .turnProcess,
[data-deckseek-skin='soft'] .turnTail { box-shadow: none; border-color: transparent; }
[data-deckseek-skin='soft'] .answer {
  background: var(--dx-surface-answer);
  border: var(--dx-border-answer);
  box-shadow: inset 0 1px 0 var(--dsw-alias-border-inverted), 0 8px 24px rgba(0, 0, 0, 0.28);
}
[data-deckseek-skin='soft'] .user { border-radius: 14px 14px 4px 14px; }
```

同时把 `.toolActivity` / `.unknown` / `.systemPrompt` / `.turnProcess` / `.turnTail` 的基础规则改为读 token（`background: var(--dx-surface-record); border: 1px solid var(--dx-border-hairline); border-radius: var(--dx-radius-card); box-shadow: inset var(--dx-rail-width) 0 0 var(--dx-rail-neutral);`），把 `.answer` 改为：

```css
.answer { position: relative; display: flex; flex-direction: column; min-width: 0; overflow-wrap: anywhere; background: var(--dx-surface-answer); border: var(--dx-border-answer); border-radius: var(--dx-radius-card); padding: 16px 18px; }
```

- [ ] **Step 2: 目视确认（暗色）**

在本地 `dsh --profile web` 里打开一个真实会话，确认：回答卡明显重于记录卡；记录卡无描边无投影；用户卡右下角是 4px 小角而不是全圆；没有左缘色条。把结果记进 PR 描述。

Run: `npm run typecheck && npm test`
Expected: 类型 0 错误；104 passing

- [ ] **Step 3: 提交**

```bash
git add src/client/Reader.module.css
git commit -m "feat(skin): soft skin — cards with real volume, no colour stripe"
```

---

### Task 8: 终端皮肤

**Files:**
- Modify: `src/client/Reader.module.css`
- Modify: `src/client/ToolActivity.tsx`

**Interfaces:**
- Consumes: `--dx-*`（Task 6）、`data-deckseek-skin`（Task 5）
- Produces: `[data-deckseek-skin='terminal']` 覆盖块，以及工具行前导格里的状态字形元素。

- [ ] **Step 1: 前导格加状态字形**

`src/client/ToolActivity.tsx` 的 `.toolGlyph` 元素内部，在现有图标之后加一个字形 span（装饰性，状态本身已由 `.toolState` 文本承载可访问名）：

```tsx
<span className={css.toolGlyph} aria-hidden="true">
  <ToolGlyphIcon />
  <span className={css.toolGlyphState} />
</span>
```

（保留现有图标元素的写法，只新增 `toolGlyphState` 这一个 span；`data-phase` 已经在现有父元素上。）

- [ ] **Step 2: 写字形与终端覆盖块**

`Reader.module.css` 末尾追加：

```css
/* Terminal — one vertical axis: a 12px state-glyph column, the content, and a
   right-aligned number column. Hairline row rules, no cards, no radii. Colour
   is reserved for state. */
.toolGlyphState { display: none; }
[data-deckseek-skin='terminal'] {
  --dx-radius-card: 0px;
  --dx-radius-panel: 3px;
  --dx-radius-chip: 3px;
  --dx-rail-width: 0px;
  --dx-surface-record: transparent;
  --dx-surface-answer: transparent;
  --dx-border-answer: none;
  --dx-rule: 1px solid var(--dsw-alias-border-l1);
  --dx-gap-block: 8px;
}
[data-deckseek-skin='terminal'] .toolActivity,
[data-deckseek-skin='terminal'] .unknown,
[data-deckseek-skin='terminal'] .systemPrompt,
[data-deckseek-skin='terminal'] .turnProcess,
[data-deckseek-skin='terminal'] .turnTail,
[data-deckseek-skin='terminal'] .reasonCard {
  background: transparent;
  border: 0;
  border-bottom: var(--dx-rule);
  border-radius: 0;
  box-shadow: none;
  padding: 7px 0;
}
[data-deckseek-skin='terminal'] .answer { background: transparent; border: 0; border-radius: 0; box-shadow: none; padding: 14px 0; }
[data-deckseek-skin='terminal'] .user {
  border-radius: 0;
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 8%, transparent);
  border-left: 2px solid var(--dsw-alias-state-business-primary);
  padding: 7px 12px;
}
/* The glyph column replaces the icon; the phase picks the glyph. */
[data-deckseek-skin='terminal'] .toolGlyph { width: 12px; }
[data-deckseek-skin='terminal'] .toolGlyph > :first-child { display: none; }
[data-deckseek-skin='terminal'] .toolGlyphState { display: block; font-size: 0.75rem; line-height: 1.25rem; }
[data-deckseek-skin='terminal'] .toolGlyph[data-phase='preparing'] .toolGlyphState::before,
[data-deckseek-skin='terminal'] .toolGlyph[data-phase='running'] .toolGlyphState::before { content: '▸'; color: var(--dsw-alias-label-caption); }
[data-deckseek-skin='terminal'] .toolGlyph[data-phase='done'] .toolGlyphState::before { content: '✓'; color: var(--dsw-alias-state-success-primary); }
[data-deckseek-skin='terminal'] .toolGlyph[data-phase='failed'] .toolGlyphState::before,
[data-deckseek-skin='terminal'] .toolGlyph[data-phase='interrupted'] .toolGlyphState::before { content: '✗'; color: var(--dsw-alias-state-error-primary); }
/* Tool chrome goes monospace; the state text stays available to screen readers. */
[data-deckseek-skin='terminal'] .toolTitle,
[data-deckseek-skin='terminal'] .toolLedger,
[data-deckseek-skin='terminal'] .toolDeltas { font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace); }
[data-deckseek-skin='terminal'] .toolState { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
[data-deckseek-skin='terminal'] .failure { background: transparent; border: 0; border-left: 2px solid var(--dsw-alias-state-error-primary); border-radius: 0; box-shadow: none; padding: 7px 12px; }
[data-deckseek-skin='terminal'] .reasonCard { overflow: visible; }
[data-deckseek-skin='terminal'] .reasonHeading { padding: 0 0 4px; }
[data-deckseek-skin='terminal'] .reasonText { padding: 4px 0 8px; }
```

> `.toolGlyph[data-phase=…]` 依赖该元素已有 `data-phase`。Step 1 之后先 `grep -n "toolGlyph" src/client/ToolActivity.tsx` 确认属性在正确的元素上；若 `data-phase` 落在父级 `.nativeToolRow`，把上面选择器改成 `.nativeToolRow[data-phase='…'] .toolGlyphState::before`。

- [ ] **Step 3: 目视确认（暗色）**

确认：工具行呈 ✓/✗/▸ 字形列且对齐；无卡片无圆角；用户行有 2px 蓝条与极淡蓝底；失败行是左红条而非红色整块；回答仍是无衬线正文（只有 chrome 走等宽）。

Run: `npm run typecheck && npm test`
Expected: 类型 0 错误；104 passing

- [ ] **Step 4: 提交**

```bash
git add src/client/Reader.module.css src/client/ToolActivity.tsx
git commit -m "feat(skin): terminal skin — glyph column, hairline rows, no cards"
```

---

### Task 9: 纸面皮肤

**Files:**
- Modify: `src/client/Reader.module.css`
- Modify: `src/client/Reader.tsx`

**Interfaces:**
- Consumes: `--dx-*`（Task 6）、`data-deckseek-skin`（Task 5）
- Produces: `[data-deckseek-skin='paper']` 覆盖块与用户块的角色标签。

- [ ] **Step 1: 加角色标签**

`src/client/Reader.tsx` 的 `MainNode` 用户分支里，在用户正文之前加一个装饰性角色标签（三种皮肤都渲染，纸面之外隐藏）：

```tsx
<span className={css.userRole} aria-hidden="true">{ui('turn.you')}</span>
```

`src/client/locale.ts` 两个字典加键：zh `'turn.you': '你'`、en `'turn.you': 'You'`。

- [ ] **Step 2: 写纸面覆盖块**

`Reader.module.css` 末尾追加：

```css
/* Paper — typographic flow. No containers at all: grouping is whitespace and
   the size gap between the answer and everything else. Only the closing stats
   line draws a rule, and only failures carry colour. */
.userRole { display: none; }
[data-deckseek-skin='paper'] {
  --dx-radius-card: 0px;
  --dx-radius-panel: 4px;
  --dx-radius-chip: 4px;
  --dx-rail-width: 0px;
  --dx-surface-record: transparent;
  --dx-surface-answer: transparent;
  --dx-border-answer: none;
  --dx-rule: none;
  --dx-gap-block: 20px;
}
[data-deckseek-skin='paper'] .column { gap: 26px; }
[data-deckseek-skin='paper'] .toolActivity,
[data-deckseek-skin='paper'] .unknown,
[data-deckseek-skin='paper'] .systemPrompt,
[data-deckseek-skin='paper'] .turnProcess,
[data-deckseek-skin='paper'] .reasonCard,
[data-deckseek-skin='paper'] .tileFrames {
  background: transparent; border: 0; border-radius: 0; box-shadow: none; padding: 0;
}
[data-deckseek-skin='paper'] .answer { background: transparent; border: 0; border-radius: 0; box-shadow: none; padding: 0; font-size: 1.0625rem; line-height: 1.8; }
[data-deckseek-skin='paper'] .turnTail { padding: 14px 0 0; border-top: 1px solid var(--dsw-alias-border-l1); }
/* The user block becomes a labelled paragraph, not a bubble. */
[data-deckseek-skin='paper'] .user { align-self: stretch; max-width: none; display: flex; gap: 14px; padding: 0; border-radius: 0; background: transparent; }
[data-deckseek-skin='paper'] .userGlyph { display: none; }
[data-deckseek-skin='paper'] .userRole { display: block; flex: none; width: 26px; padding-top: 3px; color: var(--dsw-alias-label-caption); font-size: 0.6875rem; line-height: 1.125rem; letter-spacing: 0.06em; }
[data-deckseek-skin='paper'] .userBody { font-size: 0.9375rem; line-height: 1.7; color: var(--dsw-alias-label-secondary); }
/* Reasoning hangs off a hairline thread; tools are plain monospace lines. */
[data-deckseek-skin='paper'] .reasonCard { overflow: visible; }
[data-deckseek-skin='paper'] .reasonHeading { padding: 0 0 4px; color: var(--dsw-alias-label-caption); }
[data-deckseek-skin='paper'] .reasonText { padding: 0 0 0 16px; border-left: 2px solid var(--dsw-alias-border-l2); margin-left: 2px; font-size: 0.8438rem; line-height: 1.85; color: var(--dsw-alias-label-tertiary); }
[data-deckseek-skin='paper'] .toolActivity { border-top: 0; }
[data-deckseek-skin='paper'] .toolHeading { grid-template-columns: 10px minmax(0, 1fr) auto; gap: 10px; }
[data-deckseek-skin='paper'] .toolGlyph { width: 10px; color: var(--dsw-alias-label-caption); }
[data-deckseek-skin='paper'] .toolTitle { font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace); font-size: 0.7813rem; font-weight: 400; color: var(--dsw-alias-label-secondary); }
[data-deckseek-skin='paper'] .failure { background: transparent; border: 0; border-left: 2px solid var(--dsw-alias-state-error-primary); border-radius: 0; box-shadow: none; padding: 0 0 0 16px; }
```

- [ ] **Step 3: 目视确认（暗色 + 亮色）**

确认：整屏无卡片无描边（除末尾统计线的上缘与推理竖线）；用户消息左对齐且带「你」；回答字号明显大于其它；只有失败处有红色。

Run: `npm run typecheck && npm test`
Expected: 类型 0 错误；104 passing

- [ ] **Step 4: 提交**

```bash
git add src/client/Reader.module.css src/client/Reader.tsx src/client/locale.ts
git commit -m "feat(skin): paper skin — typographic flow without containers"
```

---

### Task 10: 控件层随皮肤、文档与发布

**Files:**
- Modify: `src/client/Reader.module.css`
- Modify: `package.json`
- Modify: `CHANGELOG.md`
- Modify: `README.md`、`README.en.md`

**Interfaces:**
- Consumes: 三块皮肤覆盖（Task 7–9）
- Produces: 可发布的 0.7.0。

- [ ] **Step 1: 控件层跟着走**

`Reader.module.css` 末尾追加。工具栏、搜索面板、历史按钮、空状态、回到底部圆钮、复制芯片都是操作面，但必须与内容同源，否则"内容一套、控件一套"会重新制造凌乱：

```css
/* Controls follow the skin: same radii and density as the content they sit in. */
[data-deckseek-skin='terminal'] .searchRow,
[data-deckseek-skin='terminal'] .historyButton,
[data-deckseek-skin='terminal'] .answerActions,
[data-deckseek-skin='terminal'] .jump,
[data-deckseek-skin='terminal'] .imageFrame { border-radius: var(--dx-radius-chip); }
[data-deckseek-skin='terminal'] .toolbar,
[data-deckseek-skin='terminal'] .textButton,
[data-deckseek-skin='terminal'] .searchMeta,
[data-deckseek-skin='terminal'] .emptyHint { font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace); }
[data-deckseek-skin='paper'] .searchRow,
[data-deckseek-skin='paper'] .historyButton,
[data-deckseek-skin='paper'] .answerActions { border-radius: var(--dx-radius-chip); }
[data-deckseek-skin='paper'] .toolbar { color: var(--dsw-alias-label-caption); }
[data-deckseek-skin='paper'] .emptyBrand { letter-spacing: 0.04em; }
```

- [ ] **Step 2: 版本与变更记录**

`package.json` 的 `version` 改为 `0.7.0`。

`CHANGELOG.md` 顶部加：

```markdown
## 0.7.0

- 三套阅读皮肤：纸面（排版流）、软卡（卡片）、终端（行列），在 DSH 设置的独立 DeckSeek 页里切换，即时生效。
- 皮肤只表达结构、密度、字体与圆角；颜色全部取自宿主主题 token，亮暗主题自动适配。
- 软卡取代 0.6.x 的统一卡片体系：移除左缘色条，回答卡以填充 + 描边 + 投影承担层级。
- 默认皮肤为软卡。
```

`README.md` / `README.en.md` 的功能段补一句三皮肤与设置入口（各自语言）。

- [ ] **Step 3: 构建并提交产物**

```bash
cd /Users/jiangnan/Documents/workspace/dsh-deckseek
# package.json gained three dependencies across earlier tasks; the tracked lock
# must match. --package-lock-only rewrites the lock without touching node_modules,
# which is what keeps the dev symlink set intact.
npm install --package-lock-only
DSHX_HARNESS=/Users/jiangnan/Documents/workspace/deepseek-harness npm run build
npm run typecheck && npm test
```

Expected: 构建成功；类型 0 错误；测试全绿（本任务不新增测试）。`git diff --stat` 里应看到 `package-lock.json` 与 `lib/` 都被更新。

```bash
git add -A
git commit -m "release(skin): 0.7.0 — three reading skins with a settings page"
```

- [ ] **Step 4: 装进 profile 冒烟**

```bash
npm pack
cd /Users/jiangnan/Documents/workspace/dsh-deckseek
pnpm dsh plugin --profile web add ./dsh-deckseek-0.7.0.tgz
pnpm dsh --profile web --port 0 --no-open    # 记录打印的 URL，确认启动无错
```

Expected: 启动日志无错误；打开 URL 后阅读区按软卡渲染；设置 → DeckSeek 有三个磁贴，切到终端后阅读区立刻变。

**注意：不要动用户已有的 3080 端口实例。** 冒烟用临时端口，验证完关掉。

- [ ] **Step 5: 六组视觉验收**

三套皮肤 × 亮色/暗色各过一眼，重点看 **亮色下回答卡与记录卡是否还分得开**（亮色主题的 `bg-layer-1/2/3` 全是纯白，这是整套设计最脆弱的一处）。结果写进 PR 描述。

---

## Self-Review

**Spec coverage**

| 设计文档章节 | 覆盖任务 |
|---|---|
| 架构：一份 DOM + 根属性 | Task 5 |
| 设置链路（宿主命名空间 / 客户端 bind / 设置页注册） | Task 2、3、4 |
| 首帧不闪 | **未覆盖——见下方偏离说明** |
| 边界与失败（不可用 / 未知值 / 只读 / 写入失败） | Task 1（未知值）、Task 4（只读 + 禁用） |
| token 层 | Task 6 |
| 三套皮肤规格（表面/圆角/密度/字体/字号/颜色许可） | Task 7、8、9 |
| 装饰性 chrome 的渲染与隐藏 | Task 8（状态字形）、Task 9（角色标签） |
| 状态与控件层 | Task 7（失败卡）、Task 10 |
| 不变式 | Global Constraints |
| 旧体系处置 | 设计文档里已完成（`unified-card-system.md` 已加取代标记） |
| 版本 0.7.0 | Task 10 |
| 测试与验收 | 每个任务的 typecheck/test + Task 10 Step 4、5 |
| 实施分期 | Task 1–5 / 6–9 / 10 正对应三期 |

**与设计文档的偏离（已确认的取舍，需在 PR 里说明）**

设计文档的"首帧不闪"要求宿主半通过 `webserver/index-inject` 注入初始皮肤。实施前核查发现这条路要引入 `@deepseek-ai/dsh-host-webserver` 作为新的宿主 peer 依赖，并往每次 index 渲染里塞一段 inline script。代价与收益不成比例：settings 镜像在客户端启动时就通过 RPC 加载，而阅读视图是用户打开标签页时才挂载，实际几乎观察不到闪烁；且默认皮肤是软卡，多数用户本来就不会看到切换。**因此本计划不实现 boot injection**，改用 `useSyncExternalStore` 的加载期默认值。若实际观察到闪烁，再按设计文档补 boot injection。

**Placeholder scan**：无 TBD/TODO；每个代码步骤都给了完整代码。Task 8 Step 2 与 Task 9 Step 2 里对选择器的两条核对提示（`grep` 确认 `data-phase` / `toolGlyph` 落点、确认类名）是**实施前的事实核对**，不是待填内容——如果落点不同，计划给出了具体的替代选择器。

**Type consistency**：`SkinId` / `parseSkin` / `isSkin` / `DEFAULT_SKIN` / `SKIN_IDS` / `SKIN_FIELD` / `DECKSEEK_SETTINGS_NAMESPACE`（Task 1）在 Task 2–5 中按同名使用；`DeckSeekSettings`（Task 2）在 Task 3 作为 scope 泛型；`ReaderInjected.useSkin`（Task 3）在 Task 5 消费；`DeckSeekSectionInjected`（Task 3）与 `DeckSeekSectionProps`（Task 4）字段一致（`useSkin` / `useWritable` / `setSkin`）；`--dx-*` 名字在 Task 6 定义、Task 7–10 使用，无别名漂移。

**已知风险（实施时留意）**

1. Task 8 的状态字形依赖 `.toolGlyph` 上已有 `data-phase`；计划里给了核对命令与替代选择器。
2. Task 7 与 Task 8 的覆盖块里同时列出 `.toolActivity` 等选择器，皮肤优先级靠**同特异性下后者胜**。`.root` 上的默认值是基础规则，`[data-deckseek-skin='terminal']`（属性选择器 + 类）特异性更高，因此覆盖稳定。若后续新增皮肤，把新块追加在文件末尾即可。
3. Task 3 里 `useSyncExternalStore` 的 `getServerSnapshot` 返回默认值，SSR 场景安全；本插件实际只在浏览器运行。

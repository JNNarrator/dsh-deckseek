# 兼容 DSH 0.2.0-rc.1：闸门拒载与 peer 范围

> 工作文档：跨机器续作用。**2026-09-29 已处理：peer 范围放宽到 `>=0.1.7-rc.1 <0.3.0-0`。**
> 前置阅读：[compat-0.1.7.md](compat-0.1.7.md)（0.1.7 那次是真正的移植，这次不是）、
> [reading-skins.md](reading-skins.md)。

## 现象

用户装上的桌面版 DSH 从 **0.1.7-rc.2 自动更新到 0.2.0-rc.1**，重启后表现为「插件似乎不兼容」。
本插件（当时已装 0.12.0）声明的是 `>=0.1.7-rc.1 <0.2.0-0`。

## 根因：只有版本闸门，没有 API 破坏

harness 对 `@deepseek-ai/dsh-*` 这些 peer 做强制校验（`evaluatePluginCompatibility`，带
`includePrerelease`），判为不兼容的条目变 `disabled`——**不报错、不崩溃，就是不在**。0.2.0-rc.1
落在 `<0.2.0-0` 之外，实测（semver 7.8.5）：

```
0.1.7-rc.1  plain=satisfies  includePrerelease=satisfies
0.1.7-rc.2  plain=satisfies  includePrerelease=satisfies
0.2.0-rc.1  plain=NO         includePrerelease=NO      ← 被拒
lt(0.2.0-rc.1, 0.2.0-0) = false
```

注意 `lt(...) = false` 这条：`0.2.0-rc.1` **不小于** `0.2.0-0`，因为 `0.2.0-0` 的预发布标识是数字
`0`，数字标识优先级低于字母标识 `rc`。也就是说 `<0.2.0-0` 这个上界连 0.2.0 的预发布版都排除，
这是 0.11.0 当时为了「只支持 0.1.7 及以后」写下的，本意如此，只是没预见 0.2.0 会来得这么快。

**API 面本身没有破坏。** 判据：

| 检查 | 结果 |
|---|---|
| 上游包版本 | 全部 `0.1.7-rc.2` → `0.2.0-rc.1`（`dsh-client-ui-*`、`dsh-client-store`、`dsh-settings`、`dsh-session`、`dsh-attachment`、`dsh-util-workspace-path`…） |
| `schemastery` / `cordis` / `react` | **未变**：3.18.4 / 4.0.4 / 18.3.1 |
| plugin `tsc --noEmit` 对着 0.2.0-rc.1 的 `.d.ts` | **0 错误** |
| 289 项测试对着 0.2.0-rc.1 的**运行时**（从新 app.asar 解出） | **289/289 通过** |
| 运行时契约令牌仍在 | `conversation.view`、`configForms`、`volatileForm`、`defineStore`、`settings.configure` 全部存在 |

所以这一轮**不是移植，是放宽一个写在 manifest 里的界**。

## 处理

1. **peer 范围**：11 条 `@deepseek-ai/dsh-*` 全部 `>=0.1.7-rc.1 <0.2.0-0` → **`>=0.1.7-rc.1 <0.3.0-0`**。
   下界不动：0.1.7 下这套代码同样是验证过的，没必要把还能用的人挡在外面。
2. **devDependencies** 的 4 个固定 `0.1.7-rc.1` → `0.2.0-rc.1`，让仓库默认对着当前宿主做类型检查。
3. **`npm run preflight` 新增一道闸门**：直接读安装中应用
   （`defaults read /Applications/DeepSeek Harness.app/Contents/Info.plist CFBundleShortVersionString`）
   的版本，用 `includePrerelease: true` 把它喂给插件自己声明的每条 peer 范围。
   顺序是「先装再体检」，所以体检的是**装进去的那一份**，不是仓库里的。

第 3 条是这次真正的收获：插件有四种坏法 `npm test` 与 `tsc` 都看不见——profile 没组装、
宿主半解析不到依赖、客户端包 `require` 了加载器给不出的模块（这三条是 0.12.0 那轮加的），
以及**版本闸门拒载**。第四条最难自己发现，因为在用户看到「不兼容」之前，本地一切绿灯。

## 验证口径

```bash
npm test            # 289/289（对着 0.2.0-rc.1 的运行时）
npx tsc -p tsconfig.json --noEmit
npm run build:local
npm run preflight   # 含新的 peer 闸门检查
```

`preflight` 现在的期望输出：

```
✔ the installed app is 0.2.0-rc.1, inside all 11 host peer ranges
```

## 老实说：哪些是推断，哪些是观测

- **推断**：宿主的闸门确实拒了本插件。依据是 semver 实测「0.2.0-rc.1 不在范围内」＋
  0.11.0 已记录该闸门的存在与行为（`evaluatePluginCompatibility`）。**我没有直接读到宿主的拒载
  日志或界面状态**：应用不写插件加载日志（`~/.dsh/logs` 里只有 09-25 的启动日志），
  应用内 Web 端点（127.0.0.1:19387）要鉴权，渲染进程也没开调试端口。
- **观测**：应用确实更新到 0.2.0-rc.1（`Info.plist` = `0.2.0-rc.1`，asar 里 290 个 `@deepseek-ai` 包全部是 0.2.0-rc.1）；
  应用确实重启过（进程 26074 / 26087，09:06:56 启动）；
  profile 里 `dsh-deckseek` 仍在 `dsh.profile.bundles` 与 `dependencies` 里（应用在 09:11 重写过
  `package.json`——`dshmarket` 被移除、`@deepseek-ai/dsh-experimental-schedule-bundle` 被加入，但没动我们）。
- **没验证**：放宽之后应用里到底长什么样。这需要用户再重启一次。

## 还没查的

- **上游 0.2.0 的破坏性变更清单**：app.asar 里没有 changelog 文件，npm 上也没有单独的发布说明，
  所以「兼容」目前的依据是 tsc + 运行时测试，**不是厂商的声明**。如果后面在应用里看到行为异常，
  应当按照「0.2.0 改了什么」重新排查，而不是回头怀疑这次的放宽。
- `dsh-client-ui-slots` 的 `register` 选项在 0.2.0 是否有行为变化（类型未变，未做运行时对照）。

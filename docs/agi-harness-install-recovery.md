# DSH 安装 dsh-agi-harness 报错修复记录

> 时间：2026-09-07 ～ 09-08 · 环境：DSH Desktop 2.0.5（darwin arm64）· Profile：desktop
> 结论：**已修复，DSH 正常启动，三个 @dsh-external 插件加载成功**。修复分两层：补齐缺失依赖 + 服务改名本地补丁。

## 一、问题现象

给 DSH Desktop 安装第三方插件 [yjh051108/dsh-agi-harness](https://github.com/yjh051108/dsh-agi-harness) 后，DSH 启动进入恢复模式，报错：

```
Error: failed to import loader entry dsh-engram-relay (@dsh-external/dsh-engram-relay):
  Cannot find package 'schemastery' imported from /Users/jiangnan/.dsh/profiles/desktop/package.json
Error: failed to import loader entry browser-panel (@dsh-external/dsh-browser-panel):
  Cannot find package 'schemastery' imported from /Users/jiangnan/.dsh/profiles/desktop/package.json
Error: dsh-plugin-desktop: plugin tree failed to load: 1 entry did not activate
```

恢复助手显示：失败阶段 = 插件 Host 启动，当前 Profile = desktop。

## 二、诊断

**根因：DSH 的插件安装器只落插件包本身，不装 dependencies。**

安装器把三个包放进 `~/.dsh/profiles/desktop/node_modules/@dsh-external/`：

| 包 | 版本 | 声明依赖 |
|---|---|---|
| dsh-engram-relay | 0.4.0 | @huggingface/transformers@3.6.3、onnxruntime-node@1.20.1 |
| dsh-browser-panel | 0.1.0 | playwright-core@1.59.1、schemastery@^3.18.0、ws@^8.21.0 |
| dsh-closedloop-mode | 0.7.4 | @deepseek-ai/schemastery@^3.18.2 |

而 cordis loader 以 profile 根（`~/.dsh/profiles/desktop/`）为模块解析上下文，`@dsh-external/` 下没有嵌套 node_modules，向上也找不到这些依赖 → 启动即 `Cannot find package`。

依赖图展开后共 7 个必需包（含传递依赖 cosmokit、@deepseek-ai/cosmokit、@standard-schema/spec）。**有意暂缺的两个**：`@huggingface/transformers` + `onnxruntime-node` 是 engram 语义模型的动态 import 可选重依赖（ML 推理，体积巨大）；engram 的 `embedModel` 默认空串 = 纯算法模式，不装只降级、不报错。

## 三、修复一：补齐 7 个依赖包

从 npm 官方源下载 tgz 解压进 `~/.dsh/profiles/desktop/node_modules/`：

```
schemastery@3.18.0          @deepseek-ai/schemastery@3.18.2
playwright-core@1.59.1      ws@8.21.0
cosmokit@1.8.1              @deepseek-ai/cosmokit@1.8.3
@standard-schema/spec@1.1.0
```

**踩坑**：npm tgz 顶层自带 `package/` 前缀，直接 `extractall` 到目标父目录会让内容落在 `<name>/package/` 下。正确做法是解到临时目录后把 `package` 整体改名为目标包名（等价 `tar --strip-components=1`）。首次错误解压在 `node_modules/package`、`@deepseek-ai/package`、`@standard-schema/package` 留下三个残留目录，已清理。

**验证**：用 node `createRequire` 从各插件目录做真实解析，4 个 import 全部命中；schemastery 实际 require 成功。

## 四、修复二：`httpServer` → `webServer` 服务改名

补齐依赖后重启，错误变化为：

```
dsh-plugin-desktop: plugin tree failed to load: 1 entry did not activate
@dsh-external/dsh-browser-panel: pending (waiting for service: httpServer)
```

说明依赖已修好（另外两个插件已激活），只剩 browser-panel 在等一个没人提供的 `httpServer` 服务。

**对照源码定位**：

- 全 profile 没有任何包 provide `httpServer`；
- clone agi-harness 仓库对照，`dsh-engram-relay/src/relay.ts` 里有注释明说：

  > 旧名 httpServer 已不存在——等不到服务则图谱 API 永不挂载。

  新代码已改用 `ctx.inject(['webServer'], ...)`；
- harness 检出 `packages/host/webserver/src/index.ts`：服务名为 `webServer`，其 `register(route: WebRoute)` 的 `WebRoute = { kind: 'exact'|'prefix', path, handler(req, res) }` 与 browser-panel 的调用签名完全兼容；
- 结论：**agi-harness 作者把 engram-relay 迁移到新服务名时漏改了 browser-panel**（仓库当前 0.1.0 仍未修）。

**本地运行时补丁**（2 处改名，原文件备份为 `index.js.bak`）：

```bash
BP=~/.dsh/profiles/desktop/node_modules/@dsh-external/dsh-browser-panel/lib
cp "$BP/index.js" "$BP/index.js.bak"
sed -i '' 's/httpServer/webServer/g' "$BP/index.js"        # inject 声明 + ctx.httpServer.register
sed -i '' 's/httpServer/webServer/g' "$BP/types/index.d.ts"
```

## 五、顺带修正

agi-harness 的安装流程把 profile `package.json` 里 `dsh-deckseek` 的版本声明从 0.6.0 降回 0.4.9（node_modules 实装包未被替换），已改回声明与实装一致（0.6.0 = 0.6.0）。

## 六、验证结果

| 时间 | 动作 | 结果 |
|---|---|---|
| 17:15 | 仅补依赖后重启 | 进恢复模式：waiting for service: httpServer（预期，尚未打补丁） |
| 17:20 | webServer 补丁后重启 | **正常进入 DeepSeek Harness Desktop**，无恢复窗口；错误日志零新增；DeckSeek 视图正常渲染 |

日志位置：`~/Library/Application Support/DSH Desktop/logs/dsh-YYYY-MM-DD.log`（及 `.error.log`）。

## 七、已知边界（设计如此，非故障）

- 插件面板的 **client 端 UI** 依赖 `@deepseek-ai/dsh-client-runtime`，当前 harness 没有这个包，UI 面板不挂载；server 端核心功能（闭环写闸、判分器、记忆工具、浏览器工具）不依赖它，可正常跑。
- engram 语义模型因未装 `@huggingface/transformers`，运行在纯算法模式。

## 八、遗留与建议

1. **建议向 yjh051108/dsh-agi-harness 提 issue**：browser-panel 0.1.0 仍 inject 旧服务名 `httpServer`，当前 harness 已改名 `webServer`（仓库内 engram-relay 已迁移、browser-panel 漏改）。作者发版修复后升级插件即可撤销本地补丁（还原 `index.js.bak` 或重装）。
2. 本地补丁会被插件升级覆盖：**升级 agi-harness 后如再报 httpServer，按第四节重打补丁**。
3. 若日后要用浏览器面板 UI 或 engram 语义模型，再补装 `@huggingface/transformers` + `onnxruntime-node`。
4. （另一件事）npm 上的 0.4.6 坏包已打 deprecate 标记（2026-09-08，`BROKEN: missing bundled util-workspace-path; use >= 0.4.7 instead`，安装时会显示警告）；彻底删除仍需账号持有人自己操作——bypass-2FA granular token 被 npm 政策禁止 unpublish，只能用本人登录 + OTP：`npm unpublish dsh-deckseek@0.4.6 --registry=https://registry.npmjs.org --otp=<验证码>`（发布 72 小时内有效，0.4.6 发布于 09-08 01:13 UTC）。

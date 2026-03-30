---
name: github-issue-workflow
description: 使用 GitHub Issues 作为多 agent 问题跟进与协作层。当用户提到“用 GitHub issue 跟踪问题 / 协作 / 认领任务 / issue 驱动修复 / parent-child issue / issue 模板 / triage”时使用。也适用于需要把当前本地 `.claude/issue/` 问题沉淀到 GitHub Issues 的场景。
---

# GitHub Issue Workflow Skill

## 核心原则

- 协作层使用 GitHub Issues。
- 这个 skill 以**阶段**为核心，而不是以固定流水线或某种 issue 关系为核心。
- `Current type` 是当前阶段的持久化字段名；这里的 `type` 在协议上等同于“阶段标识”。
- 新 issue 默认从 `bug` 开始。
- 首次写入明确的阶段 comment 之后，当前阶段由最新一条明确的 explicit comment 决定。
- issue 当前状态不依赖 label，也不依赖标题前缀；只以最新 explicit comment 中的 `Current type` 为准。
- 当前默认内建阶段集合是：`bug`、`fix`、`test`、`review`、`done`。
- 当前已给出一个完整扩展阶段样板：`wait`；它说明默认内建阶段集合并不是唯一允许集合。
- 阶段集合可以继续扩展；例如未来还可以加入 `code-review` 等阶段。

## 当前阶段如何确定

1. 先读取最新的 explicit comment。
2. 如果其中存在 `Current type`，就把它当作当前阶段。
3. 如果不存在，则默认当前阶段为 `bug`。
4. 判断出当前阶段后，再去读主阶段列表与对应 `types/<stage>/stage.md`，并按需参考 `types/<stage>/in-template.md` 与 `types/<stage>/out-template.md`。

## 主阶段列表

| 阶段 | 阶段目的 | 默认 handling agent | 常见但非强制的后续阶段 | 详细文档 |
| --- | --- | --- | --- | --- |
| `bug` | 把问题整理成可执行的问题定义。 | `worker` | `bug`、`fix`、`wait`、其他扩展阶段 | `types/bug/stage.md` |
| `fix` | 对已明确的问题做一次有边界的实现。 | `worker` | `fix`、`test`、`wait`、其他扩展阶段 | `types/fix/stage.md` |
| `test` | 按验收标准验证当前实现并产出证据。 | `tester` | `test`、`fix`、`review`、`wait`、其他扩展阶段 | `types/test/stage.md` |
| `review` | 做最终确认与收尾判断。 | `worker` | `review`、`done`、`fix`、`wait`、其他扩展阶段 | `types/review/stage.md` |
| `done` | 记录终态结果并保持可追溯关闭。 | none | 无；若出现真实新缺口则 reopen 到非终态阶段 | `types/done/stage.md` |
| `wait` | 显式记录“当前工作已暂停，正在等待某个恢复条件成立”。 | `dispatcher` 或当前 handling agent | `wait`、`bug`、`fix`、`test`、`review`、其他扩展阶段 | `types/wait/stage.md` |

## 如何决定下一阶段

- 不要把 `bug -> fix -> test -> review -> done` 当成唯一固定流程。
- 每次完成一个阶段后，都要先写出**该阶段完成报告**，再结合：
  - 当前阶段文档
  - 主阶段列表
  - 当前 issue / comments / 证据 / blocker / 关联任务状态
  仔细决定下一阶段。
- 如果当前阶段目标尚未完成，或 blocker 只是暂时阻塞，则继续停留在当前阶段。
- 如果当前阶段目标已经完成，但下一步需要另一类能力、另一类判断或等待条件，才流转到下一个更合适的阶段。
- 如果现有默认阶段都不合适，但问题确实稳定地落在一种新的工作类型上，就应该考虑新增阶段目录 `types/<stage>/`，并在其中创建 `stage.md`、`in-template.md`、`out-template.md`，而不是把不匹配的工作强塞进现有阶段。

## Blocker 原则

- 不要单独设计一棵 blocker 阶段树。
- 遇到 blocker 时，默认继续停留在当前阶段，直到 blocker 被解决，或者真的需要切到别的阶段。
- blocker 用 comment 描述，不改变“阶段为核心”的设计。
- blocker comment 最小字段：
  - `Current type`
  - `Blocker`
  - `Impact`
  - `Need`
  - `Suggested next type`

## 协作机制与阶段的边界

- parent / child issue、关联 issue、sub-issue、等待用户回复、等待另一个任务、等待某个时间点，都是**协作机制**，不是阶段本身。
- 阶段描述的是“当前这件事正在处于什么工作阶段”。
- 协作机制描述的是“为了让当前阶段继续推进，需要和哪些对象建立关系或等待哪些外部条件”。
- 当阶段内发现需要额外创建 issue、拆分 child issue、补一个 `code-review` issue、进入等待，都应先判断这是不是：
  - 当前阶段里的协作动作
  - 还是应当显式流转到另一个阶段

## GitHub 操作基座

### 核心原则

- 对这个 skill 来说，**拉取 issues、读取单个 issue、读取 comments、回复 comment、创建 issue、更新 issue、处理 parent / child issue** 都视为标准 GitHub 操作。
- handling agent 在执行各阶段时，**不需要重新思考 GitHub API、token、owner、repo、URL、请求格式**。
- 这些连接细节由 `scripts/node-base` 统一承担；阶段只关心当前阶段目标、输入模板、该阶段完成报告，以及下一阶段判断。

### 配置与认证约定

- skill 只面向 **单个仓库**。
- 仓库信息来自 `scripts/node-base/github-issues.config.json`。
- `node-base` 会先读取 `scripts/node-base/` 目录下的 `.env` / `.env.local`，再继续读取仓库根目录的 `.env` / `.env.local`，最后再由 `process.env` 覆盖。
- 仓库根目录会按项目名自动推导环境变量前缀；例如项目名 `github-issue-workflow` 会推导出：
  - `GITHUB_ISSUE_WORKFLOW_GITHUB_TOKEN`
  - `GITHUB_ISSUE_WORKFLOW_GITHUB_REPO_OWNER`
  - `GITHUB_ISSUE_WORKFLOW_GITHUB_REPO_NAME`
- 同一层里如果“通用 key”和“带项目前缀 key”同时存在，优先取带项目前缀 key；整体优先级仍是 `process.env` > 根目录 env > skill-local env > 配置文件默认值。
- 仍然保留现有显式配置：`github.auth.tokenEnvVar` 与 `GITHUB_TOKEN_ENV_VAR`。
- 调用层不要显式传 `token`、`owner`、`repo`。

### workflow-level helpers

`scripts/node-base/src/index.ts` 的主入口应视为 **workflow-facing facade**，但对 skill 的实际使用方来说，优先入口不应是临时写 TypeScript 调 helper，而应是直接运行 CLI。

优先使用：

- `node scripts/node-base/cli.mjs stages list`
  - 用于读取允许的阶段集合、默认 handling agent、终态标记和默认文档路径。
- `node scripts/node-base/cli.mjs issues list --stage <type> [--state open|closed|all]`
  - 用于按当前阶段读取 issue 队列；例如要查 `bug` 阶段 issue，就直接运行 `node scripts/node-base/cli.mjs issues list --stage bug`。
- `node scripts/node-base/cli.mjs issues list [--state ...]`
  - 用于浏览通用 issue 队列，并让 CLI 帮你派生 `currentType`。
- `node scripts/node-base/cli.mjs fix queue --limit <n>`
  - 用于按当前阶段聚合 fix 候选，并直接给 worker 一个更适合挑选的最小队列表面。
- `node scripts/node-base/cli.mjs issue show <issueNumber>`
  - 用于读取完整 workflow 上下文，而不是手动扫描 comments。
- `node scripts/node-base/cli.mjs issue payload <issueNumber> --for fix|test|review|split`
  - 用于直接拿到当前角色真正需要的最小字段集。
- `node scripts/node-base/doctor.mjs`
  - 用于做配置、认证和 GitHub 连通性检查。

只有当 CLI 还没有覆盖某个动作，或你正在扩展 `node-base` 本身时，才直接使用这些库能力：

- `buildStageRegistry(allowedTypes)` / `getStageMetadata(stageType, allowedTypes)`
- `prepareFixStageQueuePayload(limit)`
- `prepareFixStageContext(issueNumber)` / `prepareTestStageContext(issueNumber)` / `prepareReviewStageContext(issueNumber)`
- `getLatestStageComment(issueNumber, stageType)` / `getLatestFinalStageComment(issueNumber, stageType)`
- `prepareFixStagePayload(issueNumber)` / `prepareTestStagePayload(issueNumber)` / `prepareReviewStagePayload(issueNumber)` / `prepareSplitStagePayload(issueNumber)`
- `publishBugStageInput(issueNumber, input)`
- `reportWorkflowBlocker(issueNumber, input)`
- `publishStageComment(issueNumber, template)`
- `publishFixStageReport(issueNumber, input)`
- `publishTestStageReport(issueNumber, input)`
- `publishReviewStageReport(issueNumber, input)`
- `publishDoneCloseout(issueNumber, input)` / `reopenIssue(issueNumber)`
- `splitIssueIntoChildren(parentIssueNumber, children)`
- `WorkerScenarioRunner` / `TesterScenarioRunner` / `DispatcherScenarioRunner`
- `createScenarioSeeds()` / `scenarioDefinitions`

### 能力使用时机

- 当 agent 需要浏览 issue 队列时，优先运行 `node scripts/node-base/cli.mjs issues list` 或 `node scripts/node-base/cli.mjs issues list --stage <type>`。
- 当 worker 需要从 `fix` 候选中优先挑选“已经定义充分”的事项时，优先运行 `node scripts/node-base/cli.mjs fix queue --limit <n>`。
- 当 agent 已经知道当前正在处理 `fix` / `test` / `review`，并希望直接拿到上游阶段整理好的最小字段时，优先运行 `node scripts/node-base/cli.mjs issue payload <issueNumber> --for <role>`，而不是自己解析 comment 文本。
- 当 agent 需要进入完整上下文并做更复杂判断时，优先运行 `node scripts/node-base/cli.mjs issue show <issueNumber>`；只有 CLI 还没有覆盖所需动作时，再退回库 API。
- 当 agent 需要写入 blocker、阶段输入、该阶段完成报告、最终 closeout 等 comment 时，优先使用现有 `publish*Stage*` facade，并继续遵守本 skill 与 `types/<stage>/stage.md`、`types/<stage>/in-template.md`、`types/<stage>/out-template.md` 中的阶段约束。

### 推荐调用范式

- 读队列：优先 `node scripts/node-base/cli.mjs issues list --stage <type>`；读 fix 候选时优先 `node scripts/node-base/cli.mjs fix queue --limit <n>`。
- 读当前阶段上下文：优先 `node scripts/node-base/cli.mjs issue show <issueNumber>`。
- 读当前角色最小字段集：优先 `node scripts/node-base/cli.mjs issue payload <issueNumber> --for fix|test|review|split`。
- 查阶段元数据：优先 `node scripts/node-base/cli.mjs stages list`。
- 写 blocker：优先 `reportWorkflowBlocker(issueNumber, input)`。
- 写 bug 阶段输入：优先 `publishBugStageInput(issueNumber, input)`。
- 写扩展阶段 comment：优先 `publishStageComment(issueNumber, template)`，让 `wait` 等阶段先按统一模板落地，再视需要补专用 facade。
- 写 fix / test / review 阶段完成报告：优先 `publishFixStageReport(...)`、`publishTestStageReport(...)`、`publishReviewStageReport(...)`。
- 写 done 终态 closeout：优先 `publishDoneCloseout(issueNumber, input)`；需要重新开始时再用 `reopenIssue(issueNumber)`。
- 只有当 CLI 还没有覆盖某个动作，或你正在扩展 `node-base` 本身时，再退回 `IssueWorkflowService`、role runner 或其他底层 helper。

### 最短 recipe

#### 1. 查 `bug` 阶段的 issues

```bash
node scripts/node-base/cli.mjs issues list --stage bug
```

#### 2. worker 从 fix 队列里挑一个可做事项

```bash
node scripts/node-base/cli.mjs fix queue --limit 5
node scripts/node-base/cli.mjs issue payload 123 --for fix
```

#### 3. 读取某个 issue 的完整 workflow 上下文

```bash
node scripts/node-base/cli.mjs issue show 123
```

#### 4. tester 读取 test 阶段最小字段

```bash
node scripts/node-base/cli.mjs issue payload 123 --for test
```

#### 5. review 读取 review 阶段最小字段

```bash
node scripts/node-base/cli.mjs issue payload 123 --for review
```

#### 6. 诊断配置与 GitHub 连通性

```bash
node scripts/node-base/doctor.mjs
```

## 自动化边界

- 可以由手动 dispatch、hooks 或外部自动化决定某个阶段当前由谁执行。
- `dispatcher` 仍可在需要额外人工 triage 时介入，但它不会重新定义阶段系统本身。
- 真正的阶段定义只在本文件和 `types/<stage>/` 目录中；其中 `stage.md` 定义阶段信息，`in-template.md` 定义进入该阶段的输入模板，`out-template.md` 定义该阶段输出模板。

## 参考示例

- 阶段输入模板与**该阶段完成报告**示例见 `examples.md`。

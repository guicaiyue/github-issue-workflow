# GitHub Issues 基础层

## 目的

本文记录了 `github-issue-workflow` 使用的**单仓库 GitHub Issues 基础层**，以便后续在调整 workflow 或 skill 时，不必从头重新调研 GitHub Issues 的能力边界。

它将体系拆分为两层：

1. **GitHub Issues 基础层**：GitHub 官方能力、本地配置规则，以及最小 Node base 层。
2. **阶段工作流 skill**：构建在 GitHub 基础层之上的、以阶段为中心的协作协议。

## 范围

该基础层被有意限制为仅面向**一个仓库**。

它覆盖：

- 仓库 issue
- issue 评论
- sub-issue / parent-child issue 关系
- 作为 intake 辅助的 issue form / template
- 仓库本地配置与环境解析
- 针对仓库约定的 `Current type` 解析

它**不**覆盖：

- 多仓库编排
- GitHub Projects 自动化
- 组织级 issue type 管理
- webhook 驱动的自动化
- 超出最小持久化阶段解析契约之外的阶段决策逻辑

## 仓库特定假设

### 当前阶段的真相来源

对于这个仓库，当前工作流状态**不是**从 label 或标题前缀推导出来的。

真相来源是：

- 最新一条显式包含 `Current type` 的 issue 评论

如果当前还不存在显式阶段评论，工作流默认阶段为：

- `bug`

`Current type` 是持久化字段标签。从语义上说，它代表当前**阶段**。

这个契约来自：

- `.claude/skills/github-issue-workflow/SKILL.md`
- `.claude/skills/github-issue-workflow/examples.md`

## GitHub 原生能力映射

### 1. 仓库 issue

将 GitHub Issues 作为以下协作信息的记录面：

- 问题定义
- 实现阶段报告
- 测试证据
- blocker 报告
- closeout
- 阶段完成报告

相关原生能力：

- 列出仓库 issues
- 获取单个 issue
- 创建 issue
- 更新 issue
- 关闭 / 重新打开 issue

### 2. Issue 评论

将评论作为以下协议字段的共享载体：

- `Current type`
- blocker 评论
- 阶段输入模板
- 阶段完成报告
- review / done closeout 评论

相关原生能力：

- 列出 issue 评论
- 创建 issue 评论

### 3. Sub-issue 与 issue 关系

当某个 issue 必须拆分为可独立执行的工作流，或者另一个 issue 必须被单独追踪时，使用 sub-issue 或 related issue。

这些是**协作机制**，不是阶段本身。

相关原生能力：

- 浏览 sub-issues
- 获取子 issue 的父 issue
- 向父 issue 添加 sub-issue
- 移除 sub-issue
- 调整 sub-issue 的优先级顺序

### 4. Issue forms 与 templates

Issue forms 和 templates 可以提升 intake 质量，但它们不能替代阶段评论。

在本仓库中，它们适合用于：

- bug intake
- 协调型 parent issue intake
- 可重复使用的回归问题报告

### 5. Issue fields 与 issue type field

GitHub 通过 project fields 和 issue type 支持提供结构化 issue 元数据。

对本仓库而言，这些能力可用作 **UI 镜像** 或未来扩展，但它们**不是**当前阶段身份的真相来源。

## Base layer 职责

Node base 层应负责：

- 加载仓库本地配置
- 从环境中读取 token
- 创建单仓库 GitHub 客户端
- 工作流所需的 issue CRUD
- 工作流所需的 comment 读写
- 协作拆分所需的 sub-issue 操作
- 解析最新显式 `Current type`
- 提供默认内建阶段集合，同时允许通过 `workflow.allowedTypes` 进行仓库级扩展

阶段工作流 skill 应负责：

- 定义阶段列表
- 决定何时停留在当前阶段
- 决定何时 hand off 到其他阶段
- 决定每种阶段输入模板和阶段完成报告应包含什么内容
- 决定 parent/child issues、related issues 或 waiting conditions 应被视为阶段内协作机制，还是流转到其他阶段的原因

## Base layer 公共接口面

Base layer 应暴露仓库作用域的函数，且**不**要求调用方传入 `token`、`owner`、`repo` 之类的连接上下文。

主入口（`skill/scripts/node-base/src/index.ts`）应被视为一个**面向工作流的门面**。它应优先显式导出稳定的 workflow helpers、role runners、comment templates、repository adapter 访问能力，以及公开的 scenario fixtures。不应承诺通过主入口暴露 fake repository 之类的测试内部实现。

示例：

```ts
getIssue(issueNumber)
listIssues(filters?)
createIssue({ title, body, labels?, assignees?, milestone? })
updateIssue(issueNumber, patch)
closeIssue(issueNumber)
reopenIssue(issueNumber)
listComments(issueNumber)
addComment(issueNumber, body)
listSubIssues(issueNumber)
getParentIssue(issueNumber)
addSubIssue(parentIssueNumber, childIssueNumber, options?)
removeSubIssue(parentIssueNumber, childIssueNumber)
reprioritizeSubIssue(parentIssueNumber, subIssueId, afterId)
detectCurrentTypeFromComments(comments)
```

## 能力使用指引

这个 foundation 应告诉调用方**有哪些能力**以及**何时使用它们**，但不应为 agents 硬编码固定阶段执行顺序。
只要某种重复出现的阶段动作可以通过 workflow-level helper 表达，调用方就应优先使用 helper，而不是手工拼装多个 repository 调用。

### 仓库 issue 能力

- `listIssues(filters?)`
  - 当调用方需要浏览仓库 issue 队列、查看 open/closed/all issues，或进行分页浏览时使用。
- `getIssue(issueNumber)`
  - 当调用方需要某个特定 issue 的当前状态和正文时使用。
- `createIssue(input)`
  - 当调用方需要从本地 intake 创建仓库 issue，或把工作拆分成新的 related issue 时使用。
- `updateIssue(issueNumber, patch)`
  - 当调用方需要更新 issue 标题、正文、labels、assignees、milestone 或与状态相关的字段时使用。
- `closeIssue(issueNumber)` / `reopenIssue(issueNumber)`
  - 当调用方需要在 GitHub issue 状态中反映终态或重新打开状态时使用。

### 评论能力

- `listComments(issueNumber)`
  - 当调用方需要阶段历史、blocker 记录、review 备注、验证证据或阶段完成报告时使用。
- `addComment(issueNumber, body)`
  - 当调用方需要写入 `Current type`、blocker 更新、阶段输入说明、阶段完成报告、验证证据、review 备注或最终 closeout 时使用。若该阶段已有模板，优先使用更高层的 `publish*Stage*` helpers；若扩展阶段已有稳定模板但还没有专用 facade，则优先使用 `publishStageComment(issueNumber, template)`。
- `detectCurrentTypeFromComments(comments)`
  - 当调用方需要根据最新显式评论推断当前阶段时使用；若不存在，则默认返回 `bug`。

### Parent / child issue 能力

- `listSubIssues(issueNumber)`
  - 当调用方需要检查当前子 issue 关系时使用。
- `getParentIssue(issueNumber)`
  - 当调用方需要确认一个 issue 是否从属于某个父 issue 时使用。
- `addSubIssue(parentIssueNumber, childIssueNumber, options?)`
  - 当调用方决定需要建立 parent / child 关系时使用。
- `removeSubIssue(parentIssueNumber, childIssueNumber)`
  - 当调用方决定需要移除既有的 parent / child 关系时使用。
- `reprioritizeSubIssue(parentIssueNumber, subIssueId, afterId)`
  - 当调用方需要调整父 issue 下 sub-issue 排序时使用。

### Workflow-level helpers

更高层可以在 repository adapter 之上暴露以阶段为导向的 helpers，让 agents 专注于阶段语义，而不是 GitHub 机制细节。

推荐的阶段导向 helpers 示例：

- `prepareFixStageQueuePayload(limit)`
- `prepareFixStageContext(issueNumber)`
- `prepareTestStageContext(issueNumber)`
- `prepareReviewStageContext(issueNumber)`
- `prepareFixStagePayload(issueNumber)`
- `prepareTestStagePayload(issueNumber)`
- `prepareReviewStagePayload(issueNumber)`
- `prepareSplitStagePayload(issueNumber)`
- `publishBugStageInput(issueNumber, input)`
- `reportWorkflowBlocker(issueNumber, input)`
- `publishStageComment(issueNumber, template)`
- `getLatestStageComment(issueNumber, stageType)`
- `getLatestFinalStageComment(issueNumber, stageType)`
- `publishFixStageReport(issueNumber, input)`
- `publishTestStageReport(issueNumber, input)`
- `publishReviewStageReport(issueNumber, input)`
- `publishDoneCloseout(issueNumber, input)`
- 面向角色的包装器，例如 `WorkerScenarioRunner`、`TesterScenarioRunner` 和 `DispatcherScenarioRunner`（也包括面向扩展阶段的通用 `publishStageCommentAndReload(...)`、`getLatestStageComment(...)` 和 `getLatestFinalStageComment(...)`）

当阶段导向接口还不够用时，可回退到更底层或更通用的 helpers：

- `loadIssueWorkflowContext(issueNumber)`
- `loadQueueContext(filters?)`
- `loadIssuesByCurrentType(currentType)`
- `loadFixBatch(limit)`
- `reopenIssue(issueNumber)`
- `splitIssueIntoChildren(parentIssueNumber, children)`

当调用方需要稳定的阶段动作边界时，应使用这些 helpers。若调用方需要不手工解析评论就能拿到上游结构化阶段信息，优先使用 `prepareFixStageContext` / `prepareTestStageContext` / `prepareReviewStageContext`；这些 helpers 应返回带类型的 workflow context，并补充 `latestBugDefinition`，以及 `latestReviewFixHandoff`、`latestFixHandoff` 或 `latestTestResult`，再加上 `latestDoneCloseout`。若调用方需要可直接消费的、最小化的角色字段集合，优先使用 `prepareFixStagePayload` / `prepareTestStagePayload` / `prepareReviewStagePayload` / `prepareSplitStagePayload`。这些 payload 应直接携带高频 workflow 字段，例如 `issueTitle`，以及 `implementationSummary`、`suggestedNextType`、`subIssueNumbers` 等角色摘要字段，让 agents 在常见读取场景中停留在 payload 层，而不必重新打开完整 workflow context。若 worker 需要从 fix 候选中选择目标，优先使用 `prepareFixStageQueuePayload(limit)`，它应提供带有 `issueTitle`、`hasBugDefinition` 等字段的最小排序队列表面；而 `loadFixBatch(limit)` 仍保留为更通用的 queue-shaped helper。若调用方希望写入阶段评论而不手动重组评论格式，优先使用 `publishBugStageInput` / `publishFixStageReport` / `publishTestStageReport` / `publishReviewStageReport` / `publishDoneCloseout`。当需要验证 agent 是否能在某个角色内保持 workflow 语义时，使用 role-oriented wrappers。将 `createScenarioSeeds()` 和 `scenarioDefinitions` 视为公开的离线 scenario fixtures，可用于 smoke、contract 或 example tests。将 `FakeIssuesRepository` 视为内部测试支持，而不是稳定的 workflow-facing API。仅当需要扩展 base layer 本身，或某个场景对共享 helper 接口来说过于特化时，才直接使用原始 repository 方法。

推荐调用模式：

- 队列读取：优先 `prepareFixStageQueuePayload(limit)`。
- 上下文读取：优先 `prepare*StageContext(issueNumber)`。
- 角色字段读取：优先 `prepare*StagePayload(issueNumber)`。
- 阶段评论写入：优先 `publish*Stage*` helpers。
- blocker 写入：优先 `reportWorkflowBlocker(issueNumber, input)`。
- 终态 closeout 写入：优先 `publishDoneCloseout(issueNumber, input)`；只有在 issue 确实需要离开终态阶段时才用 `reopenIssue(issueNumber)`。
- 角色内编排：优先 role runner facades，而不是从原始 repository 调用重新拼装阶段逻辑。

## 附件边界

- 附件、截图、日志和生成产物可以是 issue 协作的一部分，但它们不是 v1 工作流的真相来源。
- v1 应首先保证 issue、comment、sub-issue 和 `Current type` 操作完整且可靠。
- 如果后续增加附件自动化，应将其文档化为独立能力层，而不是把它耦合进阶段驱动的工作流状态。

## REST 优先的能力映射

基础层优先使用 GitHub REST，因为它对 v1 来说更简单且已足够。

### 仓库 issue

- `GET /repos/{owner}/{repo}/issues`
- `GET /repos/{owner}/{repo}/issues/{issue_number}`
- `POST /repos/{owner}/{repo}/issues`
- `PATCH /repos/{owner}/{repo}/issues/{issue_number}`

### Issue 评论

- `GET /repos/{owner}/{repo}/issues/{issue_number}/comments`
- `POST /repos/{owner}/{repo}/issues/{issue_number}/comments`

### Sub-issues

- `GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues`
- `GET /repos/{owner}/{repo}/issues/{issue_number}/parent`
- `POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues`
- `DELETE /repos/{owner}/{repo}/issues/{issue_number}/sub_issue`
- `PATCH /repos/{owner}/{repo}/issues/{issue_number}/sub_issues/priority`

当前已知的请求细节：

- `POST .../sub_issues` 需要 `sub_issue_id`
- `POST .../sub_issues` 可选接受 `replace_parent`

## GraphQL 边界

v1 不要求使用 GraphQL。

可以把它保留为未来扩展接口，用于 GitHub 未来通过 GraphQL 更清晰地暴露更丰富的 workflow 元数据或 parent-child 创建流程的场景。

## 本地配置模型

对**非敏感**的 skill 本地默认配置，使用提交到仓库的 JSON 配置文件：

- `skill/scripts/node-base/github-issues.config.json`

对 secrets 和本地覆盖项，使用环境变量。

推荐配置结构：

```json
{
  "version": 1,
  "github": {
    "baseUrl": "https://api.github.com",
    "apiVersion": "2022-11-28",
    "repo": {
      "owner": "halo-dev",
      "name": "theme-vite-shoka"
    },
    "auth": {
      "tokenEnvVar": "GITHUB_TOKEN"
    }
  },
  "workflow": {
    "defaultType": "bug",
    "allowedTypes": ["bug", "fix", "test", "review", "done"],
    "typeFieldLabel": "Current type"
  }
}
```

### 环境优先级

解析运行时配置时，使用以下优先级：

1. 硬编码默认值
2. `skill/scripts/node-base/github-issues.config.json`
3. `.env`
4. `.env.local`
5. `process.env`

### 安全规则

不要把 token 存进被仓库跟踪的 JSON 文件。

## 最小运行时校验

以下情况发生时，base layer 必须明确失败：

- config JSON 缺失或无效
- repo owner 或 repo name 为空
- 配置的 token 环境变量名为空
- 解析后的 token 缺失
- 解析后的 workflow 默认类型不在允许列表中

## 推荐的 skill 本地脚本入口

该 skill 可以在自己的目录内提供最小 Node 入口：

- `skill/scripts/node-base/doctor.mjs`
- `skill/scripts/node-base/tsconfig.json`
- `skill/scripts/node-base/github-issues.config.json`
- `skill/scripts/node-base/src/*`

这样，调用方或未来自动化层可以独立编译该 base layer，并调用产出的 `doctor` 入口，而无需修改项目 package scripts。

## 未来扩展点

下面这些可能会在后续加入，但不属于 v1：

- 新阶段（如 `wait` 或 `code-review`）的 stage registry 文档
- 当前阶段身份的字段镜像
- 用于队列可视化的 project 集成
- 更丰富的阶段报告 schema 解析
- 面向高级 issue 元数据的 GraphQL 支持
- 更高层的拆分 helpers

## 官方参考资料

### GitHub Issues 与计划管理

- GitHub Issues 文档总览：<https://docs.github.com/en/issues>
- 添加 sub-issues：<https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues>
- 浏览 sub-issues：<https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/browsing-sub-issues>
- 关于 projects 中的 issue fields：<https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-issue-fields>
- 关于 issue type field：<https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-the-issue-type-field>

### Issue templates 与 forms

- 为仓库配置 issue templates：<https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository>
- 关于 issue 和 pull request templates：<https://docs.github.com/articles/about-issue-and-pull-request-templates>
- Issue forms 语法：<https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms>

### REST API

- REST API issues 总览：<https://docs.github.com/en/rest/issues>
- REST API issue comments：<https://docs.github.com/en/rest/issues/comments>
- REST API sub-issues：<https://docs.github.com/en/rest/issues/sub-issues>
- 添加 sub-issue 的 endpoint 细节：<https://docs.github.com/en/rest/issues/sub-issues#add-sub-issue>

### GitHub CLI

- `gh issue` 总览：<https://cli.github.com/manual/gh_issue>
- `gh issue create`：<https://cli.github.com/manual/gh_issue_create>
- `gh issue edit`：<https://cli.github.com/manual/gh_issue_edit>
- `gh issue comment`：<https://cli.github.com/manual/gh_issue_comment>
- `gh issue list`：<https://cli.github.com/manual/gh_issue_list>
- `gh issue view`：<https://cli.github.com/manual/gh_issue_view>

### 扩展 base layer 时值得重新核对的近期平台变化

- Issue fields structured metadata public preview：<https://github.blog/changelog/2026-03-12-issue-fields-structured-issue-metadata-is-in-public-preview>
- Hierarchy view improvements and file uploads in issue forms：<https://github.blog/changelog/2026-03-05-hierarchy-view-improvements-and-file-uploads-in-issue-forms>

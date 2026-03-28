# github-issue-workflow

一个基于 GitHub Issues 的 AI 协作工作流仓库，用于承载问题跟踪、任务拆分、多 agent 协作、状态流转与交付沉淀。

## 项目定位

`github-issue-workflow` 的目标是把 GitHub Issues 作为 AI 协作层，而不只是缺陷记录工具。

它适合用于：

- 用 issue 驱动需求、缺陷与任务推进
- 将一个复杂问题拆分为 parent / child issues
- 让多个 agent 围绕 issue 协作
- 用明确的 handoff 规则驱动状态流转
- 将讨论、结论、修复与验证沉淀在 issue / PR 中

## 核心能力

### 1. Issue 驱动执行

所有任务围绕 issue 展开，而不是散落在聊天记录或临时文档中。

典型流程：

1. 创建 issue
2. 补充上下文与验收标准
3. 分配给对应角色或 agent
4. 实施修复或交付
5. 验证结果
6. 回写结论并关闭 issue

### 2. Parent / Child 拆分

对于复杂任务，可以把主 issue 作为 parent issue，再把子问题拆成多个 child issues，以便并行推进。

适用场景：

- 一个需求涉及前端、后端、测试三类工作
- 一个缺陷包含多个根因
- 一个重构需要按阶段推进

### 3. 多 Agent 协作

可围绕 issue 建立角色分工，例如：

- `dispatcher`：负责 intake、triage、拆分与路由
- `worker`：负责具体修复
- `tester`：负责验收与回归验证

这样可以让 issue 不只是记录问题，还成为 agent 协作的控制面。

### 4. 类型驱动流转

工作流可按 issue 类型区分处理方式，例如：

- `bug`
- `fix`
- `test`
- 其他自定义类型

每种类型都可以定义：

- 当前阶段的目标
- 允许执行的动作
- 交接给下一个角色时应附带的信息

## 适用场景

- AI 辅助的软件开发团队
- 希望把任务流转沉淀到 GitHub 的个人开发者
- 需要多人 / 多 agent 并行处理 issue 的仓库
- 想把“讨论—执行—验证—交付”串成闭环的工程流程

## 仓库当前状态

当前仓库已完成基础初始化，后续可继续补充：

- issue 模板
- PR 模板
- labels 约定
- parent / child issue 规范
- agent handoff 规范
- 自动化脚本与集成说明

## 后续计划

建议后续逐步补充以下内容：

1. `docs/` 文档目录，系统化说明工作流设计
2. issue templates，用于标准化问题录入
3. pull request template，用于统一交付格式
4. labels 体系，用于区分类型、优先级、状态
5. 与 Claude / MCP / GitHub 自动化的集成说明

## License

本项目采用 [MIT License](./LICENSE)。

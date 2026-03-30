# `bug`

## 阶段目标

- 把一个被报告的问题整理成可执行的问题定义。
- 分清事实、证据、推测、验收标准与依赖条件。
- 判断当前问题是否已经足够进入实现，还是仍需继续澄清、等待，或拆分协作对象。

## 该阶段应重点思考什么

- 哪些内容已经确认，哪些只是推测。
- 当前问题是否已经足够清晰到可以进入实现。
- 是否缺少关键证据、上下文或用户确认。
- 当前 issue 是否混入了多个独立问题，需要通过 parent / child 或关联 issue 做协作拆分。
- 如果需要等待别的任务、用户回复或外部条件，究竟是当前阶段内的协作等待，还是应显式流转到别的阶段。

## 如何确认该阶段完成

当下列条件大体满足时，可以认为 `bug` 阶段完成：

- 问题事实与证据已经足够清晰。
- 验收标准已经能指导后续实现或验证。
- 当前 scope 已经足够收敛，不再是泛泛的问题描述。
- 下一阶段为什么成立，已经可以被清楚解释。

如果这些条件仍不成立，就继续停留在 `bug`。

## 如何根据主阶段列表决定下一阶段

- 如果问题已经可执行，通常流转到 `fix`。
- 如果仍缺少必要信息、证据或外部回复，可以继续停留在 `bug`，或在主阶段列表中选择更合适的扩展阶段，例如未来的 `wait`。
- 如果当前 issue 实际承载的是另一类工作，而不是问题定义本身，应回到主阶段列表判断是否存在更合适的阶段，而不是机械推进到 `fix`。

## Blocker 处理原则

- blocker 默认仍属于 `bug` 阶段内部状态。
- 遇到 blocker 时优先记录清楚“为什么现在还不能完成问题定义”。
- 只有当 blocker 的本质已经明显属于另一阶段工作时，才考虑流转。

## 对 GitHub 操作基座的默认依赖

- 当需要进入某个 issue 的问题定义上下文时，使用 `getIssue(issueNumber)`。
- 当需要读取历史阶段记录、blocker、证据并判断当前阶段时，使用 `listComments(issueNumber)` 与 `detectCurrentTypeFromComments(comments)`，或更高层的 `prepareFixStageContext(...)` / `prepareReviewStageContext(...)` 等读取 facade。
- 当需要浏览 issue 队列或找候选问题时，使用 `listIssues(filters?)`。
- 当需要把本地问题沉淀进仓库时，使用 `createIssue(input)`。
- 当需要记录 bug 阶段输入、补证据、声明 blocker 或准备进入下一阶段时，使用 `addComment(issueNumber, body)`、`publishBugStageInput(issueNumber, input)` 或 `reportWorkflowBlocker(issueNumber, input)`。
- 当需要拆分 parent / child issue 或关联协作对象时，使用相应 issue 关系能力，但把它们当作协作机制，而不是阶段本身。

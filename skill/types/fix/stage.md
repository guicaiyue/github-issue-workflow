# `fix`

## 阶段目标

- 对一个已经可执行的问题做一次有边界的实现。
- 保持改动局部、目标明确。
- 为下游验证阶段准备可接手的输入与结论。

## 该阶段应重点思考什么

- 当前改动范围是否仍然和上游阶段输入 / 阶段完成报告保持一致。
- 是否为了修一个问题引入了无关扩展。
- 哪些实现已经完成，哪些仍然存在限制或需要额外协作。
- 是否已经具备让下游验证的最小条件。
- 如果发现额外风险、额外问题或需要他人协作，应该记录为协作动作、创建关联 issue，还是重新判断下一阶段。

## 如何确认该阶段完成

当下列条件大体满足时，可以认为 `fix` 阶段完成：

- 既定 scope 的实现已经完成。
- 改动内容与影响范围已能被清楚说明。
- 已知限制与开放问题已明确记录。
- 下游验证所需的检查项已经明确。

如果实现仍未完成，或仍无法让验证方接手，就继续停留在 `fix`。

## 如何根据主阶段列表决定下一阶段

- 如果实现已经具备被验证的条件，通常流转到 `test`。
- 如果实现尚未完成，或 blocker 仍在当前阶段内部，继续停留在 `fix`。
- 如果实现过程中发现真正需要等待外部条件或切到别的工作类型，再回到主阶段列表选择更合适的阶段，而不是机械推进到 `test`。

## Blocker 处理原则

- blocker 默认继续停留在 `fix`。
- 先记录当前不能继续实现的原因、影响和所需条件。
- 不要因为出现阻塞就自动切换阶段；只有在工作性质已经变化时，才考虑流转。

## 对 GitHub 操作基座的默认依赖

- 当需要读取当前实现范围、最近阶段记录、限制和验证要求时，使用 `getIssue(issueNumber)`、`listComments(issueNumber)` 与 `detectCurrentTypeFromComments(comments)`，或更高层的 `prepareFixStageContext(issueNumber)` / `prepareFixStagePayload(issueNumber)`。
- 当需要补充或修正 issue 描述、状态或元信息时，使用 `updateIssue(issueNumber, patch)`。
- 当需要报告实现结果、changed files、已知限制、验证重点或准备进入下一阶段时，使用 `addComment(issueNumber, body)` 或 `publishFixStageReport(issueNumber, input)`。
- 当实现过程中发现需要拆分或调整 parent / child / 关联 issue 时，使用相应 issue 关系能力，但仍把这些当作协作机制。

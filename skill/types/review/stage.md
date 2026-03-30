# `review`

## 阶段目标

- 做最终确认与收尾判断。
- 确认 issue 是否真的可以结束。
- 如果最终阶段报告仍显示存在缺口，就退回继续处理。

## 该阶段应重点思考什么

- 当前测试与证据是否已经足够支持最终确认。
- 哪些内容已经确认完成，哪些其实仍然有缺口。
- 当前问题是真的可以结束，还是只是“还没继续看下去”。
- 如果发现新缺口，它属于修复问题、等待问题，还是别的工作类型。
- 是否需要 reopen、退回、补充说明或创建协作 issue。

## 如何确认该阶段完成

当下列条件大体满足时，可以认为 `review` 阶段完成：

- 已有证据足以支持“结束”或“退回”的明确判断。
- 当前结论已经简洁明确，不再停留在模糊表述。
- 下一阶段为什么成立，已经可以被清楚解释。

如果仍无法做出清晰判断，就继续停留在 `review`。

## 如何根据主阶段列表决定下一阶段

- 如果已经足够确认结束，通常流转到 `done`。
- 如果发现还需要继续修改，通常流转回 `fix`。
- 如果结论仍依赖外部条件、等待信息或别的工作类型，则回到主阶段列表重新选择，而不是机械只在 `done` / `fix` 之间选。

## Blocker 处理原则

- blocker 默认继续停留在 `review`。
- 先说明为什么当前无法完成最终确认。
- 只有当当前工作性质已经改变时，才考虑流转。

## 对 GitHub 操作基座的默认依赖

- 当需要读取 test 结论、证据与之前阶段记录，并判断当前阶段时，使用 `getIssue(issueNumber)`、`listComments(issueNumber)` 与 `detectCurrentTypeFromComments(comments)`，或更高层的 `prepareReviewStageContext(issueNumber)` / `prepareReviewStagePayload(issueNumber)`。
- 当需要补充最终确认、退回或进入终态时，使用 `addComment(issueNumber, body)`、`publishReviewStageReport(issueNumber, input)` 或 `publishDoneCloseout(issueNumber, input)`。
- 当需要把终态同步到 GitHub issue 状态时，使用 `closeIssue(issueNumber)`；如果发现真实新缺口，需要重新打开时使用 `reopenIssue(issueNumber)`。

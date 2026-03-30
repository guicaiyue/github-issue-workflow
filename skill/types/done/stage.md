# `done`

## 阶段目标

- 表示终态完成。
- 记录最终结果并保持可追溯。
- 按仓库规则关闭或维持关闭状态。

## 该阶段应重点思考什么

- 当前问题是否真的已经结束，而不是暂时没人继续处理。
- 最终结果是否已经被清楚记录。
- 是否仍存在会触发 reopen 的真实缺口。
- 是否还有需要单独追踪的 follow-up，但它不应阻止当前 issue 进入终态。

## 如何确认该阶段完成

当下列条件大体满足时，可以认为 `done` 阶段完成：

- 终态结论已经明确。
- 关键证据或引用已经记录。
- issue 状态与阶段结论保持一致。
- 后续如果还有新问题，也已经明确应通过 reopen 或新 issue 处理。

## 如何根据主阶段列表决定下一阶段

- 正常情况下没有下一阶段。
- 如果 closeout 后又出现真实新缺口，应重新打开 issue，并回到主阶段列表选择合适的非终态阶段，而不是把 `done` 当成可继续工作阶段。

## Blocker 处理原则

- `done` 很少出现 blocker。
- 如果当前其实还不能结束，就说明问题不在 `done` 内部，而是应重新判断是否应回到非终态阶段。

## 对 GitHub 操作基座的默认依赖

- 当需要确认 issue 是否已经进入终态时，使用 `getIssue(issueNumber)`、`listComments(issueNumber)` 与 `detectCurrentTypeFromComments(comments)`。
- 当需要写最终 closeout comment 时，使用 `addComment(issueNumber, body)` 或 `publishDoneCloseout(issueNumber, input)`。
- 当 closeout 后又出现真实的新缺口时，使用 `reopenIssue(issueNumber)` 并回到主阶段列表重新选择合适的非终态阶段。

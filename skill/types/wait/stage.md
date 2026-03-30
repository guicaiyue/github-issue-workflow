# `wait`

## 阶段目标

- 显式记录“当前工作已暂停，正在等待某个恢复条件成立”。
- 把等待对象、等待原因和恢复条件写清楚。
- 避免把等待误写成已经完成、已经失败，或机械停留在别的并不匹配的阶段。

## 该阶段应重点思考什么

- 当前是否真的已经进入“无法继续推进，必须等待”的状态。
- 等待对象是用户回复、另一个 issue、某个时间点，还是外部系统 / 外部依赖。
- 当前等待是否只是阶段内部短暂阻塞，还是值得显式切到 `wait` 来记录。
- 恢复后最合理的下一阶段是什么，而不是默认回到某个固定阶段。
- 是否还需要补 parent / child issue、关联 issue 或其他协作机制来帮助恢复。

## 如何确认该阶段完成

当下列条件大体满足时，可以认为 `wait` 阶段完成：

- 等待对象与等待原因已经记录清楚。
- 恢复条件已经明确，而不是模糊地写成“之后再看”。
- 已经能解释为什么恢复后建议回到某个具体阶段。

如果等待对象、原因或恢复条件仍不清楚，就继续停留在 `wait`。

## 如何根据主阶段列表决定下一阶段

- 如果等待条件仍未成立，继续停留在 `wait`。
- 如果等待条件已成立，则回到主阶段列表，选择最适合恢复工作的阶段；常见去向可能是 `bug`、`fix`、`test` 或 `review`。
- 不要把 `wait` 当成终态，也不要默认从 `wait` 只回到单一固定阶段。

## Blocker 处理原则

- `wait` 本身已经是在显式描述“当前需要等待”的状态。
- 如果只是很短暂、无需单独记录的阻塞，未必需要切到 `wait`；继续留在原阶段并写 blocker comment 也可以。
- 只有当“等待”本身已经成为最准确的当前工作状态时，才应切到 `wait`。

## 对 GitHub 操作基座的默认依赖

- 当需要判断当前是否真的应切到等待状态时，使用 `getIssue(issueNumber)`、`listComments(issueNumber)` 与 `detectCurrentTypeFromComments(comments)`，必要时结合 `loadIssueWorkflowContext(issueNumber)`。
- 当需要读取恢复前最近的阶段上下文时，优先使用对应 `prepare*StageContext(issueNumber)` / `prepare*StagePayload(issueNumber)`，而不是手动回扫 comment。
- 当需要显式记录等待对象、等待原因、恢复条件与建议下一阶段时，使用 `addComment(issueNumber, body)`，并遵守 `examples.md` 中的 `wait` 模板。
- 当等待期间需要建立 parent / child issue、关联 issue 或补充协作关系时，使用相应 issue 关系能力，但继续把这些当作协作机制，而不是把它们混同为阶段本身。

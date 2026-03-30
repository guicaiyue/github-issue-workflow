# `test`

## 阶段目标

- 按验收标准验证当前实现。
- 产出直接证据，而不是只复述 diff。
- 判断下一步应继续验证、退回实现，还是进入最终确认。

## 该阶段应重点思考什么

- 当前验证是否真正覆盖了上游定义的验收标准。
- 哪些结论是有直接证据支持的，哪些只是推断。
- 当前结果更像是通过、失败、blocked，还是信息不足。
- 是否仍存在会影响最终确认的剩余风险。
- 如果当前无法继续验证，问题是暂时的阻塞、环境问题，还是应流转到别的阶段。

## 如何确认该阶段完成

当下列条件大体满足时，可以认为 `test` 阶段完成：

- 关键验证场景已经执行。
- pass / fail / blocked 结论都有证据支撑。
- 剩余风险和 follow-up 已记录清楚。
- 已经可以解释为什么建议进入下一阶段。

如果这些条件不满足，就继续停留在 `test`。

## 如何根据主阶段列表决定下一阶段

- 如果验证表明当前实现不满足要求，通常流转回 `fix`。
- 如果验证已经足够支持最终确认，通常流转到 `review`。
- 如果还缺少关键验证条件，或需要等待某个外部条件，可以继续停留在 `test`，或根据主阶段列表选择更合适的扩展阶段。

## Blocker 处理原则

- blocker 默认继续停留在 `test`。
- 优先说明：为什么当前无法继续验证、受什么影响、需要什么才能恢复。
- 不要把“验证暂时 blocked”误当成已经完成该阶段。

## 对 GitHub 操作基座的默认依赖

- 当需要读取 fix 阶段报告、验证重点、已知限制并判断当前阶段时，使用 `getIssue(issueNumber)`、`listComments(issueNumber)` 与 `detectCurrentTypeFromComments(comments)`，或更高层的 `prepareTestStageContext(issueNumber)` / `prepareTestStagePayload(issueNumber)`。
- 当需要补读更大范围上下文时，可使用 `listIssues(...)`、`getParentIssue(...)`、`listSubIssues(...)`。
- 当需要记录验证结论、证据、失败项、blocked 原因或准备进入下一阶段时，使用 `addComment(issueNumber, body)` 或 `publishTestStageReport(issueNumber, input)`。

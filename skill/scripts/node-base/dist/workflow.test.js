"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const workflow_1 = require("./workflow");
function createComment(body, updatedAt) {
    return {
        id: updatedAt.length,
        body,
        html_url: "https://example.com/comment",
        created_at: updatedAt,
        updated_at: updatedAt,
    };
}
(0, vitest_1.describe)("detectCurrentTypeFromComments", () => {
    (0, vitest_1.it)("returns the latest explicit current type", () => {
        const comments = [
            createComment("Current type: bug", "2026-03-01T00:00:00.000Z"),
            createComment("Current type: test", "2026-03-03T00:00:00.000Z"),
            createComment("Current type: fix", "2026-03-02T00:00:00.000Z"),
        ];
        (0, vitest_1.expect)((0, workflow_1.detectCurrentTypeFromComments)(comments, ["bug", "fix", "test", "review", "done"])).toBe("test");
    });
    (0, vitest_1.it)("falls back to bug when explicit type is missing", () => {
        const comments = [createComment("No workflow field here", "2026-03-01T00:00:00.000Z")];
        (0, vitest_1.expect)((0, workflow_1.detectCurrentTypeFromComments)(comments, ["bug", "fix", "test", "review", "done"])).toBe("bug");
    });
    (0, vitest_1.it)("ignores unsupported types", () => {
        const comments = [createComment("Current type: unknown", "2026-03-01T00:00:00.000Z")];
        (0, vitest_1.expect)((0, workflow_1.detectCurrentTypeFromComments)(comments, ["bug", "fix", "test", "review", "done"])).toBe("bug");
    });
    (0, vitest_1.it)("ignores newer non-type comments after an explicit type", () => {
        const comments = [
            createComment("Current type: fix", "2026-03-01T00:00:00.000Z"),
            createComment("Narrative note only", "2026-03-02T00:00:00.000Z"),
        ];
        (0, vitest_1.expect)((0, workflow_1.detectCurrentTypeFromComments)(comments, ["bug", "fix", "test", "review", "done"])).toBe("fix");
    });
    (0, vitest_1.it)("supports extended stage identifiers when allowed types are expanded", () => {
        const comments = [createComment("Current type: wait", "2026-03-01T00:00:00.000Z")];
        (0, vitest_1.expect)((0, workflow_1.detectCurrentTypeFromComments)(comments, ["bug", "fix", "test", "review", "done", "wait"])).toBe("wait");
    });
});
(0, vitest_1.describe)("structured comment extraction", () => {
    (0, vitest_1.it)("extracts the latest bug definition", () => {
        const comments = [
            createComment([
                "Current type: bug",
                "",
                "Facts:",
                "- fact one",
                "",
                "Evidence:",
                "- evidence one",
                "",
                "Acceptance Criteria:",
                "- acceptance one",
                "",
                "Stay in current type or hand off: hand off",
                "Recommended next type: fix",
            ].join("\n"), "2026-03-01T00:00:00.000Z"),
        ];
        (0, vitest_1.expect)((0, workflow_1.getLatestBugDefinition)(comments)).toEqual({
            facts: ["fact one"],
            evidence: ["evidence one"],
            hypothesis: [],
            acceptanceCriteria: ["acceptance one"],
            stayOrHandOff: "hand off",
            recommendedNextType: "fix",
            blockersOrDependencies: [],
        });
    });
    (0, vitest_1.it)("extracts the latest fix handoff", () => {
        const comments = [
            createComment([
                "Current type: fix",
                "",
                "Implementation summary:",
                "- change one",
                "",
                "Changed files:",
                "- src/workflow.ts",
                "",
                "Suggested next type: test",
                "",
                "Validation checklist for next role:",
                "- verify latest comment wins",
            ].join("\n"), "2026-03-01T00:00:00.000Z"),
        ];
        (0, vitest_1.expect)((0, workflow_1.getLatestFixHandoff)(comments)).toEqual({
            implementationSummary: ["change one"],
            changedFiles: ["src/workflow.ts"],
            knownLimitationsOrOpenQuestions: [],
            suggestedNextType: "test",
            validationChecklist: ["verify latest comment wins"],
        });
    });
    (0, vitest_1.it)("extracts the latest test result", () => {
        const comments = [
            createComment([
                "Current type: test",
                "",
                "Scenario-by-scenario validation result:",
                "- scenario one: pass",
                "- scenario two: blocked",
                "",
                "Evidence used:",
                "- browser run",
                "",
                "Suggested next type: review",
            ].join("\n"), "2026-03-01T00:00:00.000Z"),
        ];
        (0, vitest_1.expect)((0, workflow_1.getLatestTestResult)(comments)).toEqual({
            scenarios: [
                { name: "scenario one", result: "pass" },
                { name: "scenario two", result: "blocked" },
            ],
            evidenceUsed: ["browser run"],
            suggestedNextType: "review",
            remainingRisksOrFollowUps: [],
        });
    });
    (0, vitest_1.it)("extracts the latest blocker comment", () => {
        const comments = [
            createComment([
                "Current type: test",
                "Blocker: Missing browser session",
                "Impact: Cannot finish validation",
                "Need: agent-browser session",
                "Suggested next type: test",
            ].join("\n"), "2026-03-01T00:00:00.000Z"),
        ];
        (0, vitest_1.expect)((0, workflow_1.getLatestBlocker)(comments)).toEqual({
            currentType: "test",
            blocker: "Missing browser session",
            impact: "Cannot finish validation",
            need: "agent-browser session",
            suggestedNextType: "test",
        });
    });
    (0, vitest_1.it)("extracts the latest review-to-fix handoff", () => {
        const comments = [
            createComment([
                "Current type: review",
                "",
                "Outcome: Needs another patch",
                "",
                "Suggested next type: fix",
                "",
                "Evidence or reference:",
                "- review note",
                "",
                "Follow-up:",
                "- fix edge case",
            ].join("\n"), "2026-03-01T00:00:00.000Z"),
        ];
        (0, vitest_1.expect)((0, workflow_1.getLatestReviewFixHandoff)(comments)).toEqual({
            outcome: "Needs another patch",
            suggestedNextType: "fix",
            evidenceOrReference: ["review note"],
            followUp: ["fix edge case"],
        });
    });
    (0, vitest_1.it)("extracts the latest done closeout", () => {
        const comments = [
            createComment([
                "Final type: done",
                "",
                "Outcome: Validated and accepted",
                "",
                "Evidence or reference:",
                "- review evidence",
                "",
                "Follow-up:",
                "- none needed",
            ].join("\n"), "2026-03-01T00:00:00.000Z"),
        ];
        (0, vitest_1.expect)((0, workflow_1.getLatestDoneCloseout)(comments)).toEqual({
            outcome: "Validated and accepted",
            evidenceOrReference: ["review evidence"],
            followUp: ["none needed"],
        });
    });
    (0, vitest_1.it)("reads generic stage comments for extension stages", () => {
        const comments = [
            createComment([
                "Current type: wait",
                "",
                "Waiting for:",
                "- User confirmation",
                "",
                "Why waiting is necessary:",
                "- Cannot choose implementation direction",
                "",
                "Resume condition:",
                "- User picks a direction",
                "",
                "Suggested next type: fix",
            ].join("\n"), "2026-03-01T00:00:00.000Z"),
        ];
        (0, vitest_1.expect)((0, workflow_1.getLatestStageComment)(comments, "wait")).toEqual({
            currentType: "wait",
            finalType: null,
            fields: {
                "Waiting for": ["User confirmation"],
                "Why waiting is necessary": ["Cannot choose implementation direction"],
                "Resume condition": ["User picks a direction"],
                "Suggested next type": "fix",
            },
            rawBody: comments[0].body,
        });
    });
    (0, vitest_1.it)("reads generic final-stage comments", () => {
        const comments = [
            createComment([
                "Final type: done",
                "",
                "Outcome: Validated and accepted",
                "",
                "Evidence or reference:",
                "- review evidence",
            ].join("\n"), "2026-03-01T00:00:00.000Z"),
        ];
        (0, vitest_1.expect)((0, workflow_1.getLatestFinalStageComment)(comments, "done")).toEqual({
            currentType: null,
            finalType: "done",
            fields: {
                Outcome: "Validated and accepted",
                "Evidence or reference": ["review evidence"],
            },
            rawBody: comments[0].body,
        });
    });
    (0, vitest_1.it)("provides stage-oriented parser aliases over the existing structured extractors", () => {
        const bugComments = [
            createComment([
                "Current type: bug",
                "",
                "Facts:",
                "- fact one",
                "",
                "Evidence:",
                "- evidence one",
                "",
                "Acceptance Criteria:",
                "- acceptance one",
                "",
                "Stay in current type or hand off: hand off",
                "Recommended next type: fix",
            ].join("\n"), "2026-03-01T00:00:00.000Z"),
        ];
        const fixComments = [
            createComment([
                "Current type: fix",
                "",
                "Implementation summary:",
                "- change one",
                "",
                "Changed files:",
                "- src/workflow.ts",
                "",
                "Suggested next type: test",
                "",
                "Validation checklist for next role:",
                "- verify latest comment wins",
            ].join("\n"), "2026-03-01T00:00:00.000Z"),
        ];
        const testComments = [
            createComment([
                "Current type: test",
                "",
                "Scenario-by-scenario validation result:",
                "- scenario one: pass",
                "",
                "Evidence used:",
                "- browser run",
                "",
                "Suggested next type: review",
            ].join("\n"), "2026-03-01T00:00:00.000Z"),
        ];
        const blockerComments = [
            createComment([
                "Current type: test",
                "Blocker: Missing browser session",
                "Impact: Cannot finish validation",
                "Need: agent-browser session",
                "Suggested next type: test",
            ].join("\n"), "2026-03-01T00:00:00.000Z"),
        ];
        const reviewComments = [
            createComment([
                "Current type: review",
                "",
                "Outcome: Needs another patch",
                "",
                "Suggested next type: fix",
                "",
                "Evidence or reference:",
                "- review note",
                "",
                "Follow-up:",
                "- fix edge case",
            ].join("\n"), "2026-03-01T00:00:00.000Z"),
        ];
        const doneComments = [
            createComment([
                "Final type: done",
                "",
                "Outcome: Validated and accepted",
                "",
                "Evidence or reference:",
                "- review evidence",
                "",
                "Follow-up:",
                "- none needed",
            ].join("\n"), "2026-03-01T00:00:00.000Z"),
        ];
        (0, vitest_1.expect)((0, workflow_1.getLatestBugStageInput)(bugComments)).toEqual((0, workflow_1.getLatestBugDefinition)(bugComments));
        (0, vitest_1.expect)((0, workflow_1.getLatestFixStageReport)(fixComments)).toEqual((0, workflow_1.getLatestFixHandoff)(fixComments));
        (0, vitest_1.expect)((0, workflow_1.getLatestTestStageReport)(testComments)).toEqual((0, workflow_1.getLatestTestResult)(testComments));
        (0, vitest_1.expect)((0, workflow_1.getLatestWorkflowStageBlocker)(blockerComments)).toEqual((0, workflow_1.getLatestBlocker)(blockerComments));
        (0, vitest_1.expect)((0, workflow_1.getLatestReviewStageReport)(reviewComments)).toEqual((0, workflow_1.getLatestReviewFixHandoff)(reviewComments));
        (0, vitest_1.expect)((0, workflow_1.getLatestDoneStageCloseout)(doneComments)).toEqual((0, workflow_1.getLatestDoneCloseout)(doneComments));
    });
});

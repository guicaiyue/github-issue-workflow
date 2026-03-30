import { describe, expect, it } from "vitest";
import {
  detectCurrentTypeFromComments,
  getLatestBlocker,
  getLatestBugDefinition,
  getLatestBugStageInput,
  getLatestDoneCloseout,
  getLatestDoneStageCloseout,
  getLatestFinalStageComment,
  getLatestFixHandoff,
  getLatestFixStageReport,
  getLatestReviewFixHandoff,
  getLatestReviewStageReport,
  getLatestStageComment,
  getLatestTestResult,
  getLatestTestStageReport,
  getLatestWorkflowStageBlocker,
} from "./workflow";
import type { GitHubIssueComment } from "./types";

function createComment(body: string, updatedAt: string): GitHubIssueComment {
  return {
    id: updatedAt.length,
    body,
    html_url: "https://example.com/comment",
    created_at: updatedAt,
    updated_at: updatedAt,
  };
}

describe("detectCurrentTypeFromComments", () => {
  it("returns the latest explicit current type", () => {
    const comments = [
      createComment("Current type: bug", "2026-03-01T00:00:00.000Z"),
      createComment("Current type: test", "2026-03-03T00:00:00.000Z"),
      createComment("Current type: fix", "2026-03-02T00:00:00.000Z"),
    ];

    expect(detectCurrentTypeFromComments(comments, ["bug", "fix", "test", "review", "done"])).toBe("test");
  });

  it("falls back to bug when explicit type is missing", () => {
    const comments = [createComment("No workflow field here", "2026-03-01T00:00:00.000Z")];

    expect(detectCurrentTypeFromComments(comments, ["bug", "fix", "test", "review", "done"])).toBe("bug");
  });

  it("ignores unsupported types", () => {
    const comments = [createComment("Current type: unknown", "2026-03-01T00:00:00.000Z")];

    expect(detectCurrentTypeFromComments(comments, ["bug", "fix", "test", "review", "done"])).toBe("bug");
  });

  it("ignores newer non-type comments after an explicit type", () => {
    const comments = [
      createComment("Current type: fix", "2026-03-01T00:00:00.000Z"),
      createComment("Narrative note only", "2026-03-02T00:00:00.000Z"),
    ];

    expect(detectCurrentTypeFromComments(comments, ["bug", "fix", "test", "review", "done"])).toBe("fix");
  });

  it("supports extended stage identifiers when allowed types are expanded", () => {
    const comments = [createComment("Current type: wait", "2026-03-01T00:00:00.000Z")];

    expect(detectCurrentTypeFromComments(comments, ["bug", "fix", "test", "review", "done", "wait"] as const)).toBe("wait");
  });
});

describe("structured comment extraction", () => {
  it("extracts the latest bug definition", () => {
    const comments = [
      createComment(
        [
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
        ].join("\n"),
        "2026-03-01T00:00:00.000Z"
      ),
    ];

    expect(getLatestBugDefinition(comments)).toEqual({
      facts: ["fact one"],
      evidence: ["evidence one"],
      hypothesis: [],
      acceptanceCriteria: ["acceptance one"],
      stayOrHandOff: "hand off",
      recommendedNextType: "fix",
      blockersOrDependencies: [],
    });
  });

  it("extracts the latest fix handoff", () => {
    const comments = [
      createComment(
        [
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
        ].join("\n"),
        "2026-03-01T00:00:00.000Z"
      ),
    ];

    expect(getLatestFixHandoff(comments)).toEqual({
      implementationSummary: ["change one"],
      changedFiles: ["src/workflow.ts"],
      knownLimitationsOrOpenQuestions: [],
      suggestedNextType: "test",
      validationChecklist: ["verify latest comment wins"],
    });
  });

  it("extracts the latest test result", () => {
    const comments = [
      createComment(
        [
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
        ].join("\n"),
        "2026-03-01T00:00:00.000Z"
      ),
    ];

    expect(getLatestTestResult(comments)).toEqual({
      scenarios: [
        { name: "scenario one", result: "pass" },
        { name: "scenario two", result: "blocked" },
      ],
      evidenceUsed: ["browser run"],
      suggestedNextType: "review",
      remainingRisksOrFollowUps: [],
    });
  });

  it("extracts the latest blocker comment", () => {
    const comments = [
      createComment(
        [
          "Current type: test",
          "Blocker: Missing browser session",
          "Impact: Cannot finish validation",
          "Need: agent-browser session",
          "Suggested next type: test",
        ].join("\n"),
        "2026-03-01T00:00:00.000Z"
      ),
    ];

    expect(getLatestBlocker(comments)).toEqual({
      currentType: "test",
      blocker: "Missing browser session",
      impact: "Cannot finish validation",
      need: "agent-browser session",
      suggestedNextType: "test",
    });
  });

  it("extracts the latest review-to-fix handoff", () => {
    const comments = [
      createComment(
        [
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
        ].join("\n"),
        "2026-03-01T00:00:00.000Z"
      ),
    ];

    expect(getLatestReviewFixHandoff(comments)).toEqual({
      outcome: "Needs another patch",
      suggestedNextType: "fix",
      evidenceOrReference: ["review note"],
      followUp: ["fix edge case"],
    });
  });

  it("extracts the latest done closeout", () => {
    const comments = [
      createComment(
        [
          "Final type: done",
          "",
          "Outcome: Validated and accepted",
          "",
          "Evidence or reference:",
          "- review evidence",
          "",
          "Follow-up:",
          "- none needed",
        ].join("\n"),
        "2026-03-01T00:00:00.000Z"
      ),
    ];

    expect(getLatestDoneCloseout(comments)).toEqual({
      outcome: "Validated and accepted",
      evidenceOrReference: ["review evidence"],
      followUp: ["none needed"],
    });
  });

  it("reads generic stage comments for extension stages", () => {
    const comments = [
      createComment(
        [
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
        ].join("\n"),
        "2026-03-01T00:00:00.000Z"
      ),
    ];

    expect(getLatestStageComment(comments, "wait")).toEqual({
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

  it("reads generic final-stage comments", () => {
    const comments = [
      createComment(
        [
          "Final type: done",
          "",
          "Outcome: Validated and accepted",
          "",
          "Evidence or reference:",
          "- review evidence",
        ].join("\n"),
        "2026-03-01T00:00:00.000Z"
      ),
    ];

    expect(getLatestFinalStageComment(comments, "done")).toEqual({
      currentType: null,
      finalType: "done",
      fields: {
        Outcome: "Validated and accepted",
        "Evidence or reference": ["review evidence"],
      },
      rawBody: comments[0].body,
    });
  });

  it("provides stage-oriented parser aliases over the existing structured extractors", () => {
    const bugComments = [
      createComment(
        [
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
        ].join("\n"),
        "2026-03-01T00:00:00.000Z"
      ),
    ];
    const fixComments = [
      createComment(
        [
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
        ].join("\n"),
        "2026-03-01T00:00:00.000Z"
      ),
    ];
    const testComments = [
      createComment(
        [
          "Current type: test",
          "",
          "Scenario-by-scenario validation result:",
          "- scenario one: pass",
          "",
          "Evidence used:",
          "- browser run",
          "",
          "Suggested next type: review",
        ].join("\n"),
        "2026-03-01T00:00:00.000Z"
      ),
    ];
    const blockerComments = [
      createComment(
        [
          "Current type: test",
          "Blocker: Missing browser session",
          "Impact: Cannot finish validation",
          "Need: agent-browser session",
          "Suggested next type: test",
        ].join("\n"),
        "2026-03-01T00:00:00.000Z"
      ),
    ];
    const reviewComments = [
      createComment(
        [
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
        ].join("\n"),
        "2026-03-01T00:00:00.000Z"
      ),
    ];
    const doneComments = [
      createComment(
        [
          "Final type: done",
          "",
          "Outcome: Validated and accepted",
          "",
          "Evidence or reference:",
          "- review evidence",
          "",
          "Follow-up:",
          "- none needed",
        ].join("\n"),
        "2026-03-01T00:00:00.000Z"
      ),
    ];

    expect(getLatestBugStageInput(bugComments)).toEqual(getLatestBugDefinition(bugComments));
    expect(getLatestFixStageReport(fixComments)).toEqual(getLatestFixHandoff(fixComments));
    expect(getLatestTestStageReport(testComments)).toEqual(getLatestTestResult(testComments));
    expect(getLatestWorkflowStageBlocker(blockerComments)).toEqual(getLatestBlocker(blockerComments));
    expect(getLatestReviewStageReport(reviewComments)).toEqual(getLatestReviewFixHandoff(reviewComments));
    expect(getLatestDoneStageCloseout(doneComments)).toEqual(getLatestDoneCloseout(doneComments));
  });
});

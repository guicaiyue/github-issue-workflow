"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scenarioDefinitions = void 0;
exports.createScenarioSeeds = createScenarioSeeds;
function createIssue(number, title, state = "open") {
    return {
        id: number + 1000,
        number,
        title,
        body: `${title} body`,
        state,
        html_url: `https://example.com/issues/${number}`,
    };
}
function createComment(id, body, timestamp) {
    return {
        id,
        body,
        html_url: `https://example.com/comments/${id}`,
        created_at: timestamp,
        updated_at: timestamp,
    };
}
exports.scenarioDefinitions = [
    {
        name: "fresh-issue-defaults-to-bug",
        description: "No explicit stage comment means the workflow defaults to bug.",
        issueNumber: 101,
    },
    {
        name: "latest-comment-drives-current-type",
        description: "The latest explicit Current type comment determines workflow state.",
        issueNumber: 102,
    },
    {
        name: "parent-child-context",
        description: "A parent issue exposes child issue relationships in workflow context.",
        issueNumber: 103,
    },
];
function createScenarioSeeds() {
    const parent = createIssue(103, "Parent split issue");
    const child = createIssue(104, "Child workstream");
    return {
        "fresh-issue-defaults-to-bug": {
            issue: createIssue(101, "Fresh issue"),
            comments: [createComment(1, "Facts:\n- user reported a bug", "2026-03-20T00:00:00.000Z")],
        },
        "latest-comment-drives-current-type": {
            issue: createIssue(102, "Transitioned issue"),
            comments: [
                createComment(2, "Current type: bug", "2026-03-20T00:00:00.000Z"),
                createComment(3, "Current type: fix", "2026-03-21T00:00:00.000Z"),
                createComment(4, "Current type: test", "2026-03-22T00:00:00.000Z"),
            ],
        },
        "parent-child-context": {
            issue: parent,
            comments: [createComment(5, "Current type: bug", "2026-03-20T00:00:00.000Z")],
            subIssues: [child],
        },
        childContext: {
            issue: child,
            comments: [createComment(6, "Current type: fix", "2026-03-21T00:00:00.000Z")],
            parentIssue: parent,
        },
    };
}

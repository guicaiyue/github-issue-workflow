"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const scenarios_1 = require("./scenarios");
const fake_repository_1 = require("./testing/fake-repository");
const workflow_service_1 = require("./workflow-service");
(0, vitest_1.describe)("scenario fixtures", () => {
    (0, vitest_1.it)("covers the documented scenario definitions", () => {
        const seeds = (0, scenarios_1.createScenarioSeeds)();
        for (const definition of scenarios_1.scenarioDefinitions) {
            (0, vitest_1.expect)(seeds[definition.name]).toBeDefined();
            (0, vitest_1.expect)(seeds[definition.name].issue.number).toBe(definition.issueNumber);
        }
    });
    (0, vitest_1.it)("defaults fresh issues to bug", async () => {
        const repository = new fake_repository_1.FakeIssuesRepository((0, scenarios_1.createScenarioSeeds)());
        const service = new workflow_service_1.IssueWorkflowService({ repository });
        const context = await service.loadIssueWorkflowContext(101);
        (0, vitest_1.expect)(context.currentType).toBe("bug");
    });
    (0, vitest_1.it)("loads parent-child relationships in context", async () => {
        const repository = new fake_repository_1.FakeIssuesRepository((0, scenarios_1.createScenarioSeeds)());
        const service = new workflow_service_1.IssueWorkflowService({ repository });
        const parentContext = await service.loadIssueWorkflowContext(103);
        const childContext = await service.loadIssueWorkflowContext(104);
        (0, vitest_1.expect)(parentContext.subIssues).toHaveLength(1);
        (0, vitest_1.expect)(childContext.parentIssue?.number).toBe(103);
    });
    (0, vitest_1.it)("keeps blocker comments in the current type while logging operations", async () => {
        const repository = new fake_repository_1.FakeIssuesRepository((0, scenarios_1.createScenarioSeeds)());
        const service = new workflow_service_1.IssueWorkflowService({ repository });
        await service.reportWorkflowBlocker(101, {
            currentType: "bug",
            blocker: "Missing log sample",
            impact: "Cannot confirm failing path",
            need: "Representative logs",
            suggestedNextType: "bug",
        });
        const context = await service.loadIssueWorkflowContext(101);
        (0, vitest_1.expect)(context.currentType).toBe("bug");
        (0, vitest_1.expect)(repository.operationLog).toContain("addComment:101");
    });
    (0, vitest_1.it)("supports bug-definition comments before handing off to fix", async () => {
        const repository = new fake_repository_1.FakeIssuesRepository((0, scenarios_1.createScenarioSeeds)());
        const service = new workflow_service_1.IssueWorkflowService({ repository });
        await service.createBugDefinition(101, {
            facts: ["Docs layout breaks on first load"],
            evidence: ["Local screenshot"],
            acceptanceCriteria: ["Layout stays stable on first load"],
            stayOrHandOff: "hand off",
            recommendedNextType: "fix",
        });
        const comments = await repository.listComments(101);
        (0, vitest_1.expect)(comments.at(-1)?.body).toContain("Recommended next type: fix");
    });
});

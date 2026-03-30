import { describe, expect, it } from "vitest";
import { createScenarioSeeds, scenarioDefinitions } from "./scenarios";
import { FakeIssuesRepository } from "./testing/fake-repository";
import { IssueWorkflowService } from "./workflow-service";

describe("scenario fixtures", () => {
  it("covers the documented scenario definitions", () => {
    const seeds = createScenarioSeeds();

    for (const definition of scenarioDefinitions) {
      expect(seeds[definition.name]).toBeDefined();
      expect(seeds[definition.name].issue.number).toBe(definition.issueNumber);
    }
  });

  it("defaults fresh issues to bug", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const service = new IssueWorkflowService({ repository });

    const context = await service.loadIssueWorkflowContext(101);

    expect(context.currentType).toBe("bug");
  });

  it("loads parent-child relationships in context", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const service = new IssueWorkflowService({ repository });

    const parentContext = await service.loadIssueWorkflowContext(103);
    const childContext = await service.loadIssueWorkflowContext(104);

    expect(parentContext.subIssues).toHaveLength(1);
    expect(childContext.parentIssue?.number).toBe(103);
  });

  it("keeps blocker comments in the current type while logging operations", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const service = new IssueWorkflowService({ repository });

    await service.reportWorkflowBlocker(101, {
      currentType: "bug",
      blocker: "Missing log sample",
      impact: "Cannot confirm failing path",
      need: "Representative logs",
      suggestedNextType: "bug",
    });

    const context = await service.loadIssueWorkflowContext(101);

    expect(context.currentType).toBe("bug");
    expect(repository.operationLog).toContain("addComment:101");
  });

  it("supports bug-definition comments before handing off to fix", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const service = new IssueWorkflowService({ repository });

    await service.createBugDefinition(101, {
      facts: ["Docs layout breaks on first load"],
      evidence: ["Local screenshot"],
      acceptanceCriteria: ["Layout stays stable on first load"],
      stayOrHandOff: "hand off",
      recommendedNextType: "fix",
    });

    const comments = await repository.listComments(101);
    expect(comments.at(-1)?.body).toContain("Recommended next type: fix");
  });
});

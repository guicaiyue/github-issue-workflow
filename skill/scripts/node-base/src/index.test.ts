import { describe, expect, it } from "vitest";
import { createScenarioSeeds } from "./scenarios";
import { FakeIssuesRepository } from "./testing/fake-repository";
import * as api from "./index";

describe("node-base public exports", () => {
  it("exposes workflow service, role runners, and payload-facing helpers", () => {
    expect(api.IssueWorkflowService).toBeTypeOf("function");
    expect(api.defaultWorkflowTypes).toEqual(["bug", "fix", "test", "review", "done"]);
    expect(api.WorkerScenarioRunner).toBeTypeOf("function");
    expect(api.TesterScenarioRunner).toBeTypeOf("function");
    expect(api.DispatcherScenarioRunner).toBeTypeOf("function");
    expect(api.detectCurrentTypeFromComments).toBeTypeOf("function");
    expect(api.buildStageRegistry).toBeTypeOf("function");
    expect(api.getStageMetadata).toBeTypeOf("function");
    expect(api.getLatestBugDefinition).toBeTypeOf("function");
    expect(api.getLatestBugStageInput).toBeTypeOf("function");
    expect(api.getLatestFixHandoff).toBeTypeOf("function");
    expect(api.getLatestFixStageReport).toBeTypeOf("function");
    expect(api.getLatestReviewFixHandoff).toBeTypeOf("function");
    expect(api.getLatestReviewStageReport).toBeTypeOf("function");
    expect(api.getLatestDoneCloseout).toBeTypeOf("function");
    expect(api.getLatestDoneStageCloseout).toBeTypeOf("function");
    expect(api.getLatestFinalStageComment).toBeTypeOf("function");
    expect(api.getLatestStageComment).toBeTypeOf("function");
    expect(api.getLatestWorkflowStageBlocker).toBeTypeOf("function");
    expect(api.renderReviewFixHandoffComment).toBeTypeOf("function");
    expect(api.renderStageComment).toBeTypeOf("function");
    expect(typeof api.IssueWorkflowService.prototype.prepareFixStageContext).toBe("function");
    expect(typeof api.IssueWorkflowService.prototype.publishStageComment).toBe("function");
    expect(typeof api.IssueWorkflowService.prototype.getLatestStageComment).toBe("function");
    expect(typeof api.IssueWorkflowService.prototype.getLatestFinalStageComment).toBe("function");
    expect(typeof api.IssueWorkflowService.prototype.prepareFixStagePayload).toBe("function");
    expect(typeof api.IssueWorkflowService.prototype.prepareReviewStagePayload).toBe("function");
    expect(typeof api.WorkerScenarioRunner.prototype.publishStageCommentAndReload).toBe("function");
    expect(typeof api.TesterScenarioRunner.prototype.getLatestStageComment).toBe("function");
    expect(typeof api.DispatcherScenarioRunner.prototype.getLatestFinalStageComment).toBe("function");
  });

  it("exposes default built-in workflow type constants", () => {
    expect(api.defaultWorkflowTypes).toEqual(["bug", "fix", "test", "review", "done"]);
    expect(api.workflowTypes).toEqual(api.defaultWorkflowTypes);
  });

  it("exposes stage registry metadata for built-in and extension stages", () => {
    const registry = api.buildStageRegistry(["bug", "fix", "test", "review", "done", "wait"] as const);

    expect(registry.find((item) => item.name === "bug")).toMatchObject({
      isBuiltIn: true,
      documentationPath: "../../types/bug/stage.md",
      defaultHandlingAgent: "worker",
      isTerminal: false,
    });
    expect(registry.find((item) => item.name === "wait")).toMatchObject({
      isBuiltIn: false,
      documentationPath: "../../types/wait/stage.md",
      defaultHandlingAgent: null,
      isTerminal: false,
    });
  });

  it("supports stage-oriented publishing and payload reads through the public entrypoint", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const service = new api.IssueWorkflowService({
      repository,
      options: { allowedTypes: ["bug", "fix", "test", "review", "done", "wait"] as const },
    });

    await service.publishBugStageInput(101, {
      facts: ["Bug exists"],
      evidence: ["Screenshot"],
      acceptanceCriteria: ["Can reproduce"],
      stayOrHandOff: "hand off",
      recommendedNextType: "fix",
    });
    await service.publishStageComment(101, {
      currentType: "wait",
      fields: [
        { label: "Waiting for", value: ["User confirmation"] },
        { label: "Resume condition", value: ["Direction is chosen"] },
      ],
    });

    const fixPayload = await service.prepareFixPayload(101);
    const splitPayload = await service.prepareSplitPayload(103);
    const context = await service.loadIssueWorkflowContext(101);

    expect(fixPayload.issueNumber).toBe(101);
    expect(fixPayload.facts).toContain("Bug exists");
    expect(splitPayload.issueNumber).toBe(103);
    expect(splitPayload.subIssueNumbers).toContain(104);
    expect(context.currentType).toBe("wait");
  });

  it("keeps the public testing boundary explicit", () => {
    expect(api.createScenarioSeeds).toBeTypeOf("function");
    expect(Array.isArray(api.scenarioDefinitions)).toBe(true);
    expect("FakeIssuesRepository" in api).toBe(false);
  });

  it("keeps the main public entrypoint focused on workflow-facing exports", () => {
    expect(api.IssueWorkflowService).toBeTypeOf("function");
    expect(api.WorkerScenarioRunner).toBeTypeOf("function");
    expect(api.TesterScenarioRunner).toBeTypeOf("function");
    expect(api.DispatcherScenarioRunner).toBeTypeOf("function");
    expect(api.createScenarioSeeds).toBeTypeOf("function");
    expect(Array.isArray(api.scenarioDefinitions)).toBe(true);
    expect("FakeIssuesRepository" in api).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { IssueWorkflowService } from "./workflow-service";
import { createScenarioSeeds } from "./scenarios";
import { FakeIssuesRepository } from "./testing/fake-repository";

describe("IssueWorkflowService", () => {
  it("loads workflow context with derived current type", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const service = new IssueWorkflowService({ repository });

    const context = await service.loadIssueWorkflowContext(102);

    expect(context.currentType).toBe("test");
    expect(context.issue.number).toBe(102);
    expect(context.comments).toHaveLength(3);
  });

  it("exposes stage registry metadata through the service facade", () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const service = new IssueWorkflowService({ repository, options: { allowedTypes: ["bug", "fix", "test", "review", "done", "wait"] as const } });

    expect(service.getStageMetadata("bug")).toMatchObject({
      name: "bug",
      isBuiltIn: true,
      defaultHandlingAgent: "worker",
    });
    expect(service.getStageMetadata("wait")).toMatchObject({
      name: "wait",
      isBuiltIn: false,
      documentationPath: "../../types/wait/stage.md",
    });
    expect(service.getStageRegistry().map((item) => item.name)).toEqual(["bug", "fix", "test", "review", "done", "wait"]);
  });

  it("loads queue context with derived current types", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const service = new IssueWorkflowService({ repository });

    const queue = await service.loadQueueContext();

    expect(queue.items.some((item) => item.issue.number === 101 && item.currentType === "bug")).toBe(true);
    expect(queue.items.some((item) => item.issue.number === 102 && item.currentType === "test")).toBe(true);
  });

  it("prepares fix/test/review contexts with latest structured stage report data", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const service = new IssueWorkflowService({ repository });

    await service.createBugDefinition(101, {
      facts: ["Bug exists"],
      evidence: ["Screenshot"],
      acceptanceCriteria: ["Can reproduce"],
      stayOrHandOff: "hand off",
      recommendedNextType: "fix",
    });
    await service.handoffToTest(102, {
      implementationSummary: ["Parser updated"],
      changedFiles: ["src/workflow.ts"],
      validationChecklist: ["Check latest type"],
    });
    await service.handoffToReview(102, {
      scenarios: [{ name: "Latest type wins", result: "pass" }],
      evidenceUsed: ["Vitest"],
      suggestedNextType: "review",
      remainingRisksOrFollowUps: [],
    });

    const fixPrepared = await service.prepareFixIssue(101);
    const testPrepared = await service.prepareTestIssue(102);
    const reviewPrepared = await service.prepareReviewIssue(102);

    expect(fixPrepared.latestBugDefinition?.recommendedNextType).toBe("fix");
    expect(fixPrepared.latestReviewFixHandoff).toBeNull();
    expect(testPrepared.latestFixHandoff?.suggestedNextType).toBe("test");
    expect(reviewPrepared.latestTestResult?.suggestedNextType).toBe("review");
    expect(reviewPrepared.latestDoneCloseout).toBeNull();
  });

  it("prepares review context with done closeout when closeout already exists", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const service = new IssueWorkflowService({ repository });

    await service.closeIssueAsDone(102, {
      outcome: "Validated and accepted",
      evidenceOrReference: ["review evidence"],
      followUp: ["none needed"],
    });

    const prepared = await service.prepareReviewIssue(102);

    expect(prepared.latestDoneCloseout?.outcome).toBe("Validated and accepted");
    expect(prepared.latestDoneCloseout?.evidenceOrReference).toContain("review evidence");
  });

  it("provides stage-oriented context and payload helpers from service", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const service = new IssueWorkflowService({ repository });

    await service.publishBugStageInput(101, {
      facts: ["Bug exists"],
      evidence: ["Screenshot"],
      acceptanceCriteria: ["Can reproduce"],
      stayOrHandOff: "hand off",
      recommendedNextType: "fix",
    });
    await service.publishFixStageReport(102, {
      implementationSummary: ["Parser updated"],
      changedFiles: ["src/workflow.ts"],
      validationChecklist: ["Check latest type"],
    });
    await service.publishTestStageReport(102, {
      scenarios: [{ name: "Latest type wins", result: "pass" }],
      evidenceUsed: ["Vitest"],
      suggestedNextType: "review",
      remainingRisksOrFollowUps: [],
    });

    const fixContext = await service.prepareFixStageContext(101);
    const testContext = await service.prepareTestStageContext(102);
    const reviewContext = await service.prepareReviewStageContext(102);
    const fixPayload = await service.prepareFixStagePayload(101);
    const testPayload = await service.prepareTestStagePayload(102);
    const reviewPayload = await service.prepareReviewStagePayload(102);
    const splitPayload = await service.prepareSplitStagePayload(103);
    const queuePayload = await service.prepareFixStageQueuePayload(5);

    expect(fixContext.latestBugDefinition?.recommendedNextType).toBe("fix");
    expect(testContext.latestFixHandoff?.suggestedNextType).toBe("test");
    expect(reviewContext.latestTestResult?.suggestedNextType).toBe("review");
    expect(fixPayload.issueTitle).toBe("Fresh issue");
    expect(fixPayload.facts).toContain("Bug exists");
    expect(testPayload.issueTitle).toBe("Transitioned issue");
    expect(testPayload.implementationSummary).toContain("Parser updated");
    expect(testPayload.changedFiles).toContain("src/workflow.ts");
    expect(reviewPayload.issueTitle).toBe("Transitioned issue");
    expect(reviewPayload.suggestedNextType).toBe("review");
    expect(reviewPayload.scenarios[0]?.name).toBe("Latest type wins");
    expect(splitPayload.issueTitle).toBe("Parent split issue");
    expect(splitPayload.subIssueNumbers).toContain(104);
    expect(Array.isArray(queuePayload.items)).toBe(true);
  });

  it("prepares fix context with review fallback stage report when issue was sent back", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const service = new IssueWorkflowService({ repository });

    await service.handoffReviewBackToFix(101, {
      outcome: "Needs another patch",
      evidenceOrReference: ["review note"],
      followUp: ["Fix edge case"],
    });

    const fixPrepared = await service.prepareFixIssue(101);

    expect(fixPrepared.latestReviewFixHandoff?.suggestedNextType).toBe("fix");
    expect(fixPrepared.latestReviewFixHandoff?.followUp).toContain("Fix edge case");
  });

  it("ranks fix batch items with bug definitions ahead of underspecified fix issues", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const service = new IssueWorkflowService({ repository });

    await repository.addComment(101, "Current type: fix");
    await service.createBugDefinition(104, {
      facts: ["Scoped bug definition"],
      evidence: ["Issue note"],
      acceptanceCriteria: ["Ready for implementation"],
      stayOrHandOff: "hand off",
      recommendedNextType: "fix",
    });
    await repository.addComment(104, "Current type: fix");

    const batch = await service.loadFixBatch(2);
    const payload = await service.prepareFixQueuePayload(2);

    expect(batch.items[0]?.issue.number).toBe(104);
    expect(batch.items[1]?.issue.number).toBe(101);
    expect(payload.items[0]?.issueNumber).toBe(104);
    expect(payload.items[0]?.issueTitle).toBe("Child workstream");
    expect(payload.items[0]?.hasBugDefinition).toBe(true);
    expect(payload.items[1]?.issueNumber).toBe(101);
    expect(payload.items[1]?.issueTitle).toBe("Fresh issue");
    expect(payload.items[1]?.hasBugDefinition).toBe(false);
  });

  it("publishes bug-stage input through the shared stage template", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const service = new IssueWorkflowService({ repository });

    const comment = await service.publishBugStageInput(101, {
      facts: ["User can reproduce on docs page"],
      evidence: ["Browser screenshot"],
      acceptanceCriteria: ["Bug is reproducible with a stable path"],
      stayOrHandOff: "hand off",
      recommendedNextType: "fix",
    });

    expect(comment.body).toContain("Current type: bug");
    expect(comment.body).toContain("Recommended next type: fix");
  });

  it("reports blockers using the shared blocker template", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const service = new IssueWorkflowService({ repository });

    const comment = await service.reportWorkflowBlocker(101, {
      currentType: "bug",
      blocker: "Need reproduction details",
      impact: "Cannot define acceptance criteria",
      need: "User reproduction steps",
      suggestedNextType: "bug",
    });

    expect(comment.body).toContain("Current type: bug");
    expect(comment.body).toContain("Blocker: Need reproduction details");
  });

  it("publishes and reads generic stage comments for extension stages such as wait", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const service = new IssueWorkflowService({ repository, options: { allowedTypes: ["bug", "fix", "test", "review", "done", "wait"] as const } });

    const comment = await service.publishStageComment(101, {
      currentType: "wait",
      fields: [
        { label: "Waiting for", value: ["User confirmation"] },
        { label: "Why waiting is necessary", value: ["Cannot choose implementation direction"] },
        { label: "Resume condition", value: ["User picks a direction"] },
        { label: "Suggested next type", value: "fix" },
      ],
    });
    const context = await service.loadIssueWorkflowContext(101);
    const parsed = await service.getLatestStageComment(101, "wait");

    expect(comment.body).toContain("Current type: wait");
    expect(comment.body).toContain("Suggested next type: fix");
    expect(context.currentType).toBe("wait");
    expect(parsed?.fields["Waiting for"]).toEqual(["User confirmation"]);
    expect(parsed?.fields["Suggested next type"]).toBe("fix");
  });

  it("publishes fix-stage reports with a canonical next-stage suggestion", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const service = new IssueWorkflowService({ repository });

    const comment = await service.publishFixStageReport(102, {
      implementationSummary: ["Updated issue parser"],
      changedFiles: ["src/workflow.ts"],
      validationChecklist: ["Confirm latest explicit comment wins"],
    });

    expect(comment.body).toContain("Current type: fix");
    expect(comment.body).toContain("Suggested next type: test");
  });

  it("publishes done closeout and closes the issue", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const service = new IssueWorkflowService({ repository });

    const result = await service.publishDoneCloseout(102, {
      outcome: "Workflow facade validated",
      evidenceOrReference: ["scenario test"],
    });
    const parsed = await service.getLatestFinalStageComment(102, "done");

    expect(result.comment.body).toContain("Final type: done");
    expect(result.issue.state).toBe("closed");
    expect(parsed?.fields.Outcome).toBe("Workflow facade validated");
  });

  it("publishes review-stage reports for fix follow-up and still allows reopen", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const service = new IssueWorkflowService({ repository });

    await service.publishDoneCloseout(102, {
      outcome: "Validated",
      evidenceOrReference: ["test run"],
    });
    const reopened = await service.reopenIssue(102);
    const reviewComment = await service.publishReviewStageReport(102, {
      outcome: "Needs another patch",
      evidenceOrReference: ["review note"],
      followUp: ["Fix edge case"],
    });

    expect(reopened.state).toBe("open");
    expect(reviewComment.body).toContain("Current type: review");
    expect(reviewComment.body).toContain("Suggested next type: fix");
  });

  it("creates child issues and links them to the parent", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const service = new IssueWorkflowService({ repository });

    const children = await service.splitIssueIntoChildren(103, [
      {
        title: "Child 1",
        body: "child body",
      },
    ]);

    const context = await service.loadIssueWorkflowContext(103);
    expect(children).toHaveLength(1);
    expect(context.subIssues.some((issue) => issue.number === children[0].number)).toBe(true);
  });
});

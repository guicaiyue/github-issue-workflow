import { describe, expect, it } from "vitest";
import { createScenarioSeeds } from "./scenarios";
import { FakeIssuesRepository } from "./testing/fake-repository";
import { DispatcherScenarioRunner, TesterScenarioRunner, WorkerScenarioRunner } from "./role-scenarios";

describe("role-oriented scenario runners", () => {
  it("lets worker publish bug-stage input without raw CRUD reasoning", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const worker = new WorkerScenarioRunner({ repository });

    const context = await worker.publishBugStageInputAndReload({
      issueNumber: 101,
      bugDefinition: {
        facts: ["Docs layout breaks on load"],
        evidence: ["Screenshot from local preview"],
        acceptanceCriteria: ["Layout is stable on first load"],
        stayOrHandOff: "hand off",
        recommendedNextType: "fix",
      },
    });

    expect(context.currentType).toBe("bug");
    expect(repository.operationLog).not.toContain("createIssue:manual-comment");
    expect((await repository.listComments(101)).at(-1)?.body).toContain("Recommended next type: fix");
  });

  it("lets worker inspect a fix batch through queue helpers", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    await repository.addComment(104, "Current type: fix");
    const worker = new WorkerScenarioRunner({ repository });

    const batch = await worker.loadFixBatch(5);
    const payload = await worker.prepareFixQueuePayload(5);

    expect(batch.items.some((item) => item.issue.number === 104 && item.currentType === "fix")).toBe(true);
    expect(payload.items.some((item) => item.issueNumber === 104 && item.issueTitle === "Child workstream")).toBe(true);
    expect(payload.items.some((item) => item.issueNumber === 104 && item.hasBugDefinition === false)).toBe(true);
  });

  it("lets worker/tester read stage contexts and payloads without manual parsing", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const worker = new WorkerScenarioRunner({ repository });
    const tester = new TesterScenarioRunner({ repository });

    await worker.publishBugStageInputAndReload({
      issueNumber: 101,
      bugDefinition: {
        facts: ["Bug exists"],
        evidence: ["Screenshot"],
        acceptanceCriteria: ["Can reproduce"],
        stayOrHandOff: "hand off",
        recommendedNextType: "fix",
      },
    });
    await worker.publishFixStageReportAndReload({
      issueNumber: 102,
      report: {
        implementationSummary: ["Parser updated"],
        changedFiles: ["src/workflow.ts"],
        validationChecklist: ["Check latest type"],
      },
    });

    const fixPrepared = await worker.prepareFixStageContext(101);
    const testPrepared = await tester.prepareTestStageContext(102);
    const fixQueue = await worker.prepareFixStageQueuePayload(5);
    const workerPayload = await worker.prepareFixStagePayload(101);
    const testerPayload = await tester.prepareTestStagePayload(102);

    expect(fixPrepared.latestBugDefinition?.recommendedNextType).toBe("fix");
    expect(testPrepared.latestFixHandoff?.suggestedNextType).toBe("test");
    expect(fixQueue.items.some((item) => item.currentType === "fix")).toBe(true);
    expect(workerPayload.issueTitle).toBe("Fresh issue");
    expect(workerPayload.facts).toContain("Bug exists");
    expect(testerPayload.issueTitle).toBe("Transitioned issue");
    expect(testerPayload.implementationSummary).toContain("Parser updated");
    expect(testerPayload.changedFiles).toContain("src/workflow.ts");
  });

  it("lets worker publish fix-stage reports through the facade", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const worker = new WorkerScenarioRunner({ repository });

    const context = await worker.publishFixStageReportAndReload({
      issueNumber: 102,
      report: {
        implementationSummary: ["Adjusted workflow parser"],
        changedFiles: ["src/workflow.ts"],
        validationChecklist: ["Confirm latest explicit type wins"],
      },
    });

    expect(context.currentType).toBe("fix");
    expect((await repository.listComments(102)).at(-1)?.body).toContain("Suggested next type: test");
  });

  it("lets worker consume review fallback report in fix preparation", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const worker = new WorkerScenarioRunner({ repository });

    await worker.publishReviewDecisionAndReload({
      issueNumber: 101,
      outcome: "fix",
      closeout: {
        outcome: "Needs another patch",
        evidenceOrReference: ["review note"],
        followUp: ["Fix edge case"],
      },
    });

    const prepared = await worker.prepareFixIssue(101);

    expect(prepared.latestReviewFixHandoff?.suggestedNextType).toBe("fix");
    expect(prepared.latestReviewFixHandoff?.followUp).toContain("Fix edge case");
  });

  it("lets tester publish test-stage decisions without touching raw repository methods", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const tester = new TesterScenarioRunner({ repository });

    const context = await tester.publishTestDecisionAndReload({
      issueNumber: 102,
      outcome: "review",
      validation: {
        scenarios: [{ name: "Latest comment wins", result: "pass" }],
        evidenceUsed: ["scenario test"],
        remainingRisksOrFollowUps: [],
      },
    });

    expect(context.currentType).toBe("test");
    expect((await repository.listComments(102)).at(-1)?.body).toContain("Suggested next type: review");
  });

  it("lets runners publish and read generic extension-stage comments", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const options = { allowedTypes: ["bug", "fix", "test", "review", "done", "wait"] as const };
    const worker = new WorkerScenarioRunner({ repository, options });
    const tester = new TesterScenarioRunner({ repository, options });
    const dispatcher = new DispatcherScenarioRunner({ repository, options });

    const waitContext = await worker.publishStageCommentAndReload(101, {
      currentType: "wait",
      fields: [
        { label: "Waiting for", value: ["User confirmation"] },
        { label: "Resume condition", value: ["Direction is chosen"] },
      ],
    });
    const waitComment = await tester.getLatestStageComment(101, "wait");

    await worker.publishReviewDecisionAndReload({
      issueNumber: 102,
      outcome: "done",
      closeout: {
        outcome: "Validated and accepted",
        evidenceOrReference: ["review evidence"],
      },
    });
    const doneComment = await dispatcher.getLatestFinalStageComment(102, "done");

    expect(waitContext.currentType).toBe("wait");
    expect(waitComment?.fields["Waiting for"]).toEqual(["User confirmation"]);
    expect(doneComment?.fields.Outcome).toBe("Validated and accepted");
  });

  it("lets worker publish review decisions and done closeout through workflow helpers", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const worker = new WorkerScenarioRunner({ repository });

    const context = await worker.publishReviewDecisionAndReload({
      issueNumber: 102,
      outcome: "done",
      closeout: {
        outcome: "Validated and accepted",
        evidenceOrReference: ["review evidence"],
      },
    });

    expect(context.issue.state).toBe("closed");
    expect((await repository.listComments(102)).at(-1)?.body).toContain("Final type: done");

    const preparedReview = await worker.prepareReviewIssue(102);
    const reviewPayload = await worker.prepareReviewPayload(102);

    expect(preparedReview.latestDoneCloseout?.outcome).toBe("Validated and accepted");
    expect(reviewPayload.issueTitle).toBe("Transitioned issue");
    expect(reviewPayload.closeoutOutcome).toBe("Validated and accepted");
  });

  it("lets dispatcher prepare split-stage payload without reading full context manually", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const dispatcher = new DispatcherScenarioRunner({ repository });

    const payload = await dispatcher.prepareSplitStagePayload(103);

    expect(payload.issueNumber).toBe(103);
    expect(payload.issueTitle).toBe("Parent split issue");
    expect(payload.currentType).toBe("bug");
    expect(payload.hasChildren).toBe(true);
    expect(payload.subIssueNumbers).toContain(104);
  });

  it("lets dispatcher split parent issues through workflow helpers", async () => {
    const repository = new FakeIssuesRepository(createScenarioSeeds());
    const dispatcher = new DispatcherScenarioRunner({ repository });

    const context = await dispatcher.applySplitAndReload({
      parentIssueNumber: 103,
      children: [
        {
          title: "Split child issue",
          body: "Child workflow body",
        },
      ],
    });

    expect(context.subIssues.length).toBeGreaterThan(1);
    expect(repository.operationLog.some((entry) => entry.startsWith("createIssue:Split child issue"))).toBe(true);
  });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const scenarios_1 = require("./scenarios");
const fake_repository_1 = require("./testing/fake-repository");
const role_scenarios_1 = require("./role-scenarios");
(0, vitest_1.describe)("role-oriented scenario runners", () => {
    (0, vitest_1.it)("lets worker publish bug-stage input without raw CRUD reasoning", async () => {
        const repository = new fake_repository_1.FakeIssuesRepository((0, scenarios_1.createScenarioSeeds)());
        const worker = new role_scenarios_1.WorkerScenarioRunner({ repository });
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
        (0, vitest_1.expect)(context.currentType).toBe("bug");
        (0, vitest_1.expect)(repository.operationLog).not.toContain("createIssue:manual-comment");
        (0, vitest_1.expect)((await repository.listComments(101)).at(-1)?.body).toContain("Recommended next type: fix");
    });
    (0, vitest_1.it)("lets worker inspect a fix batch through queue helpers", async () => {
        const repository = new fake_repository_1.FakeIssuesRepository((0, scenarios_1.createScenarioSeeds)());
        await repository.addComment(104, "Current type: fix");
        const worker = new role_scenarios_1.WorkerScenarioRunner({ repository });
        const batch = await worker.loadFixBatch(5);
        const payload = await worker.prepareFixQueuePayload(5);
        (0, vitest_1.expect)(batch.items.some((item) => item.issue.number === 104 && item.currentType === "fix")).toBe(true);
        (0, vitest_1.expect)(payload.items.some((item) => item.issueNumber === 104 && item.issueTitle === "Child workstream")).toBe(true);
        (0, vitest_1.expect)(payload.items.some((item) => item.issueNumber === 104 && item.hasBugDefinition === false)).toBe(true);
    });
    (0, vitest_1.it)("lets worker/tester read stage contexts and payloads without manual parsing", async () => {
        const repository = new fake_repository_1.FakeIssuesRepository((0, scenarios_1.createScenarioSeeds)());
        const worker = new role_scenarios_1.WorkerScenarioRunner({ repository });
        const tester = new role_scenarios_1.TesterScenarioRunner({ repository });
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
        (0, vitest_1.expect)(fixPrepared.latestBugDefinition?.recommendedNextType).toBe("fix");
        (0, vitest_1.expect)(testPrepared.latestFixHandoff?.suggestedNextType).toBe("test");
        (0, vitest_1.expect)(fixQueue.items.some((item) => item.currentType === "fix")).toBe(true);
        (0, vitest_1.expect)(workerPayload.issueTitle).toBe("Fresh issue");
        (0, vitest_1.expect)(workerPayload.facts).toContain("Bug exists");
        (0, vitest_1.expect)(testerPayload.issueTitle).toBe("Transitioned issue");
        (0, vitest_1.expect)(testerPayload.implementationSummary).toContain("Parser updated");
        (0, vitest_1.expect)(testerPayload.changedFiles).toContain("src/workflow.ts");
    });
    (0, vitest_1.it)("lets worker publish fix-stage reports through the facade", async () => {
        const repository = new fake_repository_1.FakeIssuesRepository((0, scenarios_1.createScenarioSeeds)());
        const worker = new role_scenarios_1.WorkerScenarioRunner({ repository });
        const context = await worker.publishFixStageReportAndReload({
            issueNumber: 102,
            report: {
                implementationSummary: ["Adjusted workflow parser"],
                changedFiles: ["src/workflow.ts"],
                validationChecklist: ["Confirm latest explicit type wins"],
            },
        });
        (0, vitest_1.expect)(context.currentType).toBe("fix");
        (0, vitest_1.expect)((await repository.listComments(102)).at(-1)?.body).toContain("Suggested next type: test");
    });
    (0, vitest_1.it)("lets worker consume review fallback report in fix preparation", async () => {
        const repository = new fake_repository_1.FakeIssuesRepository((0, scenarios_1.createScenarioSeeds)());
        const worker = new role_scenarios_1.WorkerScenarioRunner({ repository });
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
        (0, vitest_1.expect)(prepared.latestReviewFixHandoff?.suggestedNextType).toBe("fix");
        (0, vitest_1.expect)(prepared.latestReviewFixHandoff?.followUp).toContain("Fix edge case");
    });
    (0, vitest_1.it)("lets tester publish test-stage decisions without touching raw repository methods", async () => {
        const repository = new fake_repository_1.FakeIssuesRepository((0, scenarios_1.createScenarioSeeds)());
        const tester = new role_scenarios_1.TesterScenarioRunner({ repository });
        const context = await tester.publishTestDecisionAndReload({
            issueNumber: 102,
            outcome: "review",
            validation: {
                scenarios: [{ name: "Latest comment wins", result: "pass" }],
                evidenceUsed: ["scenario test"],
                remainingRisksOrFollowUps: [],
            },
        });
        (0, vitest_1.expect)(context.currentType).toBe("test");
        (0, vitest_1.expect)((await repository.listComments(102)).at(-1)?.body).toContain("Suggested next type: review");
    });
    (0, vitest_1.it)("lets runners publish and read generic extension-stage comments", async () => {
        const repository = new fake_repository_1.FakeIssuesRepository((0, scenarios_1.createScenarioSeeds)());
        const options = { allowedTypes: ["bug", "fix", "test", "review", "done", "wait"] };
        const worker = new role_scenarios_1.WorkerScenarioRunner({ repository, options });
        const tester = new role_scenarios_1.TesterScenarioRunner({ repository, options });
        const dispatcher = new role_scenarios_1.DispatcherScenarioRunner({ repository, options });
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
        (0, vitest_1.expect)(waitContext.currentType).toBe("wait");
        (0, vitest_1.expect)(waitComment?.fields["Waiting for"]).toEqual(["User confirmation"]);
        (0, vitest_1.expect)(doneComment?.fields.Outcome).toBe("Validated and accepted");
    });
    (0, vitest_1.it)("lets worker publish review decisions and done closeout through workflow helpers", async () => {
        const repository = new fake_repository_1.FakeIssuesRepository((0, scenarios_1.createScenarioSeeds)());
        const worker = new role_scenarios_1.WorkerScenarioRunner({ repository });
        const context = await worker.publishReviewDecisionAndReload({
            issueNumber: 102,
            outcome: "done",
            closeout: {
                outcome: "Validated and accepted",
                evidenceOrReference: ["review evidence"],
            },
        });
        (0, vitest_1.expect)(context.issue.state).toBe("closed");
        (0, vitest_1.expect)((await repository.listComments(102)).at(-1)?.body).toContain("Final type: done");
        const preparedReview = await worker.prepareReviewIssue(102);
        const reviewPayload = await worker.prepareReviewPayload(102);
        (0, vitest_1.expect)(preparedReview.latestDoneCloseout?.outcome).toBe("Validated and accepted");
        (0, vitest_1.expect)(reviewPayload.issueTitle).toBe("Transitioned issue");
        (0, vitest_1.expect)(reviewPayload.closeoutOutcome).toBe("Validated and accepted");
    });
    (0, vitest_1.it)("lets dispatcher prepare split-stage payload without reading full context manually", async () => {
        const repository = new fake_repository_1.FakeIssuesRepository((0, scenarios_1.createScenarioSeeds)());
        const dispatcher = new role_scenarios_1.DispatcherScenarioRunner({ repository });
        const payload = await dispatcher.prepareSplitStagePayload(103);
        (0, vitest_1.expect)(payload.issueNumber).toBe(103);
        (0, vitest_1.expect)(payload.issueTitle).toBe("Parent split issue");
        (0, vitest_1.expect)(payload.currentType).toBe("bug");
        (0, vitest_1.expect)(payload.hasChildren).toBe(true);
        (0, vitest_1.expect)(payload.subIssueNumbers).toContain(104);
    });
    (0, vitest_1.it)("lets dispatcher split parent issues through workflow helpers", async () => {
        const repository = new fake_repository_1.FakeIssuesRepository((0, scenarios_1.createScenarioSeeds)());
        const dispatcher = new role_scenarios_1.DispatcherScenarioRunner({ repository });
        const context = await dispatcher.applySplitAndReload({
            parentIssueNumber: 103,
            children: [
                {
                    title: "Split child issue",
                    body: "Child workflow body",
                },
            ],
        });
        (0, vitest_1.expect)(context.subIssues.length).toBeGreaterThan(1);
        (0, vitest_1.expect)(repository.operationLog.some((entry) => entry.startsWith("createIssue:Split child issue"))).toBe(true);
    });
});

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const scenarios_1 = require("./scenarios");
const fake_repository_1 = require("./testing/fake-repository");
const api = __importStar(require("./index"));
(0, vitest_1.describe)("node-base public exports", () => {
    (0, vitest_1.it)("exposes workflow service, role runners, and payload-facing helpers", () => {
        (0, vitest_1.expect)(api.IssueWorkflowService).toBeTypeOf("function");
        (0, vitest_1.expect)(api.defaultWorkflowTypes).toEqual(["bug", "fix", "test", "review", "done"]);
        (0, vitest_1.expect)(api.WorkerScenarioRunner).toBeTypeOf("function");
        (0, vitest_1.expect)(api.TesterScenarioRunner).toBeTypeOf("function");
        (0, vitest_1.expect)(api.DispatcherScenarioRunner).toBeTypeOf("function");
        (0, vitest_1.expect)(api.detectCurrentTypeFromComments).toBeTypeOf("function");
        (0, vitest_1.expect)(api.buildStageRegistry).toBeTypeOf("function");
        (0, vitest_1.expect)(api.getStageMetadata).toBeTypeOf("function");
        (0, vitest_1.expect)(api.getLatestBugDefinition).toBeTypeOf("function");
        (0, vitest_1.expect)(api.getLatestBugStageInput).toBeTypeOf("function");
        (0, vitest_1.expect)(api.getLatestFixHandoff).toBeTypeOf("function");
        (0, vitest_1.expect)(api.getLatestFixStageReport).toBeTypeOf("function");
        (0, vitest_1.expect)(api.getLatestReviewFixHandoff).toBeTypeOf("function");
        (0, vitest_1.expect)(api.getLatestReviewStageReport).toBeTypeOf("function");
        (0, vitest_1.expect)(api.getLatestDoneCloseout).toBeTypeOf("function");
        (0, vitest_1.expect)(api.getLatestDoneStageCloseout).toBeTypeOf("function");
        (0, vitest_1.expect)(api.getLatestFinalStageComment).toBeTypeOf("function");
        (0, vitest_1.expect)(api.getLatestStageComment).toBeTypeOf("function");
        (0, vitest_1.expect)(api.getLatestWorkflowStageBlocker).toBeTypeOf("function");
        (0, vitest_1.expect)(api.renderReviewFixHandoffComment).toBeTypeOf("function");
        (0, vitest_1.expect)(api.renderStageComment).toBeTypeOf("function");
        (0, vitest_1.expect)(typeof api.IssueWorkflowService.prototype.prepareFixStageContext).toBe("function");
        (0, vitest_1.expect)(typeof api.IssueWorkflowService.prototype.publishStageComment).toBe("function");
        (0, vitest_1.expect)(typeof api.IssueWorkflowService.prototype.getLatestStageComment).toBe("function");
        (0, vitest_1.expect)(typeof api.IssueWorkflowService.prototype.getLatestFinalStageComment).toBe("function");
        (0, vitest_1.expect)(typeof api.IssueWorkflowService.prototype.prepareFixStagePayload).toBe("function");
        (0, vitest_1.expect)(typeof api.IssueWorkflowService.prototype.prepareReviewStagePayload).toBe("function");
        (0, vitest_1.expect)(typeof api.WorkerScenarioRunner.prototype.publishStageCommentAndReload).toBe("function");
        (0, vitest_1.expect)(typeof api.TesterScenarioRunner.prototype.getLatestStageComment).toBe("function");
        (0, vitest_1.expect)(typeof api.DispatcherScenarioRunner.prototype.getLatestFinalStageComment).toBe("function");
    });
    (0, vitest_1.it)("exposes default built-in workflow type constants", () => {
        (0, vitest_1.expect)(api.defaultWorkflowTypes).toEqual(["bug", "fix", "test", "review", "done"]);
        (0, vitest_1.expect)(api.workflowTypes).toEqual(api.defaultWorkflowTypes);
    });
    (0, vitest_1.it)("exposes stage registry metadata for built-in and extension stages", () => {
        const registry = api.buildStageRegistry(["bug", "fix", "test", "review", "done", "wait"]);
        (0, vitest_1.expect)(registry.find((item) => item.name === "bug")).toMatchObject({
            isBuiltIn: true,
            documentationPath: "../../types/bug/stage.md",
            defaultHandlingAgent: "worker",
            isTerminal: false,
        });
        (0, vitest_1.expect)(registry.find((item) => item.name === "wait")).toMatchObject({
            isBuiltIn: false,
            documentationPath: "../../types/wait/stage.md",
            defaultHandlingAgent: null,
            isTerminal: false,
        });
    });
    (0, vitest_1.it)("supports stage-oriented publishing and payload reads through the public entrypoint", async () => {
        const repository = new fake_repository_1.FakeIssuesRepository((0, scenarios_1.createScenarioSeeds)());
        const service = new api.IssueWorkflowService({
            repository,
            options: { allowedTypes: ["bug", "fix", "test", "review", "done", "wait"] },
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
        (0, vitest_1.expect)(fixPayload.issueNumber).toBe(101);
        (0, vitest_1.expect)(fixPayload.facts).toContain("Bug exists");
        (0, vitest_1.expect)(splitPayload.issueNumber).toBe(103);
        (0, vitest_1.expect)(splitPayload.subIssueNumbers).toContain(104);
        (0, vitest_1.expect)(context.currentType).toBe("wait");
    });
    (0, vitest_1.it)("keeps the public testing boundary explicit", () => {
        (0, vitest_1.expect)(api.createScenarioSeeds).toBeTypeOf("function");
        (0, vitest_1.expect)(Array.isArray(api.scenarioDefinitions)).toBe(true);
        (0, vitest_1.expect)("FakeIssuesRepository" in api).toBe(false);
    });
    (0, vitest_1.it)("keeps the main public entrypoint focused on workflow-facing exports", () => {
        (0, vitest_1.expect)(api.IssueWorkflowService).toBeTypeOf("function");
        (0, vitest_1.expect)(api.WorkerScenarioRunner).toBeTypeOf("function");
        (0, vitest_1.expect)(api.TesterScenarioRunner).toBeTypeOf("function");
        (0, vitest_1.expect)(api.DispatcherScenarioRunner).toBeTypeOf("function");
        (0, vitest_1.expect)(api.createScenarioSeeds).toBeTypeOf("function");
        (0, vitest_1.expect)(Array.isArray(api.scenarioDefinitions)).toBe(true);
        (0, vitest_1.expect)("FakeIssuesRepository" in api).toBe(false);
    });
});

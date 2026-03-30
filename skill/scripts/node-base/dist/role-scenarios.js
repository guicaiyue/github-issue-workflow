"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DispatcherScenarioRunner = exports.TesterScenarioRunner = exports.WorkerScenarioRunner = void 0;
const workflow_service_1 = require("./workflow-service");
class WorkerScenarioRunner {
    service;
    constructor(dependencies) {
        this.service = new workflow_service_1.IssueWorkflowService({ repository: dependencies.repository, options: dependencies.options });
    }
    async loadFixBatch(limit = 5) {
        return this.service.loadFixBatch(limit);
    }
    async prepareFixQueuePayload(limit = 5) {
        return this.service.prepareFixQueuePayload(limit);
    }
    async prepareFixStageQueuePayload(limit = 5) {
        return this.service.prepareFixStageQueuePayload(limit);
    }
    async prepareFixIssue(issueNumber) {
        return this.service.prepareFixIssue(issueNumber);
    }
    async prepareFixStageContext(issueNumber) {
        return this.service.prepareFixStageContext(issueNumber);
    }
    async prepareFixPayload(issueNumber) {
        return this.service.prepareFixPayload(issueNumber);
    }
    async prepareFixStagePayload(issueNumber) {
        return this.service.prepareFixStagePayload(issueNumber);
    }
    async prepareReviewIssue(issueNumber) {
        return this.service.prepareReviewIssue(issueNumber);
    }
    async prepareReviewStageContext(issueNumber) {
        return this.service.prepareReviewStageContext(issueNumber);
    }
    async prepareReviewPayload(issueNumber) {
        return this.service.prepareReviewPayload(issueNumber);
    }
    async prepareReviewStagePayload(issueNumber) {
        return this.service.prepareReviewStagePayload(issueNumber);
    }
    async defineBugAndHandOffToFix(input) {
        return this.publishBugStageInputAndReload(input);
    }
    async publishBugStageInputAndReload(input) {
        await this.service.publishBugStageInput(input.issueNumber, input.bugDefinition);
        return this.service.loadIssueWorkflowContext(input.issueNumber);
    }
    async publishStageCommentAndReload(issueNumber, template) {
        await this.service.publishStageComment(issueNumber, template);
        return this.service.loadIssueWorkflowContext(issueNumber);
    }
    async getLatestStageComment(issueNumber, stageType) {
        return this.service.getLatestStageComment(issueNumber, stageType);
    }
    async getLatestFinalStageComment(issueNumber, stageType) {
        return this.service.getLatestFinalStageComment(issueNumber, stageType);
    }
    async handOffFixToTest(input) {
        return this.publishFixStageReportAndReload({
            issueNumber: input.issueNumber,
            report: input.handoff,
        });
    }
    async publishFixStageReportAndReload(input) {
        await this.service.publishFixStageReport(input.issueNumber, input.report);
        return this.service.loadIssueWorkflowContext(input.issueNumber);
    }
    async reviewAndDecide(input) {
        return this.publishReviewDecisionAndReload(input);
    }
    async publishReviewDecisionAndReload(input) {
        if (input.outcome === "done") {
            if (!input.closeout) {
                throw new Error("closeout is required when review outcome is done");
            }
            await this.service.publishDoneCloseout(input.issueNumber, input.closeout);
            return this.service.loadIssueWorkflowContext(input.issueNumber);
        }
        await this.service.publishReviewStageReport(input.issueNumber, input.closeout ?? {
            outcome: "Needs more implementation",
            evidenceOrReference: [],
            followUp: [],
        });
        return this.service.loadIssueWorkflowContext(input.issueNumber);
    }
}
exports.WorkerScenarioRunner = WorkerScenarioRunner;
class TesterScenarioRunner {
    service;
    constructor(dependencies) {
        this.service = new workflow_service_1.IssueWorkflowService({ repository: dependencies.repository, options: dependencies.options });
    }
    async prepareTestIssue(issueNumber) {
        return this.service.prepareTestIssue(issueNumber);
    }
    async prepareTestStageContext(issueNumber) {
        return this.service.prepareTestStageContext(issueNumber);
    }
    async prepareTestPayload(issueNumber) {
        return this.service.prepareTestPayload(issueNumber);
    }
    async prepareTestStagePayload(issueNumber) {
        return this.service.prepareTestStagePayload(issueNumber);
    }
    async validateAndRecommendNext(input) {
        return this.publishTestDecisionAndReload(input);
    }
    async publishTestDecisionAndReload(input) {
        if (input.outcome === "review") {
            await this.service.publishTestStageReport(input.issueNumber, {
                ...input.validation,
                suggestedNextType: "review",
            });
        }
        else {
            await this.service.publishTestStageReport(input.issueNumber, {
                ...input.validation,
                suggestedNextType: "fix",
            });
        }
        return this.service.loadIssueWorkflowContext(input.issueNumber);
    }
    async publishStageCommentAndReload(issueNumber, template) {
        await this.service.publishStageComment(issueNumber, template);
        return this.service.loadIssueWorkflowContext(issueNumber);
    }
    async getLatestStageComment(issueNumber, stageType) {
        return this.service.getLatestStageComment(issueNumber, stageType);
    }
    async getLatestFinalStageComment(issueNumber, stageType) {
        return this.service.getLatestFinalStageComment(issueNumber, stageType);
    }
}
exports.TesterScenarioRunner = TesterScenarioRunner;
class DispatcherScenarioRunner {
    service;
    constructor(dependencies) {
        this.service = new workflow_service_1.IssueWorkflowService({ repository: dependencies.repository, options: dependencies.options });
    }
    async prepareSplitPayload(issueNumber) {
        return this.service.prepareSplitPayload(issueNumber);
    }
    async prepareSplitStagePayload(issueNumber) {
        return this.service.prepareSplitStagePayload(issueNumber);
    }
    async splitParentIntoChildren(input) {
        return this.applySplitAndReload(input);
    }
    async applySplitAndReload(input) {
        await this.service.splitIssueIntoChildren(input.parentIssueNumber, input.children);
        return this.service.loadIssueWorkflowContext(input.parentIssueNumber);
    }
    async publishStageCommentAndReload(issueNumber, template) {
        await this.service.publishStageComment(issueNumber, template);
        return this.service.loadIssueWorkflowContext(issueNumber);
    }
    async getLatestStageComment(issueNumber, stageType) {
        return this.service.getLatestStageComment(issueNumber, stageType);
    }
    async getLatestFinalStageComment(issueNumber, stageType) {
        return this.service.getLatestFinalStageComment(issueNumber, stageType);
    }
}
exports.DispatcherScenarioRunner = DispatcherScenarioRunner;

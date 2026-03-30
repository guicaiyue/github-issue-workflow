"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssueWorkflowService = void 0;
const comment_templates_1 = require("./comment-templates");
const config_1 = require("./config");
const repository_1 = require("./repository");
const stage_registry_1 = require("./stage-registry");
const workflow_1 = require("./workflow");
const config_2 = require("./config");
class IssueWorkflowService {
    repository;
    allowedTypes;
    typeFieldLabel;
    fallbackType;
    constructor(dependencies = {}) {
        const config = dependencies.repository ? null : (0, config_1.loadGitHubIssuesConfig)();
        this.repository = dependencies.repository ?? new repository_1.GitHubIssuesRepository({ config: config ?? undefined });
        this.allowedTypes = dependencies.options?.allowedTypes ?? config?.workflow.allowedTypes ?? config_2.defaultAllowedWorkflowTypes;
        this.typeFieldLabel = dependencies.options?.typeFieldLabel ?? config?.workflow.typeFieldLabel ?? "Current type";
        this.fallbackType = dependencies.options?.fallbackType ?? config?.workflow.defaultType ?? "bug";
    }
    getStageRegistry() {
        return (0, stage_registry_1.buildStageRegistry)(this.allowedTypes);
    }
    getStageMetadata(stageType) {
        return (0, stage_registry_1.getStageMetadata)(stageType, this.allowedTypes);
    }
    async loadIssueWorkflowContext(issueNumber) {
        const issue = await this.repository.getIssue(issueNumber);
        const comments = await this.repository.listComments(issueNumber);
        const currentType = (0, workflow_1.detectCurrentTypeFromComments)(comments, this.allowedTypes, this.typeFieldLabel, this.fallbackType);
        const parentIssue = await this.loadParentIssue(issueNumber);
        const subIssues = await this.repository.listSubIssues(issueNumber);
        return {
            issue,
            comments,
            currentType,
            parentIssue,
            subIssues,
        };
    }
    async loadQueueContext(filters = { state: "open" }) {
        const issues = await this.repository.listIssues({ state: filters.state ?? "open" });
        const items = await Promise.all(issues.map(async (issue) => {
            const comments = await this.repository.listComments(issue.number);
            const currentType = (0, workflow_1.detectCurrentTypeFromComments)(comments, this.allowedTypes, this.typeFieldLabel, this.fallbackType);
            return {
                issue,
                currentType,
            };
        }));
        return { items };
    }
    async loadIssuesByCurrentType(currentType, filters = { state: "open" }) {
        const queue = await this.loadQueueContext(filters);
        return queue.items.filter((item) => item.currentType === currentType);
    }
    async loadFixBatch(limit = 5) {
        const payload = await this.prepareFixQueuePayload(limit);
        return {
            items: payload.items.map((item) => ({
                issue: {
                    id: item.issueNumber,
                    number: item.issueNumber,
                    title: item.issueTitle,
                    body: null,
                    state: "open",
                    html_url: "",
                },
                currentType: item.currentType,
            })),
        };
    }
    async prepareFixQueuePayload(limit = 5) {
        return this.prepareFixStageQueuePayload(limit);
    }
    async prepareFixStageQueuePayload(limit = 5) {
        const fixItems = await this.loadIssuesByCurrentType("fix", { state: "open" });
        const ranked = await Promise.all(fixItems.map(async (item) => {
            const comments = await this.repository.listComments(item.issue.number);
            return {
                issueNumber: item.issue.number,
                issueTitle: item.issue.title,
                currentType: item.currentType,
                hasBugDefinition: (0, workflow_1.getLatestBugDefinition)(comments) !== null,
            };
        }));
        return {
            items: ranked
                .sort((left, right) => {
                if (left.hasBugDefinition !== right.hasBugDefinition) {
                    return Number(right.hasBugDefinition) - Number(left.hasBugDefinition);
                }
                return left.issueNumber - right.issueNumber;
            })
                .slice(0, limit),
        };
    }
    async prepareFixIssue(issueNumber) {
        return this.prepareFixStageContext(issueNumber);
    }
    async prepareFixStageContext(issueNumber) {
        const context = await this.loadIssueWorkflowContext(issueNumber);
        return {
            ...context,
            latestBugDefinition: (0, workflow_1.getLatestBugDefinition)(context.comments),
            latestReviewFixHandoff: (0, workflow_1.getLatestReviewFixHandoff)(context.comments),
        };
    }
    async prepareFixPayload(issueNumber) {
        return this.prepareFixStagePayload(issueNumber);
    }
    async prepareFixStagePayload(issueNumber) {
        const context = await this.prepareFixStageContext(issueNumber);
        return {
            issueNumber: context.issue.number,
            issueTitle: context.issue.title,
            currentType: context.currentType,
            facts: context.latestBugDefinition?.facts ?? [],
            acceptanceCriteria: context.latestBugDefinition?.acceptanceCriteria ?? [],
            reviewFollowUp: context.latestReviewFixHandoff?.followUp ?? [],
        };
    }
    async prepareTestIssue(issueNumber) {
        return this.prepareTestStageContext(issueNumber);
    }
    async prepareTestStageContext(issueNumber) {
        const context = await this.loadIssueWorkflowContext(issueNumber);
        return {
            ...context,
            latestFixHandoff: (0, workflow_1.getLatestFixHandoff)(context.comments),
        };
    }
    async prepareTestPayload(issueNumber) {
        return this.prepareTestStagePayload(issueNumber);
    }
    async prepareTestStagePayload(issueNumber) {
        const context = await this.prepareTestStageContext(issueNumber);
        return {
            issueNumber: context.issue.number,
            issueTitle: context.issue.title,
            currentType: context.currentType,
            implementationSummary: context.latestFixHandoff?.implementationSummary ?? [],
            changedFiles: context.latestFixHandoff?.changedFiles ?? [],
            validationChecklist: context.latestFixHandoff?.validationChecklist ?? [],
        };
    }
    async prepareReviewIssue(issueNumber) {
        return this.prepareReviewStageContext(issueNumber);
    }
    async prepareReviewStageContext(issueNumber) {
        const context = await this.loadIssueWorkflowContext(issueNumber);
        return {
            ...context,
            latestTestResult: (0, workflow_1.getLatestTestResult)(context.comments),
            latestDoneCloseout: (0, workflow_1.getLatestDoneCloseout)(context.comments),
        };
    }
    async prepareReviewPayload(issueNumber) {
        return this.prepareReviewStagePayload(issueNumber);
    }
    async prepareReviewStagePayload(issueNumber) {
        const context = await this.prepareReviewStageContext(issueNumber);
        return {
            issueNumber: context.issue.number,
            issueTitle: context.issue.title,
            currentType: context.currentType,
            suggestedNextType: context.latestTestResult?.suggestedNextType ?? null,
            scenarios: context.latestTestResult?.scenarios ?? [],
            closeoutOutcome: context.latestDoneCloseout?.outcome ?? null,
        };
    }
    async prepareSplitPayload(issueNumber) {
        return this.prepareSplitStagePayload(issueNumber);
    }
    async prepareSplitStagePayload(issueNumber) {
        const context = await this.loadIssueWorkflowContext(issueNumber);
        return {
            issueNumber: context.issue.number,
            issueTitle: context.issue.title,
            currentType: context.currentType,
            parentIssueNumber: context.parentIssue?.number ?? null,
            subIssueNumbers: context.subIssues.map((issue) => issue.number),
            hasChildren: context.subIssues.length > 0,
        };
    }
    async createBugDefinition(issueNumber, input) {
        return this.publishBugStageInput(issueNumber, input);
    }
    async publishBugStageInput(issueNumber, input) {
        return this.repository.addComment(issueNumber, (0, comment_templates_1.renderBugDefinitionComment)(input));
    }
    async publishStageComment(issueNumber, template) {
        return this.repository.addComment(issueNumber, (0, comment_templates_1.renderStageComment)(template));
    }
    async getLatestStageComment(issueNumber, stageType) {
        const comments = await this.repository.listComments(issueNumber);
        return (0, workflow_1.getLatestStageComment)(comments, stageType);
    }
    async getLatestFinalStageComment(issueNumber, stageType) {
        const comments = await this.repository.listComments(issueNumber);
        return (0, workflow_1.getLatestFinalStageComment)(comments, stageType);
    }
    async reportWorkflowBlocker(issueNumber, input) {
        return this.repository.addComment(issueNumber, (0, comment_templates_1.renderWorkflowBlockerComment)(input));
    }
    async handoffToTest(issueNumber, input) {
        return this.publishFixStageReport(issueNumber, input);
    }
    async publishFixStageReport(issueNumber, input) {
        return this.repository.addComment(issueNumber, (0, comment_templates_1.renderFixHandoffComment)(input));
    }
    async handoffToReview(issueNumber, input) {
        return this.publishTestStageReport(issueNumber, {
            ...input,
            suggestedNextType: "review",
        });
    }
    async handoffBackToFix(issueNumber, input) {
        return this.publishTestStageReport(issueNumber, {
            ...input,
            suggestedNextType: "fix",
        });
    }
    async publishTestStageReport(issueNumber, input) {
        return this.repository.addComment(issueNumber, (0, comment_templates_1.renderTestValidationComment)(input));
    }
    async handoffReviewBackToFix(issueNumber, input) {
        return this.publishReviewStageReport(issueNumber, input);
    }
    async publishReviewStageReport(issueNumber, input) {
        return this.repository.addComment(issueNumber, (0, comment_templates_1.renderReviewFixHandoffComment)(input));
    }
    async closeIssueAsDone(issueNumber, input) {
        return this.publishDoneCloseout(issueNumber, input);
    }
    async publishDoneCloseout(issueNumber, input) {
        const comment = await this.repository.addComment(issueNumber, (0, comment_templates_1.renderDoneCloseoutComment)(input));
        const issue = await this.repository.closeIssue(issueNumber);
        return { comment, issue };
    }
    async reopenIssue(issueNumber) {
        return this.repository.reopenIssue(issueNumber);
    }
    async splitIssueIntoChildren(parentIssueNumber, children) {
        const createdChildren = [];
        for (const child of children) {
            const created = await this.repository.createIssue({
                title: child.title,
                body: child.body,
                labels: child.labels,
                assignees: child.assignees,
                milestone: child.milestone,
            });
            createdChildren.push(created);
            await this.repository.addSubIssue(parentIssueNumber, created.number, { replaceParent: child.replaceParent });
        }
        return createdChildren;
    }
    async loadParentIssue(issueNumber) {
        try {
            return await this.repository.getParentIssue(issueNumber);
        }
        catch {
            return null;
        }
    }
}
exports.IssueWorkflowService = IssueWorkflowService;

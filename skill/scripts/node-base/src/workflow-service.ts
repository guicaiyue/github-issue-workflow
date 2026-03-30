import {
  renderBugDefinitionComment,
  renderDoneCloseoutComment,
  renderFixHandoffComment,
  renderReviewFixHandoffComment,
  renderStageComment,
  renderTestValidationComment,
  renderWorkflowBlockerComment,
} from "./comment-templates";
import { loadGitHubIssuesConfig } from "./config";
import { GitHubIssuesRepository } from "./repository";
import { buildStageRegistry, getStageMetadata } from "./stage-registry";
import {
  detectCurrentTypeFromComments,
  getLatestBugDefinition,
  getLatestDoneCloseout,
  getLatestFinalStageComment,
  getLatestFixHandoff,
  getLatestReviewFixHandoff,
  getLatestStageComment,
  getLatestTestResult,
} from "./workflow";
import type {
  BugDefinitionInput,
  DispatcherSplitPreparePayload,
  DoneCloseoutInput,
  FixHandoffInput,
  FixStagePreparePayload,
  FixStageQueuePayload,
  GitHubIssue,
  IssueQueueContext,
  IssueWorkflowContext,
  IssuesRepositoryLike,
  PreparedFixIssueContext,
  PreparedFixStageContext,
  PreparedReviewIssueContext,
  PreparedReviewStageContext,
  PreparedTestIssueContext,
  PreparedTestStageContext,
  ReviewerPreparePayload,
  ReviewStagePreparePayload,
  SplitChildIssueInput,
  SplitStagePreparePayload,
  TestStagePreparePayload,
  TestValidationResultInput,
  TesterPreparePayload,
  WorkflowBlockerInput,
  WorkflowServiceOptions,
  WorkflowTypeName,
  WorkerFixPreparePayload,
  StageCommentTemplate,
  WorkerFixQueuePayload,
} from "./types";
import { defaultAllowedWorkflowTypes } from "./config";

export interface IssueWorkflowServiceDependencies {
  repository?: IssuesRepositoryLike;
  options?: WorkflowServiceOptions;
}

export class IssueWorkflowService {
  private readonly repository: IssuesRepositoryLike;
  private readonly allowedTypes: readonly WorkflowTypeName[];
  private readonly typeFieldLabel: string;
  private readonly fallbackType: WorkflowTypeName;

  constructor(dependencies: IssueWorkflowServiceDependencies = {}) {
    const config = dependencies.repository ? null : loadGitHubIssuesConfig();
    this.repository = dependencies.repository ?? new GitHubIssuesRepository({ config: config ?? undefined });
    this.allowedTypes = dependencies.options?.allowedTypes ?? config?.workflow.allowedTypes ?? defaultAllowedWorkflowTypes;
    this.typeFieldLabel = dependencies.options?.typeFieldLabel ?? config?.workflow.typeFieldLabel ?? "Current type";
    this.fallbackType = dependencies.options?.fallbackType ?? config?.workflow.defaultType ?? "bug";
  }

  getStageRegistry() {
    return buildStageRegistry(this.allowedTypes);
  }

  getStageMetadata(stageType: string) {
    return getStageMetadata(stageType, this.allowedTypes);
  }

  async loadIssueWorkflowContext(issueNumber: number): Promise<IssueWorkflowContext> {
    const issue = await this.repository.getIssue(issueNumber);
    const comments = await this.repository.listComments(issueNumber);
    const currentType = detectCurrentTypeFromComments(comments, this.allowedTypes, this.typeFieldLabel, this.fallbackType);
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

  async loadQueueContext(filters: { state?: "open" | "closed" | "all" } = { state: "open" }): Promise<IssueQueueContext> {
    const issues = await this.repository.listIssues({ state: filters.state ?? "open" });
    const items = await Promise.all(
      issues.map(async (issue) => {
        const comments = await this.repository.listComments(issue.number);
        const currentType = detectCurrentTypeFromComments(comments, this.allowedTypes, this.typeFieldLabel, this.fallbackType);
        return {
          issue,
          currentType,
        };
      })
    );

    return { items };
  }

  async loadIssuesByCurrentType(currentType: WorkflowTypeName, filters: { state?: "open" | "closed" | "all" } = { state: "open" }) {
    const queue = await this.loadQueueContext(filters);
    return queue.items.filter((item) => item.currentType === currentType);
  }

  async loadFixBatch(limit = 5): Promise<IssueQueueContext> {
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

  async prepareFixQueuePayload(limit = 5): Promise<WorkerFixQueuePayload> {
    return this.prepareFixStageQueuePayload(limit);
  }

  async prepareFixStageQueuePayload(limit = 5): Promise<FixStageQueuePayload> {
    const fixItems = await this.loadIssuesByCurrentType("fix", { state: "open" });
    const ranked = await Promise.all(
      fixItems.map(async (item) => {
        const comments = await this.repository.listComments(item.issue.number);
        return {
          issueNumber: item.issue.number,
          issueTitle: item.issue.title,
          currentType: item.currentType,
          hasBugDefinition: getLatestBugDefinition(comments) !== null,
        };
      })
    );

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

  async prepareFixIssue(issueNumber: number): Promise<PreparedFixIssueContext> {
    return this.prepareFixStageContext(issueNumber);
  }

  async prepareFixStageContext(issueNumber: number): Promise<PreparedFixStageContext> {
    const context = await this.loadIssueWorkflowContext(issueNumber);
    return {
      ...context,
      latestBugDefinition: getLatestBugDefinition(context.comments),
      latestReviewFixHandoff: getLatestReviewFixHandoff(context.comments),
    };
  }

  async prepareFixPayload(issueNumber: number): Promise<WorkerFixPreparePayload> {
    return this.prepareFixStagePayload(issueNumber);
  }

  async prepareFixStagePayload(issueNumber: number): Promise<FixStagePreparePayload> {
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

  async prepareTestIssue(issueNumber: number): Promise<PreparedTestIssueContext> {
    return this.prepareTestStageContext(issueNumber);
  }

  async prepareTestStageContext(issueNumber: number): Promise<PreparedTestStageContext> {
    const context = await this.loadIssueWorkflowContext(issueNumber);
    return {
      ...context,
      latestFixHandoff: getLatestFixHandoff(context.comments),
    };
  }

  async prepareTestPayload(issueNumber: number): Promise<TesterPreparePayload> {
    return this.prepareTestStagePayload(issueNumber);
  }

  async prepareTestStagePayload(issueNumber: number): Promise<TestStagePreparePayload> {
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

  async prepareReviewIssue(issueNumber: number): Promise<PreparedReviewIssueContext> {
    return this.prepareReviewStageContext(issueNumber);
  }

  async prepareReviewStageContext(issueNumber: number): Promise<PreparedReviewStageContext> {
    const context = await this.loadIssueWorkflowContext(issueNumber);
    return {
      ...context,
      latestTestResult: getLatestTestResult(context.comments),
      latestDoneCloseout: getLatestDoneCloseout(context.comments),
    };
  }

  async prepareReviewPayload(issueNumber: number): Promise<ReviewerPreparePayload> {
    return this.prepareReviewStagePayload(issueNumber);
  }

  async prepareReviewStagePayload(issueNumber: number): Promise<ReviewStagePreparePayload> {
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

  async prepareSplitPayload(issueNumber: number): Promise<DispatcherSplitPreparePayload> {
    return this.prepareSplitStagePayload(issueNumber);
  }

  async prepareSplitStagePayload(issueNumber: number): Promise<SplitStagePreparePayload> {
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

  async createBugDefinition(issueNumber: number, input: BugDefinitionInput) {
    return this.publishBugStageInput(issueNumber, input);
  }

  async publishBugStageInput(issueNumber: number, input: BugDefinitionInput) {
    return this.repository.addComment(issueNumber, renderBugDefinitionComment(input));
  }

  async publishStageComment(issueNumber: number, template: StageCommentTemplate) {
    return this.repository.addComment(issueNumber, renderStageComment(template));
  }

  async getLatestStageComment(issueNumber: number, stageType: string) {
    const comments = await this.repository.listComments(issueNumber);
    return getLatestStageComment(comments, stageType);
  }

  async getLatestFinalStageComment(issueNumber: number, stageType: string) {
    const comments = await this.repository.listComments(issueNumber);
    return getLatestFinalStageComment(comments, stageType);
  }

  async reportWorkflowBlocker(issueNumber: number, input: WorkflowBlockerInput) {
    return this.repository.addComment(issueNumber, renderWorkflowBlockerComment(input));
  }

  async handoffToTest(issueNumber: number, input: FixHandoffInput) {
    return this.publishFixStageReport(issueNumber, input);
  }

  async publishFixStageReport(issueNumber: number, input: FixHandoffInput) {
    return this.repository.addComment(issueNumber, renderFixHandoffComment(input));
  }

  async handoffToReview(issueNumber: number, input: TestValidationResultInput) {
    return this.publishTestStageReport(issueNumber, {
      ...input,
      suggestedNextType: "review",
    });
  }

  async handoffBackToFix(issueNumber: number, input: Omit<TestValidationResultInput, "suggestedNextType">) {
    return this.publishTestStageReport(issueNumber, {
      ...input,
      suggestedNextType: "fix",
    });
  }

  async publishTestStageReport(issueNumber: number, input: TestValidationResultInput) {
    return this.repository.addComment(issueNumber, renderTestValidationComment(input));
  }

  async handoffReviewBackToFix(issueNumber: number, input: DoneCloseoutInput) {
    return this.publishReviewStageReport(issueNumber, input);
  }

  async publishReviewStageReport(issueNumber: number, input: DoneCloseoutInput) {
    return this.repository.addComment(issueNumber, renderReviewFixHandoffComment(input));
  }

  async closeIssueAsDone(issueNumber: number, input: DoneCloseoutInput) {
    return this.publishDoneCloseout(issueNumber, input);
  }

  async publishDoneCloseout(issueNumber: number, input: DoneCloseoutInput) {
    const comment = await this.repository.addComment(issueNumber, renderDoneCloseoutComment(input));
    const issue = await this.repository.closeIssue(issueNumber);
    return { comment, issue };
  }

  async reopenIssue(issueNumber: number) {
    return this.repository.reopenIssue(issueNumber);
  }

  async splitIssueIntoChildren(parentIssueNumber: number, children: SplitChildIssueInput[]): Promise<GitHubIssue[]> {
    const createdChildren: GitHubIssue[] = [];

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

  private async loadParentIssue(issueNumber: number): Promise<GitHubIssue | null> {
    try {
      return await this.repository.getParentIssue(issueNumber);
    } catch {
      return null;
    }
  }
}

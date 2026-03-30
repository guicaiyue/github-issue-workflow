import { IssueWorkflowService } from "./workflow-service";
import type { ParsedStageComment, StageCommentTemplate } from "./types";
import type {
  DispatcherSplitInput,
  DispatcherSplitPreparePayload,
  FixStagePreparePayload,
  IssueWorkflowContext,
  IssuesRepositoryLike,
  PreparedFixIssueContext,
  PreparedFixStageContext,
  PreparedReviewIssueContext,
  PreparedReviewStageContext,
  PreparedTestIssueContext,
  PreparedTestStageContext,
  ReviewDecisionInput,
  ReviewerPreparePayload,
  ReviewStagePreparePayload,
  SplitStagePreparePayload,
  TesterDecisionInput,
  TesterPreparePayload,
  TestStagePreparePayload,
  WorkerBugToFixInput,
  WorkerFixPreparePayload,
  WorkerFixStageReportInput,
  WorkerFixToTestInput,
  WorkflowServiceOptions,
} from "./types";

export interface RoleScenarioDependencies {
  repository: IssuesRepositoryLike;
  options?: WorkflowServiceOptions;
}

export class WorkerScenarioRunner {
  private readonly service: IssueWorkflowService;

  constructor(dependencies: RoleScenarioDependencies) {
    this.service = new IssueWorkflowService({ repository: dependencies.repository, options: dependencies.options });
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

  async prepareFixIssue(issueNumber: number): Promise<PreparedFixIssueContext> {
    return this.service.prepareFixIssue(issueNumber);
  }

  async prepareFixStageContext(issueNumber: number): Promise<PreparedFixStageContext> {
    return this.service.prepareFixStageContext(issueNumber);
  }

  async prepareFixPayload(issueNumber: number): Promise<WorkerFixPreparePayload> {
    return this.service.prepareFixPayload(issueNumber);
  }

  async prepareFixStagePayload(issueNumber: number): Promise<FixStagePreparePayload> {
    return this.service.prepareFixStagePayload(issueNumber);
  }

  async prepareReviewIssue(issueNumber: number): Promise<PreparedReviewIssueContext> {
    return this.service.prepareReviewIssue(issueNumber);
  }

  async prepareReviewStageContext(issueNumber: number): Promise<PreparedReviewStageContext> {
    return this.service.prepareReviewStageContext(issueNumber);
  }

  async prepareReviewPayload(issueNumber: number): Promise<ReviewerPreparePayload> {
    return this.service.prepareReviewPayload(issueNumber);
  }

  async prepareReviewStagePayload(issueNumber: number): Promise<ReviewStagePreparePayload> {
    return this.service.prepareReviewStagePayload(issueNumber);
  }

  async defineBugAndHandOffToFix(input: WorkerBugToFixInput): Promise<IssueWorkflowContext> {
    return this.publishBugStageInputAndReload(input);
  }

  async publishBugStageInputAndReload(input: WorkerBugToFixInput): Promise<IssueWorkflowContext> {
    await this.service.publishBugStageInput(input.issueNumber, input.bugDefinition);
    return this.service.loadIssueWorkflowContext(input.issueNumber);
  }

  async publishStageCommentAndReload(issueNumber: number, template: StageCommentTemplate): Promise<IssueWorkflowContext> {
    await this.service.publishStageComment(issueNumber, template);
    return this.service.loadIssueWorkflowContext(issueNumber);
  }

  async getLatestStageComment(issueNumber: number, stageType: string): Promise<ParsedStageComment | null> {
    return this.service.getLatestStageComment(issueNumber, stageType);
  }

  async getLatestFinalStageComment(issueNumber: number, stageType: string): Promise<ParsedStageComment | null> {
    return this.service.getLatestFinalStageComment(issueNumber, stageType);
  }

  async handOffFixToTest(input: WorkerFixToTestInput): Promise<IssueWorkflowContext> {
    return this.publishFixStageReportAndReload({
      issueNumber: input.issueNumber,
      report: input.handoff,
    });
  }

  async publishFixStageReportAndReload(input: WorkerFixStageReportInput): Promise<IssueWorkflowContext> {
    await this.service.publishFixStageReport(input.issueNumber, input.report);
    return this.service.loadIssueWorkflowContext(input.issueNumber);
  }

  async reviewAndDecide(input: ReviewDecisionInput): Promise<IssueWorkflowContext> {
    return this.publishReviewDecisionAndReload(input);
  }

  async publishReviewDecisionAndReload(input: ReviewDecisionInput): Promise<IssueWorkflowContext> {
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

export class TesterScenarioRunner {
  private readonly service: IssueWorkflowService;

  constructor(dependencies: RoleScenarioDependencies) {
    this.service = new IssueWorkflowService({ repository: dependencies.repository, options: dependencies.options });
  }

  async prepareTestIssue(issueNumber: number): Promise<PreparedTestIssueContext> {
    return this.service.prepareTestIssue(issueNumber);
  }

  async prepareTestStageContext(issueNumber: number): Promise<PreparedTestStageContext> {
    return this.service.prepareTestStageContext(issueNumber);
  }

  async prepareTestPayload(issueNumber: number): Promise<TesterPreparePayload> {
    return this.service.prepareTestPayload(issueNumber);
  }

  async prepareTestStagePayload(issueNumber: number): Promise<TestStagePreparePayload> {
    return this.service.prepareTestStagePayload(issueNumber);
  }

  async validateAndRecommendNext(input: TesterDecisionInput): Promise<IssueWorkflowContext> {
    return this.publishTestDecisionAndReload(input);
  }

  async publishTestDecisionAndReload(input: TesterDecisionInput): Promise<IssueWorkflowContext> {
    if (input.outcome === "review") {
      await this.service.publishTestStageReport(input.issueNumber, {
        ...input.validation,
        suggestedNextType: "review",
      });
    } else {
      await this.service.publishTestStageReport(input.issueNumber, {
        ...input.validation,
        suggestedNextType: "fix",
      });
    }

    return this.service.loadIssueWorkflowContext(input.issueNumber);
  }

  async publishStageCommentAndReload(issueNumber: number, template: StageCommentTemplate): Promise<IssueWorkflowContext> {
    await this.service.publishStageComment(issueNumber, template);
    return this.service.loadIssueWorkflowContext(issueNumber);
  }

  async getLatestStageComment(issueNumber: number, stageType: string): Promise<ParsedStageComment | null> {
    return this.service.getLatestStageComment(issueNumber, stageType);
  }

  async getLatestFinalStageComment(issueNumber: number, stageType: string): Promise<ParsedStageComment | null> {
    return this.service.getLatestFinalStageComment(issueNumber, stageType);
  }
}

export class DispatcherScenarioRunner {
  private readonly service: IssueWorkflowService;

  constructor(dependencies: RoleScenarioDependencies) {
    this.service = new IssueWorkflowService({ repository: dependencies.repository, options: dependencies.options });
  }

  async prepareSplitPayload(issueNumber: number): Promise<DispatcherSplitPreparePayload> {
    return this.service.prepareSplitPayload(issueNumber);
  }

  async prepareSplitStagePayload(issueNumber: number): Promise<SplitStagePreparePayload> {
    return this.service.prepareSplitStagePayload(issueNumber);
  }

  async splitParentIntoChildren(input: DispatcherSplitInput): Promise<IssueWorkflowContext> {
    return this.applySplitAndReload(input);
  }

  async applySplitAndReload(input: DispatcherSplitInput): Promise<IssueWorkflowContext> {
    await this.service.splitIssueIntoChildren(input.parentIssueNumber, input.children);
    return this.service.loadIssueWorkflowContext(input.parentIssueNumber);
  }

  async publishStageCommentAndReload(issueNumber: number, template: StageCommentTemplate): Promise<IssueWorkflowContext> {
    await this.service.publishStageComment(issueNumber, template);
    return this.service.loadIssueWorkflowContext(issueNumber);
  }

  async getLatestStageComment(issueNumber: number, stageType: string): Promise<ParsedStageComment | null> {
    return this.service.getLatestStageComment(issueNumber, stageType);
  }

  async getLatestFinalStageComment(issueNumber: number, stageType: string): Promise<ParsedStageComment | null> {
    return this.service.getLatestFinalStageComment(issueNumber, stageType);
  }
}

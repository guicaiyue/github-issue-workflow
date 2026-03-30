export const defaultWorkflowTypes = ["bug", "fix", "test", "review", "done"] as const;
export const workflowTypes = defaultWorkflowTypes; // compatibility alias for the default built-in stage set

export type WorkflowType = (typeof defaultWorkflowTypes)[number]; // Built-in stage identifiers
export type WorkflowTypeName = string; // Persisted stage identifier stored in `Current type`; may include repository extensions such as `wait`

export interface GitHubIssuesConfigFile {
  version: number;
  github: {
    baseUrl?: string;
    apiVersion?: string;
    repo?: {
      owner?: string;
      name?: string;
    };
    auth?: {
      tokenEnvVar?: string;
    };
  };
  workflow?: {
    defaultType?: WorkflowTypeName;
    allowedTypes?: WorkflowTypeName[];
    typeFieldLabel?: string;
  };
}

export interface ResolvedGitHubIssuesConfig {
  version: number;
  github: {
    baseUrl: string;
    apiVersion: string;
    repo: {
      owner: string;
      name: string;
    };
    auth: {
      tokenEnvVar: string;
      token: string;
    };
  };
  workflow: {
    defaultType: WorkflowTypeName;
    allowedTypes: WorkflowTypeName[];
    typeFieldLabel: string;
  };
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
}

export interface GitHubIssueComment {
  id: number;
  body: string;
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface IssueListFilters {
  state?: "open" | "closed" | "all";
  perPage?: number;
  page?: number;
}

export interface CreateIssueInput {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
  milestone?: number;
}

export interface UpdateIssueInput {
  title?: string;
  body?: string;
  state?: "open" | "closed";
  labels?: string[];
  assignees?: string[];
  milestone?: number | null;
}

export interface AddSubIssueOptions {
  replaceParent?: boolean;
}

export interface ReprioritizeSubIssueInput {
  subIssueId: number;
  afterId?: number;
}

export interface GitHubRequestInit {
  method?: string;
  body?: unknown;
}

export interface GitHubRequestClient {
  request<T>(pathname: string, init?: GitHubRequestInit): Promise<T>;
}

export interface IssuesRepositoryLike {
  getIssue(issueNumber: number): Promise<GitHubIssue>;
  listIssues(filters?: IssueListFilters): Promise<GitHubIssue[]>;
  createIssue(input: CreateIssueInput): Promise<GitHubIssue>;
  updateIssue(issueNumber: number, patch: UpdateIssueInput): Promise<GitHubIssue>;
  closeIssue(issueNumber: number): Promise<GitHubIssue>;
  reopenIssue(issueNumber: number): Promise<GitHubIssue>;
  listComments(issueNumber: number): Promise<GitHubIssueComment[]>;
  addComment(issueNumber: number, body: string): Promise<GitHubIssueComment>;
  listSubIssues(issueNumber: number): Promise<GitHubIssue[]>;
  getParentIssue(issueNumber: number): Promise<GitHubIssue>;
  addSubIssue(parentIssueNumber: number, childIssueNumber: number, options?: AddSubIssueOptions): Promise<void>;
  removeSubIssue(parentIssueNumber: number, childIssueNumber: number): Promise<void>;
  reprioritizeSubIssue(parentIssueNumber: number, input: ReprioritizeSubIssueInput): Promise<void>;
}

export interface WorkflowServiceOptions {
  allowedTypes?: readonly WorkflowTypeName[];
  typeFieldLabel?: string;
  fallbackType?: WorkflowTypeName;
}

export interface StageMetadata {
  name: WorkflowTypeName;
  isBuiltIn: boolean;
  documentationPath: string | null;
  defaultHandlingAgent: string | null;
  isTerminal: boolean;
}

export interface IssueWorkflowContext {
  issue: GitHubIssue;
  comments: GitHubIssueComment[];
  currentType: WorkflowTypeName;
  parentIssue: GitHubIssue | null;
  subIssues: GitHubIssue[];
}

export interface IssueQueueItem {
  issue: GitHubIssue;
  currentType: WorkflowTypeName;
}

export interface IssueQueueContext {
  items: IssueQueueItem[];
}

export interface WorkflowBlockerInput {
  currentType: Exclude<WorkflowType, "done">;
  blocker: string;
  impact: string;
  need: string;
  suggestedNextType: WorkflowType;
}

export interface StageCommentTemplate {
  currentType?: string;
  finalType?: string;
  fields: Array<{
    label: string;
    value: string | string[];
    omitIfEmpty?: boolean;
  }>;
}

export interface ParsedStageComment {
  currentType: string | null;
  finalType: string | null;
  fields: Record<string, string | string[]>;
  rawBody: string;
}

export interface BugDefinitionInput {
  facts: string[];
  evidence: string[];
  hypothesis?: string[];
  acceptanceCriteria: string[];
  stayOrHandOff: "stay" | "hand off";
  recommendedNextType: "bug" | "fix";
  blockersOrDependencies?: string[];
}

export interface FixHandoffInput {
  implementationSummary: string[];
  changedFiles: string[];
  knownLimitationsOrOpenQuestions?: string[];
  validationChecklist: string[];
}

export interface ValidationScenarioResult {
  name: string;
  result: "pass" | "fail" | "blocked";
}

export interface TestValidationResultInput {
  scenarios: ValidationScenarioResult[];
  evidenceUsed: string[];
  suggestedNextType: "fix" | "review";
  remainingRisksOrFollowUps?: string[];
}

export interface DoneCloseoutInput {
  outcome: string;
  evidenceOrReference: string[];
  followUp?: string[];
}

export interface SplitChildIssueInput {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
  milestone?: number;
  replaceParent?: boolean;
}

export interface ScenarioDefinition {
  name: string;
  description: string;
  issueNumber: number;
}

export interface WorkerBugToFixInput {
  issueNumber: number;
  bugDefinition: BugDefinitionInput;
}

export interface WorkerFixToTestInput {
  issueNumber: number;
  handoff: FixHandoffInput;
}

export interface WorkerFixStageReportInput {
  issueNumber: number;
  report: FixHandoffInput;
}

export interface ReviewDecisionInput {
  issueNumber: number;
  outcome: "done" | "fix";
  closeout?: DoneCloseoutInput;
}

export interface TesterDecisionInput {
  issueNumber: number;
  validation: Omit<TestValidationResultInput, "suggestedNextType">;
  outcome: "fix" | "review";
}

export interface DispatcherSplitInput {
  parentIssueNumber: number;
  children: SplitChildIssueInput[];
}

export interface ParsedBugDefinition {
  facts: string[];
  evidence: string[];
  hypothesis: string[];
  acceptanceCriteria: string[];
  stayOrHandOff: string | null;
  recommendedNextType: string | null;
  blockersOrDependencies: string[];
}

export interface ParsedFixHandoff {
  implementationSummary: string[];
  changedFiles: string[];
  knownLimitationsOrOpenQuestions: string[];
  suggestedNextType: string | null;
  validationChecklist: string[];
}

export interface ParsedTestResult {
  scenarios: ValidationScenarioResult[];
  evidenceUsed: string[];
  suggestedNextType: string | null;
  remainingRisksOrFollowUps: string[];
}

export interface ParsedWorkflowBlocker {
  currentType: string | null;
  blocker: string | null;
  impact: string | null;
  need: string | null;
  suggestedNextType: string | null;
}

export interface ParsedReviewFixHandoff {
  outcome: string | null;
  suggestedNextType: string | null;
  evidenceOrReference: string[];
  followUp: string[];
}

export interface ParsedDoneCloseout {
  outcome: string | null;
  evidenceOrReference: string[];
  followUp: string[];
}

export type ParsedBugStageInput = ParsedBugDefinition;
export type ParsedFixStageReport = ParsedFixHandoff;
export type ParsedTestStageReport = ParsedTestResult;
export type ParsedWorkflowStageBlocker = ParsedWorkflowBlocker;
export type ParsedReviewStageReport = ParsedReviewFixHandoff;
export type ParsedDoneStageCloseout = ParsedDoneCloseout;

export interface PreparedFixIssueContext extends IssueWorkflowContext {
  latestBugDefinition: ParsedBugDefinition | null;
  latestReviewFixHandoff: ParsedReviewFixHandoff | null;
}

export interface PreparedTestIssueContext extends IssueWorkflowContext {
  latestFixHandoff: ParsedFixHandoff | null;
}

export interface PreparedReviewIssueContext extends IssueWorkflowContext {
  latestTestResult: ParsedTestResult | null;
  latestDoneCloseout: ParsedDoneCloseout | null;
}

export interface WorkerFixPreparePayload {
  issueNumber: number;
  issueTitle: string;
  currentType: WorkflowTypeName;
  facts: string[];
  acceptanceCriteria: string[];
  reviewFollowUp: string[];
}

export interface WorkerFixQueuePayloadItem {
  issueNumber: number;
  issueTitle: string;
  currentType: WorkflowTypeName;
  hasBugDefinition: boolean;
}

export interface WorkerFixQueuePayload {
  items: WorkerFixQueuePayloadItem[];
}

export interface TesterPreparePayload {
  issueNumber: number;
  issueTitle: string;
  currentType: WorkflowTypeName;
  implementationSummary: string[];
  changedFiles: string[];
  validationChecklist: string[];
}

export interface ReviewerPreparePayload {
  issueNumber: number;
  issueTitle: string;
  currentType: WorkflowTypeName;
  suggestedNextType: string | null;
  scenarios: ValidationScenarioResult[];
  closeoutOutcome: string | null;
}

export interface DispatcherSplitPreparePayload {
  issueNumber: number;
  issueTitle: string;
  currentType: WorkflowTypeName;
  parentIssueNumber: number | null;
  subIssueNumbers: number[];
  hasChildren: boolean;
}

export type PreparedFixStageContext = PreparedFixIssueContext;
export type PreparedTestStageContext = PreparedTestIssueContext;
export type PreparedReviewStageContext = PreparedReviewIssueContext;

export type FixStagePreparePayload = WorkerFixPreparePayload;
export type FixStageQueuePayloadItem = WorkerFixQueuePayloadItem;
export type FixStageQueuePayload = WorkerFixQueuePayload;
export type TestStagePreparePayload = TesterPreparePayload;
export type ReviewStagePreparePayload = ReviewerPreparePayload;
export type SplitStagePreparePayload = DispatcherSplitPreparePayload;
export type WorkerFixStageToTestInput = WorkerFixToTestInput;

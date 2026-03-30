import { defaultWorkflowTypes, type GitHubIssuesConfigFile, type ResolvedGitHubIssuesConfig, type WorkflowType, type WorkflowTypeName } from "./types";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBuiltInWorkflowType(value: unknown): value is WorkflowType {
  return typeof value === "string" && defaultWorkflowTypes.includes(value as WorkflowType);
}

function isWorkflowTypeName(value: unknown): value is WorkflowTypeName {
  return typeof value === "string" && value.trim().length > 0;
}

export function assertValidConfigFile(config: GitHubIssuesConfigFile): void {
  if (!Number.isInteger(config.version) || config.version < 1) {
    throw new Error("github-issues.config.json must contain a supported integer version");
  }

  if (!isNonEmptyString(config.github?.repo?.owner)) {
    throw new Error("github-issues.config.json must define github.repo.owner");
  }

  if (!isNonEmptyString(config.github?.repo?.name)) {
    throw new Error("github-issues.config.json must define github.repo.name");
  }

  if (!isNonEmptyString(config.github?.auth?.tokenEnvVar)) {
    throw new Error("github-issues.config.json must define github.auth.tokenEnvVar");
  }

  if (config.workflow?.defaultType && !isBuiltInWorkflowType(config.workflow.defaultType)) {
    throw new Error("github-issues.config.json has an unsupported workflow.defaultType");
  }

  if (config.workflow?.allowedTypes) {
    const invalidType = config.workflow.allowedTypes.find((item) => !isWorkflowTypeName(item));
    if (invalidType) {
      throw new Error(`github-issues.config.json has an invalid workflow.allowedTypes entry: ${invalidType}`);
    }
  }
}

export function assertResolvedConfig(config: ResolvedGitHubIssuesConfig): void {
  if (!isNonEmptyString(config.github.baseUrl)) {
    throw new Error("Resolved GitHub config must include github.baseUrl");
  }

  if (!isNonEmptyString(config.github.apiVersion)) {
    throw new Error("Resolved GitHub config must include github.apiVersion");
  }

  if (!isNonEmptyString(config.github.repo.owner) || !isNonEmptyString(config.github.repo.name)) {
    throw new Error("Resolved GitHub config must include github.repo.owner and github.repo.name");
  }

  if (!isNonEmptyString(config.github.auth.tokenEnvVar)) {
    throw new Error("Resolved GitHub config must include github.auth.tokenEnvVar");
  }

  if (!isNonEmptyString(config.github.auth.token)) {
    throw new Error(`Missing GitHub token in environment variable ${config.github.auth.tokenEnvVar}`);
  }

  if (!config.workflow.allowedTypes.includes(config.workflow.defaultType)) {
    throw new Error("Resolved workflow.defaultType must be included in workflow.allowedTypes");
  }

  if (!isNonEmptyString(config.workflow.typeFieldLabel)) {
    throw new Error("Resolved workflow.typeFieldLabel must be a non-empty string");
  }
}

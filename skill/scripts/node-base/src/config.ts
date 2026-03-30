import fs from "node:fs";
import path from "node:path";
import { findProjectRoot, getProjectEnvPrefixes, readRepoEnvFiles } from "./env";
import { assertResolvedConfig, assertValidConfigFile } from "./validate";
import type { GitHubIssuesConfigFile, ResolvedGitHubIssuesConfig, WorkflowType, WorkflowTypeName } from "./types";

export const GITHUB_ISSUES_CONFIG_PATH = path.resolve(__dirname, "../github-issues.config.json");

function readConfigFile(configPath: string): GitHubIssuesConfigFile {
  if (!fs.existsSync(configPath)) {
    throw new Error(`GitHub issues config file not found: ${configPath}`);
  }

  const raw = fs.readFileSync(configPath, "utf8");
  return JSON.parse(raw) as GitHubIssuesConfigFile;
}

function asWorkflowTypes(values: WorkflowTypeName[] | undefined, fallback: readonly WorkflowTypeName[]): WorkflowTypeName[] {
  return values && values.length > 0 ? [...values] : [...fallback];
}

function getEnvValue(sources: ReadonlyArray<Record<string, string | undefined>>, keys: readonly string[]): string | undefined {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }
  }

  return undefined;
}

function getPrefixedKeys(prefixes: readonly string[], suffix: string): string[] {
  return prefixes.map((prefix) => `${prefix}_${suffix}`);
}

export const defaultAllowedWorkflowTypes: readonly WorkflowTypeName[] = ["bug", "fix", "test", "review", "done"] as const;

export function loadGitHubIssuesConfig(configPath = GITHUB_ISSUES_CONFIG_PATH): ResolvedGitHubIssuesConfig {
  const configFile = readConfigFile(configPath);
  assertValidConfigFile(configFile);

  const skillRoot = path.dirname(configPath);
  const projectRoot = findProjectRoot(skillRoot);
  const projectPrefixes = getProjectEnvPrefixes(projectRoot);
  const skillEnv = readRepoEnvFiles(skillRoot);
  const projectEnv = projectRoot === skillRoot ? skillEnv : readRepoEnvFiles(projectRoot);
  const envSources: ReadonlyArray<Record<string, string | undefined>> = [process.env, projectEnv, skillEnv];

  const configuredTokenEnvVar = getEnvValue(envSources, ["GITHUB_TOKEN_ENV_VAR"]) ?? configFile.github.auth?.tokenEnvVar ?? "GITHUB_TOKEN";
  const allowedTypes = asWorkflowTypes(configFile.workflow?.allowedTypes, defaultAllowedWorkflowTypes);
  const defaultType = (configFile.workflow?.defaultType ?? "bug") as WorkflowType;

  const resolved: ResolvedGitHubIssuesConfig = {
    version: configFile.version,
    github: {
      baseUrl: getEnvValue(envSources, [...getPrefixedKeys(projectPrefixes, "GITHUB_API_BASE_URL"), "GITHUB_API_BASE_URL"]) ?? configFile.github.baseUrl ?? "https://api.github.com",
      apiVersion: getEnvValue(envSources, [...getPrefixedKeys(projectPrefixes, "GITHUB_API_VERSION"), "GITHUB_API_VERSION"]) ?? configFile.github.apiVersion ?? "2022-11-28",
      repo: {
        owner: getEnvValue(envSources, [...getPrefixedKeys(projectPrefixes, "GITHUB_REPO_OWNER"), "GITHUB_REPO_OWNER"]) ?? configFile.github.repo?.owner ?? "",
        name: getEnvValue(envSources, [...getPrefixedKeys(projectPrefixes, "GITHUB_REPO_NAME"), "GITHUB_REPO_NAME"]) ?? configFile.github.repo?.name ?? "",
      },
      auth: {
        tokenEnvVar: configuredTokenEnvVar,
        token: getEnvValue(envSources, [...getPrefixedKeys(projectPrefixes, "GITHUB_TOKEN"), configuredTokenEnvVar, "GITHUB_TOKEN"]) ?? "",
      },
    },
    workflow: {
      defaultType,
      allowedTypes,
      typeFieldLabel: configFile.workflow?.typeFieldLabel ?? "Current type",
    },
  };

  assertResolvedConfig(resolved);
  return resolved;
}

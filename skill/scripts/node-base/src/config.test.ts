import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadGitHubIssuesConfig } from "./config";
import { getProjectEnvPrefixes, toEnvVarPrefix } from "./env";

const createdDirs: string[] = [];
const managedEnvKeys = [
  "GITHUB_TOKEN",
  "GITHUB_REPO_OWNER",
  "GITHUB_REPO_NAME",
  "GITHUB_API_BASE_URL",
  "GITHUB_API_VERSION",
  "GITHUB_TOKEN_ENV_VAR",
  "GITHUB_ISSUE_WORKFLOW_GITHUB_TOKEN",
  "GITHUB_ISSUE_WORKFLOW_GITHUB_REPO_OWNER",
  "GITHUB_ISSUE_WORKFLOW_GITHUB_REPO_NAME",
  "GITHUB_ISSUE_WORKFLOW_GITHUB_API_BASE_URL",
  "GITHUB_ISSUE_WORKFLOW_GITHUB_API_VERSION",
] as const;

function createTempRepo(): string {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "github-issues-config-"));
  createdDirs.push(repoRoot);
  return repoRoot;
}

function writeConfig(configPath: string) {
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      version: 1,
      github: {
        repo: { owner: "halo-dev", name: "theme-vite-shoka" },
        auth: { tokenEnvVar: "GITHUB_TOKEN" },
      },
      workflow: {
        defaultType: "bug",
        allowedTypes: ["bug", "fix", "test", "review", "done"],
        typeFieldLabel: "Current type",
      },
    })
  );
}

function writeEnvFile(directoryPath: string, values: Record<string, string>) {
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  fs.writeFileSync(path.join(directoryPath, ".env"), `${lines.join("\n")}\n`);
}

afterEach(() => {
  for (const key of managedEnvKeys) {
    delete process.env[key];
  }

  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("loadGitHubIssuesConfig", () => {
  it("loads config file and token from env", () => {
    const repoRoot = createTempRepo();
    const configPath = path.join(repoRoot, "github-issues.config.json");
    writeConfig(configPath);
    process.env.GITHUB_TOKEN = "token-from-env";

    const config = loadGitHubIssuesConfig(configPath);

    expect(config.github.auth.token).toBe("token-from-env");
    expect(config.github.repo.owner).toBe("halo-dev");
  });

  it("allows process env to override repo owner and repo name", () => {
    const repoRoot = createTempRepo();
    const configPath = path.join(repoRoot, "github-issues.config.json");
    writeConfig(configPath);
    process.env.GITHUB_TOKEN = "token-from-env";
    process.env.GITHUB_REPO_OWNER = "custom-owner";
    process.env.GITHUB_REPO_NAME = "custom-repo";

    const config = loadGitHubIssuesConfig(configPath);

    expect(config.github.repo.owner).toBe("custom-owner");
    expect(config.github.repo.name).toBe("custom-repo");
  });

  it("reads prefixed token from project root env", () => {
    const projectRoot = createTempRepo();
    fs.writeFileSync(path.join(projectRoot, "package.json"), JSON.stringify({ name: "github-issue-workflow" }));
    const configDir = path.join(projectRoot, "skill", "scripts", "node-base");
    fs.mkdirSync(configDir, { recursive: true });
    const configPath = path.join(configDir, "github-issues.config.json");
    writeConfig(configPath);
    writeEnvFile(projectRoot, {
      GITHUB_ISSUE_WORKFLOW_GITHUB_TOKEN: "root-prefixed-token",
    });

    const config = loadGitHubIssuesConfig(configPath);

    expect(config.github.auth.token).toBe("root-prefixed-token");
  });

  it("prefers project root prefixed token over skill-local generic token", () => {
    const projectRoot = createTempRepo();
    fs.writeFileSync(path.join(projectRoot, "package.json"), JSON.stringify({ name: "github-issue-workflow" }));
    const configDir = path.join(projectRoot, "skill", "scripts", "node-base");
    fs.mkdirSync(configDir, { recursive: true });
    const configPath = path.join(configDir, "github-issues.config.json");
    writeConfig(configPath);
    writeEnvFile(configDir, {
      GITHUB_TOKEN: "skill-local-token",
    });
    writeEnvFile(projectRoot, {
      GITHUB_ISSUE_WORKFLOW_GITHUB_TOKEN: "root-prefixed-token",
    });

    const config = loadGitHubIssuesConfig(configPath);

    expect(config.github.auth.token).toBe("root-prefixed-token");
  });

  it("keeps process env as highest priority", () => {
    const projectRoot = createTempRepo();
    fs.writeFileSync(path.join(projectRoot, "package.json"), JSON.stringify({ name: "github-issue-workflow" }));
    const configDir = path.join(projectRoot, "skill", "scripts", "node-base");
    fs.mkdirSync(configDir, { recursive: true });
    const configPath = path.join(configDir, "github-issues.config.json");
    writeConfig(configPath);
    writeEnvFile(projectRoot, {
      GITHUB_ISSUE_WORKFLOW_GITHUB_TOKEN: "root-prefixed-token",
    });
    process.env.GITHUB_ISSUE_WORKFLOW_GITHUB_TOKEN = "process-token";

    const config = loadGitHubIssuesConfig(configPath);

    expect(config.github.auth.token).toBe("process-token");
  });

  it("supports prefixed repo owner and repo name", () => {
    const projectRoot = createTempRepo();
    fs.writeFileSync(path.join(projectRoot, "package.json"), JSON.stringify({ name: "github-issue-workflow" }));
    const configDir = path.join(projectRoot, "skill", "scripts", "node-base");
    fs.mkdirSync(configDir, { recursive: true });
    const configPath = path.join(configDir, "github-issues.config.json");
    writeConfig(configPath);
    writeEnvFile(projectRoot, {
      GITHUB_ISSUE_WORKFLOW_GITHUB_TOKEN: "root-prefixed-token",
      GITHUB_ISSUE_WORKFLOW_GITHUB_REPO_OWNER: "prefixed-owner",
      GITHUB_ISSUE_WORKFLOW_GITHUB_REPO_NAME: "prefixed-repo",
    });

    const config = loadGitHubIssuesConfig(configPath);

    expect(config.github.repo.owner).toBe("prefixed-owner");
    expect(config.github.repo.name).toBe("prefixed-repo");
  });

  it("falls back to the config directory when no project root marker exists", () => {
    const repoRoot = createTempRepo();
    const configPath = path.join(repoRoot, "github-issues.config.json");
    writeConfig(configPath);
    writeEnvFile(repoRoot, {
      GITHUB_TOKEN: "config-dir-token",
    });

    const config = loadGitHubIssuesConfig(configPath);

    expect(config.github.auth.token).toBe("config-dir-token");
  });

  it("prefers the outer project root when nested package.json files exist", () => {
    const projectRoot = path.join(createTempRepo(), "github-issue-workflow");
    fs.mkdirSync(projectRoot, { recursive: true });
    fs.writeFileSync(path.join(projectRoot, "package.json"), JSON.stringify({ name: "github-issue-workflow-skill" }));
    const configDir = path.join(projectRoot, "skill", "scripts", "node-base");
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, "package.json"), JSON.stringify({ type: "commonjs" }));
    const configPath = path.join(configDir, "github-issues.config.json");
    writeConfig(configPath);
    writeEnvFile(projectRoot, {
      GITHUB_ISSUE_WORKFLOW_GITHUB_TOKEN: "outer-root-token",
    });

    const config = loadGitHubIssuesConfig(configPath);

    expect(config.github.auth.token).toBe("outer-root-token");
  });

  it("normalizes project names into stable env var prefixes", () => {
    expect(toEnvVarPrefix("github-issue.workflow skill")).toBe("GITHUB_ISSUE_WORKFLOW_SKILL");
  });

  it("supports both directory-based and package-based project prefixes", () => {
    const projectRoot = path.join(createTempRepo(), "github-issue-workflow");
    fs.mkdirSync(projectRoot, { recursive: true });
    fs.writeFileSync(path.join(projectRoot, "package.json"), JSON.stringify({ name: "github-issue-workflow-skill" }));

    expect(getProjectEnvPrefixes(projectRoot)).toEqual([
      "GITHUB_ISSUE_WORKFLOW",
      "GITHUB_ISSUE_WORKFLOW_SKILL",
    ]);
  });

  it("treats built-in workflow types as the default set rather than the only allowed set", () => {
    const repoRoot = createTempRepo();
    const configPath = path.join(repoRoot, "github-issues.config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        version: 1,
        github: {
          repo: { owner: "halo-dev", name: "theme-vite-shoka" },
          auth: { tokenEnvVar: "GITHUB_TOKEN" },
        },
        workflow: {
          defaultType: "bug",
          allowedTypes: ["bug", "fix", "test", "review", "done", "wait"],
          typeFieldLabel: "Current type",
        },
      })
    );
    process.env.GITHUB_TOKEN = "token-from-env";

    const config = loadGitHubIssuesConfig(configPath);

    expect(config.workflow.defaultType).toBe("bug");
    expect(config.workflow.allowedTypes).toEqual(["bug", "fix", "test", "review", "done", "wait"]);
  });
});

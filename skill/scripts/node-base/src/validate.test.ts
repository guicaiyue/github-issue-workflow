import { describe, expect, it } from "vitest";
import { assertResolvedConfig, assertValidConfigFile } from "./validate";
import type { GitHubIssuesConfigFile, ResolvedGitHubIssuesConfig } from "./types";

function createConfigFile(): GitHubIssuesConfigFile {
  return {
    version: 1,
    github: {
      repo: {
        owner: "halo-dev",
        name: "theme-vite-shoka",
      },
      auth: {
        tokenEnvVar: "GITHUB_TOKEN",
      },
    },
    workflow: {
      defaultType: "bug",
      allowedTypes: ["bug", "fix", "test", "review", "done"],
      typeFieldLabel: "Current type",
    },
  };
}

function createResolvedConfig(): ResolvedGitHubIssuesConfig {
  return {
    version: 1,
    github: {
      baseUrl: "https://api.github.com",
      apiVersion: "2022-11-28",
      repo: {
        owner: "halo-dev",
        name: "theme-vite-shoka",
      },
      auth: {
        tokenEnvVar: "GITHUB_TOKEN",
        token: "token-value",
      },
    },
    workflow: {
      defaultType: "bug",
      allowedTypes: ["bug", "fix", "test", "review", "done"],
      typeFieldLabel: "Current type",
    },
  };
}

describe("validate config", () => {
  it("accepts a valid config file", () => {
    expect(() => assertValidConfigFile(createConfigFile())).not.toThrow();
  });

  it("rejects an empty repo owner", () => {
    const config = createConfigFile();
    config.github.repo!.owner = "";

    expect(() => assertValidConfigFile(config)).toThrow(/github.repo.owner/);
  });

  it("rejects missing resolved token", () => {
    const config = createResolvedConfig();
    config.github.auth.token = "";

    expect(() => assertResolvedConfig(config)).toThrow(/Missing GitHub token/);
  });
});

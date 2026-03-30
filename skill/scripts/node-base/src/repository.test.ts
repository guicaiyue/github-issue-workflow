import { describe, expect, it, vi } from "vitest";
import { GitHubIssuesRepository } from "./repository";
import type { GitHubIssue, GitHubRequestClient, ResolvedGitHubIssuesConfig } from "./types";

function createConfig(): ResolvedGitHubIssuesConfig {
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

function createIssue(number: number): GitHubIssue {
  return {
    id: number + 1000,
    number,
    title: `Issue ${number}`,
    body: "body",
    state: "open",
    html_url: `https://example.com/issues/${number}`,
  };
}

function createClient(): GitHubRequestClient {
  return {
    request: vi.fn(),
  };
}

describe("GitHubIssuesRepository", () => {
  it("builds listIssues query parameters", async () => {
    const client = createClient();
    vi.mocked(client.request).mockResolvedValue([]);
    const repository = new GitHubIssuesRepository({ config: createConfig(), client });

    await repository.listIssues({ state: "open", perPage: 10, page: 2 });

    expect(client.request).toHaveBeenCalledWith(
      "/repos/halo-dev/theme-vite-shoka/issues?state=open&per_page=10&page=2"
    );
  });

  it("posts comments with the expected payload", async () => {
    const client = createClient();
    vi.mocked(client.request).mockResolvedValue({ id: 1 });
    const repository = new GitHubIssuesRepository({ config: createConfig(), client });

    await repository.addComment(42, "Current type: bug");

    expect(client.request).toHaveBeenCalledWith("/repos/halo-dev/theme-vite-shoka/issues/42/comments", {
      method: "POST",
      body: { body: "Current type: bug" },
    });
  });

  it("uses child issue id when adding a sub-issue", async () => {
    const client = createClient();
    vi.mocked(client.request)
      .mockResolvedValueOnce(createIssue(7))
      .mockResolvedValueOnce(undefined);
    const repository = new GitHubIssuesRepository({ config: createConfig(), client });

    await repository.addSubIssue(5, 7, { replaceParent: true });

    expect(client.request).toHaveBeenNthCalledWith(1, "/repos/halo-dev/theme-vite-shoka/issues/7");
    expect(client.request).toHaveBeenNthCalledWith(2, "/repos/halo-dev/theme-vite-shoka/issues/5/sub_issues", {
      method: "POST",
      body: {
        sub_issue_id: 1007,
        replace_parent: true,
      },
    });
  });

  it("uses child issue id when removing a sub-issue", async () => {
    const client = createClient();
    vi.mocked(client.request)
      .mockResolvedValueOnce(createIssue(7))
      .mockResolvedValueOnce(undefined);
    const repository = new GitHubIssuesRepository({ config: createConfig(), client });

    await repository.removeSubIssue(5, 7);

    expect(client.request).toHaveBeenNthCalledWith(2, "/repos/halo-dev/theme-vite-shoka/issues/5/sub_issue", {
      method: "DELETE",
      body: { sub_issue_id: 1007 },
    });
  });

  it("patches close and reopen through updateIssue", async () => {
    const client = createClient();
    vi.mocked(client.request).mockResolvedValue(createIssue(9));
    const repository = new GitHubIssuesRepository({ config: createConfig(), client });

    await repository.closeIssue(9);
    await repository.reopenIssue(9);

    expect(client.request).toHaveBeenNthCalledWith(1, "/repos/halo-dev/theme-vite-shoka/issues/9", {
      method: "PATCH",
      body: { state: "closed" },
    });
    expect(client.request).toHaveBeenNthCalledWith(2, "/repos/halo-dev/theme-vite-shoka/issues/9", {
      method: "PATCH",
      body: { state: "open" },
    });
  });
});

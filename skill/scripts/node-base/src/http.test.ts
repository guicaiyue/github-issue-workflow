import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubHttpClient } from "./http";
import type { ResolvedGitHubIssuesConfig } from "./types";

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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GitHubHttpClient", () => {
  it("sends GitHub headers and parses json", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new GitHubHttpClient(createConfig());
    const result = await client.request<{ ok: boolean }>("/repos/halo-dev/theme-vite-shoka/issues");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/repos/halo-dev/theme-vite-shoka/issues", "https://api.github.com/"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Accept: "application/vnd.github+json",
          Authorization: "Bearer token-value",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        }),
      })
    );
  });

  it("serializes request bodies", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 1 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new GitHubHttpClient(createConfig());
    await client.request("/repos/halo-dev/theme-vite-shoka/issues", {
      method: "POST",
      body: { title: "new issue" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "new issue" }),
      })
    );
  });

  it("returns undefined for 204 responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      })
    );

    const client = new GitHubHttpClient(createConfig());
    await expect(client.request<void>("/repos/halo-dev/theme-vite-shoka/issues/1/sub_issue", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("surfaces response text on non-ok responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => "validation failed",
      })
    );

    const client = new GitHubHttpClient(createConfig());
    await expect(client.request("/repos/halo-dev/theme-vite-shoka/issues")).rejects.toThrow(
      "GitHub API request failed with 422: validation failed"
    );
  });
});

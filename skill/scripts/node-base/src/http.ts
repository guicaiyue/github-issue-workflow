import { loadGitHubIssuesConfig } from "./config";
import type { GitHubRequestClient, GitHubRequestInit, ResolvedGitHubIssuesConfig } from "./types";

export { type GitHubRequestInit } from "./types";

export class GitHubHttpClient implements GitHubRequestClient {
  constructor(private readonly config: ResolvedGitHubIssuesConfig = loadGitHubIssuesConfig()) {}

  async request<T>(pathname: string, init: GitHubRequestInit = {}): Promise<T> {
    const url = new URL(pathname, `${this.config.github.baseUrl}/`);
    const response = await fetch(url, {
      method: init.method ?? "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.config.github.auth.token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": this.config.github.apiVersion,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitHub API request failed with ${response.status}: ${text}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}

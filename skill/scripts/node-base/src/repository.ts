import { loadGitHubIssuesConfig } from "./config";
import { GitHubHttpClient } from "./http";
import type {
  AddSubIssueOptions,
  CreateIssueInput,
  GitHubIssue,
  GitHubIssueComment,
  GitHubRequestClient,
  IssueListFilters,
  IssuesRepositoryLike,
  ReprioritizeSubIssueInput,
  ResolvedGitHubIssuesConfig,
  UpdateIssueInput,
} from "./types";

function buildIssueBasePath(owner: string, repo: string): string {
  return `/repos/${owner}/${repo}/issues`;
}

export interface GitHubIssuesRepositoryOptions {
  config?: ResolvedGitHubIssuesConfig;
  client?: GitHubRequestClient;
}

export class GitHubIssuesRepository implements IssuesRepositoryLike {
  private readonly config: ResolvedGitHubIssuesConfig;
  private readonly client: GitHubRequestClient;
  private readonly basePath: string;

  constructor(options: GitHubIssuesRepositoryOptions = {}) {
    this.config = options.config ?? loadGitHubIssuesConfig();
    this.client = options.client ?? new GitHubHttpClient(this.config);
    this.basePath = buildIssueBasePath(this.config.github.repo.owner, this.config.github.repo.name);
  }

  async getIssue(issueNumber: number): Promise<GitHubIssue> {
    return this.client.request<GitHubIssue>(`${this.basePath}/${issueNumber}`);
  }

  async listIssues(filters: IssueListFilters = {}): Promise<GitHubIssue[]> {
    const search = new URLSearchParams();
    if (filters.state) {
      search.set("state", filters.state);
    }
    if (filters.perPage) {
      search.set("per_page", String(filters.perPage));
    }
    if (filters.page) {
      search.set("page", String(filters.page));
    }

    const query = search.toString();
    return this.client.request<GitHubIssue[]>(query ? `${this.basePath}?${query}` : this.basePath);
  }

  async createIssue(input: CreateIssueInput): Promise<GitHubIssue> {
    return this.client.request<GitHubIssue>(this.basePath, {
      method: "POST",
      body: input,
    });
  }

  async updateIssue(issueNumber: number, patch: UpdateIssueInput): Promise<GitHubIssue> {
    return this.client.request<GitHubIssue>(`${this.basePath}/${issueNumber}`, {
      method: "PATCH",
      body: patch,
    });
  }

  async closeIssue(issueNumber: number): Promise<GitHubIssue> {
    return this.updateIssue(issueNumber, { state: "closed" });
  }

  async reopenIssue(issueNumber: number): Promise<GitHubIssue> {
    return this.updateIssue(issueNumber, { state: "open" });
  }

  async listComments(issueNumber: number): Promise<GitHubIssueComment[]> {
    return this.client.request<GitHubIssueComment[]>(`${this.basePath}/${issueNumber}/comments`);
  }

  async addComment(issueNumber: number, body: string): Promise<GitHubIssueComment> {
    return this.client.request<GitHubIssueComment>(`${this.basePath}/${issueNumber}/comments`, {
      method: "POST",
      body: { body },
    });
  }

  async listSubIssues(issueNumber: number): Promise<GitHubIssue[]> {
    return this.client.request<GitHubIssue[]>(`${this.basePath}/${issueNumber}/sub_issues`);
  }

  async getParentIssue(issueNumber: number): Promise<GitHubIssue> {
    return this.client.request<GitHubIssue>(`${this.basePath}/${issueNumber}/parent`);
  }

  async addSubIssue(parentIssueNumber: number, childIssueNumber: number, options: AddSubIssueOptions = {}): Promise<void> {
    const child = await this.getIssue(childIssueNumber);
    await this.client.request<void>(`${this.basePath}/${parentIssueNumber}/sub_issues`, {
      method: "POST",
      body: {
        sub_issue_id: child.id,
        replace_parent: options.replaceParent,
      },
    });
  }

  async removeSubIssue(parentIssueNumber: number, childIssueNumber: number): Promise<void> {
    const child = await this.getIssue(childIssueNumber);
    await this.client.request<void>(`${this.basePath}/${parentIssueNumber}/sub_issue`, {
      method: "DELETE",
      body: {
        sub_issue_id: child.id,
      },
    });
  }

  async reprioritizeSubIssue(parentIssueNumber: number, input: ReprioritizeSubIssueInput): Promise<void> {
    await this.client.request<void>(`${this.basePath}/${parentIssueNumber}/sub_issues/priority`, {
      method: "PATCH",
      body: {
        sub_issue_id: input.subIssueId,
        after_id: input.afterId,
      },
    });
  }
}

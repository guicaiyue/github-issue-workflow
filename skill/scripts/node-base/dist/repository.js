"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubIssuesRepository = void 0;
const config_1 = require("./config");
const http_1 = require("./http");
function buildIssueBasePath(owner, repo) {
    return `/repos/${owner}/${repo}/issues`;
}
class GitHubIssuesRepository {
    config;
    client;
    basePath;
    constructor(options = {}) {
        this.config = options.config ?? (0, config_1.loadGitHubIssuesConfig)();
        this.client = options.client ?? new http_1.GitHubHttpClient(this.config);
        this.basePath = buildIssueBasePath(this.config.github.repo.owner, this.config.github.repo.name);
    }
    async getIssue(issueNumber) {
        return this.client.request(`${this.basePath}/${issueNumber}`);
    }
    async listIssues(filters = {}) {
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
        return this.client.request(query ? `${this.basePath}?${query}` : this.basePath);
    }
    async createIssue(input) {
        return this.client.request(this.basePath, {
            method: "POST",
            body: input,
        });
    }
    async updateIssue(issueNumber, patch) {
        return this.client.request(`${this.basePath}/${issueNumber}`, {
            method: "PATCH",
            body: patch,
        });
    }
    async closeIssue(issueNumber) {
        return this.updateIssue(issueNumber, { state: "closed" });
    }
    async reopenIssue(issueNumber) {
        return this.updateIssue(issueNumber, { state: "open" });
    }
    async listComments(issueNumber) {
        return this.client.request(`${this.basePath}/${issueNumber}/comments`);
    }
    async addComment(issueNumber, body) {
        return this.client.request(`${this.basePath}/${issueNumber}/comments`, {
            method: "POST",
            body: { body },
        });
    }
    async listSubIssues(issueNumber) {
        return this.client.request(`${this.basePath}/${issueNumber}/sub_issues`);
    }
    async getParentIssue(issueNumber) {
        return this.client.request(`${this.basePath}/${issueNumber}/parent`);
    }
    async addSubIssue(parentIssueNumber, childIssueNumber, options = {}) {
        const child = await this.getIssue(childIssueNumber);
        await this.client.request(`${this.basePath}/${parentIssueNumber}/sub_issues`, {
            method: "POST",
            body: {
                sub_issue_id: child.id,
                replace_parent: options.replaceParent,
            },
        });
    }
    async removeSubIssue(parentIssueNumber, childIssueNumber) {
        const child = await this.getIssue(childIssueNumber);
        await this.client.request(`${this.basePath}/${parentIssueNumber}/sub_issue`, {
            method: "DELETE",
            body: {
                sub_issue_id: child.id,
            },
        });
    }
    async reprioritizeSubIssue(parentIssueNumber, input) {
        await this.client.request(`${this.basePath}/${parentIssueNumber}/sub_issues/priority`, {
            method: "PATCH",
            body: {
                sub_issue_id: input.subIssueId,
                after_id: input.afterId,
            },
        });
    }
}
exports.GitHubIssuesRepository = GitHubIssuesRepository;

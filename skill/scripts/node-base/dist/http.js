"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubHttpClient = void 0;
const config_1 = require("./config");
class GitHubHttpClient {
    config;
    constructor(config = (0, config_1.loadGitHubIssuesConfig)()) {
        this.config = config;
    }
    async request(pathname, init = {}) {
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
            return undefined;
        }
        return (await response.json());
    }
}
exports.GitHubHttpClient = GitHubHttpClient;

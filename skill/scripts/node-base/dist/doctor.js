"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const repository_1 = require("./repository");
async function main() {
    const config = (0, config_1.loadGitHubIssuesConfig)();
    const repository = new repository_1.GitHubIssuesRepository();
    const issues = await repository.listIssues({ state: "open", perPage: 1 });
    console.log(JSON.stringify({
        ok: true,
        repo: `${config.github.repo.owner}/${config.github.repo.name}`,
        tokenEnvVar: config.github.auth.tokenEnvVar,
        sampleIssueCount: issues.length,
    }, null, 2));
}
main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
});

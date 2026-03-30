"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const vitest_1 = require("vitest");
const config_1 = require("./config");
const env_1 = require("./env");
const createdDirs = [];
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
];
function createTempRepo() {
    const repoRoot = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), "github-issues-config-"));
    createdDirs.push(repoRoot);
    return repoRoot;
}
function writeConfig(configPath) {
    node_fs_1.default.writeFileSync(configPath, JSON.stringify({
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
    }));
}
function writeEnvFile(directoryPath, values) {
    const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
    node_fs_1.default.writeFileSync(node_path_1.default.join(directoryPath, ".env"), `${lines.join("\n")}\n`);
}
(0, vitest_1.afterEach)(() => {
    for (const key of managedEnvKeys) {
        delete process.env[key];
    }
    while (createdDirs.length > 0) {
        const dir = createdDirs.pop();
        if (dir) {
            node_fs_1.default.rmSync(dir, { recursive: true, force: true });
        }
    }
});
(0, vitest_1.describe)("loadGitHubIssuesConfig", () => {
    (0, vitest_1.it)("loads config file and token from env", () => {
        const repoRoot = createTempRepo();
        const configPath = node_path_1.default.join(repoRoot, "github-issues.config.json");
        writeConfig(configPath);
        process.env.GITHUB_TOKEN = "token-from-env";
        const config = (0, config_1.loadGitHubIssuesConfig)(configPath);
        (0, vitest_1.expect)(config.github.auth.token).toBe("token-from-env");
        (0, vitest_1.expect)(config.github.repo.owner).toBe("halo-dev");
    });
    (0, vitest_1.it)("allows process env to override repo owner and repo name", () => {
        const repoRoot = createTempRepo();
        const configPath = node_path_1.default.join(repoRoot, "github-issues.config.json");
        writeConfig(configPath);
        process.env.GITHUB_TOKEN = "token-from-env";
        process.env.GITHUB_REPO_OWNER = "custom-owner";
        process.env.GITHUB_REPO_NAME = "custom-repo";
        const config = (0, config_1.loadGitHubIssuesConfig)(configPath);
        (0, vitest_1.expect)(config.github.repo.owner).toBe("custom-owner");
        (0, vitest_1.expect)(config.github.repo.name).toBe("custom-repo");
    });
    (0, vitest_1.it)("reads prefixed token from project root env", () => {
        const projectRoot = createTempRepo();
        node_fs_1.default.writeFileSync(node_path_1.default.join(projectRoot, "package.json"), JSON.stringify({ name: "github-issue-workflow" }));
        const configDir = node_path_1.default.join(projectRoot, "skill", "scripts", "node-base");
        node_fs_1.default.mkdirSync(configDir, { recursive: true });
        const configPath = node_path_1.default.join(configDir, "github-issues.config.json");
        writeConfig(configPath);
        writeEnvFile(projectRoot, {
            GITHUB_ISSUE_WORKFLOW_GITHUB_TOKEN: "root-prefixed-token",
        });
        const config = (0, config_1.loadGitHubIssuesConfig)(configPath);
        (0, vitest_1.expect)(config.github.auth.token).toBe("root-prefixed-token");
    });
    (0, vitest_1.it)("prefers project root prefixed token over skill-local generic token", () => {
        const projectRoot = createTempRepo();
        node_fs_1.default.writeFileSync(node_path_1.default.join(projectRoot, "package.json"), JSON.stringify({ name: "github-issue-workflow" }));
        const configDir = node_path_1.default.join(projectRoot, "skill", "scripts", "node-base");
        node_fs_1.default.mkdirSync(configDir, { recursive: true });
        const configPath = node_path_1.default.join(configDir, "github-issues.config.json");
        writeConfig(configPath);
        writeEnvFile(configDir, {
            GITHUB_TOKEN: "skill-local-token",
        });
        writeEnvFile(projectRoot, {
            GITHUB_ISSUE_WORKFLOW_GITHUB_TOKEN: "root-prefixed-token",
        });
        const config = (0, config_1.loadGitHubIssuesConfig)(configPath);
        (0, vitest_1.expect)(config.github.auth.token).toBe("root-prefixed-token");
    });
    (0, vitest_1.it)("keeps process env as highest priority", () => {
        const projectRoot = createTempRepo();
        node_fs_1.default.writeFileSync(node_path_1.default.join(projectRoot, "package.json"), JSON.stringify({ name: "github-issue-workflow" }));
        const configDir = node_path_1.default.join(projectRoot, "skill", "scripts", "node-base");
        node_fs_1.default.mkdirSync(configDir, { recursive: true });
        const configPath = node_path_1.default.join(configDir, "github-issues.config.json");
        writeConfig(configPath);
        writeEnvFile(projectRoot, {
            GITHUB_ISSUE_WORKFLOW_GITHUB_TOKEN: "root-prefixed-token",
        });
        process.env.GITHUB_ISSUE_WORKFLOW_GITHUB_TOKEN = "process-token";
        const config = (0, config_1.loadGitHubIssuesConfig)(configPath);
        (0, vitest_1.expect)(config.github.auth.token).toBe("process-token");
    });
    (0, vitest_1.it)("supports prefixed repo owner and repo name", () => {
        const projectRoot = createTempRepo();
        node_fs_1.default.writeFileSync(node_path_1.default.join(projectRoot, "package.json"), JSON.stringify({ name: "github-issue-workflow" }));
        const configDir = node_path_1.default.join(projectRoot, "skill", "scripts", "node-base");
        node_fs_1.default.mkdirSync(configDir, { recursive: true });
        const configPath = node_path_1.default.join(configDir, "github-issues.config.json");
        writeConfig(configPath);
        writeEnvFile(projectRoot, {
            GITHUB_ISSUE_WORKFLOW_GITHUB_TOKEN: "root-prefixed-token",
            GITHUB_ISSUE_WORKFLOW_GITHUB_REPO_OWNER: "prefixed-owner",
            GITHUB_ISSUE_WORKFLOW_GITHUB_REPO_NAME: "prefixed-repo",
        });
        const config = (0, config_1.loadGitHubIssuesConfig)(configPath);
        (0, vitest_1.expect)(config.github.repo.owner).toBe("prefixed-owner");
        (0, vitest_1.expect)(config.github.repo.name).toBe("prefixed-repo");
    });
    (0, vitest_1.it)("falls back to the config directory when no project root marker exists", () => {
        const repoRoot = createTempRepo();
        const configPath = node_path_1.default.join(repoRoot, "github-issues.config.json");
        writeConfig(configPath);
        writeEnvFile(repoRoot, {
            GITHUB_TOKEN: "config-dir-token",
        });
        const config = (0, config_1.loadGitHubIssuesConfig)(configPath);
        (0, vitest_1.expect)(config.github.auth.token).toBe("config-dir-token");
    });
    (0, vitest_1.it)("prefers the outer project root when nested package.json files exist", () => {
        const projectRoot = node_path_1.default.join(createTempRepo(), "github-issue-workflow");
        node_fs_1.default.mkdirSync(projectRoot, { recursive: true });
        node_fs_1.default.writeFileSync(node_path_1.default.join(projectRoot, "package.json"), JSON.stringify({ name: "github-issue-workflow-skill" }));
        const configDir = node_path_1.default.join(projectRoot, "skill", "scripts", "node-base");
        node_fs_1.default.mkdirSync(configDir, { recursive: true });
        node_fs_1.default.writeFileSync(node_path_1.default.join(configDir, "package.json"), JSON.stringify({ type: "commonjs" }));
        const configPath = node_path_1.default.join(configDir, "github-issues.config.json");
        writeConfig(configPath);
        writeEnvFile(projectRoot, {
            GITHUB_ISSUE_WORKFLOW_GITHUB_TOKEN: "outer-root-token",
        });
        const config = (0, config_1.loadGitHubIssuesConfig)(configPath);
        (0, vitest_1.expect)(config.github.auth.token).toBe("outer-root-token");
    });
    (0, vitest_1.it)("normalizes project names into stable env var prefixes", () => {
        (0, vitest_1.expect)((0, env_1.toEnvVarPrefix)("github-issue.workflow skill")).toBe("GITHUB_ISSUE_WORKFLOW_SKILL");
    });
    (0, vitest_1.it)("supports both directory-based and package-based project prefixes", () => {
        const projectRoot = node_path_1.default.join(createTempRepo(), "github-issue-workflow");
        node_fs_1.default.mkdirSync(projectRoot, { recursive: true });
        node_fs_1.default.writeFileSync(node_path_1.default.join(projectRoot, "package.json"), JSON.stringify({ name: "github-issue-workflow-skill" }));
        (0, vitest_1.expect)((0, env_1.getProjectEnvPrefixes)(projectRoot)).toEqual([
            "GITHUB_ISSUE_WORKFLOW",
            "GITHUB_ISSUE_WORKFLOW_SKILL",
        ]);
    });
    (0, vitest_1.it)("treats built-in workflow types as the default set rather than the only allowed set", () => {
        const repoRoot = createTempRepo();
        const configPath = node_path_1.default.join(repoRoot, "github-issues.config.json");
        node_fs_1.default.writeFileSync(configPath, JSON.stringify({
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
        }));
        process.env.GITHUB_TOKEN = "token-from-env";
        const config = (0, config_1.loadGitHubIssuesConfig)(configPath);
        (0, vitest_1.expect)(config.workflow.defaultType).toBe("bug");
        (0, vitest_1.expect)(config.workflow.allowedTypes).toEqual(["bug", "fix", "test", "review", "done", "wait"]);
    });
});

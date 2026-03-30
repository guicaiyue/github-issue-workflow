"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultAllowedWorkflowTypes = exports.GITHUB_ISSUES_CONFIG_PATH = void 0;
exports.loadGitHubIssuesConfig = loadGitHubIssuesConfig;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const env_1 = require("./env");
const validate_1 = require("./validate");
exports.GITHUB_ISSUES_CONFIG_PATH = node_path_1.default.resolve(__dirname, "../github-issues.config.json");
function readConfigFile(configPath) {
    if (!node_fs_1.default.existsSync(configPath)) {
        throw new Error(`GitHub issues config file not found: ${configPath}`);
    }
    const raw = node_fs_1.default.readFileSync(configPath, "utf8");
    return JSON.parse(raw);
}
function asWorkflowTypes(values, fallback) {
    return values && values.length > 0 ? [...values] : [...fallback];
}
function getEnvValue(sources, keys) {
    for (const source of sources) {
        for (const key of keys) {
            const value = source[key];
            if (typeof value === "string" && value.length > 0) {
                return value;
            }
        }
    }
    return undefined;
}
function getPrefixedKeys(prefixes, suffix) {
    return prefixes.map((prefix) => `${prefix}_${suffix}`);
}
exports.defaultAllowedWorkflowTypes = ["bug", "fix", "test", "review", "done"];
function loadGitHubIssuesConfig(configPath = exports.GITHUB_ISSUES_CONFIG_PATH) {
    const configFile = readConfigFile(configPath);
    (0, validate_1.assertValidConfigFile)(configFile);
    const skillRoot = node_path_1.default.dirname(configPath);
    const projectRoot = (0, env_1.findProjectRoot)(skillRoot);
    const projectPrefixes = (0, env_1.getProjectEnvPrefixes)(projectRoot);
    const skillEnv = (0, env_1.readRepoEnvFiles)(skillRoot);
    const projectEnv = projectRoot === skillRoot ? skillEnv : (0, env_1.readRepoEnvFiles)(projectRoot);
    const envSources = [process.env, projectEnv, skillEnv];
    const configuredTokenEnvVar = getEnvValue(envSources, ["GITHUB_TOKEN_ENV_VAR"]) ?? configFile.github.auth?.tokenEnvVar ?? "GITHUB_TOKEN";
    const allowedTypes = asWorkflowTypes(configFile.workflow?.allowedTypes, exports.defaultAllowedWorkflowTypes);
    const defaultType = (configFile.workflow?.defaultType ?? "bug");
    const resolved = {
        version: configFile.version,
        github: {
            baseUrl: getEnvValue(envSources, [...getPrefixedKeys(projectPrefixes, "GITHUB_API_BASE_URL"), "GITHUB_API_BASE_URL"]) ?? configFile.github.baseUrl ?? "https://api.github.com",
            apiVersion: getEnvValue(envSources, [...getPrefixedKeys(projectPrefixes, "GITHUB_API_VERSION"), "GITHUB_API_VERSION"]) ?? configFile.github.apiVersion ?? "2022-11-28",
            repo: {
                owner: getEnvValue(envSources, [...getPrefixedKeys(projectPrefixes, "GITHUB_REPO_OWNER"), "GITHUB_REPO_OWNER"]) ?? configFile.github.repo?.owner ?? "",
                name: getEnvValue(envSources, [...getPrefixedKeys(projectPrefixes, "GITHUB_REPO_NAME"), "GITHUB_REPO_NAME"]) ?? configFile.github.repo?.name ?? "",
            },
            auth: {
                tokenEnvVar: configuredTokenEnvVar,
                token: getEnvValue(envSources, [...getPrefixedKeys(projectPrefixes, "GITHUB_TOKEN"), configuredTokenEnvVar, "GITHUB_TOKEN"]) ?? "",
            },
        },
        workflow: {
            defaultType,
            allowedTypes,
            typeFieldLabel: configFile.workflow?.typeFieldLabel ?? "Current type",
        },
    };
    (0, validate_1.assertResolvedConfig)(resolved);
    return resolved;
}

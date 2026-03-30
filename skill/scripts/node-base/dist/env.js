"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readEnvFile = readEnvFile;
exports.readRepoEnvFiles = readRepoEnvFiles;
exports.findProjectRoot = findProjectRoot;
exports.getProjectName = getProjectName;
exports.getProjectEnvPrefixes = getProjectEnvPrefixes;
exports.toEnvVarPrefix = toEnvVarPrefix;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function parseEnvLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
        return null;
    }
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
        return null;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
    }
    return [key, value];
}
function hasProjectRootMarker(directoryPath) {
    return readPackageName(directoryPath) !== null || node_fs_1.default.existsSync(node_path_1.default.join(directoryPath, ".git"));
}
function readPackageName(directoryPath) {
    const packageJsonPath = node_path_1.default.join(directoryPath, "package.json");
    if (!node_fs_1.default.existsSync(packageJsonPath)) {
        return null;
    }
    try {
        const raw = node_fs_1.default.readFileSync(packageJsonPath, "utf8");
        const parsed = JSON.parse(raw);
        return typeof parsed.name === "string" && parsed.name.trim().length > 0 ? parsed.name.trim() : null;
    }
    catch {
        return null;
    }
}
function readEnvFile(filePath) {
    if (!node_fs_1.default.existsSync(filePath)) {
        return {};
    }
    const content = node_fs_1.default.readFileSync(filePath, "utf8");
    const result = {};
    for (const line of content.split(/\r?\n/)) {
        const parsed = parseEnvLine(line);
        if (!parsed) {
            continue;
        }
        const [key, value] = parsed;
        result[key] = value;
    }
    return result;
}
function readRepoEnvFiles(repoRoot) {
    const merged = {};
    for (const fileName of [".env", ".env.local"]) {
        Object.assign(merged, readEnvFile(node_path_1.default.join(repoRoot, fileName)));
    }
    return merged;
}
function findProjectRoot(startDirectory) {
    const initialDirectory = node_path_1.default.resolve(startDirectory);
    let currentDirectory = initialDirectory;
    let detectedRoot = null;
    while (true) {
        if (hasProjectRootMarker(currentDirectory)) {
            detectedRoot = currentDirectory;
        }
        const parentDirectory = node_path_1.default.dirname(currentDirectory);
        if (parentDirectory === currentDirectory) {
            return detectedRoot ?? initialDirectory;
        }
        currentDirectory = parentDirectory;
    }
}
function getProjectName(projectRoot) {
    return readPackageName(projectRoot) ?? node_path_1.default.basename(projectRoot);
}
function getProjectEnvPrefixes(projectRoot) {
    const prefixes = [toEnvVarPrefix(node_path_1.default.basename(projectRoot)), toEnvVarPrefix(getProjectName(projectRoot))].filter((value) => value.length > 0);
    return [...new Set(prefixes)];
}
function toEnvVarPrefix(value) {
    return value
        .trim()
        .replace(/[^A-Za-z0-9]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toUpperCase();
}

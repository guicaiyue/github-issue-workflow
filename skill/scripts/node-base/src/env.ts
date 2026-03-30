import fs from "node:fs";
import path from "node:path";

function parseEnvLine(line: string): [string, string] | null {
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

function hasProjectRootMarker(directoryPath: string): boolean {
  return readPackageName(directoryPath) !== null || fs.existsSync(path.join(directoryPath, ".git"));
}

function readPackageName(directoryPath: string): string | null {
  const packageJsonPath = path.join(directoryPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw) as { name?: unknown };
    return typeof parsed.name === "string" && parsed.name.trim().length > 0 ? parsed.name.trim() : null;
  } catch {
    return null;
  }
}

export function readEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const result: Record<string, string> = {};

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

export function readRepoEnvFiles(repoRoot: string): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const fileName of [".env", ".env.local"]) {
    Object.assign(merged, readEnvFile(path.join(repoRoot, fileName)));
  }

  return merged;
}

export function findProjectRoot(startDirectory: string): string {
  const initialDirectory = path.resolve(startDirectory);
  let currentDirectory = initialDirectory;
  let detectedRoot: string | null = null;

  while (true) {
    if (hasProjectRootMarker(currentDirectory)) {
      detectedRoot = currentDirectory;
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      return detectedRoot ?? initialDirectory;
    }

    currentDirectory = parentDirectory;
  }
}

export function getProjectName(projectRoot: string): string {
  return readPackageName(projectRoot) ?? path.basename(projectRoot);
}

export function getProjectEnvPrefixes(projectRoot: string): string[] {
  const prefixes = [toEnvVarPrefix(path.basename(projectRoot)), toEnvVarPrefix(getProjectName(projectRoot))].filter((value) => value.length > 0);
  return [...new Set(prefixes)];
}

export function toEnvVarPrefix(value: string): string {
  return value
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

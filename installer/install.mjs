#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const packageRoot = path.resolve(import.meta.dirname, "..");
const skillSourceDir = path.join(packageRoot, "skill");
const targetDir = path.join(os.homedir(), ".claude", "skills", "github-issue-workflow");

if (!fs.existsSync(skillSourceDir)) {
  console.error(`Skill source directory not found: ${skillSourceDir}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(targetDir), { recursive: true });
fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });

for (const entry of fs.readdirSync(skillSourceDir)) {
  fs.cpSync(path.join(skillSourceDir, entry), path.join(targetDir, entry), {
    recursive: true,
    force: true,
  });
}

console.log(`Installed github-issue-workflow to ${targetDir}`);

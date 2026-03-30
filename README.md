# github-issue-workflow-skill

通过 npm 安装 `github-issue-workflow` Claude Code skill。

## 安装

直接运行：

```bash
npx github-issue-workflow-skill
```

或全局安装后运行：

```bash
npm install -g github-issue-workflow-skill
github-issue-workflow-skill
```

安装器会把 `skill/` 下的内容复制到：

```text
~/.claude/skills/github-issue-workflow/
```

安装完成后，该目录下会直接包含：

- `SKILL.md`
- `examples.md`
- `types/`
- `templates/`
- `scripts/`
- `CLAUDE.md`

## 本地开发

从仓库根目录运行：

```bash
pnpm exec tsc -p skill/scripts/node-base/tsconfig.json
pnpm exec vitest run --config skill/scripts/node-base/vitest.config.ts
node skill/scripts/node-base/doctor.mjs
node skill/scripts/node-base/cli.mjs issues list --stage bug
```

## 环境变量

`node-base` 会按这个顺序解析配置：

1. `skill/scripts/node-base/.env` / `.env.local`
2. 仓库根目录 `.env` / `.env.local`
3. `process.env`

支持按项目名自动生成前缀环境变量。以当前仓库为例，可在根目录 `.env` 中写：

```bash
GITHUB_ISSUE_WORKFLOW_GITHUB_TOKEN=your_token
GITHUB_ISSUE_WORKFLOW_GITHUB_REPO_OWNER=your_owner
GITHUB_ISSUE_WORKFLOW_GITHUB_REPO_NAME=your_repo
```

如果同时存在通用 key 和带项目前缀的 key，则优先使用带项目前缀的 key。`process.env` 仍然拥有最高优先级。

## 发布

打包前会自动编译 node-base：

```bash
npm pack
npm publish --access public
```

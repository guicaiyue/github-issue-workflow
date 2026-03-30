# github-issue-workflow-skill

一个通过 npm 安装的 Claude Code skill。安装后会把仓库中的 `skill/` 内容复制到 `~/.claude/skills/github-issue-workflow/`，用于在 GitHub Issues 上运行分阶段、多 agent 的问题跟进与协作工作流。

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

安装器入口在 `installer/install.mjs:1`，会覆盖目标目录中的旧版本。

## 安装后目录

安装完成后，`~/.claude/skills/github-issue-workflow/` 下会包含：

- `SKILL.md`
- `types/`
- `templates/`
- `scripts/`
- `CLAUDE.md`

## 这个 skill 做什么

该 skill 让 GitHub Issue 成为协作控制面，而不只是缺陷记录工具。

核心特性：

- 以阶段为核心管理 issue 流转，而不是固定死流水线
- 当前内建阶段：`bug`、`fix`、`test`、`review`、`done`
- 支持扩展阶段；仓库内已提供 `wait` 作为扩展示例
- 通过结构化 issue comments 持久化当前阶段
- 提供 Node 实现的 CLI 和 service facade，便于读取队列、加载上下文、发布阶段报告

技能主说明见 `skill/SKILL.md:1`。

## 本地开发

从仓库根目录运行：

```bash
npm run build
npm run test
npm run doctor
```

也可以直接运行底层命令：

```bash
pnpm exec tsc -p skill/scripts/node-base/tsconfig.json
pnpm exec vitest run --config skill/scripts/node-base/vitest.config.ts
node skill/scripts/node-base/doctor.mjs
node skill/scripts/node-base/cli.mjs issues list --stage bug
```

## 环境变量

`node-base` 的配置读取顺序：

1. `skill/scripts/node-base/.env` / `.env.local`
2. 仓库根目录 `.env` / `.env.local`
3. `process.env`

支持按项目名自动生成前缀环境变量。当前项目可使用：

```bash
GITHUB_ISSUE_WORKFLOW_GITHUB_TOKEN=your_token
GITHUB_ISSUE_WORKFLOW_GITHUB_REPO_OWNER=your_owner
GITHUB_ISSUE_WORKFLOW_GITHUB_REPO_NAME=your_repo
```

如果同层同时存在通用 key 和带项目前缀的 key，则优先使用带项目前缀的 key；整体上 `process.env` 优先级最高。

## 发布

打包前会自动编译 `node-base`：

```bash
npm pack
npm publish --access public
```

## 仓库结构

- `installer/`：npm 安装入口
- `skill/`：真正安装到 Claude Code skills 目录的内容
- `skill/scripts/node-base/src/`：GitHub issue workflow 的主要实现
- `skill/types/<stage>/`：每个阶段的文档与输入输出模板

## 说明

这个仓库是 skill 的 npm 分发层，不是应用运行时仓库。实际影响 skill 行为的改动通常发生在 `skill/` 下。
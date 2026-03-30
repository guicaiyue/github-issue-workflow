# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository purpose

This repository is an npm-distributed Claude Code skill, not an application runtime. The npm package installs the contents of `skill/` into `~/.claude/skills/github-issue-workflow/`.

## Common commands

Run these from the repository root:

```bash
pnpm exec tsc -p skill/scripts/node-base/tsconfig.json
pnpm exec vitest run --config skill/scripts/node-base/vitest.config.ts
pnpm exec vitest --config skill/scripts/node-base/vitest.config.ts
pnpm exec vitest run --config skill/scripts/node-base/vitest.config.ts skill/scripts/node-base/src/workflow-service.test.ts
pnpm exec vitest run --config skill/scripts/node-base/vitest.config.ts -t "test name"
node skill/scripts/node-base/doctor.mjs
npm pack
npm publish --access public
```

Package scripts:

```bash
npm run build
npm run test
npm run doctor
```

Notes derived from the checked-in files:
- `skill/scripts/node-base/tsconfig.json` compiles `src/**/*` to `skill/scripts/node-base/dist/` using CommonJS.
- `skill/scripts/node-base/doctor.mjs` imports `./dist/doctor.js`, so the TypeScript build must run before `doctor`.
- `skill/scripts/node-base/vitest.config.ts` runs `src/**/*.test.ts` in a Node environment.
- `npm pack` triggers `prepack`, which runs `npm run build`.

## High-level architecture

### 1. Repository purpose and workflow model

This repository defines a stage-driven GitHub issue workflow for a single GitHub repository. Workflow state is stored in issue comments, and the latest explicit comment containing `Current type` is the only source of truth for the current stage. If no explicit stage comment exists yet, the workflow defaults to `bug`.

The system is stage-centered, not pipeline-centered. Do not hardcode `bug -> fix -> test -> review -> done` as the only path.

### 2. Two-layer repository: npm wrapper outside, skill payload inside

The repository root is the npm distribution layer:
- `package.json` defines the installable package and publish/build scripts.
- `installer/install.mjs` copies `skill/` into the user's Claude skills directory.
- `README.md` documents installation and local development.

The actual Claude skill lives under `skill/`. Anything that changes skill behavior should usually happen there, not in the root wrapper.

### 3. Stage documentation is split into per-stage folders

Each stage now lives under `skill/types/<stage>/` with three files:
- `stage.md` — stage purpose, completion rules, blocker handling, and GitHub helper expectations
- `in-template.md` — recommended structure for entering the stage
- `out-template.md` — recommended structure for the stage report, handoff, or closeout

Built-in stages are `bug`, `fix`, `test`, `review`, and `done`. `wait` is the checked-in example of an extension stage. If you add a new stage, create a new `skill/types/<stage>/` directory with all three files. The shared starter templates for this live in `skill/templates/`.

### 4. Keep three layers in sync when changing workflow semantics

Protocol changes usually require coordinated updates across:
- `skill/SKILL.md`
- `skill/types/<stage>/stage.md`, `in-template.md`, `out-template.md`
- `skill/scripts/node-base/src/workflow.ts`
- `skill/scripts/node-base/src/comment-templates.ts`
- `skill/scripts/node-base/src/stage-registry.ts`

If field names like `Current type`, `Final type`, or stage comment structure change, update both parsing and rendering code.

### 5. `node-base` is the implementation core

`skill/scripts/node-base/src/` is the main implementation layer. It implements the GitHub integration, stage parsing, workflow service facade, and role-oriented runners used by the skill.

Responsibilities are split as follows:
- `config.ts` loads repository config plus token environment settings
- `http.ts` is the GitHub REST client layer
- `repository.ts` provides issue/comment/sub-issue CRUD for one repository
- `workflow.ts` parses workflow comments and determines stage state
- `comment-templates.ts` renders the structured workflow comments
- `workflow-service.ts` is the main stage-aware facade
- `role-scenarios.ts` provides thin role-oriented wrappers around the workflow service
- `stage-registry.ts` defines built-in stage metadata and extension-stage doc paths
- `index.ts` is the public entrypoint

Prefer `IssueWorkflowService` and the exported workflow helpers over manually stitching together repository calls.

### 6. The service layer is the main entrypoint for stage-aware operations

The most important rule when changing workflow semantics is to keep the documentation layer and parser/renderer layer aligned. Changes to stage structure, stage fields, or comment schema usually span `skill/SKILL.md`, `skill/types/<stage>/...`, `skill/scripts/node-base/src/workflow.ts`, and `skill/scripts/node-base/src/comment-templates.ts`.


`skill/scripts/node-base/src/workflow-service.ts` is the main facade for consumers. Use it when the caller wants stage semantics rather than raw GitHub mechanics.

Important capabilities include:
- queue reads like `prepareFixStageQueuePayload(...)`
- context loaders like `prepareFixStageContext(...)`, `prepareTestStageContext(...)`, `prepareReviewStageContext(...)`
- role-facing payload builders like `prepareFixStagePayload(...)`, `prepareTestStagePayload(...)`, `prepareReviewStagePayload(...)`
- publishing helpers like `publishBugStageInput(...)`, `publishFixStageReport(...)`, `publishTestStageReport(...)`, `publishReviewStageReport(...)`, `publishDoneCloseout(...)`
- generic stage helpers like `publishStageComment(...)`, `getLatestStageComment(...)`, `getLatestFinalStageComment(...)`
- split support via `splitIssueIntoChildren(...)`

Fallback, more general reads still exist:
- `loadIssueWorkflowContext(issueNumber)`
- `loadQueueContext(filters?)`
- `loadIssuesByCurrentType(currentType)`
- `loadFixBatch(limit)`

### 7. Stage metadata now points to `stage.md`

`skill/scripts/node-base/src/stage-registry.ts` exposes a single `documentationPath` per stage, and that path now points to `skill/types/<stage>/stage.md` (via relative paths from `node-base`). If tests assert stage doc paths, they should match that model.

### 8. Installed skill layout vs repo layout

Inside the npm package repo, paths are prefixed with `skill/`.
After installation, the contents of `skill/` become the skill root in `~/.claude/skills/github-issue-workflow/`.

That means:
- repo path: `skill/scripts/node-base/src/workflow.ts`
- installed skill path: `scripts/node-base/src/workflow.ts`

Be explicit about which context you are referring to when updating docs or examples.

## Repository-specific conventions

- This skill is scoped to a single GitHub repository.
- Parent/child issues, blockers, related issues, and waiting states are collaboration mechanisms around a stage, not replacements for the stage model itself.
- `publishDoneCloseout(...)` both writes the final closeout comment and closes the GitHub issue, so terminal-stage changes should be evaluated with both effects in mind.
- The `templates/` directory is not an issue-form bundle anymore; it contains starter templates for defining new workflow stages under `skill/types/<stage>/`.

## Source-of-truth priority

When code, docs, and examples disagree, prefer:
1. `skill/scripts/node-base/src/`
2. `skill/SKILL.md`
3. `skill/types/<stage>/` and `skill/examples.md`
4. `foundation.md`

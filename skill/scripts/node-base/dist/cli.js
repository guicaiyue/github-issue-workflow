"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const workflow_service_1 = require("./workflow-service");
function usage() {
    return [
        "Usage:",
        "  node scripts/node-base/cli.mjs stages list",
        "  node scripts/node-base/cli.mjs issues list [--state open|closed|all] [--stage <type>]",
        "  node scripts/node-base/cli.mjs fix queue [--limit <n>]",
        "  node scripts/node-base/cli.mjs issue show <number>",
        "  node scripts/node-base/cli.mjs issue payload <number> --for fix|test|review|split",
    ].join("\n");
}
function fail(message) {
    throw new Error(`${message}\n\n${usage()}`);
}
function parseOption(args, name) {
    const index = args.indexOf(name);
    if (index === -1) {
        return null;
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
        fail(`Missing value for ${name}`);
    }
    return value;
}
function parseState(args) {
    const value = parseOption(args, "--state") ?? "open";
    if (value !== "open" && value !== "closed" && value !== "all") {
        fail(`Invalid --state value: ${value}`);
    }
    return value;
}
function parseLimit(args) {
    const value = parseOption(args, "--limit") ?? "5";
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        fail(`Invalid --limit value: ${value}`);
    }
    return parsed;
}
function parseIssueNumber(value) {
    if (!value) {
        fail("Missing issue number");
    }
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        fail(`Invalid issue number: ${value}`);
    }
    return parsed;
}
function parsePayloadTarget(args) {
    const value = parseOption(args, "--for");
    if (value !== "fix" && value !== "test" && value !== "review" && value !== "split") {
        fail(`Invalid --for value: ${value ?? ""}`);
    }
    return value;
}
function printJson(value) {
    console.log(JSON.stringify(value, null, 2));
}
async function run() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
        console.log(usage());
        return;
    }
    const service = new workflow_service_1.IssueWorkflowService();
    const [resource, action, ...rest] = args;
    if (resource === "stages" && action === "list") {
        printJson(service.getStageRegistry());
        return;
    }
    if (resource === "issues" && action === "list") {
        const state = parseState(rest);
        const stage = parseOption(rest, "--stage");
        if (stage) {
            printJson(await service.loadIssuesByCurrentType(stage, { state }));
            return;
        }
        printJson(await service.loadQueueContext({ state }));
        return;
    }
    if (resource === "fix" && action === "queue") {
        const limit = parseLimit(rest);
        printJson(await service.prepareFixStageQueuePayload(limit));
        return;
    }
    if (resource === "issue" && action === "show") {
        const issueNumber = parseIssueNumber(rest[0]);
        printJson(await service.loadIssueWorkflowContext(issueNumber));
        return;
    }
    if (resource === "issue" && action === "payload") {
        const issueNumber = parseIssueNumber(rest[0]);
        const target = parsePayloadTarget(rest.slice(1));
        switch (target) {
            case "fix":
                printJson(await service.prepareFixStagePayload(issueNumber));
                return;
            case "test":
                printJson(await service.prepareTestStagePayload(issueNumber));
                return;
            case "review":
                printJson(await service.prepareReviewStagePayload(issueNumber));
                return;
            case "split":
                printJson(await service.prepareSplitStagePayload(issueNumber));
                return;
        }
    }
    fail(`Unknown command: ${args.join(" ")}`);
}
run().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
});

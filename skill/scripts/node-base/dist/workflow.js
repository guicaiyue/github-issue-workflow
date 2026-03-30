"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isExplicitWorkflowType = isExplicitWorkflowType;
exports.detectCurrentTypeFromComments = detectCurrentTypeFromComments;
exports.getLatestBugDefinition = getLatestBugDefinition;
exports.getLatestFixHandoff = getLatestFixHandoff;
exports.getLatestTestResult = getLatestTestResult;
exports.getLatestBlocker = getLatestBlocker;
exports.getLatestReviewFixHandoff = getLatestReviewFixHandoff;
exports.getLatestDoneCloseout = getLatestDoneCloseout;
exports.getLatestBugStageInput = getLatestBugStageInput;
exports.getLatestFixStageReport = getLatestFixStageReport;
exports.getLatestTestStageReport = getLatestTestStageReport;
exports.getLatestWorkflowStageBlocker = getLatestWorkflowStageBlocker;
exports.getLatestReviewStageReport = getLatestReviewStageReport;
exports.getLatestDoneStageCloseout = getLatestDoneStageCloseout;
exports.getLatestStageComment = getLatestStageComment;
exports.getLatestFinalStageComment = getLatestFinalStageComment;
function escapeRegExp(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function extractFieldValue(body, label) {
    const matcher = new RegExp(`^${escapeRegExp(label)}\\s*:\\s*(.+)$`, "im");
    const matched = body.match(matcher);
    return matched ? matched[1].trim() : null;
}
function extractBulletSection(body, heading) {
    const escapedHeading = escapeRegExp(heading);
    const matcher = new RegExp(`^${escapedHeading}:\\s*\\n([\\s\\S]*?)(?=\\n[A-Z][^\\n]*:|(?![\\s\\S]))`, "im");
    const matched = body.match(matcher);
    if (!matched) {
        return [];
    }
    return matched[1]
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith("- "))
        .map((line) => line.slice(2).trim())
        .filter((line) => line.length > 0 && line !== "none");
}
function sortCommentsNewestFirst(comments) {
    return [...comments].sort((left, right) => {
        return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    });
}
function findLatestCommentWithField(comments, fieldLabel) {
    for (const comment of sortCommentsNewestFirst(comments)) {
        if (extractFieldValue(comment.body ?? "", fieldLabel)) {
            return comment;
        }
    }
    return null;
}
function findLatestCommentByCurrentType(comments, workflowType) {
    for (const comment of sortCommentsNewestFirst(comments)) {
        if (extractFieldValue(comment.body ?? "", "Current type") === workflowType) {
            return comment;
        }
    }
    return null;
}
function parseStageCommentFields(body) {
    const sections = body.split(/\r?\n\r?\n/).map((section) => section.trim()).filter(Boolean);
    const fields = {};
    for (const section of sections) {
        if (section.startsWith("Current type:") || section.startsWith("Final type:")) {
            continue;
        }
        const lines = section.split(/\r?\n/);
        const firstLine = lines[0] ?? "";
        const headingMatch = firstLine.match(/^([^:]+):\s*$/);
        if (headingMatch) {
            const label = headingMatch[1].trim();
            const items = lines
                .slice(1)
                .map((line) => line.trim())
                .filter((line) => line.startsWith("- "))
                .map((line) => line.slice(2).trim())
                .filter((line) => line.length > 0 && line !== "none");
            fields[label] = items;
            continue;
        }
        const inlineMatch = section.match(/^([^:]+):\s*([\s\S]+)$/);
        if (inlineMatch) {
            fields[inlineMatch[1].trim()] = inlineMatch[2].trim();
        }
    }
    return fields;
}
function parseValidationScenarios(items) {
    return items.map((item) => {
        const separatorIndex = item.lastIndexOf(":");
        if (separatorIndex <= 0) {
            return { name: item, result: "blocked" };
        }
        const name = item.slice(0, separatorIndex).trim();
        const result = item.slice(separatorIndex + 1).trim();
        if (result === "pass" || result === "fail" || result === "blocked") {
            return { name, result };
        }
        return { name: item, result: "blocked" };
    });
}
function isExplicitWorkflowType(value, allowedTypes) {
    return allowedTypes.includes(value);
}
// `Current type` is the persisted field label; semantically it represents the current stage.
function detectCurrentTypeFromComments(comments, allowedTypes, fieldLabel = "Current type", fallbackType = "bug") {
    for (const comment of sortCommentsNewestFirst(comments)) {
        const candidate = extractFieldValue(comment.body ?? "", fieldLabel);
        if (candidate && isExplicitWorkflowType(candidate, allowedTypes)) {
            return candidate;
        }
    }
    return fallbackType;
}
function getLatestBugDefinition(comments) {
    const comment = findLatestCommentByCurrentType(comments, "bug");
    if (!comment) {
        return null;
    }
    return {
        facts: extractBulletSection(comment.body, "Facts"),
        evidence: extractBulletSection(comment.body, "Evidence"),
        hypothesis: extractBulletSection(comment.body, "Hypothesis"),
        acceptanceCriteria: extractBulletSection(comment.body, "Acceptance Criteria"),
        stayOrHandOff: extractFieldValue(comment.body, "Stay in current type or hand off"),
        recommendedNextType: extractFieldValue(comment.body, "Recommended next type"),
        blockersOrDependencies: extractBulletSection(comment.body, "Blockers / dependencies"),
    };
}
function getLatestFixHandoff(comments) {
    const comment = findLatestCommentByCurrentType(comments, "fix");
    if (!comment) {
        return null;
    }
    return {
        implementationSummary: extractBulletSection(comment.body, "Implementation summary"),
        changedFiles: extractBulletSection(comment.body, "Changed files"),
        knownLimitationsOrOpenQuestions: extractBulletSection(comment.body, "Known limitations / open questions"),
        suggestedNextType: extractFieldValue(comment.body, "Suggested next type"),
        validationChecklist: extractBulletSection(comment.body, "Validation checklist for next role"),
    };
}
function getLatestTestResult(comments) {
    const comment = findLatestCommentByCurrentType(comments, "test");
    if (!comment) {
        return null;
    }
    return {
        scenarios: parseValidationScenarios(extractBulletSection(comment.body, "Scenario-by-scenario validation result")),
        evidenceUsed: extractBulletSection(comment.body, "Evidence used"),
        suggestedNextType: extractFieldValue(comment.body, "Suggested next type"),
        remainingRisksOrFollowUps: extractBulletSection(comment.body, "Remaining risks / follow-ups"),
    };
}
function getLatestBlocker(comments) {
    const comment = findLatestCommentWithField(comments, "Blocker");
    if (!comment) {
        return null;
    }
    return {
        currentType: extractFieldValue(comment.body, "Current type"),
        blocker: extractFieldValue(comment.body, "Blocker"),
        impact: extractFieldValue(comment.body, "Impact"),
        need: extractFieldValue(comment.body, "Need"),
        suggestedNextType: extractFieldValue(comment.body, "Suggested next type"),
    };
}
function getLatestReviewFixHandoff(comments) {
    const comment = findLatestCommentByCurrentType(comments, "review");
    if (!comment || extractFieldValue(comment.body, "Suggested next type") !== "fix") {
        return null;
    }
    return {
        outcome: extractFieldValue(comment.body, "Outcome"),
        suggestedNextType: extractFieldValue(comment.body, "Suggested next type"),
        evidenceOrReference: extractBulletSection(comment.body, "Evidence or reference"),
        followUp: extractBulletSection(comment.body, "Follow-up"),
    };
}
function getLatestDoneCloseout(comments) {
    const comment = findLatestCommentWithField(comments, "Final type");
    if (!comment || extractFieldValue(comment.body, "Final type") !== "done") {
        return null;
    }
    return {
        outcome: extractFieldValue(comment.body, "Outcome"),
        evidenceOrReference: extractBulletSection(comment.body, "Evidence or reference"),
        followUp: extractBulletSection(comment.body, "Follow-up"),
    };
}
function getLatestBugStageInput(comments) {
    return getLatestBugDefinition(comments);
}
function getLatestFixStageReport(comments) {
    return getLatestFixHandoff(comments);
}
function getLatestTestStageReport(comments) {
    return getLatestTestResult(comments);
}
function getLatestWorkflowStageBlocker(comments) {
    return getLatestBlocker(comments);
}
function getLatestReviewStageReport(comments) {
    return getLatestReviewFixHandoff(comments);
}
function getLatestDoneStageCloseout(comments) {
    return getLatestDoneCloseout(comments);
}
function getLatestStageComment(comments, stageType) {
    for (const comment of sortCommentsNewestFirst(comments)) {
        const currentType = extractFieldValue(comment.body ?? "", "Current type");
        if (currentType !== stageType) {
            continue;
        }
        return {
            currentType,
            finalType: extractFieldValue(comment.body ?? "", "Final type"),
            fields: parseStageCommentFields(comment.body ?? ""),
            rawBody: comment.body ?? "",
        };
    }
    return null;
}
function getLatestFinalStageComment(comments, stageType) {
    for (const comment of sortCommentsNewestFirst(comments)) {
        const finalType = extractFieldValue(comment.body ?? "", "Final type");
        if (finalType !== stageType) {
            continue;
        }
        return {
            currentType: extractFieldValue(comment.body ?? "", "Current type"),
            finalType,
            fields: parseStageCommentFields(comment.body ?? ""),
            rawBody: comment.body ?? "",
        };
    }
    return null;
}

import type {
  BugDefinitionInput,
  DoneCloseoutInput,
  FixHandoffInput,
  StageCommentTemplate,
  TestValidationResultInput,
  WorkflowBlockerInput,
} from "./types";

function renderBulletSection(title: string, items: string[]): string {
  const lines = items.length > 0 ? items : ["none"];
  return `${title}:\n${lines.map((item) => `- ${item}`).join("\n")}`;
}

export function renderStageComment(template: StageCommentTemplate): string {
  const sections: string[] = [];

  if (template.currentType) {
    sections.push(`Current type: ${template.currentType}`);
  }

  if (template.finalType) {
    sections.push(`Final type: ${template.finalType}`);
  }

  for (const field of template.fields) {
    const value = field.value;
    if (Array.isArray(value)) {
      const isEmpty = value.length === 0;
      if (field.omitIfEmpty && isEmpty) {
        continue;
      }

      sections.push(renderBulletSection(field.label, value));
      continue;
    }

    const isEmpty = value.trim().length === 0;
    if (field.omitIfEmpty && isEmpty) {
      continue;
    }

    sections.push(`${field.label}: ${value}`);
  }

  return sections.join("\n\n");
}

export function renderWorkflowBlockerComment(input: WorkflowBlockerInput): string {
  return renderStageComment({
    currentType: input.currentType,
    fields: [
      { label: "Blocker", value: input.blocker },
      { label: "Impact", value: input.impact },
      { label: "Need", value: input.need },
      { label: "Suggested next type", value: input.suggestedNextType },
    ],
  });
}

export function renderBugDefinitionComment(input: BugDefinitionInput): string {
  return renderStageComment({
    currentType: "bug",
    fields: [
      { label: "Facts", value: input.facts },
      { label: "Evidence", value: input.evidence },
      { label: "Hypothesis", value: input.hypothesis ?? [] },
      { label: "Acceptance Criteria", value: input.acceptanceCriteria },
      { label: "Stay in current type or hand off", value: input.stayOrHandOff },
      { label: "Recommended next type", value: input.recommendedNextType },
      { label: "Blockers / dependencies", value: input.blockersOrDependencies ?? [] },
    ],
  });
}

export function renderFixHandoffComment(input: FixHandoffInput): string {
  return renderStageComment({
    currentType: "fix",
    fields: [
      { label: "Implementation summary", value: input.implementationSummary },
      { label: "Changed files", value: input.changedFiles },
      { label: "Known limitations / open questions", value: input.knownLimitationsOrOpenQuestions ?? [] },
      { label: "Suggested next type", value: "test" },
      { label: "Validation checklist for next role", value: input.validationChecklist },
    ],
  });
}

export function renderTestValidationComment(input: TestValidationResultInput): string {
  return renderStageComment({
    currentType: "test",
    fields: [
      {
        label: "Scenario-by-scenario validation result",
        value: input.scenarios.map((scenario) => `${scenario.name}: ${scenario.result}`),
      },
      { label: "Evidence used", value: input.evidenceUsed },
      { label: "Suggested next type", value: input.suggestedNextType },
      { label: "Remaining risks / follow-ups", value: input.remainingRisksOrFollowUps ?? [] },
    ],
  });
}

export function renderReviewFixHandoffComment(input: DoneCloseoutInput): string {
  return renderStageComment({
    currentType: "review",
    fields: [
      { label: "Outcome", value: input.outcome },
      { label: "Suggested next type", value: "fix" },
      { label: "Evidence or reference", value: input.evidenceOrReference },
      { label: "Follow-up", value: input.followUp ?? [] },
    ],
  });
}

export function renderDoneCloseoutComment(input: DoneCloseoutInput): string {
  return renderStageComment({
    finalType: "done",
    fields: [
      { label: "Outcome", value: input.outcome },
      { label: "Evidence or reference", value: input.evidenceOrReference },
      { label: "Follow-up", value: input.followUp ?? [] },
    ],
  });
}

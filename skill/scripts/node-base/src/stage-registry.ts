import type { StageMetadata, WorkflowType, WorkflowTypeName } from "./types";

const builtInStageMetadata: Record<WorkflowType, Omit<StageMetadata, "name" | "isBuiltIn">> = {
  bug: {
    documentationPath: "../../types/bug/stage.md",
    defaultHandlingAgent: "worker",
    isTerminal: false,
  },
  fix: {
    documentationPath: "../../types/fix/stage.md",
    defaultHandlingAgent: "worker",
    isTerminal: false,
  },
  test: {
    documentationPath: "../../types/test/stage.md",
    defaultHandlingAgent: "tester",
    isTerminal: false,
  },
  review: {
    documentationPath: "../../types/review/stage.md",
    defaultHandlingAgent: "worker",
    isTerminal: false,
  },
  done: {
    documentationPath: "../../types/done/stage.md",
    defaultHandlingAgent: null,
    isTerminal: true,
  },
};

export const defaultBuiltInStageRegistry: StageMetadata[] = (Object.keys(builtInStageMetadata) as WorkflowType[]).map((name) => ({
  name,
  isBuiltIn: true,
  ...builtInStageMetadata[name],
}));

export function getDefaultStageMetadata(stageType: WorkflowTypeName): StageMetadata | null {
  return defaultBuiltInStageRegistry.find((item) => item.name === stageType) ?? null;
}

export function buildStageRegistry(allowedTypes: readonly WorkflowTypeName[]): StageMetadata[] {
  return allowedTypes.map((stageType) => {
    const builtIn = getDefaultStageMetadata(stageType);
    if (builtIn) {
      return builtIn;
    }

    return {
      name: stageType,
      isBuiltIn: false,
      documentationPath: `../../types/${stageType}/stage.md`,
      defaultHandlingAgent: null,
      isTerminal: false,
    } satisfies StageMetadata;
  });
}

export function getStageMetadata(stageType: WorkflowTypeName, allowedTypes: readonly WorkflowTypeName[]): StageMetadata | null {
  return buildStageRegistry(allowedTypes).find((item) => item.name === stageType) ?? null;
}

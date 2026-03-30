"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultBuiltInStageRegistry = void 0;
exports.getDefaultStageMetadata = getDefaultStageMetadata;
exports.buildStageRegistry = buildStageRegistry;
exports.getStageMetadata = getStageMetadata;
const builtInStageMetadata = {
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
exports.defaultBuiltInStageRegistry = Object.keys(builtInStageMetadata).map((name) => ({
    name,
    isBuiltIn: true,
    ...builtInStageMetadata[name],
}));
function getDefaultStageMetadata(stageType) {
    return exports.defaultBuiltInStageRegistry.find((item) => item.name === stageType) ?? null;
}
function buildStageRegistry(allowedTypes) {
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
        };
    });
}
function getStageMetadata(stageType, allowedTypes) {
    return buildStageRegistry(allowedTypes).find((item) => item.name === stageType) ?? null;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const validate_1 = require("./validate");
function createConfigFile() {
    return {
        version: 1,
        github: {
            repo: {
                owner: "halo-dev",
                name: "theme-vite-shoka",
            },
            auth: {
                tokenEnvVar: "GITHUB_TOKEN",
            },
        },
        workflow: {
            defaultType: "bug",
            allowedTypes: ["bug", "fix", "test", "review", "done"],
            typeFieldLabel: "Current type",
        },
    };
}
function createResolvedConfig() {
    return {
        version: 1,
        github: {
            baseUrl: "https://api.github.com",
            apiVersion: "2022-11-28",
            repo: {
                owner: "halo-dev",
                name: "theme-vite-shoka",
            },
            auth: {
                tokenEnvVar: "GITHUB_TOKEN",
                token: "token-value",
            },
        },
        workflow: {
            defaultType: "bug",
            allowedTypes: ["bug", "fix", "test", "review", "done"],
            typeFieldLabel: "Current type",
        },
    };
}
(0, vitest_1.describe)("validate config", () => {
    (0, vitest_1.it)("accepts a valid config file", () => {
        (0, vitest_1.expect)(() => (0, validate_1.assertValidConfigFile)(createConfigFile())).not.toThrow();
    });
    (0, vitest_1.it)("rejects an empty repo owner", () => {
        const config = createConfigFile();
        config.github.repo.owner = "";
        (0, vitest_1.expect)(() => (0, validate_1.assertValidConfigFile)(config)).toThrow(/github.repo.owner/);
    });
    (0, vitest_1.it)("rejects missing resolved token", () => {
        const config = createResolvedConfig();
        config.github.auth.token = "";
        (0, vitest_1.expect)(() => (0, validate_1.assertResolvedConfig)(config)).toThrow(/Missing GitHub token/);
    });
});

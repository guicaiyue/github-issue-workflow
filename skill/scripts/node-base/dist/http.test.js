"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const http_1 = require("./http");
function createConfig() {
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
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.restoreAllMocks();
});
(0, vitest_1.describe)("GitHubHttpClient", () => {
    (0, vitest_1.it)("sends GitHub headers and parses json", async () => {
        const fetchMock = vitest_1.vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ ok: true }),
        });
        vitest_1.vi.stubGlobal("fetch", fetchMock);
        const client = new http_1.GitHubHttpClient(createConfig());
        const result = await client.request("/repos/halo-dev/theme-vite-shoka/issues");
        (0, vitest_1.expect)(result).toEqual({ ok: true });
        (0, vitest_1.expect)(fetchMock).toHaveBeenCalledWith(new URL("/repos/halo-dev/theme-vite-shoka/issues", "https://api.github.com/"), vitest_1.expect.objectContaining({
            method: "GET",
            headers: vitest_1.expect.objectContaining({
                Accept: "application/vnd.github+json",
                Authorization: "Bearer token-value",
                "Content-Type": "application/json",
                "X-GitHub-Api-Version": "2022-11-28",
            }),
        }));
    });
    (0, vitest_1.it)("serializes request bodies", async () => {
        const fetchMock = vitest_1.vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ id: 1 }),
        });
        vitest_1.vi.stubGlobal("fetch", fetchMock);
        const client = new http_1.GitHubHttpClient(createConfig());
        await client.request("/repos/halo-dev/theme-vite-shoka/issues", {
            method: "POST",
            body: { title: "new issue" },
        });
        (0, vitest_1.expect)(fetchMock).toHaveBeenCalledWith(vitest_1.expect.any(URL), vitest_1.expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ title: "new issue" }),
        }));
    });
    (0, vitest_1.it)("returns undefined for 204 responses", async () => {
        vitest_1.vi.stubGlobal("fetch", vitest_1.vi.fn().mockResolvedValue({
            ok: true,
            status: 204,
        }));
        const client = new http_1.GitHubHttpClient(createConfig());
        await (0, vitest_1.expect)(client.request("/repos/halo-dev/theme-vite-shoka/issues/1/sub_issue", { method: "DELETE" })).resolves.toBeUndefined();
    });
    (0, vitest_1.it)("surfaces response text on non-ok responses", async () => {
        vitest_1.vi.stubGlobal("fetch", vitest_1.vi.fn().mockResolvedValue({
            ok: false,
            status: 422,
            text: async () => "validation failed",
        }));
        const client = new http_1.GitHubHttpClient(createConfig());
        await (0, vitest_1.expect)(client.request("/repos/halo-dev/theme-vite-shoka/issues")).rejects.toThrow("GitHub API request failed with 422: validation failed");
    });
});

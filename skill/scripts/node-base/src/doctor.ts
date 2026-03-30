import { loadGitHubIssuesConfig } from "./config";
import { GitHubIssuesRepository } from "./repository";

async function main(): Promise<void> {
  const config = loadGitHubIssuesConfig();
  const repository = new GitHubIssuesRepository();
  const issues = await repository.listIssues({ state: "open", perPage: 1 });

  console.log(
    JSON.stringify(
      {
        ok: true,
        repo: `${config.github.repo.owner}/${config.github.repo.name}`,
        tokenEnvVar: config.github.auth.tokenEnvVar,
        sampleIssueCount: issues.length,
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});

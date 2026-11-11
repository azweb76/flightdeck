import { TeamConfigSchema, type TeamConfig } from "@flightdeck/shared";
import { createRepo, listRepos } from "../repos/index.ts";
import { patchSettings, storeDeferredTeamConfig } from "../settings/index.ts";

export function parseTeamConfig(input: unknown): TeamConfig {
  return TeamConfigSchema.parse(input);
}

export function applyTeamConfig(config: TeamConfig): { reposAdded: number } {
  const existing = new Set(listRepos().map((r) => `${r.owner}/${r.name}`.toLowerCase()));
  let reposAdded = 0;
  for (const repo of config.repos) {
    const key = `${repo.owner}/${repo.name}`.toLowerCase();
    if (existing.has(key)) continue;
    createRepo({
      owner: repo.owner,
      name: repo.name,
      defaultBranch: repo.defaultBranch ?? "main",
      localPath: repo.localPath ?? "",
      pinned: repo.pinned ?? false,
    });
    existing.add(key);
    reposAdded += 1;
  }
  patchSettings({
    labelPrefix: config.labelRules.prefix,
    jiraSiteUrl: config.jira?.siteUrl || undefined,
    jiraJql: config.jira?.jql || undefined,
  });
  storeDeferredTeamConfig(config);
  return { reposAdded };
}

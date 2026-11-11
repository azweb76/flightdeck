import { TeamConfigSchema, type TeamConfig } from "@flightdeck/shared";
import { createRepo, listRepos } from "../repos/index.ts";
import { getSettings, patchSettings, storeDeferredTeamConfig } from "../settings/index.ts";

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
  if (config.prompts) {
    patchSettings({
      promptRefiner: config.prompts.refiner,
      promptPlanner: config.prompts.planner,
      promptImplementer: config.prompts.implementer,
      promptReviewer: config.prompts.reviewer,
    });
  }
  if (config.models) {
    patchSettings({
      modelRefiner: config.models.refiner,
      modelPlanner: config.models.planner,
      modelImplementer: config.models.implementer,
      modelReviewer: config.models.reviewer,
    });
  }
  return { reposAdded };
}

export function exportTeamConfig(): TeamConfig {
  const settings = getSettings();
  return TeamConfigSchema.parse({
    version: 1,
    repos: listRepos().map((r) => ({
      owner: r.owner,
      name: r.name,
      defaultBranch: r.defaultBranch,
      localPath: r.localPath,
      pinned: r.pinned,
    })),
    labelRules: { prefix: settings.labelPrefix },
    prompts: {
      refiner: settings.promptRefiner || undefined,
      planner: settings.promptPlanner || undefined,
      implementer: settings.promptImplementer || undefined,
      reviewer: settings.promptReviewer || undefined,
    },
    models: {
      refiner: settings.modelRefiner,
      planner: settings.modelPlanner,
      implementer: settings.modelImplementer,
      reviewer: settings.modelReviewer,
    },
    jira: settings.jiraSiteUrl
      ? { siteUrl: settings.jiraSiteUrl, jql: settings.jiraJql }
      : undefined,
  });
}

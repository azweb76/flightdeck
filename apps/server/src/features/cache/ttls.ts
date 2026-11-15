export const TTL = {
  issuesSync: 60_000,
  githubStatus: 120_000,
  githubRepos: 3_600_000,
  githubIssues: 60_000,
  jiraSearch: 60_000,
  jiraConnect: 120_000,
  claudeConfig: 120_000,
  cloneFetch: 60_000,
  githubPulls: 60_000,
  githubChecks: 20_000,
  githubPull: 20_000,
  githubReviewRequests: 60_000,
} as const;

export const CACHE_KEYS = {
  issuesSync: "issues:sync",
  githubStatus: "gh:status",
  githubRepos: "gh:repos",
  githubIssues: "gh:issues",
  claudeConfig: "claude:config",
  jiraAll: "jira:*",
  jiraSearchAll: "jira:search:*",
  cloneFetch: (owner: string, name: string) => `clone:fetch:${owner}/${name}`,
  githubPulls: "gh:pulls",
  githubPull: (owner: string, name: string, number: number) => `gh:pull:${owner}/${name}#${number}`,
  githubPullFiles: (owner: string, name: string, number: number) => `gh:pull-files:${owner}/${name}#${number}`,
  githubReviewRequests: "gh:reviews",
  githubChecks: (owner: string, name: string, ref: string) => `gh:checks:${owner}/${name}:${ref}`,
  jiraSearch: (site: string, email: string, jql: string) => `jira:search:${site}:${email}:${jql}`,
  jiraTest: (site: string, email: string) => `jira:test:${site}:${email}`,
} as const;

export const RATE_LIMIT = {
  maxAttempts: 3,
  capMs: 30_000,
  initialMs: 1_000,
} as const;

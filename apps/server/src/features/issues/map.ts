import { parseRepoLabels, resolveRepos, type Issue, type LinkedRepo, type VisibleRepo } from "@flightdeck/shared";
import { rememberedIssuePick } from "../discovery/index.ts";

export function mapJira(
  issue: { key: string; title: string; body: string; url: string; labels: string[]; updatedAt: string; jiraPriority?: string },
  visible: VisibleRepo[],
  prefix: string,
  rememberedByLabel: Record<string, VisibleRepo> = {},
): Issue {
  const parsed = parseRepoLabels(issue.labels, prefix);
  const resolution = withIssuePick(`jira:${issue.key}`, resolveRepos(parsed, visible, rememberedByLabel));
  const withLabel = (p: VisibleRepo): LinkedRepo => ({
    owner: p.owner,
    name: p.name,
    registered: true,
    label: parsed.find((x) => x.name.toLowerCase() === p.name.toLowerCase())?.label ?? `${p.owner}/${p.name}`,
  });
  return {
    id: `jira:${issue.key}`,
    source: "jira",
    key: issue.key,
    title: issue.title,
    body: issue.body,
    url: issue.url,
    stage: "new",
    repos: resolution.resolved.map(withLabel),
    repoWarning: resolution.warning,
    repoGuesses: resolution.guesses.map(withLabel),
    updatedAt: issue.updatedAt,
    labels: issue.labels,
    jiraPriority: issue.jiraPriority,
  };
}

export function mapGithub(issue: {
  number: number;
  title: string;
  body: string;
  url: string;
  updatedAt: string;
  owner: string;
  name: string;
  labels?: string[];
}): Issue {
  return {
    id: `github:${issue.owner}/${issue.name}#${issue.number}`,
    source: "github",
    key: `${issue.owner}/${issue.name}#${issue.number}`,
    title: issue.title,
    body: issue.body,
    url: issue.url,
    stage: "new",
    repos: [{ owner: issue.owner, name: issue.name, registered: true }],
    repoWarning: "none",
    updatedAt: issue.updatedAt,
    labels: issue.labels,
  };
}

function withIssuePick(
  issueId: string,
  resolution: ReturnType<typeof resolveRepos>,
): ReturnType<typeof resolveRepos> {
  const pick = rememberedIssuePick(issueId);
  if (!pick) return resolution;
  if (resolution.warning === "missing" || resolution.resolved.length === 0) {
    return { resolved: [pick], warning: "none", guesses: resolution.guesses };
  }
  return resolution;
}

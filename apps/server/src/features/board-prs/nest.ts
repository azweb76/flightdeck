import type { BoardPr, Issue } from "@flightdeck/shared";

export function stubFromLink(id: string, pr: BoardPr): Issue {
  const github = id.startsWith("github:") ? id.slice("github:".length) : undefined;
  const [repo, num] = github?.includes("#") ? github.split("#") : [undefined, undefined];
  const [owner, name] = repo?.includes("/") ? repo.split("/") : ["", ""];
  const jira = id.startsWith("jira:") ? id.slice("jira:".length) : undefined;
  return {
    id,
    source: jira ? "jira" : "github",
    key: jira ?? github ?? id,
    title: pr.title,
    body: `Linked from ${pr.repo}#${pr.number}`,
    url: jira ? "" : `https://github.com/${repo}/issues/${num}`,
    stage: "pr_open",
    repos: owner && name ? [{ owner, name, registered: true }] : repoSlugRepos(pr.repo),
    repoWarning: "none",
    updatedAt: pr.updatedAt,
    viaPr: true,
    prs: [],
  };
}

export function prAsIssue(pr: BoardPr): Issue {
  const [owner, name] = pr.repo.split("/");
  return {
    id: `pr:${pr.id}`,
    source: "github",
    key: `${pr.repo}#${pr.number}`,
    title: pr.title,
    body: pr.body,
    url: pr.url,
    stage: "pr_open",
    repos: owner && name ? [{ owner, name, registered: true }] : [],
    repoWarning: "none",
    updatedAt: pr.updatedAt,
    viaPr: false,
    prs: [pr],
  };
}

/** One card per issue; PRs nest. A PR with no links is its own card. */
export function nestPrs(issues: Issue[], prs: BoardPr[], linkedIssues: boolean): Issue[] {
  const byId = new Map(issues.map((i) => [i.id, { ...i, prs: [...(i.prs ?? [])] as BoardPr[] }]));
  const extras: Issue[] = [];
  for (const pr of prs) {
    const links = linkedIssues ? pr.linkedIssueIds : [];
    const hits = links.filter((id) => byId.has(id));
    const missing = links.filter((id) => !byId.has(id));
    if (hits.length === 0 && missing.length === 0) {
      extras.push(prAsIssue(pr));
      continue;
    }
    for (const id of missing) {
      const stub = stubFromLink(id, pr);
      byId.set(id, { ...stub, prs: [pr], viaPr: true });
    }
    for (const id of hits) {
      const cur = byId.get(id)!;
      const have = cur.prs ?? [];
      if (!have.some((p) => p.id === pr.id)) cur.prs = [...have, pr];
      cur.viaPr = true;
      byId.set(id, cur);
    }
  }
  return dedupe([...byId.values(), ...extras]);
}

function dedupe(issues: Issue[]): Issue[] {
  const seen = new Map<string, Issue>();
  for (const issue of issues) {
    const hit = seen.get(issue.id);
    if (!hit) {
      seen.set(issue.id, issue);
      continue;
    }
    const prs = [...(hit.prs ?? [])];
    for (const pr of issue.prs ?? []) {
      if (!prs.some((p) => p.id === pr.id)) prs.push(pr);
    }
    seen.set(issue.id, { ...hit, ...issue, prs, viaPr: hit.viaPr || issue.viaPr });
  }
  return [...seen.values()];
}

function repoSlugRepos(slug: string): Issue["repos"] {
  const [owner, name] = slug.split("/");
  return owner && name ? [{ owner, name, registered: true }] : [];
}

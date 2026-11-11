import type { ParsedRepoRef } from "./labels.ts";

export type VisibleRepo = { owner: string; name: string };

export type RepoResolution = {
  resolved: VisibleRepo[];
  warning: "none" | "missing" | "multiple";
  guesses: VisibleRepo[];
};

export function resolveRepos(
  labels: readonly ParsedRepoRef[],
  visible: readonly VisibleRepo[],
  remembered?: VisibleRepo,
): RepoResolution {
  if (remembered) {
    return { resolved: [remembered], warning: "none", guesses: guessesFor(labels, visible) };
  }
  const resolved: VisibleRepo[] = [];
  const seen = new Set<string>();
  for (const label of labels) {
    const hits = matchLabel(label, visible);
    for (const hit of hits) {
      const key = `${hit.owner}/${hit.name}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      resolved.push(hit);
    }
  }
  if (resolved.length === 1) return { resolved, warning: "none", guesses: guessesFor(labels, visible) };
  if (resolved.length === 0) return { resolved: [], warning: "missing", guesses: guessesFor(labels, visible) };
  return { resolved, warning: "multiple", guesses: resolved };
}

function matchLabel(label: ParsedRepoRef, visible: readonly VisibleRepo[]): VisibleRepo[] {
  if (label.owner) {
    const slug = `${label.owner}/${label.name}`.toLowerCase();
    const hit = visible.find((r) => `${r.owner}/${r.name}`.toLowerCase() === slug);
    return hit ? [hit] : [{ owner: label.owner, name: label.name }];
  }
  return visible.filter((r) => r.name.toLowerCase() === label.name.toLowerCase());
}

function guessesFor(labels: readonly ParsedRepoRef[], visible: readonly VisibleRepo[]): VisibleRepo[] {
  const names = new Set(labels.map((l) => l.name.toLowerCase()));
  const guessed = visible.filter(
    (r) => names.has(r.name.toLowerCase()) || [...names].some((n) => r.name.toLowerCase().includes(n)),
  );
  return guessed.slice(0, 8);
}

export function jiraProjectKey(issueKey: string): string {
  return issueKey.split("-")[0] ?? issueKey;
}

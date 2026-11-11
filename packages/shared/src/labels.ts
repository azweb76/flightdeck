export type ParsedRepoRef = {
  owner: string;
  name: string;
  label: string;
};

export type RepoLinkWarning = "none" | "missing" | "multiple";

const REPO_SPEC = /^([^/\s]+)\/([^/\s]+)$/;

export function parseRepoLabels(labels: readonly string[], prefix: string): ParsedRepoRef[] {
  const found: ParsedRepoRef[] = [];
  const seen = new Set<string>();
  for (const label of labels) {
    const parsed = parseOne(label, prefix);
    if (!parsed) continue;
    const key = `${parsed.owner}/${parsed.name}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(parsed);
  }
  return found;
}

function parseOne(label: string, prefix: string): ParsedRepoRef | undefined {
  if (!prefix || !label.toLowerCase().startsWith(prefix.toLowerCase())) return undefined;
  const spec = label.slice(prefix.length).trim();
  const m = spec.match(REPO_SPEC);
  if (m?.[1] && m[2]) return { owner: m[1], name: m[2], label };
  if (spec && !spec.includes("/")) return { owner: "", name: spec, label };
  return undefined;
}

export function repoLinkWarning(repos: readonly ParsedRepoRef[]): RepoLinkWarning {
  if (repos.length === 0) return "missing";
  if (repos.length > 1) return "multiple";
  return "none";
}

export function repoSlug(owner: string, name: string): string {
  return `${owner}/${name}`;
}

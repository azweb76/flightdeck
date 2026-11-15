const REPO_LABEL = /^repo:([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/;

export function repoSlugFromLabels(labels: string[] | undefined): string | undefined {
  for (const raw of labels ?? []) {
    const match = REPO_LABEL.exec(raw.trim());
    if (match) return match[1];
  }
  return undefined;
}

export function withRepoLabel(labels: string[] | undefined, slug: string): string[] {
  const rest = (labels ?? []).filter((label) => !label.trim().startsWith("repo:"));
  return [...rest, `repo:${slug}`];
}

export function parseLabelNames(fields: { labels?: unknown } | undefined): string[] {
  const raw = fields?.labels;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === "string" ? item : (item as { name?: string })?.name))
    .filter((name): name is string => Boolean(name));
}

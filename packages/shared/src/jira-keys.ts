const KEY = /\b([A-Z][A-Z0-9]+-\d+)\b/g;

/** Jira keys whose project prefix is in `projectKeys` (case-insensitive). */
export function parseJiraKeys(text: string, projectKeys: readonly string[]): string[] {
  const allow = new Set(projectKeys.map((k) => k.toUpperCase()));
  if (allow.size === 0) return [];
  const found: string[] = [];
  const seen = new Set<string>();
  for (const match of text.toUpperCase().matchAll(KEY)) {
    const key = match[1] ?? "";
    const project = key.split("-")[0] ?? "";
    if (!allow.has(project) || seen.has(key)) continue;
    seen.add(key);
    found.push(key);
  }
  return found;
}

export function parseExcludeRepos(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes("/"));
}

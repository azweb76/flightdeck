export function repoChipLabel(repo: { owner: string; name: string; label?: string }): string {
  const raw = repo.label?.trim() || `${repo.owner}/${repo.name}`;
  return raw.replace(/^gh:/i, "");
}

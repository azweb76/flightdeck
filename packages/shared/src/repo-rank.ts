import type { RepoPermission } from "./schemas/repos.ts";

export type RankableRepo = {
  owner: string;
  name: string;
  description: string;
  pushedAt?: string;
  favorite?: boolean;
  lastUsedAt?: string;
};

export type RankedGroup = "favorites" | "recent" | "all";

export type RankedRepo<T extends RankableRepo = RankableRepo> = {
  repo: T;
  group: RankedGroup;
  score: number;
};

export function slugOf(repo: { owner: string; name: string }): string {
  return `${repo.owner}/${repo.name}`;
}

export function isPushable(permission: RepoPermission): boolean {
  return permission === "ADMIN" || permission === "MAINTAIN" || permission === "WRITE";
}

export function fuzzyScore(repo: RankableRepo, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const slug = slugOf(repo).toLowerCase();
  const name = repo.name.toLowerCase();
  const owner = repo.owner.toLowerCase();
  const desc = repo.description.toLowerCase();
  if (slug === q) return 100;
  if (name === q) return 95;
  if (name.startsWith(q)) return 90;
  if (owner.startsWith(q)) return 70;
  if (slug.includes(q)) return 50;
  if (desc.includes(q)) return 30;
  if (subsequence(slug, q)) return 10 + Math.min(20, q.length);
  return 0;
}

/** Favorites, then recent (max 10, not already favorited), then the rest by fuzzy score. */
export function rankRepos<T extends RankableRepo>(
  repos: readonly T[],
  query: string,
  recentLimit = 10,
): RankedRepo<T>[] {
  const favorited = repos.filter((r) => r.favorite);
  const recent = [...repos]
    .filter((r) => r.lastUsedAt && !r.favorite)
    .sort((a, b) => (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? ""))
    .slice(0, recentLimit);
  const recentKeys = new Set(recent.map(slugOf));
  const favoriteKeys = new Set(favorited.map(slugOf));
  const rest = repos.filter((r) => !favoriteKeys.has(slugOf(r)) && !recentKeys.has(slugOf(r)));
  return [
    ...scored(favorited, "favorites", query),
    ...scored(recent, "recent", query),
    ...scored(rest, "all", query),
  ];
}

function scored<T extends RankableRepo>(
  repos: readonly T[],
  group: RankedGroup,
  query: string,
): RankedRepo<T>[] {
  const q = query.trim();
  const rows = repos
    .map((repo) => ({ repo, group, score: fuzzyScore(repo, q) }))
    .filter((row) => row.score > 0);
  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (group === "all" && !q) {
      return (b.repo.pushedAt ?? "").localeCompare(a.repo.pushedAt ?? "");
    }
    if (group === "recent") return (b.repo.lastUsedAt ?? "").localeCompare(a.repo.lastUsedAt ?? "");
    return slugOf(a.repo).localeCompare(slugOf(b.repo));
  });
  return rows;
}

function subsequence(haystack: string, needle: string): boolean {
  let i = 0;
  for (const ch of haystack) {
    if (ch === needle[i]) i += 1;
    if (i >= needle.length) return true;
  }
  return false;
}

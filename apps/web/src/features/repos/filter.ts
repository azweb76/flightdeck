import type { CatalogRepo, CatalogView } from "@flightdeck/shared";

export type CatalogSections = {
  favorites: string[];
  recent: string[];
  all: CatalogRepo[];
  slugs: string[];
};

export function filterCatalog(catalog: CatalogView | undefined, query: string): CatalogSections {
  const q = query.trim().toLowerCase();
  const match = (slug: string) => !q || slug.toLowerCase().includes(q);
  const favorites = (catalog?.favorites ?? []).filter(match);
  const fav = new Set(favorites);
  const recent = (catalog?.recent ?? []).filter((slug) => !fav.has(slug) && match(slug));
  const skip = new Set([...favorites, ...recent]);
  const all = (catalog?.repos ?? []).filter((repo) => {
    const slug = `${repo.owner}/${repo.name}`;
    return !skip.has(slug) && match(slug);
  });
  const slugs = [
    ...favorites,
    ...recent,
    ...all.map((repo) => `${repo.owner}/${repo.name}`),
  ];
  return { favorites, recent, all, slugs };
}

export const ALL_CAP = 80;

export type RepoOption = { slug: string; group: "Favorites" | "Recent" | "All" };

export function catalogOptions(catalog: CatalogView | undefined, query: string, cap = ALL_CAP): RepoOption[] {
  const sections = filterCatalog(catalog, query);
  return [
    ...sections.favorites.map((slug) => ({ slug, group: "Favorites" as const })),
    ...sections.recent.map((slug) => ({ slug, group: "Recent" as const })),
    ...sections.all.slice(0, cap).map((repo) => ({ slug: `${repo.owner}/${repo.name}`, group: "All" as const })),
  ];
}

export function nextActive(slugs: string[], current: string, delta: number): string {
  if (!slugs.length) return "";
  const i = slugs.indexOf(current);
  const from = i < 0 ? (delta > 0 ? -1 : 0) : i;
  const next = (from + delta + slugs.length) % slugs.length;
  return slugs[next] ?? "";
}

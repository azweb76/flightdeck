import { describe, expect, it } from "vitest";
import { fuzzyScore, rankRepos, type RankableRepo } from "./repo-rank.ts";

function repo(partial: Partial<RankableRepo> & Pick<RankableRepo, "owner" | "name">): RankableRepo {
  return { description: "", ...partial };
}

describe("rankRepos", () => {
  const catalog = [
    repo({ owner: "acme", name: "web", favorite: true, description: "frontend" }),
    repo({ owner: "acme", name: "api", lastUsedAt: "2026-11-11T12:00:00Z", description: "public api" }),
    repo({ owner: "globex", name: "platform", lastUsedAt: "2026-11-10T12:00:00Z" }),
    repo({ owner: "initech", name: "handbook", description: "internal docs", pushedAt: "2026-01-01T00:00:00Z" }),
    repo({ owner: "acme", name: "mobile", pushedAt: "2026-11-01T00:00:00Z" }),
  ];

  it("orders favorites, then recent, then the rest", () => {
    const ranked = rankRepos(catalog, "");
    expect(ranked.map((r) => `${r.group}:${r.repo.name}`)).toEqual([
      "favorites:web",
      "recent:api",
      "recent:platform",
      "all:mobile",
      "all:handbook",
    ]);
  });

  it("keeps a favorite out of the recent section", () => {
    const ranked = rankRepos(
      [repo({ owner: "acme", name: "web", favorite: true, lastUsedAt: "2026-11-11T00:00:00Z" })],
      "",
    );
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.group).toBe("favorites");
  });

  it("caps recent at 10", () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      repo({
        owner: "acme",
        name: `r${String(i).padStart(2, "0")}`,
        lastUsedAt: `2026-11-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
      }),
    );
    const recent = rankRepos(many, "").filter((r) => r.group === "recent");
    expect(recent).toHaveLength(10);
    expect(recent[0]?.repo.name).toBe("r14");
  });

  it("filters and scores by fuzzy match on owner, name, and description", () => {
    const ranked = rankRepos(catalog, "front");
    expect(ranked.map((r) => r.repo.name)).toEqual(["web"]);
    expect(fuzzyScore(catalog[0]!, "acme/web")).toBe(100);
    expect(fuzzyScore(catalog[1]!, "api")).toBeGreaterThan(fuzzyScore(catalog[1]!, "public"));
  });

  it("hides non-matching rows when there is a query", () => {
    expect(rankRepos(catalog, "zzz")).toEqual([]);
  });
});

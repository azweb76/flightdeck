import { describe, expect, it } from "vitest";
import { ALL_CAP, catalogOptions, filterCatalog, nextActive } from "./filter.ts";

const catalog = {
  favorites: ["acme/web"],
  recent: ["acme/web", "acme/api"],
  repos: [
    { owner: "acme", name: "web", localPath: "" },
    { owner: "acme", name: "api", localPath: "" },
    { owner: "acme", name: "mobile", localPath: "" },
  ],
};

describe("filterCatalog", () => {
  it("dedupes favorites and recent out of All", () => {
    const sections = filterCatalog(catalog, "");
    expect(sections.favorites).toEqual(["acme/web"]);
    expect(sections.recent).toEqual(["acme/api"]);
    expect(sections.all.map((r) => `${r.owner}/${r.name}`)).toEqual(["acme/mobile"]);
    expect(sections.slugs).toEqual(["acme/web", "acme/api", "acme/mobile"]);
  });

  it("searches the cache without needing a network call", () => {
    const sections = filterCatalog(catalog, "MOB");
    expect(sections.favorites).toEqual([]);
    expect(sections.recent).toEqual([]);
    expect(sections.all.map((r) => r.name)).toEqual(["mobile"]);
  });
});

describe("catalogOptions", () => {
  it("caps All for long catalogs", () => {
    const repos = Array.from({ length: ALL_CAP + 5 }, (_, i) => ({
      owner: "acme",
      name: `r${i}`,
      localPath: "",
    }));
    const opts = catalogOptions({ favorites: [], recent: [], repos }, "");
    expect(opts.filter((o) => o.group === "All")).toHaveLength(ALL_CAP);
  });
});

describe("nextActive", () => {
  it("moves keyboard focus through visible slugs", () => {
    const slugs = ["a/one", "a/two"];
    expect(nextActive(slugs, "", 1)).toBe("a/one");
    expect(nextActive(slugs, "a/one", 1)).toBe("a/two");
    expect(nextActive(slugs, "a/two", 1)).toBe("a/one");
    expect(nextActive(slugs, "a/one", -1)).toBe("a/two");
  });
});

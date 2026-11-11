import { describe, expect, it } from "vitest";
import { repoChipLabel } from "./repoDisplay.ts";

describe("repoChipLabel", () => {
  it("drops the gh: prefix and falls back to owner/name", () => {
    expect(repoChipLabel({ owner: "acme", name: "web", label: "gh:acme/web" })).toBe("acme/web");
    expect(repoChipLabel({ owner: "acme", name: "api" })).toBe("acme/api");
  });
});

import { describe, expect, it } from "vitest";
import { MIN_GIT } from "./engines.ts";
import { meetsMin, minFromRange, parseGitVersion, parseTriple } from "./version.ts";

describe("version compare", () => {
  it("parses git and node version strings", () => {
    expect(parseTriple("v22.13.0")).toEqual([22, 13, 0]);
    expect(parseTriple("git version 2.47.1")).toEqual([2, 47, 1]);
    expect(minFromRange(">=22.13.0")).toEqual([22, 13, 0]);
  });

  it("parses Apple Git suffixes as numeric triples, not floats", () => {
    expect(parseGitVersion("git version 2.50.1 (Apple Git-155)")).toEqual([2, 50, 1]);
    expect(parseGitVersion("2.50.0")).toEqual([2, 50, 0]);
    expect(parseGitVersion("2.39.5 (Apple Git-154)")).toEqual([2, 39, 5]);
    expect(parseGitVersion("git version 2.9.0")).toEqual([2, 9, 0]);
    expect(meetsMin("git version 2.50.1 (Apple Git-155)", `>=${MIN_GIT}`)).toBe(true);
    expect(meetsMin("2.50.0", `>=${MIN_GIT}`)).toBe(true);
    expect(meetsMin("2.39.5 (Apple Git-154)", `>=${MIN_GIT}`)).toBe(true);
    expect(meetsMin("git version 2.9.0", `>=${MIN_GIT}`)).toBe(false);
  });

  it("accepts versions at or above the engines range", () => {
    expect(meetsMin("22.13.0", ">=22.13.0")).toBe(true);
    expect(meetsMin("22.12.0", ">=22.13.0")).toBe(false);
    expect(meetsMin("2.19.9", ">=2.20.0")).toBe(false);
    expect(meetsMin("2.20.0", ">=2.20.0")).toBe(true);
  });
});

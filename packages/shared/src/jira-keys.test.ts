import { describe, expect, it } from "vitest";
import { parseExcludeRepos, parseJiraKeys } from "./jira-keys.ts";

describe("parseJiraKeys", () => {
  it("keeps keys for visible projects from title, branch, and body", () => {
    const text = "PROJ-150: headers\nbranch agent/PROJ-150-v2\nAlso see WEB-9 and SKIP-1.";
    expect(parseJiraKeys(text, ["PROJ", "WEB"])).toEqual(["PROJ-150", "WEB-9"]);
  });

  it("returns nothing without project keys", () => {
    expect(parseJiraKeys("PROJ-1", [])).toEqual([]);
  });
});

describe("parseExcludeRepos", () => {
  it("normalizes a comma list", () => {
    expect(parseExcludeRepos("Acme/Old, other/secret\n")).toEqual(["acme/old", "other/secret"]);
  });
});

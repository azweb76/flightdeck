import { describe, expect, it } from "vitest";
import type { Issue } from "@flightdeck/shared";
import { issueWarningText } from "./warning.ts";

const base: Issue = {
  id: "jira:X-1",
  source: "jira",
  key: "X-1",
  title: "t",
  body: "",
  url: "",
  stage: "new",
  repos: [],
  repoWarning: "none",
  updatedAt: "t",
};

describe("issueWarningText", () => {
  it("is silent for GitHub issues", () => {
    expect(issueWarningText({ ...base, source: "github", repoWarning: "missing" })).toBeUndefined();
  });
  it("explains missing and multiple Jira labels", () => {
    expect(issueWarningText({ ...base, repoWarning: "missing" })).toBe("No repo label");
    expect(issueWarningText({ ...base, repoWarning: "multiple" })).toBe("Multiple repo labels");
  });
});

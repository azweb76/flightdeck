import { describe, expect, it } from "vitest";
import type { Issue } from "@flightdeck/shared";
import { refineDisabledReason, startDisabledReason } from "./disableReasons.ts";

const jiraUnlabeled: Issue = {
  id: "jira:PROJ-9",
  source: "jira",
  key: "PROJ-9",
  title: "No labels",
  body: "",
  url: "",
  stage: "new",
  repos: [],
  repoWarning: "missing",
  updatedAt: "2026-11-11T00:00:00Z",
};

describe("disableReasons", () => {
  it("does not block Refine/Start on a Jira HTTP 400 (not network offline)", () => {
    expect(refineDisabledReason(false)).toBeUndefined();
    expect(startDisabledReason({ ...jiraUnlabeled, repos: [{ owner: "acme", name: "web", registered: true }] }, false, false)).toBeUndefined();
  });

  it("explains Start when the Jira issue has no repo and none is picked", () => {
    expect(startDisabledReason(jiraUnlabeled, false, false)).toMatch(/Pick a GitHub repo/);
    expect(startDisabledReason(jiraUnlabeled, false, true)).toBeUndefined();
  });

  it("blocks only when that source is actually unreachable", () => {
    expect(refineDisabledReason(true)).toMatch(/unreachable/);
    expect(startDisabledReason(jiraUnlabeled, true, true)).toMatch(/unreachable/);
  });
});

import { describe, expect, it } from "vitest";
import { syncFromIssues } from "./syncStatus.ts";

describe("syncFromIssues", () => {
  it("stays Synced when both sources are up", () => {
    const s = syncFromIssues({ offline: false, errors: [], offlineSources: { jira: false, github: false } });
    expect(s.label).toBe("Synced");
    expect(s.detail).toContain("Jira: ok");
  });

  it("uses Partial for one source, Offline for the whole app", () => {
    expect(syncFromIssues({ offline: false, errors: ["jira down"], offlineSources: { jira: true, github: false } }).label).toBe(
      "Partial",
    );
    expect(syncFromIssues({ offline: true, errors: [], offlineSources: { jira: true, github: true } }).label).toBe("Offline");
  });

  it("marks Partial when PR sync failed even if issue sources are up", () => {
    const s = syncFromIssues({
      offline: false,
      errors: [],
      offlineSources: { jira: false, github: false },
      prSync: { error: "PR sync: GraphQL rate limit", total: 0 },
    });
    expect(s.label).toBe("Partial");
    expect(s.detail).toContain("PR sync:");
  });
});

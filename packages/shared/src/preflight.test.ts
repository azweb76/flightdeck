import { describe, expect, it } from "vitest";
import { blockedBy, type PreflightReport } from "./preflight.ts";

const report = (ok: boolean): PreflightReport => ({
  ok,
  checkedAt: "2026-11-14T00:00:00.000Z",
  demo: true,
  checks: [
    {
      id: "github",
      label: "GitHub token",
      severity: "required",
      ok,
      status: ok ? "pass" : "fail",
      detail: "No GitHub token stored",
      fix: "Add a GitHub token in Settings",
      gates: ["refine", "start", "saveGithub"],
    },
    {
      id: "jira",
      label: "Jira",
      severity: "optional",
      ok: false,
      status: "warn",
      detail: "token missing",
      gates: ["saveJira"],
    },
  ],
});

describe("blockedBy", () => {
  it("gates only required failures for the matching action", () => {
    const fail = report(false);
    expect(blockedBy(fail, "saveGithub")?.id).toBe("github");
    expect(blockedBy(fail, "refine")?.id).toBe("github");
    expect(blockedBy(fail, "saveJira")?.id).toBe("jira");
    expect(blockedBy(report(true), "refine")).toBeUndefined();
    expect(blockedBy(report(true), "saveJira")?.id).toBe("jira");
  });
});

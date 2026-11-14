import { describe, expect, it } from "vitest";
import { blockedBy, type PreflightReport } from "./preflight.ts";

const report = (ok: boolean): PreflightReport => ({
  ok,
  checkedAt: "2026-11-14T00:00:00.000Z",
  demo: true,
  checks: [
    {
      id: "gh",
      label: "GitHub CLI",
      severity: "required",
      ok,
      status: ok ? "pass" : "fail",
      detail: "gh is installed but not logged in",
      fix: "gh auth login",
      gates: ["shape", "start", "saveGithub"],
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
    expect(blockedBy(fail, "saveGithub")?.id).toBe("gh");
    expect(blockedBy(fail, "shape")?.id).toBe("gh");
    expect(blockedBy(fail, "saveJira")?.id).toBe("jira");
    expect(blockedBy(report(true), "shape")).toBeUndefined();
    expect(blockedBy(report(true), "saveJira")?.id).toBe("jira");
  });
});

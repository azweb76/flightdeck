import { describe, expect, it } from "vitest";
import { blockedBy, stayOffCopy, type PreflightReport } from "./preflight.ts";

const github = (ok: boolean): PreflightReport["checks"][number] => ({
  id: "github",
  label: "GitHub token",
  severity: "required",
  ok,
  status: ok ? "pass" : "fail",
  detail: "No GitHub token stored",
  fix: "Add a GitHub token in Settings",
  gates: ["start", "saveGithub"],
});

const jira = (ok: boolean): PreflightReport["checks"][number] => ({
  id: "jira",
  label: "Jira",
  severity: "optional",
  ok,
  status: ok ? "skip" : "warn",
  detail: ok ? "Jira is optional" : "token missing",
  gates: ["saveJira"],
});

const report = (opts: { github: boolean; jira: boolean }): PreflightReport => ({
  ok: opts.github,
  checkedAt: "2026-11-14T00:00:00.000Z",
  demo: true,
  checks: [github(opts.github), jira(opts.jira)],
});

describe("blockedBy", () => {
  it("gates only required failures for the matching action", () => {
    const fail = report({ github: false, jira: false });
    expect(blockedBy(fail, "saveGithub")?.id).toBe("github");
    expect(blockedBy(fail, "start")?.id).toBe("github");
    expect(blockedBy(fail, "refine")).toBeUndefined();
    expect(blockedBy(fail, "pickRepo")).toBeUndefined();
    expect(blockedBy(fail, "saveJira")?.id).toBe("jira");
    expect(blockedBy(report({ github: true, jira: false }), "refine")).toBeUndefined();
    expect(blockedBy(report({ github: true, jira: true }), "saveJira")).toBeUndefined();
  });

  it("names only the actions blocked by failed checks", () => {
    expect(stayOffCopy(report({ github: false, jira: true }))).toBe(
      "Flightdeck can still run, but Start and GitHub save stay off until the required tools are ready.",
    );
    expect(stayOffCopy(report({ github: false, jira: true }))).not.toMatch(/Refine/);
    expect(stayOffCopy(report({ github: false, jira: false }))).toBe(
      "Flightdeck can still run, but Start, GitHub save, and Jira save stay off until the required tools are ready.",
    );
    expect(stayOffCopy(report({ github: true, jira: true }))).toBe("Flightdeck can still run.");
  });
});

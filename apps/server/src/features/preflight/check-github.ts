import { GITHUB_NEEDED_SCOPES } from "@flightdeck/shared";
import type { PreflightCheck } from "@flightdeck/shared";
import { createGithubClient } from "../github/index.ts";

const FIX = "Add a GitHub token in Settings";
const GATES = ["shape", "start", "saveGithub"] as const;

export async function checkGithub(): Promise<PreflightCheck> {
  const status = await createGithubClient().status();
  if (!status.hasToken && !status.loggedIn) {
    return fail("No GitHub token stored", FIX);
  }
  if (!status.loggedIn) {
    return fail(status.detail, FIX);
  }
  const missing = (status.scopes ?? []).includes("fine-grained")
    ? []
    : GITHUB_NEEDED_SCOPES.filter((s) => !(status.scopes ?? []).includes(s));
  if (missing.length) {
    return fail(`GitHub token is missing scopes: ${missing.join(", ")}`, FIX);
  }
  return {
    id: "github",
    label: "GitHub token",
    severity: "required",
    ok: true,
    status: "pass",
    detail: status.detail,
    gates: [...GATES],
  };
}

function fail(detail: string, fix: string): PreflightCheck {
  return {
    id: "github",
    label: "GitHub token",
    severity: "required",
    ok: false,
    status: "fail",
    detail,
    fix,
    gates: [...GATES],
  };
}

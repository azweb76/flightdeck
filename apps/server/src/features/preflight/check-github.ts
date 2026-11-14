import type { PreflightCheck } from "@flightdeck/shared";
import { createGithubClient } from "../github/index.ts";

const FIX = "Add a GitHub token in Settings";
const GATES = ["shape", "start", "saveGithub"] as const;

export async function checkGithub(): Promise<PreflightCheck> {
  const status = await createGithubClient().status();
  if (!status.hasToken) return fail("No GitHub token stored");
  if (!status.loggedIn) return fail(status.detail);
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

function fail(detail: string): PreflightCheck {
  return {
    id: "github",
    label: "GitHub token",
    severity: "required",
    ok: false,
    status: "fail",
    detail,
    fix: FIX,
    gates: [...GATES],
  };
}

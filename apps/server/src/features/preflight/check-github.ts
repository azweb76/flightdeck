import { appendGithubSourceLabel, type GithubStatus, type PreflightCheck } from "@flightdeck/shared";
import { createGithubClient } from "../github/index.ts";

const FIX = "Add a GitHub token in Settings";
const GATES = ["shape", "start", "saveGithub"] as const;

export async function checkGithub(): Promise<PreflightCheck> {
  return githubCheckFromStatus(await createGithubClient().status());
}

export function githubCheckFromStatus(status: GithubStatus): PreflightCheck {
  const detail = appendGithubSourceLabel(
    status.detail || "No GitHub token. Set GITHUB_TOKEN or paste a PAT in Settings",
    status.tokenSource,
  );
  if (!status.hasToken || !status.loggedIn) return fail(detail);
  return {
    id: "github",
    label: "GitHub token",
    severity: "required",
    ok: true,
    status: "pass",
    detail,
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

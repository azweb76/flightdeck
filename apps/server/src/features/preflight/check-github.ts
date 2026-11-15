import { appendGithubSourceLabel, githubEnvFailDetail, type GithubStatus, type PreflightCheck } from "@flightdeck/shared";
import { createGithubClient } from "../github/index.ts";

const FIX = "Add a GitHub token in Settings";
const GATES = ["refine", "start", "saveGithub"] as const;

export async function checkGithub(): Promise<PreflightCheck> {
  return githubCheckFromStatus(await createGithubClient().status());
}

export function githubCheckFromStatus(status: GithubStatus): PreflightCheck {
  if (!status.hasToken || !status.loggedIn) {
    const detail = status.hasToken ? status.detail : githubEnvFailDetail(status.tokenSource);
    return fail(detail);
  }
  return {
    id: "github",
    label: "GitHub token",
    severity: "required",
    ok: true,
    status: "pass",
    detail: appendGithubSourceLabel(status.detail, status.tokenSource),
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

import type { PreflightCheck } from "@flightdeck/shared";
import { githubStatus } from "../github/index.ts";
import type { PreflightCtx } from "./types.ts";

export async function checkGh(ctx: PreflightCtx): Promise<PreflightCheck> {
  const status = await githubStatus(ctx.exec);
  if (!status.installed) {
    return {
      id: "gh",
      label: "GitHub CLI",
      severity: "required",
      ok: false,
      status: "fail",
      detail: "gh is not installed",
      fix: "brew install gh",
      gates: ["shape", "start", "saveGithub"],
    };
  }
  if (!status.loggedIn) {
    return {
      id: "gh",
      label: "GitHub CLI",
      severity: "required",
      ok: false,
      status: "fail",
      detail: "gh is installed but not logged in",
      fix: "gh auth login",
      gates: ["shape", "start", "saveGithub"],
    };
  }
  return {
    id: "gh",
    label: "GitHub CLI",
    severity: "required",
    ok: true,
    status: "pass",
    detail: status.detail,
    gates: ["shape", "start", "saveGithub"],
  };
}

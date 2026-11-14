import type { PreflightCheck } from "@flightdeck/shared";
import type { PreflightCtx } from "./types.ts";

export async function checkJira(ctx: PreflightCtx): Promise<PreflightCheck> {
  const base = {
    id: "jira",
    label: "Jira",
    severity: "optional" as const,
    gates: ["saveJira" as const],
  };
  if (!ctx.settings.jiraConfigured) {
    return {
      ...base,
      ok: true,
      status: "skip",
      detail: "Jira is optional until you connect it in Settings",
    };
  }
  if (!ctx.hasJiraToken) {
    return {
      ...base,
      ok: false,
      status: "warn",
      detail: "Jira is configured but the API token is missing",
      fix: "Add a Jira API token in Settings",
    };
  }
  if (!ctx.jiraProbe) {
    return {
      ...base,
      ok: true,
      status: "pass",
      detail: jiraConnected(ctx),
    };
  }
  try {
    const test = await ctx.jiraProbe();
    return { ...base, ok: true, status: "pass", detail: test.detail };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Jira login failed";
    return {
      ...base,
      ok: false,
      status: "warn",
      detail: message,
      fix: "Reconnect Jira in Settings",
    };
  }
}

function jiraConnected(ctx: PreflightCtx): string {
  const email = ctx.settings.jiraEmail;
  return email ? `Jira connected as ${email}` : "Jira connected";
}

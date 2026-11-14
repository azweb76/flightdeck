import { homedir } from "node:os";
import { defaultExec } from "../exec/index.ts";
import { createJiraClient } from "../jira/index.ts";
import { createSecretStore } from "../secrets/index.ts";
import { getSettings } from "../settings/index.ts";
import { loadEngines } from "./engines.ts";
import type { PreflightCtx } from "./types.ts";

export async function liveContext(overrides: Partial<PreflightCtx> = {}): Promise<PreflightCtx> {
  const settings = overrides.settings ?? getSettings();
  const demo = process.env.FLIGHTDECK_DEMO === "1";
  const hasJiraToken =
    overrides.hasJiraToken ?? (demo ? settings.jiraConfigured : Boolean(await createSecretStore().get()));
  return {
    exec: overrides.exec ?? defaultExec,
    env: overrides.env ?? process.env,
    home: overrides.home ?? homedir(),
    nodeVersion: overrides.nodeVersion ?? process.versions.node,
    engines: overrides.engines ?? loadEngines(),
    settings,
    hasJiraToken,
    jiraProbe: overrides.jiraProbe ?? (demo ? undefined : jiraProbe(settings, hasJiraToken)),
  };
}

function jiraProbe(settings: PreflightCtx["settings"], hasToken: boolean): PreflightCtx["jiraProbe"] {
  if (!settings.jiraConfigured || !hasToken) return undefined;
  return async () => {
    const token = await createSecretStore().get();
    if (!token) throw new Error("Jira API token is missing");
    return createJiraClient().test(settings.jiraSiteUrl, settings.jiraEmail, token);
  };
}

import type { Hono } from "hono";
import { SettingsPatchSchema, type SettingsView } from "@flightdeck/shared";
import { resolveGithubToken } from "../../features/github/token.ts";
import { createSecretStore } from "../../features/secrets/index.ts";
import { pumpQueue } from "../../features/run/index.ts";
import { getSettings, patchSettings } from "../../features/settings/index.ts";
import { fail } from "../errors.ts";

export function mountSettings(app: Hono): void {
  app.get("/api/settings", async (c) => c.json(await settingsView()));
  app.patch("/api/settings", async (c) => {
    const patch = SettingsPatchSchema.parse(await c.req.json());
    patchSettings(patch);
    if (patch.maxConcurrentAgents != null) pumpQueue();
    return c.json(await settingsView());
  });
  app.post("/api/jira/save", async (c) => {
    const body = await c.req.json<{ siteUrl?: string; email?: string; token?: string; projectKey?: string }>();
    if (!body.siteUrl || !body.email) fail("Site URL and email are required");
    if (body.token?.trim()) await createSecretStore().set(body.token.trim());
    const hasJiraToken = Boolean(body.token?.trim() || (await createSecretStore().get()));
    patchSettings({
      jiraSiteUrl: body.siteUrl,
      jiraEmail: body.email,
      jiraProjectKey: body.projectKey ?? "",
      jiraConfigured: hasJiraToken,
    });
    return c.json({ ok: true, settings: await settingsView() });
  });
}

export async function settingsView(): Promise<SettingsView> {
  const github = await resolveGithubToken();
  return {
    ...getSettings(),
    githubTokenSource: github?.source,
    hasGithubToken: Boolean(github),
    hasJiraToken: Boolean(await createSecretStore().get()),
  };
}

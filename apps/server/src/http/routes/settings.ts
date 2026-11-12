import type { Hono } from "hono";
import { SettingsPatchSchema } from "@flightdeck/shared";
import { getSettings, patchSettings } from "../../features/settings/index.ts";
import { createSecretStore } from "../../features/secrets/index.ts";
import { createJiraClient } from "../../features/jira/index.ts";
import { claudeLoginInstructions } from "../../features/claude/index.ts";
import { setJiraLastError } from "../../features/status/index.ts";
import { fail } from "../errors.ts";

export function mountSettings(app: Hono): void {
  app.get("/api/settings", (c) => c.json(getSettings()));
  app.patch("/api/settings", async (c) => {
    const patch = SettingsPatchSchema.parse(await c.req.json());
    return c.json(patchSettings(patch));
  });
  app.post("/api/claude/login", (c) => c.json(claudeLoginInstructions()));
  app.post("/api/jira/connect", async (c) => {
    const body = await c.req.json<{ siteUrl?: string; email?: string; token?: string; projectKey?: string }>();
    if (!body.siteUrl || !body.email) fail("Site URL and email are required");
    if (process.env.FLIGHTDECK_DEMO === "1") return c.json(demoConnect(body));
    const token = body.token?.trim() || (await createSecretStore().get());
    if (!token) fail("Paste a Jira API token, or connect once so we can reuse the stored token");
    try {
      const test = await createJiraClient().test(body.siteUrl, body.email, token);
      if (body.token?.trim()) await createSecretStore().set(body.token.trim());
      setJiraLastError(undefined);
      const settings = patchSettings({
        jiraSiteUrl: body.siteUrl,
        jiraEmail: body.email,
        jiraProjectKey: body.projectKey ?? "",
        jiraConfigured: true,
      });
      return c.json({ ok: true, detail: test.detail, settings });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Jira login failed";
      setJiraLastError(message);
      patchSettings({ jiraConfigured: false });
      fail(message);
    }
  });
}

function demoConnect(body: { siteUrl?: string; email?: string; token?: string; projectKey?: string }) {
  if (body.token === "fail" || body.siteUrl?.includes("invalid")) {
    setJiraLastError("Jira login failed (401): Unauthorized");
    patchSettings({ jiraConfigured: false });
    fail("Jira login failed (401): Unauthorized");
  }
  setJiraLastError(undefined);
  const settings = patchSettings({
    jiraSiteUrl: body.siteUrl ?? "",
    jiraEmail: body.email ?? "",
    jiraProjectKey: body.projectKey ?? "PROJ",
    jiraConfigured: true,
  });
  return { ok: true, detail: `Connected as ${body.email} (demo)`, settings };
}

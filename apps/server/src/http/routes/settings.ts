import type { Hono } from "hono";
import { SettingsPatchSchema } from "@flightdeck/shared";
import { getSettings, patchSettings } from "../../features/settings/index.ts";
import { createSecretStore } from "../../features/secrets/index.ts";
import { createJiraClient } from "../../features/jira/index.ts";
import { startClaudeLogin } from "../../features/claude/index.ts";
import { fail } from "../errors.ts";

export function mountSettings(app: Hono): void {
  app.get("/api/settings", (c) => c.json(getSettings()));
  app.patch("/api/settings", async (c) => {
    const patch = SettingsPatchSchema.parse(await c.req.json());
    return c.json(patchSettings(patch));
  });
  app.post("/api/claude/login", async (c) => c.json(await startClaudeLogin()));
  app.post("/api/jira/connect", async (c) => {
    const body = await c.req.json<{ siteUrl?: string; email?: string; token?: string; projectKey?: string }>();
    if (!body.siteUrl || !body.email || !body.token) fail("Site URL, email and API token are required");
    if (process.env.FLIGHTDECK_DEMO === "1") return c.json(demoConnect(body));
    const test = await createJiraClient().test(body.siteUrl, body.email, body.token);
    if (!test.ok) fail(test.detail);
    await createSecretStore().set(body.token);
    const settings = patchSettings({
      jiraSiteUrl: body.siteUrl,
      jiraEmail: body.email,
      jiraProjectKey: body.projectKey ?? "",
      jiraConfigured: true,
    });
    return c.json({ ok: true, detail: test.detail, settings });
  });
}

function demoConnect(body: { siteUrl?: string; email?: string; token?: string; projectKey?: string }) {
  if (body.token === "fail" || body.siteUrl?.includes("invalid")) {
    fail("Jira login failed (401): Unauthorized");
  }
  const settings = patchSettings({
    jiraSiteUrl: body.siteUrl ?? "",
    jiraEmail: body.email ?? "",
    jiraProjectKey: body.projectKey ?? "PROJ",
    jiraConfigured: true,
  });
  return { ok: true, detail: `Connected as ${body.email} (demo)`, settings };
}

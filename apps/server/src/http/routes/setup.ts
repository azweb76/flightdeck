import { Hono } from "hono";
import { ConnectJiraSchema } from "@flightdeck/shared";
import { publish } from "../../features/events/index.ts";
import { createJiraClient } from "../../features/jira/index.ts";
import { createSecretStore } from "../../features/secrets/index.ts";
import { patchSettings } from "../../features/settings/index.ts";
import { runSetupChecks } from "../../features/setup/checks.ts";
import { applyTeamConfig, exportTeamConfig, parseTeamConfig } from "../../features/setup/import-config.ts";
import { apiError } from "../errors.ts";

/** Canonical route: setup status, Jira connect, team-config import. */
export function setupRoutes(): Hono {
  const app = new Hono();

  app.get("/status", async (c) => c.json(await runSetupChecks()));

  app.post("/recheck", async (c) => {
    publish("setup.updated");
    return c.json(await runSetupChecks());
  });

  app.post("/jira", async (c) => {
    const body = ConnectJiraSchema.parse(await c.req.json());
    const result = await createJiraClient().test(body.siteUrl, body.email, body.apiToken);
    if (!result.ok) throw apiError(401, "jira_auth", result.detail);
    await createSecretStore().set(body.apiToken);
    patchSettings({
      jiraSiteUrl: body.siteUrl,
      jiraEmail: body.email,
      jiraConfigured: true,
    });
    publish("settings.updated");
    publish("setup.updated");
    return c.json({ ok: true, detail: result.detail });
  });

  app.post("/import", async (c) => {
    const config = parseTeamConfig(await c.req.json());
    const result = applyTeamConfig(config);
    publish("repos.updated");
    publish("settings.updated");
    return c.json({ ok: true, ...result });
  });

  app.get("/export", (c) => c.json(exportTeamConfig()));

  app.post("/complete", async (c) => {
    const status = await runSetupChecks();
    const git = status.checks.find((x) => x.id === "git");
    const gh = status.checks.find((x) => x.id === "gh");
    const claude = status.checks.find((x) => x.id === "claude");
    if (!git?.ok || !gh?.ok || !claude?.ok) {
      throw apiError(400, "setup_incomplete", "Finish git, GitHub, and Claude checks first");
    }
    patchSettings({ setupComplete: true });
    publish("setup.updated");
    return c.json({ ok: true });
  });

  return app;
}

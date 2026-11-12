import type { Issue } from "@flightdeck/shared";
import { getDb } from "../db/index.ts";
import { rememberRepo } from "../clone/index.ts";
import { upsertIssue } from "../issues/store.ts";
import { patchSettings } from "../settings/index.ts";
import { setJiraLastError } from "../status/index.ts";

const NOW = "2026-11-12T12:00:00.000Z";

export function shouldSeed(): boolean {
  return process.env.FLIGHTDECK_DEMO === "1" && process.env.FLIGHTDECK_SEED !== "0";
}

export function seedDemo(): void {
  const count = (getDb().prepare("SELECT COUNT(*) AS n FROM issues").get() as { n: number }).n;
  if (count > 0) return;
  patchSettings({
    jiraSiteUrl: "https://example.atlassian.net",
    jiraEmail: "dan@example.com",
    jiraConfigured: true,
    jiraProjectKey: "PROJ",
    theme: "system",
  });
  rememberRepo("acme", "web", "/tmp/flightdeck-demo/acme/web");
  rememberRepo("acme", "api", "/tmp/flightdeck-demo/acme/api");
  for (const issue of seedIssues()) upsertIssue(issue);
}

export function resetDemo(opts: { seed: boolean }): void {
  setJiraLastError(undefined);
  getDb().exec("DELETE FROM issues; DELETE FROM repos; DELETE FROM shape_sessions; DELETE FROM settings;");
  if (opts.seed) {
    process.env.FLIGHTDECK_SEED = "1";
    seedDemo();
  } else {
    process.env.FLIGHTDECK_SEED = "0";
  }
}

function seedIssues(): Issue[] {
  return [
    {
      id: "github:acme/web#12",
      source: "github",
      key: "acme/web#12",
      title: "Export invoices as CSV",
      body: "Finance wants a CSV from the invoices page.",
      url: "https://github.com/acme/web/issues/12",
      repoSlug: "acme/web",
      updatedAt: NOW,
      saved: true,
    },
    {
      id: "jira:PROJ-150",
      source: "jira",
      key: "PROJ-150",
      title: "Invoice CSV on the web app",
      body: "Need an export for finance.",
      url: "https://example.atlassian.net/browse/PROJ-150",
      updatedAt: NOW,
      saved: true,
    },
  ];
}

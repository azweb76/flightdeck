import type { Issue } from "@flightdeck/shared";

export function demoIssues(): Issue[] {
  return [
    {
      id: "jira:PROJ-150",
      source: "jira",
      key: "PROJ-150",
      title: "Export invoices as CSV",
      body: "Add a CSV export of invoices for finance.",
      url: "https://example.atlassian.net/browse/PROJ-150",
      stage: "new",
      repos: [{ owner: "acme", name: "web", label: "gh:acme/web", registered: true }],
      repoWarning: "none",
      updatedAt: "2026-11-10T12:00:00.000Z",
    },
    {
      id: "github:acme/docs#88",
      source: "github",
      key: "acme/docs#88",
      title: "Fix broken links in docs",
      body: "Several links in README 404.",
      url: "https://github.com/acme/docs/issues/88",
      stage: "new",
      repos: [{ owner: "acme", name: "docs", registered: true }],
      repoWarning: "none",
      updatedAt: "2026-11-10T11:00:00.000Z",
    },
    {
      id: "jira:PROJ-151",
      source: "jira",
      key: "PROJ-151",
      title: "Audit log retention",
      body: "Keep audit logs for 90 days in api and web.",
      url: "https://example.atlassian.net/browse/PROJ-151",
      stage: "new",
      repos: [
        { owner: "acme", name: "api", label: "gh:acme/api", registered: true },
        { owner: "acme", name: "web", label: "gh:acme/web", registered: true },
      ],
      repoWarning: "multiple",
      updatedAt: "2026-11-09T09:00:00.000Z",
    },
  ];
}

import { Hono } from "hono";
import { IssueListQuerySchema } from "@flightdeck/shared";
import { startAdhoc } from "../../features/adhoc/index.ts";
import { getIssue, listIssues, scheduleAssignedSync } from "../../features/issues/index.ts";
import { draftGithubIssue, draftJiraIssue } from "../../features/issues/draft.ts";
import { splitIssue } from "../../features/split/index.ts";
import { getRepo } from "../../features/repos/index.ts";
import { apiError } from "../errors.ts";

export function issueRoutes(): Hono {
  const app = new Hono();
  app.get("/", async (c) => {
    const query = IssueListQuerySchema.parse({
      source: c.req.query("source") ?? "all",
      repo: c.req.query("repo"),
      refresh: c.req.query("refresh"),
    });
    const result = await listIssues(query);
    if (query.refresh !== "1" && query.refresh !== "true") {
      void scheduleAssignedSync(query);
    }
    return c.json(result);
  });
  app.post("/sync", async (c) => c.json(await listIssues({ refresh: "1" })));
  app.post("/adhoc", async (c) => {
    const body = (await c.req.json()) as { repoId: number; title: string; body: string };
    return c.json(await startAdhoc(body.repoId, body.title, body.body), 201);
  });
  app.post("/draft", async (c) => {
    const body = (await c.req.json()) as {
      source?: "github" | "jira";
      repoId?: number;
      projectKey?: string;
      title: string;
      body: string;
    };
    if (body.source === "jira") {
      if (!body.projectKey) throw apiError(400, "missing_project", "Jira project key required");
      return c.json(await draftJiraIssue(body.projectKey, body.title, body.body), 201);
    }
    const repo = getRepo(body.repoId ?? 0);
    if (!repo) throw apiError(404, "not_found", "Repo not found");
    return c.json(await draftGithubIssue(repo, body.title, body.body), 201);
  });
  app.post("/:id/repo", async (c) => {
    const body = (await c.req.json()) as { owner: string; name: string; label?: string };
    const { rememberIssuePick, rememberPick } = await import("../../features/discovery/index.ts");
    const { jiraProjectKey } = await import("@flightdeck/shared");
    const { rememberIssue } = await import("../../features/issues/index.ts");
    const issue = await getIssue(decodeURIComponent(c.req.param("id")));
    if (!issue) throw apiError(404, "not_found", "Issue not found");
    const label = body.label ?? `${body.owner}/${body.name}`;
    rememberPick(jiraProjectKey(issue.key), label, body.owner, body.name);
    rememberIssuePick(issue.id, body.owner, body.name);
    rememberIssue({
      ...issue,
      repos: [{ owner: body.owner, name: body.name, registered: true }],
      repoWarning: "none",
    });
    return c.json(await getIssue(issue.id));
  });
  app.get("/:id", async (c) => {
    const issue = await getIssue(decodeURIComponent(c.req.param("id")));
    if (!issue) throw apiError(404, "not_found", "Issue not found");
    return c.json(issue);
  });
  app.post("/:id/split", async (c) => {
    try {
      return c.json(await splitIssue(decodeURIComponent(c.req.param("id"))));
    } catch (err) {
      throw apiError(400, "split_failed", err instanceof Error ? err.message : "split failed");
    }
  });
  return app;
}

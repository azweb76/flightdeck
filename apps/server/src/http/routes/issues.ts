import { Hono } from "hono";
import { IssueListQuerySchema } from "@flightdeck/shared";
import { startAdhoc } from "../../features/adhoc/index.ts";
import { getIssue, listIssues, rememberIssue } from "../../features/issues/index.ts";
import { splitIssue } from "../../features/split/index.ts";
import { getRepo } from "../../features/repos/index.ts";
import { apiError } from "../errors.ts";

export function issueRoutes(): Hono {
  const app = new Hono();
  app.get("/", async (c) => {
    const query = IssueListQuerySchema.parse({
      source: c.req.query("source") ?? "all",
      repo: c.req.query("repo"),
    });
    return c.json(await listIssues(query));
  });
  app.post("/adhoc", async (c) => {
    const body = (await c.req.json()) as { repoId: number; title: string; body: string };
    return c.json(await startAdhoc(body.repoId, body.title, body.body), 201);
  });
  app.post("/draft", async (c) => {
    const body = (await c.req.json()) as { repoId: number; title: string; body: string };
    const repo = getRepo(body.repoId);
    if (!repo) throw apiError(404, "not_found", "Repo not found");
    const id = `adhoc:${repo.owner}/${repo.name}:${Date.now()}`;
    rememberIssue({
      id,
      source: "adhoc",
      key: `draft/${repo.name}`,
      title: body.title,
      body: body.body,
      url: "",
      stage: "new",
      repos: [{ owner: repo.owner, name: repo.name, registered: true }],
      repoWarning: "none",
      updatedAt: new Date().toISOString(),
    });
    return c.json({ id });
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

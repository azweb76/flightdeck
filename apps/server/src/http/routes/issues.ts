import { Hono } from "hono";
import { IssueListQuerySchema } from "@flightdeck/shared";
import { getIssue, listIssues } from "../../features/issues/index.ts";
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
  app.get("/:id", async (c) => {
    const id = decodeURIComponent(c.req.param("id"));
    const issue = await getIssue(id);
    if (!issue) throw apiError(404, "not_found", "Issue not found");
    return c.json(issue);
  });
  return app;
}

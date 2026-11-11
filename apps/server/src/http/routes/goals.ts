import { Hono } from "hono";
import { GoalPatchSchema, RefineAnswerSchema } from "@flightdeck/shared";
import { latestGoal } from "../../features/goals/store.ts";
import { approveGoal, questionsFor, saveGoalMarkdown, startRefine, submitAnswers } from "../../features/refine/index.ts";
import { apiError } from "../errors.ts";

export function goalRoutes(): Hono {
  const app = new Hono();
  app.get("/:id/goal", (c) => {
    const issueId = decodeURIComponent(c.req.param("id"));
    return c.json({ goal: latestGoal(issueId), questions: questionsFor(issueId) });
  });
  app.post("/:id/refine", async (c) => {
    const issueId = decodeURIComponent(c.req.param("id"));
    return c.json({ questions: await startRefine(issueId) });
  });
  app.post("/:id/refine/answers", async (c) => {
    const parsed = RefineAnswerSchema.parse({
      ...(await c.req.json()),
      issueId: decodeURIComponent(c.req.param("id")),
    });
    return c.json(await submitAnswers(parsed.issueId, parsed.answers));
  });
  app.put("/:id/goal", async (c) => {
    const issueId = decodeURIComponent(c.req.param("id"));
    const patch = GoalPatchSchema.parse(await c.req.json());
    try {
      return c.json(saveGoalMarkdown(issueId, patch.markdown));
    } catch (err) {
      throw apiError(400, "no_goal", err instanceof Error ? err.message : "no goal");
    }
  });
  app.post("/:id/goal/approve", async (c) => {
    const issueId = decodeURIComponent(c.req.param("id"));
    return c.json(await approveGoal(issueId));
  });
  return app;
}

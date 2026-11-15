import type { Hono } from "hono";
import { PrFilterSchema } from "@flightdeck/shared";
import { getMyPull, listMyPulls } from "../../features/prs/index.ts";
import { fail } from "../errors.ts";

export function mountPrs(app: Hono): void {
  app.get("/api/prs", async (c) => {
    const parsed = PrFilterSchema.safeParse(c.req.query("filter") ?? "all");
    const filter = parsed.success ? parsed.data : "all";
    return c.json({ prs: await listMyPulls(filter) });
  });
  app.get("/api/prs/:owner/:name/:number", async (c) => {
    const number = Number(c.req.param("number"));
    if (!Number.isFinite(number)) fail("Unknown pull request", 404);
    const pr = await getMyPull(c.req.param("owner"), c.req.param("name"), number);
    if (!pr) fail("Pull request not found", 404);
    return c.json(pr);
  });
}

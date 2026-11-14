import type { Hono } from "hono";
import { publish } from "../../features/events/index.ts";
import { getPreflightReport, recheckPreflight, setDemoPreflightFixture } from "../../features/preflight/index.ts";
import { fail } from "../errors.ts";

export function mountPreflight(app: Hono): void {
  app.get("/api/preflight", async (c) => {
    const refresh = c.req.query("refresh") === "1" || c.req.query("refresh") === "true";
    return c.json(await getPreflightReport({ force: refresh }));
  });
  app.post("/api/preflight/recheck", async (c) => c.json(await recheckPreflight()));
  app.post("/api/demo/preflight", async (c) => {
    if (process.env.FLIGHTDECK_DEMO !== "1") fail("Demo preflight is only available in demo mode");
    const body = await c.req.json<{ fixture?: string }>().catch(() => ({ fixture: "pass" }));
    const fixture = body.fixture === "fail" ? "fail" : "pass";
    setDemoPreflightFixture(fixture);
    const report = await getPreflightReport({ force: true });
    publish("preflight.updated", report);
    return c.json(report);
  });
}

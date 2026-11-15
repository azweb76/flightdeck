import type { Hono } from "hono";
import { publish } from "../../features/events/index.ts";
import { getPreflightReport, recheckPreflight, runChecks, setDemoPreflightFixture } from "../../features/preflight/index.ts";
import { fail } from "../errors.ts";

export function mountPreflight(app: Hono): void {
  app.get("/api/preflight", (c) => {
    const report = getPreflightReport();
    if (!report) fail("Preflight has not run yet", 503);
    return c.json(report);
  });
  app.post("/api/preflight/recheck", async (c) => c.json(await recheckPreflight()));
  app.post("/api/demo/preflight", async (c) => {
    if (process.env.FLIGHTDECK_DEMO !== "1") fail("Demo preflight is only available in demo mode");
    const body = await c.req.json<{ fixture?: string }>().catch(() => ({ fixture: "pass" }));
    const fixture = body.fixture === "fail" ? "fail" : body.fixture === "github" ? "github" : "pass";
    setDemoPreflightFixture(fixture);
    const report = await runChecks();
    publish("preflight.updated", report);
    return c.json(report);
  });
}

import type { Hono } from "hono";
import { DEFAULT_HOST } from "@flightdeck/shared";
import { resetDemo, shouldSeed } from "../../features/demo/index.ts";
import { getPreflightReport } from "../../features/preflight/index.ts";
import { appStatus } from "../../features/status/index.ts";
import { listCatalog } from "../../features/catalog/index.ts";
import { ensureClone } from "../../features/clone/index.ts";
import { fail } from "../errors.ts";

export function mountMeta(app: Hono): void {
  app.get("/api/health", (c) =>
    c.json({ ok: true, host: DEFAULT_HOST, demo: process.env.FLIGHTDECK_DEMO === "1" }),
  );
  app.get("/api/status", async (c) => c.json(await appStatus()));
  app.get("/api/preflight", (c) => c.json(getPreflightReport()));
  app.get("/api/repos", async (c) => c.json({ repos: await listCatalog() }));
  app.post("/api/repos/clone", async (c) => {
    const body = await c.req.json<{ owner?: string; name?: string }>();
    if (!body.owner || !body.name) fail("Pick a repo");
    const cloned = await ensureClone(body.owner, body.name);
    return c.json({ ok: true, localPath: cloned.localPath });
  });
  app.post("/api/demo/reset", async (c) => {
    if (process.env.FLIGHTDECK_DEMO !== "1") fail("Demo reset is only available in demo mode");
    const body = await c.req.json<{ seed?: boolean }>().catch(() => ({ seed: shouldSeed() }));
    resetDemo({ seed: body.seed !== false });
    return c.json({ ok: true, seed: process.env.FLIGHTDECK_SEED !== "0" });
  });
}

import type { Hono } from "hono";
import {
  clearGithubToken,
  pollDeviceFlow,
  saveGithubToken,
  setDemoGithubMode,
  startDeviceFlow,
} from "../../features/github/index.ts";
import { resolveGithubToken } from "../../features/github/token.ts";
import { fail } from "../errors.ts";

export function mountGithub(app: Hono): void {
  app.post("/api/github/token", async (c) => {
    const body = await c.req.json<{ token?: string }>();
    const token = body.token?.trim() ?? "";
    if (!token) fail("Paste a GitHub personal access token");
    await saveGithubToken(token);
    if (process.env.FLIGHTDECK_DEMO === "1") setDemoGithubMode("connected");
    return c.json(await githubSecret());
  });
  app.post("/api/github/disconnect", async (c) => {
    await clearGithubToken();
    if (process.env.FLIGHTDECK_DEMO === "1") setDemoGithubMode("empty");
    return c.json(await githubSecret());
  });
  app.post("/api/github/device", async (c) => {
    if (process.env.FLIGHTDECK_DEMO === "1") fail("Device login is not used in demo mode");
    return c.json(await startDeviceFlow());
  });
  app.post("/api/github/device/poll", async (c) => {
    if (process.env.FLIGHTDECK_DEMO === "1") fail("Device login is not used in demo mode");
    const body = await c.req.json<{ device_code?: string }>();
    if (!body.device_code) fail("Missing device_code");
    return c.json(await pollDeviceFlow(body.device_code));
  });
}

async function githubSecret(): Promise<{ ok: true; tokenSource?: string; hasGithubToken: boolean }> {
  const resolved = await resolveGithubToken();
  return { ok: true, tokenSource: resolved?.source, hasGithubToken: Boolean(resolved) };
}

import type { Hono } from "hono";
import {
  clearGithubToken,
  createGithubClient,
  demoGithubStatus,
  pollDeviceFlow,
  saveGithubToken,
  setDemoGithubMode,
  startDeviceFlow,
} from "../../features/github/index.ts";
import { patchGithubPreflight } from "../../features/preflight/index.ts";
import { fail } from "../errors.ts";

export function mountGithub(app: Hono): void {
  app.post("/api/github/token", async (c) => {
    const body = await c.req.json<{ token?: string }>();
    const token = body.token?.trim() ?? "";
    if (process.env.FLIGHTDECK_DEMO === "1") return c.json(await demoToken(token));
    if (!token) fail("Paste a GitHub personal access token");
    await saveGithubToken(token);
    const status = await createGithubClient().status();
    if (!status.loggedIn) fail(status.detail);
    patchGithubPreflight(status);
    return c.json({ ok: true, status });
  });
  app.post("/api/github/disconnect", async (c) => {
    if (process.env.FLIGHTDECK_DEMO === "1") {
      setDemoGithubMode("empty");
      patchGithubPreflight(demoGithubStatus());
      return c.json({ ok: true, status: demoGithubStatus() });
    }
    await clearGithubToken();
    const status = await createGithubClient().status();
    patchGithubPreflight(status);
    return c.json({ ok: true, status });
  });
  app.post("/api/github/device", async (c) => {
    if (process.env.FLIGHTDECK_DEMO === "1") fail("Device login is not used in demo mode");
    return c.json(await startDeviceFlow());
  });
  app.post("/api/github/device/poll", async (c) => {
    if (process.env.FLIGHTDECK_DEMO === "1") fail("Device login is not used in demo mode");
    const body = await c.req.json<{ device_code?: string }>();
    if (!body.device_code) fail("Missing device_code");
    const result = await pollDeviceFlow(body.device_code);
    if ("ok" in result) patchGithubPreflight(await createGithubClient().status());
    return c.json(result);
  });
}

async function demoToken(token: string): Promise<{ ok: boolean; status: ReturnType<typeof demoGithubStatus> }> {
  if (!token) {
    setDemoGithubMode("empty");
    patchGithubPreflight(demoGithubStatus());
    return { ok: true, status: demoGithubStatus() };
  }
  if (token === "fail") {
    setDemoGithubMode("error");
    patchGithubPreflight(demoGithubStatus());
    fail("GitHub token was rejected (401). Create a new PAT and paste it in Settings.");
  }
  if (token === "scopes") {
    setDemoGithubMode("scopes");
    patchGithubPreflight(demoGithubStatus());
    fail(demoGithubStatus().detail);
  }
  setDemoGithubMode("connected");
  patchGithubPreflight(demoGithubStatus());
  return { ok: true, status: demoGithubStatus() };
}

import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dataDir = process.env.FLIGHTDECK_DATA_DIR ?? mkdtempSync(join(tmpdir(), "fd-e2e-"));
const apiPort = process.env.FLIGHTDECK_PORT ?? "47421";
const webPort = process.env.FLIGHTDECK_WEB_PORT ?? "47422";
const shots = process.env.PHASE1_SHOTS === "1";
process.env.FLIGHTDECK_DATA_DIR = dataDir;
process.env.FLIGHTDECK_DEMO = "1";
process.env.FLIGHTDECK_PORT = apiPort;
process.env.FLIGHTDECK_WEB_PORT = webPort;

const env = {
  ...process.env,
  FLIGHTDECK_DEMO: "1",
  FLIGHTDECK_DATA_DIR: dataDir,
  FLIGHTDECK_HOST: "127.0.0.1",
  FLIGHTDECK_PORT: apiPort,
  FLIGHTDECK_WEB_PORT: webPort,
};

export default defineConfig({
  testDir: ".",
  testMatch: shots ? ["screenshots.spec.ts"] : ["phase1.spec.ts"],
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  },
  webServer: [
    {
      command: "pnpm --filter @flightdeck/server start",
      url: `http://127.0.0.1:${apiPort}/api/health`,
      reuseExistingServer: false,
      cwd: join(import.meta.dirname, "../.."),
      env,
    },
    {
      command: "pnpm --filter @flightdeck/web dev",
      url: `http://127.0.0.1:${webPort}`,
      reuseExistingServer: false,
      cwd: join(import.meta.dirname, "../.."),
      env,
    },
  ],
});

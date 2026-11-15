import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dataDir = process.env.FLIGHTDECK_DATA_DIR ?? mkdtempSync(join(tmpdir(), "fd-e2e-"));
const apiPort = process.env.FLIGHTDECK_PORT ?? "47421";
const webPort = process.env.FLIGHTDECK_WEB_PORT ?? "47422";
const shots = process.env.PHASE1_SHOTS === "1";
const preflightShots = process.env.PREFLIGHT_SHOTS === "1";
const octokitShots = process.env.OCTOKIT_SHOTS === "1";
const octokitFixes = process.env.OCTOKIT_FIXES === "1";
const phase2Shots = process.env.PHASE2_SHOTS === "1";
const leaveDemoShots = process.env.LEAVE_DEMO_SHOTS === "1";
const fieldsShots = process.env.FIELDS_SHOTS === "1";
const phase3Shots = process.env.PHASE3_SHOTS === "1";
const phase4Shots = process.env.PHASE4_SHOTS === "1";
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
  GITHUB_TOKEN: process.env.GITHUB_TOKEN ?? "test-env-github-token",
};

export default defineConfig({
  testDir: ".",
  testMatch: shots
    ? ["screenshots.spec.ts"]
    : preflightShots
      ? ["preflight-shots.spec.ts"]
      : octokitShots
        ? ["octokit-shots.spec.ts"]
        : octokitFixes
          ? ["octokit-fixes.spec.ts"]
          : phase2Shots
            ? ["phase2-shots.spec.ts"]
            : leaveDemoShots
              ? ["leave-demo-shots.spec.ts"]
              : fieldsShots
                ? ["fields-shots.spec.ts"]
                : phase3Shots
                  ? ["phase3-shots.spec.ts"]
                  : phase4Shots
                    ? ["phase4-shots.spec.ts"]
                    : ["phase1.spec.ts", "preflight.spec.ts", "phase2.spec.ts", "phase3.spec.ts", "phase4.spec.ts"],
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  },
  webServer: leaveDemoShots
    ? [
        {
          command: "node apps/e2e/start-live-after-demo.mjs",
          url: `http://127.0.0.1:${webPort}`,
          reuseExistingServer: false,
          cwd: join(import.meta.dirname, "../.."),
          env,
          timeout: 120_000,
        },
      ]
    : [
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

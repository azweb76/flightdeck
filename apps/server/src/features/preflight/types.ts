import type { Settings } from "@flightdeck/shared";
import type { ExecFn } from "../exec/index.ts";

export type PreflightCtx = {
  exec: ExecFn;
  env: NodeJS.ProcessEnv;
  home: string;
  nodeVersion: string;
  engines: { node: string; pnpm: string };
  settings: Settings;
  hasJiraToken: boolean;
  jiraProbe?: () => Promise<{ ok: boolean; detail: string }>;
};

export type DemoPreflightFixture = "pass" | "fail" | "github";

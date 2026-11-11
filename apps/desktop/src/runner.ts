import { spawn, type ChildProcess } from "node:child_process";

export type ServerHandle = { proc?: ChildProcess; port: number };

export async function ensureServer(port: number, repoRoot: string): Promise<ChildProcess | undefined> {
  if (process.env.FLIGHTDECK_UI_URL) return undefined;
  if (await ping(port)) return undefined;
  return spawn("pnpm", ["--filter", "@flightdeck/server", "start"], {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, FLIGHTDECK_HOST: "127.0.0.1", FLIGHTDECK_PORT: String(port) },
  });
}

export async function runnerBusy(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/runner`);
    const body = (await res.json()) as { active?: number };
    return Number(body.active) > 0;
  } catch {
    return false;
  }
}

async function ping(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultExec, type ExecFn } from "../exec/index.ts";
import { dataDir } from "../../paths.ts";
import { resolveGithubToken } from "./token.ts";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "askpass.mjs");

export function askpassPath(): string {
  const dir = dataDir();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const dest = join(dir, "askpass.mjs");
  const body = readFileSync(SRC, "utf8");
  writeFileSync(dest, body, { encoding: "utf8", mode: 0o700 });
  chmodSync(dest, 0o700);
  return dest;
}

export async function gitAuthEnv(): Promise<NodeJS.ProcessEnv> {
  const resolved = await resolveGithubToken();
  return {
    GIT_ASKPASS: askpassPath(),
    GIT_TERMINAL_PROMPT: "0",
    GCM_INTERACTIVE: "never",
    ...(resolved ? { GITHUB_TOKEN: resolved.token } : {}),
  };
}

export async function gitClone(
  exec: ExecFn = defaultExec,
  owner: string,
  name: string,
  dest: string,
): Promise<{ ok: boolean; detail: string }> {
  const r = await exec("git", ["clone", `https://github.com/${owner}/${name}.git`, dest], {
    timeoutMs: 120_000,
    env: await gitAuthEnv(),
  });
  if (r.code !== 0) return { ok: false, detail: r.stderr || "clone failed" };
  return { ok: true, detail: dest };
}

export async function gitFetch(exec: ExecFn, dest: string): Promise<void> {
  const r = await exec("git", ["fetch", "origin"], { cwd: dest, timeoutMs: 60_000, env: await gitAuthEnv() });
  if (r.code !== 0) throw new Error(r.stderr || "git fetch failed");
}

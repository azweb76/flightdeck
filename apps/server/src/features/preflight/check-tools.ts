import type { PreflightCheck } from "@flightdeck/shared";
import type { ExecFn } from "../exec/index.ts";
import { MIN_GIT } from "./engines.ts";
import type { PreflightCtx } from "./types.ts";
import { meetsMin, parseTriple } from "./version.ts";

export async function checkPnpm(ctx: PreflightCtx): Promise<PreflightCheck> {
  const version = await toolVersion(ctx.exec, "pnpm", ["--version"]);
  if (!version) {
    return {
      id: "pnpm",
      label: "pnpm",
      severity: "required",
      ok: false,
      status: "fail",
      detail: "pnpm is not installed",
      fix: "corepack enable",
      gates: ["shape", "start"],
    };
  }
  const ok = meetsMin(version, ctx.engines.pnpm);
  return {
    id: "pnpm",
    label: "pnpm",
    severity: "required",
    ok,
    status: ok ? "pass" : "fail",
    version,
    detail: ok ? `pnpm ${version} (need ${ctx.engines.pnpm})` : `pnpm ${version} is too old (need ${ctx.engines.pnpm})`,
    fix: ok ? undefined : "corepack enable",
    gates: ["shape", "start"],
  };
}

export async function checkGit(ctx: PreflightCtx): Promise<PreflightCheck> {
  const raw = await toolOutput(ctx.exec, "git", ["--version"]);
  const version = raw ? parseTriple(raw)?.join(".") : undefined;
  if (!version) {
    return {
      id: "git",
      label: "git",
      severity: "required",
      ok: false,
      status: "fail",
      detail: "git is not installed",
      fix: "brew install git",
      gates: ["shape", "start"],
    };
  }
  const worktree = await ctx.exec("git", ["worktree", "-h"], { timeoutMs: 5_000 });
  const recent = meetsMin(version, `>=${MIN_GIT}`);
  const ok = recent && worktree.code === 0;
  return {
    id: "git",
    label: "git",
    severity: "required",
    ok,
    status: ok ? "pass" : "fail",
    version,
    detail: gitDetail(version, recent, worktree.code === 0),
    fix: ok ? undefined : "brew install git",
    gates: ["shape", "start"],
  };
}

async function toolVersion(exec: ExecFn, file: string, args: string[]): Promise<string | undefined> {
  const raw = await toolOutput(exec, file, args);
  return raw?.match(/(\d+\.\d+(?:\.\d+)?)/)?.[1];
}

async function toolOutput(exec: ExecFn, file: string, args: string[]): Promise<string | undefined> {
  const r = await exec(file, args, { timeoutMs: 5_000 });
  if (r.code !== 0) return undefined;
  return `${r.stdout}\n${r.stderr}`.trim();
}

function gitDetail(version: string, recent: boolean, worktree: boolean): string {
  if (!recent) return `git ${version} is too old for worktrees (need >=${MIN_GIT})`;
  if (!worktree) return `git ${version} does not support worktrees`;
  return `git ${version} (worktrees ok)`;
}

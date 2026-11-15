import type { PreflightCheck } from "@flightdeck/shared";
import type { ExecFn } from "../exec/index.ts";
import { MIN_GIT } from "./engines.ts";
import type { PreflightCtx } from "./types.ts";
import { meetsMin, parseGitVersion } from "./version.ts";

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
      gates: ["refine", "start"],
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
    gates: ["refine", "start"],
  };
}

export async function checkGit(ctx: PreflightCtx): Promise<PreflightCheck> {
  const raw = await toolOutput(ctx.exec, "git", ["--version"]);
  const version = raw ? parseGitVersion(raw)?.join(".") : undefined;
  if (!version) {
    return {
      id: "git",
      label: "git",
      severity: "required",
      ok: false,
      status: "fail",
      detail: "git is not installed",
      fix: "brew install git",
      gates: ["refine", "start"],
    };
  }
  const help = await ctx.exec("git", ["worktree", "-h"], { timeoutMs: 5_000 });
  const recent = meetsMin(version, `>=${MIN_GIT}`);
  const worktree = recent || worktreeHelpOk(help);
  const ok = recent;
  return {
    id: "git",
    label: "git",
    severity: "required",
    ok,
    status: ok ? "pass" : "fail",
    version,
    detail: gitDetail(version, recent, worktree),
    fix: ok ? undefined : "brew install git",
    gates: ["refine", "start"],
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

export function worktreeHelpOk(r: { code: number; stdout: string; stderr: string }): boolean {
  const text = `${r.stdout}\n${r.stderr}`;
  if (r.code === 0) return true;
  return r.code === 129 && /worktree|usage/i.test(text);
}

function gitDetail(version: string, recent: boolean, worktree: boolean): string {
  if (!recent) return `git ${version} is too old for worktrees (need >=${MIN_GIT})`;
  if (!worktree) return `git ${version} does not support worktrees`;
  return `git ${version} (worktrees ok)`;
}

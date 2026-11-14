import type { PreflightCheck } from "@flightdeck/shared";
import { detectClaudeConfig } from "../claude/index.ts";
import type { PreflightCtx } from "./types.ts";

export async function checkClaude(ctx: PreflightCtx): Promise<PreflightCheck> {
  const status = await detectClaudeConfig({ exec: ctx.exec, home: ctx.home, env: ctx.env });
  const helperFailed = status.apiKeyHelper && status.apiKeyHelperOk === false;
  const ok = status.found && !helperFailed;
  return {
    id: "claude",
    label: "Claude auth",
    severity: "required",
    ok,
    status: ok ? "pass" : "fail",
    detail: helperFailed ? "apiKeyHelper failed" : status.detail,
    fix: ok ? undefined : "Run claude, then type /login",
    gates: ["shape", "start"],
  };
}

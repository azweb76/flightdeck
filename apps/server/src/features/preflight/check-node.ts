import type { PreflightCheck } from "@flightdeck/shared";
import type { PreflightCtx } from "./types.ts";
import { meetsMin } from "./version.ts";

export function checkNode(ctx: PreflightCtx): PreflightCheck {
  const version = ctx.nodeVersion;
  const ok = meetsMin(version, ctx.engines.node);
  return {
    id: "node",
    label: "Node.js",
    severity: "required",
    ok,
    status: ok ? "pass" : "fail",
    version,
    detail: ok
      ? `Node.js ${version} (need ${ctx.engines.node})`
      : `Node.js ${version} is too old (need ${ctx.engines.node})`,
    fix: ok ? undefined : "brew install node@22",
    gates: ["shape", "start"],
  };
}

export function nodeTooOld(checks: PreflightCheck[]): boolean {
  return checks.some((c) => c.id === "node" && !c.ok);
}

import { blockedBy, type PreflightGate } from "@flightdeck/shared";
import { getPreflightReport } from "./report.ts";

export class PreflightBlockedError extends Error {
  readonly status = 409;
  constructor(message: string) {
    super(message);
    this.name = "PreflightBlockedError";
  }
}

export function assertPreflightGate(gate: PreflightGate): void {
  const report = getPreflightReport();
  if (!report) throw new PreflightBlockedError("Preflight has not run yet");
  const blocked = blockedBy(report, gate);
  if (!blocked) return;
  const base = `${blocked.label}: ${blocked.detail}`.replace(/\.$/, "");
  const message = blocked.fix ? `${base}.\nFix: ${blocked.fix}` : `${base}.`;
  throw new PreflightBlockedError(message);
}

import type { PreflightCheck } from "@flightdeck/shared";

export function statusColor(status: PreflightCheck["status"]): "success" | "error" | "warning" | "default" {
  if (status === "pass") return "success";
  if (status === "fail") return "error";
  if (status === "warn") return "warning";
  return "default";
}

export function statusLabel(status: PreflightCheck["status"]): string {
  if (status === "pass") return "Pass";
  if (status === "fail") return "Fail";
  if (status === "warn") return "Warn";
  return "Skip";
}

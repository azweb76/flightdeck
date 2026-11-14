import type { PreflightCheck } from "@flightdeck/shared";

export function chipTone(status: PreflightCheck["status"]): { bgcolor: string; color: string } {
  if (status === "pass") return { bgcolor: "#248a3d", color: "#fff" };
  if (status === "fail") return { bgcolor: "#d70015", color: "#fff" };
  if (status === "warn") return { bgcolor: "#ffd60a", color: "#1d1d1f" };
  return { bgcolor: "#6e6e73", color: "#fff" };
}

export function statusLabel(status: PreflightCheck["status"]): string {
  if (status === "pass") return "Pass";
  if (status === "fail") return "Fail";
  if (status === "warn") return "Warn";
  return "Skip";
}

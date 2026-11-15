import type { ChangeStatus } from "@flightdeck/shared";
import type { SxProps, Theme } from "@mui/material/styles";

export function chipColor(status: ChangeStatus, interrupted = false, ciPhase?: string): "default" | "success" | "warning" | "error" | "info" {
  if (interrupted) return "warning";
  if (status === "done") return "success";
  if (status === "asking" || status === "needs_dan") return "warning";
  if (status === "cap_hit" || status === "error") return "error";
  if (status === "queued" || status === "archived" || ciPhase === "queued") return "default";
  return "info";
}

/** Gold chip that stays readable in light and dark. */
export const askingChipSx: SxProps<Theme> = {
  bgcolor: "warning.light",
  color: "warning.contrastText",
  fontWeight: 600,
};

/** Grey default chips fail contrast on white; use a solid fill. */
export const queuedChipSx: SxProps<Theme> = {
  bgcolor: "#5c5c5e",
  color: "#fff",
  fontWeight: 600,
};

export const interruptedChipSx: SxProps<Theme> = {
  bgcolor: "#7a3e00",
  color: "#fff",
  fontWeight: 600,
};

export const archivedChipSx: SxProps<Theme> = {
  bgcolor: "#3a3a3c",
  color: "#fff",
  fontWeight: 600,
};

export function chipSx(status: ChangeStatus, interrupted = false, ciPhase?: string): SxProps<Theme> | undefined {
  if (interrupted) return interruptedChipSx;
  if (status === "asking" || status === "needs_dan") return askingChipSx;
  if (status === "queued" || ciPhase === "queued") return queuedChipSx;
  if (status === "archived") return archivedChipSx;
  return undefined;
}

export function archiveDisabled(status: ChangeStatus, interrupted = false): boolean {
  if (interrupted || status === "queued") return false;
  return ["planning", "implementing", "reviewing", "opening_pr", "fixing_ci", "archived"].includes(status);
}

export function statusChip(status: ChangeStatus, interrupted = false, askReason?: string, ciPhase?: string): string {
  if (interrupted) return "Interrupted";
  if (ciPhase === "queued") return "Waiting for slot";
  if (status === "queued") return "Queued";
  if (status === "planning") return "Plan";
  if (status === "implementing") return "Implement";
  if (status === "reviewing") return "Review";
  if (status === "asking") return "Needs you";
  if (status === "opening_pr") return "Draft PR";
  if (status === "watching_ci") return "CI";
  if (status === "fixing_ci") return "Fixing CI";
  if (status === "done") return "Done";
  if (status === "needs_dan") return askReason === "ci_action_required" ? "GitHub action" : "Needs you";
  if (status === "cap_hit") return "Cap hit";
  if (status === "archived") return "Archived";
  return "Error";
}

export function stageLabel(status: ChangeStatus, interrupted = false, ciPhase?: string): string {
  if (interrupted) return "Interrupted";
  if (ciPhase === "queued") return "Waiting for slot";
  if (status === "queued") return "Queued";
  if (status === "planning") return "Plan";
  if (status === "implementing") return "Implement";
  if (status === "reviewing") return "Review";
  if (status === "asking" || status === "needs_dan") return "Waiting";
  if (status === "opening_pr") return "Draft PR";
  if (status === "watching_ci") return "CI";
  if (status === "fixing_ci") return "Fixing CI";
  if (status === "done") return "Done";
  if (status === "cap_hit") return "Cap";
  if (status === "archived") return "Archived";
  return "Error";
}

export function formatElapsed(fromIso: string, toMs = Date.now()): string {
  const from = new Date(fromIso).getTime();
  if (Number.isNaN(from)) return "—";
  const sec = Math.max(0, Math.floor((toMs - from) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

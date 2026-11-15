import type { ChangeStatus } from "@flightdeck/shared";
import type { SxProps, Theme } from "@mui/material/styles";

export function chipColor(status: ChangeStatus): "default" | "success" | "warning" | "error" | "info" {
  if (status === "done") return "success";
  if (status === "asking" || status === "needs_dan") return "warning";
  if (status === "cap_hit" || status === "error") return "error";
  if (status === "queued" || status === "archived") return "default";
  return "info";
}

/** Gold chip that stays readable in light and dark. */
export const askingChipSx: SxProps<Theme> = {
  bgcolor: "warning.light",
  color: "warning.contrastText",
  fontWeight: 600,
};

export function archiveDisabled(status: ChangeStatus, interrupted = false): boolean {
  if (interrupted || status === "queued") return false;
  return ["planning", "implementing", "reviewing", "opening_pr", "archived"].includes(status);
}

export function statusChip(status: ChangeStatus): string {
  if (status === "queued") return "Queued";
  if (status === "planning") return "Plan";
  if (status === "implementing") return "Implement";
  if (status === "reviewing") return "Review";
  if (status === "asking") return "Needs you";
  if (status === "opening_pr") return "Draft PR";
  if (status === "done") return "Done";
  if (status === "needs_dan") return "Needs you";
  if (status === "cap_hit") return "Cap hit";
  if (status === "archived") return "Archived";
  return "Error";
}

export function stageLabel(status: ChangeStatus): string {
  if (status === "queued") return "Queued";
  if (status === "planning") return "Plan";
  if (status === "implementing") return "Implement";
  if (status === "reviewing") return "Review";
  if (status === "asking" || status === "needs_dan") return "Waiting";
  if (status === "opening_pr") return "Draft PR";
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

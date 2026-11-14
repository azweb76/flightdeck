import type { ChangeStatus } from "@flightdeck/shared";
import type { SxProps, Theme } from "@mui/material/styles";

export function chipColor(status: ChangeStatus): "default" | "success" | "warning" | "error" | "info" {
  if (status === "done") return "success";
  if (status === "asking") return "warning";
  if (status === "needs_dan" || status === "cap_hit" || status === "error") return "error";
  if (status === "archived") return "default";
  return "info";
}

/** Gold chip that stays readable in light and dark. */
export const askingChipSx: SxProps<Theme> = {
  bgcolor: "warning.light",
  color: "warning.contrastText",
  fontWeight: 600,
};

export function archiveDisabled(status: ChangeStatus): boolean {
  return ["planning", "implementing", "reviewing", "opening_pr", "archived"].includes(status);
}

export function statusChip(status: ChangeStatus): string {
  if (status === "planning") return "Plan";
  if (status === "implementing") return "Implement";
  if (status === "reviewing") return "Review";
  if (status === "asking") return "Needs you";
  if (status === "opening_pr") return "Draft PR";
  if (status === "done") return "Done";
  if (status === "needs_dan") return "Ask Dan";
  if (status === "cap_hit") return "Cap hit";
  if (status === "archived") return "Archived";
  return "Error";
}

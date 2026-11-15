import type { PrReviewStatus } from "@flightdeck/shared";
import type { SxProps, Theme } from "@mui/material/styles";
import { archivedChipSx, interruptedChipSx, queuedChipSx } from "./changeStatus.ts";

export function reviewStatusLabel(status: PrReviewStatus, interrupted = false): string {
  if (interrupted) return "Interrupted";
  if (status === "requested") return "Not started";
  if (status === "selected") return "Selected";
  if (status === "queued") return "Waiting for slot";
  if (status === "reviewing") return "Reviewing";
  if (status === "drafts") return "Drafts ready";
  if (status === "posted") return "Posted";
  if (status === "cap_hit") return "Cap hit";
  if (status === "archived") return "Archived";
  if (status === "error") return "Error";
  return status;
}

export function reviewStatusColor(
  status: PrReviewStatus,
  interrupted = false,
): "default" | "success" | "warning" | "error" | "info" {
  if (interrupted) return "warning";
  if (status === "posted") return "success";
  if (status === "drafts") return "info";
  if (status === "reviewing" || status === "selected") return "info";
  if (status === "cap_hit" || status === "error") return "error";
  return "default";
}

export function reviewChipSx(status: PrReviewStatus, interrupted = false): SxProps<Theme> | undefined {
  if (interrupted) return interruptedChipSx;
  if (status === "queued" || status === "requested") return queuedChipSx;
  if (status === "archived") return archivedChipSx;
  return undefined;
}

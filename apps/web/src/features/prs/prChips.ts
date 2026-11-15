import type { OwnPr } from "@flightdeck/shared";

export function ciLabel(ci: OwnPr["ci"]): string {
  if (ci === "passing") return "CI passing";
  if (ci === "failing") return "CI failing";
  if (ci === "pending") return "CI pending";
  if (ci === "action_required") return "CI needs you";
  return "CI unknown";
}

export function ciColor(ci: OwnPr["ci"]): "success" | "error" | "warning" | "default" {
  if (ci === "passing") return "success";
  if (ci === "failing") return "error";
  if (ci === "pending" || ci === "action_required") return "warning";
  return "default";
}

export function reviewLabel(review: OwnPr["review"]): string {
  if (review === "approved") return "Approved";
  if (review === "changes_requested") return "Changes requested";
  if (review === "commented") return "Commented";
  return "No review";
}

import { MAX_REVIEW_ROUNDS, type ChangeStatus } from "@flightdeck/shared";

export { MAX_REVIEW_ROUNDS };

export type CapHit = "ok" | "run" | "daily";

export function reviewLimit(round: number, extra: boolean): number {
  return extra && round >= MAX_REVIEW_ROUNDS ? round + 1 : MAX_REVIEW_ROUNDS;
}

export function nextAfterReview(round: number, passed: boolean): ChangeStatus {
  if (passed) return "opening_pr";
  if (round >= MAX_REVIEW_ROUNDS) return "needs_dan";
  return "implementing";
}

export function canReply(status: ChangeStatus): boolean {
  return status === "asking" || status === "needs_dan";
}

export function canArchive(status: ChangeStatus): boolean {
  return status !== "planning" && status !== "implementing" && status !== "reviewing" && status !== "opening_pr" && status !== "archived";
}

export function activeStatuses(): ChangeStatus[] {
  return ["planning", "implementing", "reviewing", "asking", "opening_pr"];
}

export function checkCaps(spentRun: number, spentDaily: number, add: number, runCap: number, dailyCap: number): CapHit {
  if (spentRun + add > runCap) return "run";
  if (spentDaily + add > dailyCap) return "daily";
  return "ok";
}

export function parseReviewVerdict(text: string): boolean {
  if (/CHANGES[_ ]NEEDED|REQUEST_CHANGES|FAIL(ED)?\b/i.test(text)) return false;
  return /APPROVE|ACCEPT|all acceptance criteria (are )?met/i.test(text);
}

import { MAX_CI_ROUNDS, MAX_REVIEW_ROUNDS, type ChangeStatus } from "@flightdeck/shared";

export { MAX_CI_ROUNDS, MAX_REVIEW_ROUNDS };

export type CapHit = "ok" | "run" | "daily";

const AGENT_RUNNING: ChangeStatus[] = [
  "planning",
  "implementing",
  "reviewing",
  "opening_pr",
  "watching_ci",
  "fixing_ci",
];
const SLOT: ChangeStatus[] = [...AGENT_RUNNING, "asking", "needs_dan"];

export function reviewLimit(round: number, extra: boolean): number {
  return extra && round >= MAX_REVIEW_ROUNDS ? round + 1 : MAX_REVIEW_ROUNDS;
}

export function ciLimit(round: number, extra: boolean): number {
  return extra && round >= MAX_CI_ROUNDS ? round + 1 : MAX_CI_ROUNDS;
}

export function nextAfterReview(round: number, passed: boolean): ChangeStatus {
  if (passed) return "opening_pr";
  if (round >= MAX_REVIEW_ROUNDS) return "needs_dan";
  return "implementing";
}

export function canReply(status: ChangeStatus): boolean {
  return status === "asking" || status === "needs_dan";
}

export function isAgentRunning(status: ChangeStatus): boolean {
  return AGENT_RUNNING.includes(status);
}

export function occupiesSlot(status: ChangeStatus): boolean {
  return SLOT.includes(status);
}

export function canArchive(status: ChangeStatus, interrupted = false): boolean {
  if (status === "archived") return false;
  if (interrupted || status === "queued" || status === "watching_ci") return true;
  return !isAgentRunning(status);
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

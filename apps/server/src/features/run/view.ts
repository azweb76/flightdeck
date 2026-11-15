import type { Change } from "@flightdeck/shared";
import { getJob } from "./jobs.ts";
import { isAgentRunning } from "./machine.ts";

export function isInterrupted(change: Change): boolean {
  return isAgentRunning(change.status) && !getJob(change.id);
}

export function presentChange(change: Change): Change {
  return { ...change, interrupted: isInterrupted(change) };
}

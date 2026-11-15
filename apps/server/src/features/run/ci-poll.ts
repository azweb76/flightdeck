import type { Change } from "@flightdeck/shared";
import { commitChecks, graceSinceMs, type CommitChecks } from "../github/checks.ts";
import { getPullState } from "../github/prs.ts";
import type { FetchFn } from "../github/octokit.ts";
import { getChange } from "./store.ts";

const polls = new Map<string, AbortController>();

export type PollResult = CommitChecks | { state: "stopped"; sha: string; summary: string };

export type CiPollDeps = {
  fetchFn?: FetchFn;
  checks?: typeof commitChecks;
  pullState?: typeof getPullState;
  pollMs?: number;
};

export function abortCiWatch(id: string): void {
  polls.get(id)?.abort();
}

export function attachCiPoll(id: string): AbortController {
  polls.get(id)?.abort();
  const ac = new AbortController();
  polls.set(id, ac);
  return ac;
}

export function detachCiPoll(id: string): void {
  polls.delete(id);
}

export async function waitForChecks(
  token: string,
  owner: string,
  name: string,
  ref: string,
  change: Change,
  signal: AbortSignal,
  deps: CiPollDeps = {},
): Promise<PollResult> {
  const fetchFn = deps.fetchFn ?? fetch;
  const checks = deps.checks ?? commitChecks;
  const pullState = deps.pullState ?? getPullState;
  const pollMs = deps.pollMs ?? 15_000;
  for (;;) {
    if (signal.aborted) return { state: "stopped", sha: ref, summary: "CI watch stopped." };
    const fresh = getChange(change.id);
    if (!fresh || fresh.status === "archived") {
      return { state: "stopped", sha: ref, summary: "Run archived." };
    }
    let pr: { state: string; merged: boolean; createdAt?: string; updatedAt?: string; committedAt?: string } | undefined;
    if (change.prNumber) {
      pr = await pullState(token, fetchFn, owner, name, change.prNumber, {
        headCommit: !change.ciPushedAt,
      });
      if (pr.merged) return { state: "stopped", sha: ref, summary: "Pull request merged." };
      if (pr.state === "closed") return { state: "stopped", sha: ref, summary: "Pull request closed." };
    }
    const sinceMs = graceSinceMs(change, pr);
    const result = await checks(token, fetchFn, owner, name, ref, { fresh: true, sinceMs });
    if (result.state !== "pending") return result;
    if (process.env.FLIGHTDECK_RUN_FAST === "1" && deps.pollMs == null) return result;
    await sleep(process.env.FLIGHTDECK_RUN_FAST === "1" ? 0 : pollMs, signal);
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

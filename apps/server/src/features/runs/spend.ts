import { roundUsd, type Run } from "@flightdeck/shared";
import { getSettings, patchSettings } from "../settings/index.ts";
import { publish } from "../events/index.ts";
import { listRuns } from "./store.ts";

export type SpendStatus = {
  todayUsd: number;
  capUsd: number;
  blocked: boolean;
  reason?: string;
};

const LIVE = new Set<Run["status"]>(["queued", "running", "paused", "asking"]);

export function localDay(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Sum of run.costUsd for live runs plus finished/failed/interrupted runs that spent on this local day. */
export function todaySpend(now = new Date()): number {
  const day = localDay(now);
  let sum = 0;
  for (const run of listRuns()) {
    if (!countsTowardDay(run, day)) continue;
    sum += run.costUsd;
  }
  return roundUsd(sum);
}

export function spendStatus(now = new Date()): SpendStatus {
  const settings = getSettings();
  const todayUsd = todaySpend(now);
  const capUsd = settings.dailyDollarCapUsd;
  const resume = settings.spendResumeAt?.trim();
  if (resume && resume > now.toISOString()) {
    return { todayUsd, capUsd, blocked: false };
  }
  if (todayUsd >= capUsd) {
    return {
      todayUsd,
      capUsd,
      blocked: true,
      reason: `Daily spend $${todayUsd.toFixed(2)} hit the $${capUsd.toFixed(2)} cap. Running agents will finish; new starts are paused.`,
    };
  }
  return { todayUsd, capUsd, blocked: false };
}

export function raiseDailyCap(capUsd: number): SpendStatus {
  patchSettings({ dailyDollarCapUsd: capUsd, spendResumeAt: "" });
  publish("settings.updated");
  return spendStatus();
}

export function resumeSpendTomorrow(now = new Date()): SpendStatus {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  patchSettings({ spendResumeAt: next.toISOString() });
  publish("settings.updated");
  return spendStatus(now);
}

function countsTowardDay(run: Run, day: string): boolean {
  if (LIVE.has(run.status)) return true;
  const stamp = run.finishedAt ?? run.updatedAt ?? run.startedAt ?? run.createdAt;
  return localDay(new Date(stamp)) === day;
}

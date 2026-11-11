import { getSettings, patchSettings } from "../settings/index.ts";
import { getDb } from "../db/index.ts";
import { publish } from "../events/index.ts";

export type SpendStatus = {
  todayUsd: number;
  capUsd: number;
  blocked: boolean;
  reason?: string;
};

export function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function addDailySpend(usd: number, now = new Date()): number {
  if (usd <= 0) return todaySpend(now);
  const day = utcDay(now);
  getDb()
    .prepare(
      `INSERT INTO daily_spend (day, usd) VALUES (?, ?)
       ON CONFLICT(day) DO UPDATE SET usd = usd + excluded.usd`,
    )
    .run(day, usd);
  return todaySpend(now);
}

export function todaySpend(now = new Date()): number {
  const row = getDb().prepare("SELECT usd FROM daily_spend WHERE day = ?").get(utcDay(now)) as
    | { usd: number }
    | undefined;
  return Number(row?.usd ?? 0);
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
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  patchSettings({ spendResumeAt: next.toISOString() });
  publish("settings.updated");
  return spendStatus(now);
}

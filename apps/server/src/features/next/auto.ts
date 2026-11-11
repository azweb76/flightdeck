import type { BoardPr, Settings } from "@flightdeck/shared";
import { getSettings } from "../settings/index.ts";
import { startPrFix } from "../board-prs/fix-run.ts";
import { startReview } from "../pr-review/index.ts";
import { spendStatus, type SpendStatus } from "../runs/spend.ts";

export type AutoDeps = {
  settings: Settings;
  spend: SpendStatus;
  fix: (id: string) => Promise<unknown>;
  review: (repo: string, number: number) => Promise<unknown>;
};

export async function applyAutoRules(prs: BoardPr[], deps?: Partial<AutoDeps>): Promise<string[]> {
  const settings = deps?.settings ?? getSettings();
  const spend = deps?.spend ?? spendStatus();
  const fix = deps?.fix ?? ((id: string) => startPrFix(id));
  const review = deps?.review ?? ((repo: string, number: number) => startReview(repo, number));
  if (spend.blocked) return [];
  const started: string[] = [];
  if (settings.autoFixCi) {
    for (const pr of prs) {
      if (pr.role !== "mine" || pr.ci !== "failing" || (pr.state ?? "open") !== "open") continue;
      if (seenFix.has(pr.id)) continue;
      seenFix.add(pr.id);
      await fix(pr.id).catch(() => undefined);
      started.push(`fix:${pr.id}`);
    }
  }
  if (settings.autoDraftReviews) {
    for (const pr of prs) {
      if (pr.role !== "review" || (pr.state ?? "open") !== "open") continue;
      if (seenReview.has(pr.id)) continue;
      seenReview.add(pr.id);
      await review(pr.repo, pr.number).catch(() => undefined);
      started.push(`review:${pr.id}`);
    }
  }
  return started;
}

const seenFix = new Set<string>();
const seenReview = new Set<string>();

export function resetAutoSeen(): void {
  seenFix.clear();
  seenReview.clear();
}

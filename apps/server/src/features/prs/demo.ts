import type { OwnPr } from "@flightdeck/shared";
import { upsertPull, listStoredPulls } from "./store.ts";

export function seedDemoPulls(): void {
  if (process.env.FLIGHTDECK_DEMO !== "1") return;
  if (listStoredPulls().length > 0) return;
  for (const pr of demoPulls()) upsertPull(pr);
}

export function demoPulls(): OwnPr[] {
  const at = "2026-11-15T12:00:00.000Z";
  return [
    row("acme/web", 80, "Passing checks on the CSV export", false, "passing", "none", 1, false),
    row("acme/api", 81, "CI still red on the webhook", false, "failing", "none", 1, true),
    row("acme/web", 82, "Auto-fixing lint on the invoices page", true, "failing", "none", 2, false),
    row("acme/web", 83, "Gave up after three CI fixes", false, "failing", "none", 3, true),
    row("acme/web", 84, "Reviewer asked for tests", false, "passing", "changes_requested", 0, true),
  ].map((p) => ({ ...p, updatedAt: at, demo: true }));
}

function row(
  repoSlug: string,
  number: number,
  title: string,
  draft: boolean,
  ci: OwnPr["ci"],
  review: OwnPr["review"],
  ciRound: number,
  needsYou: boolean,
): Omit<OwnPr, "updatedAt"> {
  return {
    id: `github:${repoSlug}#${number}`,
    repoSlug,
    number,
    title,
    url: `https://github.com/${repoSlug}/pull/${number}`,
    draft,
    ci,
    review,
    needsYou,
    ciRound,
  };
}

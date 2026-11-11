export const NEXT_BUCKETS = ["waiting", "fix_prs", "review", "issues"] as const;
export type NextBucket = (typeof NEXT_BUCKETS)[number];

export type NextAction = "answer" | "fix" | "draft_review" | "start";

export type NextItem = {
  id: string;
  bucket: NextBucket;
  key: string;
  title: string;
  repo?: string;
  source: "jira" | "github" | "adhoc" | "pr" | "run";
  action: NextAction;
  priority: number;
  ageMs: number;
  statusChips: string[];
  runId?: number;
  prId?: string;
  issueId?: string;
  question?: { prompt: string; options: { id: string; label: string }[] };
};

export function priorityRank(input: { jiraPriority?: string; labels?: string[] }): number {
  const blob = [input.jiraPriority, ...(input.labels ?? [])].join(" ").toLowerCase();
  if (/\bp0\b|highest|priority:critical|priority:highest/.test(blob)) return 0;
  if (/\bp1\b|priority:high|\bhigh\b/.test(blob) && !/highest/.test(blob)) return 1;
  if (/\bp2\b|priority:medium|\bmedium\b/.test(blob)) return 2;
  if (/\bp3\b|priority:low|\blow\b|lowest/.test(blob)) return 3;
  return 4;
}

export function sortNextItems(items: NextItem[]): NextItem[] {
  const bucket = (b: NextBucket) => NEXT_BUCKETS.indexOf(b);
  return [...items].sort(
    (a, b) => bucket(a.bucket) - bucket(b.bucket) || a.priority - b.priority || b.ageMs - a.ageMs,
  );
}

/** Waiting agents, authored CI/review work, and open review requests. */
export function nextNeedsYouCount(items: NextItem[]): number {
  return items.filter((i) => i.bucket !== "issues").length;
}

/** Electron dock badge. Undefined means leave the badge untouched (non-macOS). */
export function dockBadgeCount(badge: unknown, platform: string): number | undefined {
  if (platform !== "darwin") return undefined;
  const n = Number(badge ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

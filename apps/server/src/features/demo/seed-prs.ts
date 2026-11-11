import type { BoardPr } from "@flightdeck/shared";
import { upsertBoardPr, listBoardPrs } from "../board-prs/store.ts";

export function seedBoardPrs(): void {
  if (listBoardPrs().length > 0) return;
  for (const pr of demoPrs()) upsertBoardPr(pr);
}

export function demoPrs(): BoardPr[] {
  const now = "2026-11-11T12:00:00.000Z";
  const day = (n: number) => new Date(Date.parse(now) - n * 86_400_000).toISOString();
  return [
    mine("acme/docs#91", 91, "Fix broken links in docs", { draft: true, ci: "failing", linked: ["github:acme/docs#88"], age: 2, now, day }),
    mine("acme/web#401", 401, "Retry flaky invoice test", { ci: "failing", age: 1, now, day }),
    mine("acme/web#431", 431, "CSV export of invoices", {
      review: "changes_requested",
      unresolvedThreads: 3,
      linked: ["jira:PROJ-150"],
      age: 4,
      now,
      day,
    }),
    mine("acme/api#77", 77, "Rate-limit login", { ci: "pending", age: 3, now, day }),
    mine("acme/web#450", 450, "Dark mode polish", { review: "approved", age: 5, now, day }),
    mine("acme/docs#100", 100, "Ship changelog", { state: "merged", age: 1, now, day }),
    review("acme/web#460", 460, "Draft: telemetry opt-in", { draft: true, age: 2, now, day }),
    review("acme/api#90", 90, "CI red on auth tests", { ci: "failing", age: 1, now, day }),
    review("acme/web#441", 441, "Please revert the cache bust", { review: "changes_requested", unresolvedThreads: 2, age: 3, now, day }),
    review("acme/api#88", 88, "Tighten auth middleware", { ci: "pending", unresolvedThreads: 1, age: 1, now, day }),
    review("acme/web#440", 440, "Fork: locale fallback", { isFork: true, viewerCanPush: false, headRepo: "ada/web", age: 6, now, day }),
    review("acme/api#95", 95, "Approved health probe", { review: "approved", age: 2, now, day }),
    review("acme/web#399", 399, "Closed leftover experiment", { state: "closed", age: 2, now, day }),
  ];
}

function mine(id: string, number: number, title: string, extra: Extra): BoardPr {
  return base(id, number, title, "mine", extra);
}

function review(id: string, number: number, title: string, extra: Extra): BoardPr {
  return base(id, number, title, "review", extra);
}

type Extra = {
  ci?: BoardPr["ci"];
  review?: BoardPr["review"];
  draft?: boolean;
  unresolvedThreads?: number;
  linked?: string[];
  state?: BoardPr["state"];
  isFork?: boolean;
  viewerCanPush?: boolean;
  headRepo?: string;
  age: number;
  now: string;
  day: (n: number) => string;
};

function base(id: string, number: number, title: string, role: BoardPr["role"], extra: Extra): BoardPr {
  const repo = id.split("#")[0] ?? "acme/web";
  return {
    id,
    number,
    title,
    url: `https://github.com/${repo}/pull/${number}`,
    repo,
    role,
    ci: extra.ci ?? "passing",
    review: extra.review ?? "pending",
    unresolvedThreads: extra.unresolvedThreads ?? 0,
    draft: extra.draft ?? false,
    ageDays: extra.age,
    headRef: `agent/${number}`,
    headRepo: extra.headRepo ?? repo,
    viewerCanPush: extra.viewerCanPush ?? true,
    isFork: extra.isFork ?? false,
    body: title,
    createdAt: extra.day(extra.age),
    updatedAt: extra.now,
    linkedIssueIds: extra.linked ?? [],
    state: extra.state ?? "open",
  };
}

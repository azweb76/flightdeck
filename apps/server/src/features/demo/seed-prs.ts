import type { BoardPr } from "@flightdeck/shared";
import { upsertBoardPr, listBoardPrs } from "../board-prs/store.ts";

export function seedBoardPrs(): void {
  if (listBoardPrs().length > 0) return;
  for (const pr of demoPrs()) upsertBoardPr(pr);
}

export function demoPrs(): BoardPr[] {
  const now = "2026-11-11T12:00:00.000Z";
  const day = (n: number) => new Date(Date.parse(now) - n * 86_400_000).toISOString();
  return [...authored(now, day), ...reviewRequested(now, day)];
}

function authored(now: string, day: (n: number) => string): BoardPr[] {
  return [
    {
      id: "acme/docs#91",
      number: 91,
      title: "Fix broken links in docs",
      url: "https://github.com/acme/docs/pull/91",
      repo: "acme/docs",
      role: "mine",
      ci: "failing",
      review: "pending",
      unresolvedThreads: 0,
      draft: true,
      ageDays: 2,
      headRef: "agent/docs-88",
      headRepo: "acme/docs",
      viewerCanPush: true,
      isFork: false,
      body: "Closes #88",
      createdAt: day(2),
      updatedAt: now,
      linkedIssueIds: ["github:acme/docs#88"],
    },
    {
      id: "acme/web#431",
      number: 431,
      title: "CSV export of invoices",
      url: "https://github.com/acme/web/pull/431",
      repo: "acme/web",
      role: "mine",
      ci: "passing",
      review: "changes_requested",
      unresolvedThreads: 3,
      draft: false,
      ageDays: 4,
      headRef: "agent/PROJ-150",
      headRepo: "acme/web",
      viewerCanPush: true,
      isFork: false,
      body: "PROJ-150 export invoices as CSV.",
      createdAt: day(4),
      updatedAt: now,
      linkedIssueIds: ["jira:PROJ-150"],
    },
  ];
}

function reviewRequested(now: string, day: (n: number) => string): BoardPr[] {
  return [
    {
      id: "acme/api#88",
      number: 88,
      title: "Tighten auth middleware",
      url: "https://github.com/acme/api/pull/88",
      repo: "acme/api",
      role: "review",
      ci: "pending",
      review: "pending",
      unresolvedThreads: 1,
      draft: false,
      ageDays: 1,
      headRef: "feat/auth",
      headRepo: "acme/api",
      viewerCanPush: true,
      isFork: false,
      body: "Please review the JWT allowlist.",
      createdAt: day(1),
      updatedAt: now,
      linkedIssueIds: [],
    },
    {
      id: "acme/web#440",
      number: 440,
      title: "Fork: locale fallback",
      url: "https://github.com/acme/web/pull/440",
      repo: "acme/web",
      role: "review",
      ci: "passing",
      review: "pending",
      unresolvedThreads: 0,
      draft: false,
      ageDays: 6,
      headRef: "locale-fallback",
      headRepo: "ada/web",
      viewerCanPush: false,
      isFork: true,
      body: "From a fork. WEB-9 is unrelated.",
      createdAt: day(6),
      updatedAt: now,
      linkedIssueIds: [],
    },
  ];
}

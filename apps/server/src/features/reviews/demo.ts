import { holdSlot } from "../run/jobs.ts";
import type { ReviewRequest } from "../github/review-requests.ts";
import { addMessage, listStoredReviews, replaceComments, upsertReview } from "./store.ts";

const NOW = "2026-11-15T18:00:00.000Z";

export function demoRequests(): ReviewRequest[] {
  return [90, 91, 92, 93, 94].map((n) => ({
    id: `github:acme/web#${n}`,
    repoSlug: "acme/web",
    number: n,
    title: titleFor(n),
    url: `https://github.com/acme/web/pull/${n}`,
    author: n === 94 ? "sam" : "alex",
    headSha: `sha${n}`,
    updatedAt: NOW,
  }));
}

export function seedDemoReviews(): void {
  if (process.env.FLIGHTDECK_DEMO !== "1") return;
  if (listStoredReviews().length > 0) return;
  seedRow(90, "selected", false);
  const reviewing = seedRow(91, "reviewing", true);
  holdSlot(reviewing.id);
  addMessage(reviewing.id, { role: "assistant", text: "Reading the diff at the PR head." });
  const drafts = seedRow(92, "drafts", true);
  drafts.summary = "Looks close. One guard is missing on the empty list.";
  replaceComments(drafts.id, [
    { path: "src/checkout.ts", line: 24, side: "RIGHT", body: "Return early when items is empty.", state: "draft", placement: "inline" },
    { path: "src/checkout.ts", line: 40, side: "RIGHT", body: "This error message should mention the field name.", state: "draft", placement: "inline" },
    {
      path: "internal/notes.md",
      line: 3,
      side: "RIGHT",
      body: "This file is not in the diff; keep it as a summary note.",
      state: "draft",
      placement: "summary",
    },
  ]);
  addMessage(drafts.id, { role: "assistant", text: drafts.summary });
  const posted = seedRow(93, "posted", true);
  posted.summary = "Docs look good.";
  posted.postedEvent = "APPROVE";
  replaceComments(posted.id, [
    { path: "README.md", line: 12, side: "RIGHT", body: "Link the new endpoint from the table of contents.", state: "posted" },
  ]);
  addMessage(posted.id, { role: "assistant", text: "Posted an approval review to GitHub." });
  seedRow(94, "requested", false);
}

function seedRow(number: number, status: "requested" | "selected" | "reviewing" | "drafts" | "posted", selected: boolean) {
  return upsertReview({
    id: `github:acme/web#${number}`,
    repoSlug: "acme/web",
    number,
    title: titleFor(number),
    url: `https://github.com/acme/web/pull/${number}`,
    author: number === 94 ? "sam" : "alex",
    headSha: `sha${number}`,
    status,
    selected,
    summary: "",
    skillPath: number === 91 ? ".cursor/skills/review/SKILL.md" : "",
    worktreePath: "",
    costUsd: 0,
    postedEvent: status === "posted" ? "APPROVE" : undefined,
    demo: true,
  });
}

function titleFor(n: number): string {
  if (n === 90) return "Add invoice CSV totals";
  if (n === 91) return "Retry webhook delivery";
  if (n === 92) return "Tighten checkout validation";
  if (n === 93) return "Document the export endpoint";
  return "Rename the stale feature flag";
}

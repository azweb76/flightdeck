import { getDb } from "../db/index.ts";
import { createGithubClient } from "../github/index.ts";
import { publish } from "../events/index.ts";
import type { PrReviewSession, ReviewDraft } from "@flightdeck/shared";

export function listReviews(): PrReviewSession[] {
  const rows = getDb().prepare("SELECT * FROM pr_reviews ORDER BY id DESC").all() as {
    id: number;
    repo_slug: string;
    pr_number: number;
    title: string;
    files_json: string;
    status: string;
  }[];
  return rows.map((r) => ({
    id: r.id,
    repoSlug: r.repo_slug,
    prNumber: r.pr_number,
    title: r.title,
    files: JSON.parse(r.files_json) as PrReviewSession["files"],
    drafts: draftsFor(r.id),
    status: r.status as PrReviewSession["status"],
  }));
}

export function getReview(id: number): PrReviewSession | undefined {
  return listReviews().find((r) => r.id === id);
}

export function startDemoReview(): PrReviewSession {
  const files = [
    {
      path: "src/routes/export.ts",
      patch: "+router.get(\"/export\", ...)\n+  const rows = await db.invoices.findAll();",
      additions: 8,
      deletions: 0,
    },
  ];
  const createdAt = new Date().toISOString();
  const r = getDb()
    .prepare(
      `INSERT INTO pr_reviews (repo_slug, pr_number, title, files_json, status, created_at)
       VALUES (?,?,?,?,?,?)`,
    )
    .run("acme/web", 431, "Add CSV export endpoint", JSON.stringify(files), "drafting", createdAt);
  const id = Number(r.lastInsertRowid);
  getDb()
    .prepare("INSERT INTO review_drafts (review_id, path, line, body, state) VALUES (?,?,?,?,?)")
    .run(id, "src/routes/export.ts", 12, "findAll() loads every invoice; stream with a cursor.", "pending");
  publish("reviews.updated");
  return getReview(id)!;
}

export function patchDraft(id: number, state: ReviewDraft["state"], body?: string): void {
  const sql = body
    ? "UPDATE review_drafts SET state = ?, body = ? WHERE id = ?"
    : "UPDATE review_drafts SET state = ? WHERE id = ?";
  if (body) getDb().prepare(sql).run(state, body, id);
  else getDb().prepare(sql).run(state, id);
  publish("reviews.updated");
}

export async function submitReview(id: number): Promise<void> {
  const review = getReview(id);
  if (!review) throw new Error("not found");
  const kept = review.drafts.filter((d) => d.state === "kept" || d.state === "edited");
  if (process.env.FLIGHTDECK_DEMO !== "1") {
    const [owner, name] = review.repoSlug.split("/");
    await createGithubClient().submitReview(
      owner ?? "",
      name ?? "",
      review.prNumber,
      kept.map((d) => ({ path: d.path, line: d.line, body: d.body })),
    );
  }
  getDb().prepare("UPDATE pr_reviews SET status = 'submitted' WHERE id = ?").run(id);
  publish("reviews.updated");
}

function draftsFor(reviewId: number): ReviewDraft[] {
  const rows = getDb().prepare("SELECT * FROM review_drafts WHERE review_id = ?").all(reviewId) as {
    id: number;
    path: string;
    line: number;
    body: string;
    state: string;
  }[];
  const review = getDb().prepare("SELECT repo_slug, pr_number FROM pr_reviews WHERE id = ?").get(reviewId) as
    | { repo_slug: string; pr_number: number }
    | undefined;
  return rows.map((r) => ({
    id: r.id,
    repoSlug: review?.repo_slug ?? "",
    prNumber: review?.pr_number ?? 0,
    path: r.path,
    line: r.line,
    body: r.body,
    state: r.state as ReviewDraft["state"],
  }));
}

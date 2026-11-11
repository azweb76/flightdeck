import { PrReviewAgentSchema, parseAgentJson, type PrReviewSession, type ReviewDraft } from "@flightdeck/shared";
import { getDb } from "../db/index.ts";
import { createGithubClient, type GithubClient } from "../github/index.ts";
import { publish } from "../events/index.ts";
import { collectAgentOutput } from "../agent/collect.ts";
import { prReviewPrompt } from "../agent/prompts.ts";
import { roleModel } from "../runs/execute.ts";

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
  return insertReview(
    "acme/web",
    431,
    "Add CSV export endpoint",
    [
      {
        path: "src/routes/export.ts",
        patch: "+router.get(\"/export\", ...)\n+  const rows = await db.invoices.findAll();",
        additions: 8,
        deletions: 0,
      },
    ],
    [],
  );
}

export async function startReview(
  repoSlug: string,
  prNumber: number,
  deps: { github?: GithubClient } = {},
): Promise<PrReviewSession> {
  if (process.env.FLIGHTDECK_DEMO === "1") {
    const session = startDemoReview();
    return attachAgentDrafts(session, "demo.diff", session.title);
  }
  const [owner, name] = repoSlug.split("/");
  const gh = deps.github ?? createGithubClient();
  const view = await gh.prView(owner ?? "", name ?? "", prNumber);
  const diff = await gh.prDiff(owner ?? "", name ?? "", prNumber);
  const files = [{ path: "diff.patch", patch: diff.slice(0, 8000), additions: 0, deletions: 0 }];
  const session = insertReview(repoSlug, prNumber, view.title || `PR #${prNumber}`, files, []);
  return attachAgentDrafts(session, diff, view.title || `PR #${prNumber}`);
}

async function attachAgentDrafts(
  session: PrReviewSession,
  diff: string,
  title: string,
): Promise<PrReviewSession> {
  const collected = await collectAgentOutput({
    prompt: prReviewPrompt(session.repoSlug, session.prNumber, title, diff),
    cwd: process.cwd(),
    role: "reviewer",
    model: roleModel("reviewer"),
    permissionMode: "auto",
  });
  if (collected.status !== "ok") throw new Error(collected.error ?? "pr review agent failed");
  const parsed = parseAgentJson(collected.text, (v) => PrReviewAgentSchema.parse(v));
  for (const c of parsed.comments) {
    getDb()
      .prepare("INSERT INTO review_drafts (review_id, path, line, body, state) VALUES (?,?,?,?,?)")
      .run(session.id, c.path, c.line, c.body, "pending");
  }
  publish("reviews.updated");
  return getReview(session.id)!;
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

function insertReview(
  repoSlug: string,
  prNumber: number,
  title: string,
  files: PrReviewSession["files"],
  draftBodies: string[],
): PrReviewSession {
  const createdAt = new Date().toISOString();
  const r = getDb()
    .prepare(
      `INSERT INTO pr_reviews (repo_slug, pr_number, title, files_json, status, created_at)
       VALUES (?,?,?,?,?,?)`,
    )
    .run(repoSlug, prNumber, title, JSON.stringify(files), "drafting", createdAt);
  const id = Number(r.lastInsertRowid);
  const path = files[0]?.path ?? "file";
  for (const body of draftBodies) {
    getDb()
      .prepare("INSERT INTO review_drafts (review_id, path, line, body, state) VALUES (?,?,?,?,?)")
      .run(id, path, 1, body, "pending");
  }
  publish("reviews.updated");
  return getReview(id)!;
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

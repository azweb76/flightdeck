import { randomUUID } from "node:crypto";
import type {
  ChatMessage,
  PrReview,
  PrReviewStatus,
  ReviewComment,
  ReviewCommentPlacement,
  ReviewCommentState,
} from "@flightdeck/shared";
import { occupiesReviewSlot } from "@flightdeck/shared";
import { getDb } from "../db/index.ts";
import { hasJob, isHeld } from "../run/jobs.ts";

type ReviewRow = {
  id: string;
  repo_slug: string;
  number: number;
  title: string;
  url: string;
  author: string;
  head_sha: string;
  status: PrReviewStatus;
  summary: string;
  worktree_path: string;
  skill_path: string;
  cost_usd: number;
  posted_event: string | null;
  selected: number;
  created_at: string;
  updated_at: string;
  demo: number;
};

type CommentRow = {
  id: string;
  review_id: string;
  path: string;
  line: number;
  side: "LEFT" | "RIGHT";
  body: string;
  state: ReviewCommentState;
  placement: ReviewCommentPlacement;
  created_at: string;
};

type MessageRow = { id: string; review_id: string; role: string; text: string; at: string };

export function countReviewing(): number {
  const rows = getDb().prepare("SELECT id, status FROM pr_reviews").all() as { id: string; status: PrReviewStatus }[];
  return rows.filter((r) => occupiesReviewSlot(r.status) && (hasJob(r.id) || isHeld(r.id))).length;
}

export function listStoredReviews(): PrReview[] {
  const rows = getDb().prepare("SELECT * FROM pr_reviews ORDER BY updated_at DESC").all() as ReviewRow[];
  return rows.map((row) => fromRow(row));
}

export function getReview(id: string): PrReview | undefined {
  const row = getDb().prepare("SELECT * FROM pr_reviews WHERE id = ?").get(id) as ReviewRow | undefined;
  return row ? fromRow(row) : undefined;
}

export function findReview(repoSlug: string, number: number): PrReview | undefined {
  const row = getDb()
    .prepare("SELECT * FROM pr_reviews WHERE repo_slug = ? AND number = ?")
    .get(repoSlug, number) as ReviewRow | undefined;
  return row ? fromRow(row) : undefined;
}

export function upsertReview(partial: Omit<PrReview, "comments" | "messages" | "updatedAt"> & { updatedAt?: string }): PrReview {
  const now = new Date().toISOString();
  const existing = getReview(partial.id) ?? findReview(partial.repoSlug, partial.number);
  const row: PrReview = {
    comments: existing?.comments ?? [],
    messages: existing?.messages ?? [],
    ...existing,
    ...partial,
    updatedAt: now,
  };
  getDb()
    .prepare(
      `INSERT INTO pr_reviews (id, repo_slug, number, title, url, author, head_sha, status, summary, worktree_path, skill_path, cost_usd, posted_event, selected, created_at, updated_at, demo)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET title=excluded.title, url=excluded.url, author=excluded.author, head_sha=excluded.head_sha,
         status=excluded.status, summary=excluded.summary, worktree_path=excluded.worktree_path, skill_path=excluded.skill_path,
         cost_usd=excluded.cost_usd, posted_event=excluded.posted_event, selected=excluded.selected, updated_at=excluded.updated_at`,
    )
    .run(
      row.id,
      row.repoSlug,
      row.number,
      row.title,
      row.url,
      row.author,
      row.headSha,
      row.status,
      row.summary,
      row.worktreePath,
      row.skillPath,
      row.costUsd,
      row.postedEvent ?? null,
      row.selected ? 1 : 0,
      existing?.updatedAt ? existing.updatedAt : now,
      now,
      row.demo ? 1 : 0,
    );
  return getReview(row.id) ?? row;
}

export function saveReview(review: PrReview): void {
  const prev = getDb().prepare("SELECT status FROM pr_reviews WHERE id = ?").get(review.id) as
    | { status: PrReviewStatus }
    | undefined;
  if (prev?.status === "archived") review.status = "archived";
  review.updatedAt = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE pr_reviews SET title=?, url=?, author=?, status=?, summary=?, worktree_path=?, skill_path=?, cost_usd=?, posted_event=?, selected=?, head_sha=?, updated_at=? WHERE id=?`,
    )
    .run(
      review.title,
      review.url,
      review.author,
      review.status,
      review.summary,
      review.worktreePath,
      review.skillPath,
      review.costUsd,
      review.postedEvent ?? null,
      review.selected ? 1 : 0,
      review.headSha,
      review.updatedAt,
      review.id,
    );
}

export function nextQueuedReview(): PrReview | undefined {
  const row = getDb()
    .prepare(
      `SELECT * FROM pr_reviews WHERE status = 'queued' AND status NOT IN ('archived','posted','cap_hit','error')
       ORDER BY updated_at ASC LIMIT 1`,
    )
    .get() as ReviewRow | undefined;
  return row ? fromRow(row) : undefined;
}

export function replaceComments(reviewId: string, comments: Omit<ReviewComment, "id">[]): ReviewComment[] {
  const demo = (getDb().prepare("SELECT demo FROM pr_reviews WHERE id = ?").get(reviewId) as { demo: number } | undefined)?.demo ?? 0;
  getDb().prepare("DELETE FROM pr_review_comments WHERE review_id = ?").run(reviewId);
  const saved: ReviewComment[] = [];
  for (const comment of comments) {
    const full: ReviewComment = { ...comment, id: randomUUID() };
    getDb()
      .prepare(
        `INSERT INTO pr_review_comments (id, review_id, path, line, side, body, state, placement, created_at, demo) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        full.id,
        reviewId,
        full.path,
        full.line,
        full.side,
        full.body,
        full.state,
        full.placement ?? "inline",
        new Date().toISOString(),
        demo,
      );
    saved.push(full);
  }
  return saved;
}

export function saveComment(reviewId: string, comment: ReviewComment): void {
  getDb()
    .prepare(`UPDATE pr_review_comments SET body=?, state=?, placement=? WHERE id=? AND review_id=?`)
    .run(comment.body, comment.state, comment.placement ?? "inline", comment.id, reviewId);
}

export function addReviewCost(review: PrReview, add: number, at = new Date().toISOString()): void {
  if (add <= 0) return;
  review.costUsd += add;
  saveReview(review);
  const demo = (getDb().prepare("SELECT demo FROM pr_reviews WHERE id = ?").get(review.id) as { demo: number } | undefined)?.demo ?? 0;
  getDb()
    .prepare(`INSERT INTO pr_review_events (id, review_id, at, kind, title, detail, cost_usd, demo) VALUES (?,?,?,?,?,?,?,?)`)
    .run(randomUUID(), review.id, at, "usage", "usage", null, add, demo || review.demo ? 1 : 0);
}

export function addMessage(reviewId: string, msg: Omit<ChatMessage, "id">): ChatMessage {
  const demo = (getDb().prepare("SELECT demo FROM pr_reviews WHERE id = ?").get(reviewId) as { demo: number } | undefined)?.demo ?? 0;
  const full: ChatMessage = { ...msg, id: randomUUID() };
  getDb()
    .prepare(`INSERT INTO pr_review_messages (id, review_id, role, text, at, demo) VALUES (?,?,?,?,?,?)`)
    .run(full.id, reviewId, full.role, full.text, new Date().toISOString(), demo);
  return full;
}

function fromRow(row: ReviewRow): PrReview {
  return {
    id: row.id,
    repoSlug: row.repo_slug,
    number: row.number,
    title: row.title,
    url: row.url,
    author: row.author,
    headSha: row.head_sha,
    status: row.status,
    selected: Boolean(row.selected),
    summary: row.summary,
    skillPath: row.skill_path,
    worktreePath: row.worktree_path,
    costUsd: row.cost_usd,
    postedEvent: (row.posted_event as PrReview["postedEvent"]) ?? undefined,
    comments: loadComments(row.id),
    messages: loadMessages(row.id),
    updatedAt: row.updated_at,
    demo: Boolean(row.demo),
  };
}

function loadComments(reviewId: string): ReviewComment[] {
  const rows = getDb()
    .prepare("SELECT * FROM pr_review_comments WHERE review_id = ? ORDER BY created_at")
    .all(reviewId) as CommentRow[];
  return rows.map((r) => ({
    id: r.id,
    path: r.path,
    line: r.line,
    side: r.side,
    body: r.body,
    state: r.state,
    placement: r.placement ?? "inline",
  }));
}

function loadMessages(reviewId: string): ChatMessage[] {
  const rows = getDb()
    .prepare("SELECT * FROM pr_review_messages WHERE review_id = ? ORDER BY at")
    .all(reviewId) as MessageRow[];
  return rows.map((r) => ({ id: r.id, role: r.role as ChatMessage["role"], text: r.text }));
}

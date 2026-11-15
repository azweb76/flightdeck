import type { OwnPr, PrCiState, PrReviewState } from "@flightdeck/shared";
import { getDb } from "../db/index.ts";

type Row = {
  id: string;
  repo_slug: string;
  number: number;
  title: string;
  url: string;
  draft: number;
  ci: PrCiState;
  review: PrReviewState;
  ci_round: number;
  needs_you: number;
  change_id: string | null;
  updated_at: string;
  demo: number;
};

export function upsertPull(pr: OwnPr): void {
  getDb()
    .prepare(
      `INSERT INTO pull_requests (id, repo_slug, number, title, url, draft, ci, review, ci_round, needs_you, change_id, updated_at, demo)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         title=excluded.title, url=excluded.url, draft=excluded.draft, ci=excluded.ci, review=excluded.review,
         ci_round=excluded.ci_round, needs_you=excluded.needs_you, change_id=excluded.change_id, updated_at=excluded.updated_at, demo=excluded.demo`,
    )
    .run(
      pr.id,
      pr.repoSlug,
      pr.number,
      pr.title,
      pr.url,
      pr.draft ? 1 : 0,
      pr.ci,
      pr.review,
      pr.ciRound,
      pr.needsYou ? 1 : 0,
      pr.changeId ?? null,
      pr.updatedAt,
      pr.demo ? 1 : 0,
    );
}

export function listStoredPulls(): OwnPr[] {
  const rows = getDb().prepare("SELECT * FROM pull_requests ORDER BY updated_at DESC").all() as Row[];
  return rows.map(fromRow);
}

export function getStoredPull(owner: string, name: string, number: number): OwnPr | undefined {
  const id = `github:${owner}/${name}#${number}`;
  const row = getDb().prepare("SELECT * FROM pull_requests WHERE id = ?").get(id) as Row | undefined;
  return row ? fromRow(row) : undefined;
}

function fromRow(row: Row): OwnPr {
  return {
    id: row.id,
    repoSlug: row.repo_slug,
    number: row.number,
    title: row.title,
    url: row.url,
    draft: Boolean(row.draft),
    ci: row.ci,
    review: row.review,
    needsYou: Boolean(row.needs_you),
    ciRound: row.ci_round,
    changeId: row.change_id ?? undefined,
    updatedAt: row.updated_at,
    demo: Boolean(row.demo),
  };
}

import type { BoardPr } from "@flightdeck/shared";
import { getDb } from "../db/index.ts";

export function listBoardPrs(): BoardPr[] {
  const rows = getDb().prepare("SELECT payload FROM board_prs").all() as { payload: string }[];
  return rows.map((r) => JSON.parse(r.payload) as BoardPr);
}

export function upsertBoardPr(pr: BoardPr): void {
  getDb()
    .prepare(
      `INSERT INTO board_prs (id, payload, linked_issue_ids, fetched_at) VALUES (?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, linked_issue_ids=excluded.linked_issue_ids, fetched_at=excluded.fetched_at`,
    )
    .run(pr.id, JSON.stringify(pr), JSON.stringify(pr.linkedIssueIds), new Date().toISOString());
}

export function deleteBoardPrs(ids: string[]): void {
  const stmt = getDb().prepare("DELETE FROM board_prs WHERE id = ?");
  for (const id of ids) stmt.run(id);
}

export function linkedByPrMap(prs: BoardPr[]): Record<string, string[]> {
  return Object.fromEntries(prs.map((p) => [p.id, p.linkedIssueIds]));
}

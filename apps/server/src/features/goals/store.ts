import type { Goal } from "@flightdeck/shared";
import { getDb } from "../db/index.ts";

type Row = {
  id: number;
  issue_id: string;
  original_body: string;
  markdown: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export function listGoals(issueId: string): Goal[] {
  return (
    getDb().prepare("SELECT * FROM goals WHERE issue_id = ? ORDER BY id DESC").all(issueId) as Row[]
  ).map(toGoal);
}

export function latestGoal(issueId: string): Goal | undefined {
  return listGoals(issueId)[0];
}

export function insertGoal(input: Omit<Goal, "id">): Goal {
  const r = getDb()
    .prepare(
      `INSERT INTO goals (issue_id, original_body, markdown, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?)`,
    )
    .run(input.issueId, input.originalBody, input.markdown, input.status, input.createdAt, input.updatedAt);
  return listGoals(input.issueId)[0]!;
  void r;
}

export function updateGoal(id: number, patch: { markdown?: string; status?: Goal["status"] }): Goal {
  const row = getDb().prepare("SELECT * FROM goals WHERE id = ?").get(id) as Row | undefined;
  if (!row) throw new Error("goal not found");
  const markdown = patch.markdown ?? row.markdown;
  const status = patch.status ?? row.status;
  const updatedAt = new Date().toISOString();
  getDb()
    .prepare("UPDATE goals SET markdown = ?, status = ?, updated_at = ? WHERE id = ?")
    .run(markdown, status, updatedAt, id);
  return toGoal({ ...row, markdown, status, updated_at: updatedAt });
}

function toGoal(row: Row): Goal {
  return {
    id: row.id,
    issueId: row.issue_id,
    originalBody: row.original_body,
    markdown: row.markdown,
    status: row.status as Goal["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

import { emptyDraft, type ChatMessage, type IssueDraft, type ShapeSession } from "@flightdeck/shared";
import { getDb } from "../db/index.ts";
import { randomUUID } from "node:crypto";

export function createSession(repoSlug: string, issueId?: string): ShapeSession {
  const session: ShapeSession = {
    id: randomUUID(),
    repoSlug,
    issueId,
    status: "idle",
    draft: emptyDraft(),
    messages: [],
  };
  saveSession(session);
  return session;
}

export function getSession(id: string): ShapeSession | undefined {
  const row = getDb().prepare("SELECT * FROM shape_sessions WHERE id = ?").get(id) as Row | undefined;
  return row ? fromRow(row) : undefined;
}

export function saveSession(session: ShapeSession): void {
  getDb()
    .prepare(
      `INSERT INTO shape_sessions (id, repo_slug, issue_id, status, draft_json, messages_json, updated_at)
       VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         status=excluded.status, draft_json=excluded.draft_json, messages_json=excluded.messages_json,
         issue_id=excluded.issue_id, updated_at=excluded.updated_at`,
    )
    .run(
      session.id,
      session.repoSlug,
      session.issueId ?? null,
      session.status,
      JSON.stringify(session.draft),
      JSON.stringify(session.messages),
      new Date().toISOString(),
    );
}

export function addMessage(session: ShapeSession, msg: Omit<ChatMessage, "id">): ChatMessage {
  const full = { ...msg, id: randomUUID() };
  session.messages.push(full);
  saveSession(session);
  return full;
}

export function patchDraft(session: ShapeSession, draft: IssueDraft): void {
  session.draft = draft;
  saveSession(session);
}

type Row = {
  id: string;
  repo_slug: string;
  issue_id: string | null;
  status: ShapeSession["status"];
  draft_json: string;
  messages_json: string;
};

function fromRow(row: Row): ShapeSession {
  return {
    id: row.id,
    repoSlug: row.repo_slug,
    issueId: row.issue_id ?? undefined,
    status: row.status,
    draft: JSON.parse(row.draft_json) as IssueDraft,
    messages: JSON.parse(row.messages_json) as ChatMessage[],
  };
}

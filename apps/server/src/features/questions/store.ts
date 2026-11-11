import type { Question } from "@flightdeck/shared";
import { getDb } from "../db/index.ts";

type Row = {
  id: number;
  run_id: number;
  prompt: string;
  options_json: string;
  allow_free_text: number;
  answer: string | null;
  status: string;
  created_at: string;
};

export function listQuestions(runId: number): Question[] {
  return (
    getDb().prepare("SELECT * FROM questions WHERE run_id = ? ORDER BY id DESC").all(runId) as Row[]
  ).map(toQ);
}

export function openQuestions(): Question[] {
  return (
    getDb().prepare("SELECT * FROM questions WHERE status = 'open' ORDER BY id DESC").all() as Row[]
  ).map(toQ);
}

export function insertQuestion(input: {
  runId: number;
  prompt: string;
  options: { id: string; label: string }[];
}): Question {
  const createdAt = new Date().toISOString();
  const r = getDb()
    .prepare(
      `INSERT INTO questions (run_id, prompt, options_json, allow_free_text, status, created_at)
       VALUES (?,?,?,?,?,?)`,
    )
    .run(input.runId, input.prompt, JSON.stringify(input.options), 1, "open", createdAt);
  return listQuestions(input.runId)[0]!;
  void r;
}

export function answerQuestion(id: number, answer: string): void {
  getDb().prepare("UPDATE questions SET answer = ?, status = 'answered' WHERE id = ?").run(answer, id);
}

function toQ(row: Row): Question {
  return {
    id: row.id,
    runId: row.run_id,
    prompt: row.prompt,
    options: JSON.parse(row.options_json) as Question["options"],
    allowFreeText: row.allow_free_text === 1,
    answer: row.answer ?? undefined,
    status: row.status as Question["status"],
    createdAt: row.created_at,
  };
}

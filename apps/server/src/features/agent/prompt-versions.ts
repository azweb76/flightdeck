import type { AgentRole } from "@flightdeck/shared";
import { getDb } from "../db/index.ts";
import { getSettings } from "../settings/index.ts";

export function appliedPrompt(role: AgentRole): string {
  const row = getDb()
    .prepare("SELECT body FROM prompt_versions WHERE role = ? ORDER BY version DESC LIMIT 1")
    .get(role) as { body: string } | undefined;
  if (row?.body) return row.body;
  const s = getSettings();
  if (role === "refiner") return s.promptRefiner;
  if (role === "planner") return s.promptPlanner;
  if (role === "implementer") return s.promptImplementer;
  if (role === "reviewer" || role === "session_reviewer") return s.promptReviewer;
  return "";
}

export function savePromptVersion(role: AgentRole, body: string): void {
  getDb()
    .prepare("INSERT INTO prompt_versions (role, body, version, created_at) VALUES (?,?,?,?)")
    .run(role, body, Date.now(), new Date().toISOString());
}

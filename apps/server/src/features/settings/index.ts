import {
  SettingsSchema,
  type Settings,
  type SettingsPatch,
  type TeamConfig,
} from "@flightdeck/shared";
import { getDb } from "../db/index.ts";

const KEY = "app";
const DEFERRED_KEY = "deferred_team_config";

export function getSettings(): Settings {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(KEY) as
    | { value: string }
    | undefined;
  if (!row) return SettingsSchema.parse({});
  const raw = JSON.parse(row.value) as Record<string, unknown>;
  const parsed = SettingsSchema.parse(raw);
  if (missingBoardToggles(raw)) upsert(KEY, parsed);
  return parsed;
}

function missingBoardToggles(raw: Record<string, unknown>): boolean {
  return (
    raw.boardAuthoredPrs === undefined ||
    raw.boardReviewPrs === undefined ||
    raw.boardLinkedIssues === undefined
  );
}

export function patchSettings(patch: SettingsPatch): Settings {
  const next = SettingsSchema.parse({ ...getSettings(), ...patch });
  upsert(KEY, next);
  return next;
}

export function storeDeferredTeamConfig(config: TeamConfig): void {
  const deferred = {
    prompts: config.prompts,
    models: config.models,
  };
  upsert(DEFERRED_KEY, deferred);
}

export function getDeferredTeamConfig(): unknown {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(DEFERRED_KEY) as
    | { value: string }
    | undefined;
  return row ? (JSON.parse(row.value) as unknown) : undefined;
}

function upsert(key: string, value: unknown): void {
  getDb()
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(key, JSON.stringify(value));
}

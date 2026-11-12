import { SettingsPatchSchema, SettingsSchema, type Settings, type SettingsPatch } from "@flightdeck/shared";
import { getDb } from "../db/index.ts";
import { publish } from "../events/index.ts";

const KEY = "app";

export function getSettings(): Settings {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(KEY) as { value: string } | undefined;
  const raw = row ? (JSON.parse(row.value) as unknown) : {};
  return SettingsSchema.parse(raw);
}

export function patchSettings(patch: SettingsPatch): Settings {
  const next = SettingsSchema.parse({ ...getSettings(), ...SettingsPatchSchema.parse(patch) });
  getDb()
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(KEY, JSON.stringify(next));
  publish("settings.updated");
  return next;
}

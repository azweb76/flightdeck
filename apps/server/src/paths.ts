import { homedir } from "node:os";
import { join } from "node:path";
import { APP_DATA_DIR_NAME } from "@flightdeck/shared";

export function dataDir(override = process.env.FLIGHTDECK_DATA_DIR): string {
  return override && override.length > 0 ? override : join(homedir(), APP_DATA_DIR_NAME);
}

export function dbPath(dir = dataDir()): string {
  return join(dir, "app.sqlite");
}

export function secretsDir(dir = dataDir()): string {
  return join(dir, "secrets");
}

export function secretsFile(account: string, dir = dataDir()): string {
  return join(secretsDir(dir), account);
}

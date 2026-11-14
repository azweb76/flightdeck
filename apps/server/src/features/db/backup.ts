import { existsSync, renameSync } from "node:fs";

const SIDECARS = ["", "-wal", "-shm"] as const;

let lastBackupPath: string | undefined;

export function getLastBackupPath(): string | undefined {
  return lastBackupPath;
}

export function resetBackupPathForTests(): void {
  lastBackupPath = undefined;
}

export function backupStamp(now = new Date()): string {
  return now.toISOString().replaceAll(":", "-");
}

export function backupIncompatibleDb(path: string, now = new Date()): string {
  const dest = `${path}.v1-backup-${backupStamp(now)}`;
  for (const suffix of SIDECARS) {
    const from = `${path}${suffix}`;
    if (existsSync(from)) renameSync(from, `${dest}${suffix}`);
  }
  lastBackupPath = dest;
  return dest;
}

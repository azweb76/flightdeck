import type { CreateRepo, PatchRepo, Repo } from "@flightdeck/shared";
import { setFavorite } from "../catalog/store.ts";
import { getDb } from "../db/index.ts";

type Row = {
  id: number;
  owner: string;
  name: string;
  local_path: string;
  default_branch: string;
  pinned: number;
  created_at: string;
  instructions?: string;
  setup_command?: string;
  test_command?: string;
  commit_convention?: string;
  model_override?: string;
};

export function listRepos(): Repo[] {
  const rows = getDb()
    .prepare("SELECT * FROM repos ORDER BY pinned DESC, owner, name")
    .all() as Row[];
  return rows.map(toRepo);
}

export function getRepo(id: number): Repo | undefined {
  const row = getDb().prepare("SELECT * FROM repos WHERE id = ?").get(id) as Row | undefined;
  return row ? toRepo(row) : undefined;
}

export function createRepo(input: CreateRepo): Repo {
  const createdAt = new Date().toISOString();
  const result = getDb()
    .prepare(
      `INSERT INTO repos (owner, name, local_path, default_branch, pinned, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.owner,
      input.name,
      input.localPath ?? "",
      input.defaultBranch ?? "main",
      input.pinned ? 1 : 0,
      createdAt,
    );
  const id = Number(result.lastInsertRowid);
  const repo = getRepo(id);
  if (!repo) throw new Error("failed to read created repo");
  if (input.pinned) setFavorite(repo.owner, repo.name, true);
  return repo;
}

export function patchRepo(id: number, patch: PatchRepo): Repo | undefined {
  const current = getRepo(id);
  if (!current) return undefined;
  const next = {
    localPath: patch.localPath ?? current.localPath,
    defaultBranch: patch.defaultBranch ?? current.defaultBranch,
    pinned: patch.pinned ?? current.pinned,
    instructions: patch.instructions ?? current.instructions,
    setupCommand: patch.setupCommand ?? current.setupCommand,
    testCommand: patch.testCommand ?? current.testCommand,
    commitConvention: patch.commitConvention ?? current.commitConvention,
    modelOverride: patch.modelOverride ?? current.modelOverride,
  };
  getDb()
    .prepare(
      `UPDATE repos SET local_path = ?, default_branch = ?, pinned = ?,
        instructions = ?, setup_command = ?, test_command = ?,
        commit_convention = ?, model_override = ? WHERE id = ?`,
    )
    .run(
      next.localPath,
      next.defaultBranch,
      next.pinned ? 1 : 0,
      next.instructions,
      next.setupCommand,
      next.testCommand,
      next.commitConvention,
      next.modelOverride,
      id,
    );
  return getRepo(id);
}

export function deleteRepo(id: number): boolean {
  const r = getDb().prepare("DELETE FROM repos WHERE id = ?").run(id);
  return Number(r.changes) > 0;
}

function toRepo(row: Row): Repo {
  return {
    id: row.id,
    owner: row.owner,
    name: row.name,
    localPath: row.local_path,
    defaultBranch: row.default_branch,
    pinned: row.pinned === 1,
    createdAt: row.created_at,
    instructions: row.instructions ?? "",
    setupCommand: row.setup_command ?? "",
    testCommand: row.test_command ?? "",
    commitConvention: row.commit_convention ?? "fix",
    modelOverride: row.model_override ?? "",
  };
}

export function getRepoBySlug(slug: string): Repo | undefined {
  const [owner, name] = slug.split("/");
  if (!owner || !name) return undefined;
  const row = getDb()
    .prepare("SELECT * FROM repos WHERE owner = ? AND name = ?")
    .get(owner, name) as Row | undefined;
  return row ? toRepo(row) : undefined;
}

import type { CatalogRepo, RepoPermission } from "@flightdeck/shared";
import type { ExecFn } from "../exec/index.ts";

const REST_PATH =
  "user/repos?affiliation=owner,collaborator,organization_member&per_page=100";

export async function listAccessibleRepos(exec: ExecFn): Promise<Omit<CatalogRepo, "favorite" | "lastUsedAt">[]> {
  try {
    const viaGql = await listViaGraphql(exec);
    if (viaGql.length > 0) return viaGql;
  } catch {
    /* REST fallback */
  }
  return listViaRest(exec);
}

async function listViaRest(exec: ExecFn): Promise<Omit<CatalogRepo, "favorite" | "lastUsedAt">[]> {
  const r = await exec("gh", ["api", "--paginate", REST_PATH], { timeoutMs: 60_000 });
  if (r.code !== 0) throw new Error(r.stderr || "gh user/repos failed");
  return parseRestRepos(r.stdout);
}

async function listViaGraphql(exec: ExecFn): Promise<Omit<CatalogRepo, "favorite" | "lastUsedAt">[]> {
  const out: Omit<CatalogRepo, "favorite" | "lastUsedAt">[] = [];
  let after: string | undefined;
  for (let i = 0; i < 20; i++) {
    const args = ["api", "graphql", "-f", `query=${GRAPHQL}`];
    if (after) args.push("-f", `after=${after}`);
    const r = await exec("gh", args, { timeoutMs: 30_000 });
    if (r.code !== 0) throw new Error(r.stderr || "gh graphql repositories failed");
    const page = parseGraphqlRepos(r.stdout);
    out.push(...page.repos);
    if (!page.hasNextPage || !page.endCursor) break;
    after = page.endCursor;
  }
  return out;
}

export function parseRestRepos(stdout: string): Omit<CatalogRepo, "favorite" | "lastUsedAt">[] {
  return parseJsonRows(stdout)
    .filter((row) => row.archived !== true)
    .map((row) => {
      const slug = String(row.full_name ?? "");
      const [owner, name] = slug.split("/");
      if (!owner || !name) return undefined;
      const perms = row.permissions as
        | { admin?: boolean; maintain?: boolean; push?: boolean; triage?: boolean; pull?: boolean }
        | undefined;
      return {
        owner,
        name,
        description: String(row.description ?? ""),
        private: Boolean(row.private),
        defaultBranch: String(row.default_branch ?? "main"),
        pushedAt: String(row.pushed_at ?? ""),
        permission: permissionFromRest(perms),
      };
    })
    .filter((x): x is Omit<CatalogRepo, "favorite" | "lastUsedAt"> => Boolean(x));
}

export function parseGraphqlRepos(stdout: string): {
  repos: Omit<CatalogRepo, "favorite" | "lastUsedAt">[];
  hasNextPage: boolean;
  endCursor?: string;
} {
  const payload = JSON.parse(stdout || "{}") as {
    data?: {
      viewer?: {
        repositories?: {
          nodes?: Record<string, unknown>[];
          pageInfo?: { hasNextPage?: boolean; endCursor?: string };
        };
      };
    };
  };
  const conn = payload.data?.viewer?.repositories;
  const repos = (conn?.nodes ?? [])
    .filter((n) => n.isArchived !== true)
    .map((n) => {
      const slug = String(n.nameWithOwner ?? "");
      const [owner, name] = slug.split("/");
      if (!owner || !name) return undefined;
      const branch = n.defaultBranchRef as { name?: string } | null;
      return {
        owner,
        name,
        description: String(n.description ?? ""),
        private: Boolean(n.isPrivate),
        defaultBranch: String(branch?.name ?? "main"),
        pushedAt: String(n.pushedAt ?? ""),
        permission: permissionFromGraphql(String(n.viewerPermission ?? "READ")),
      };
    })
    .filter((x): x is Omit<CatalogRepo, "favorite" | "lastUsedAt"> => Boolean(x));
  return {
    repos,
    hasNextPage: Boolean(conn?.pageInfo?.hasNextPage),
    endCursor: conn?.pageInfo?.endCursor,
  };
}

function permissionFromRest(p?: {
  admin?: boolean;
  maintain?: boolean;
  push?: boolean;
  triage?: boolean;
  pull?: boolean;
}): RepoPermission {
  if (!p) return "READ";
  if (p.admin) return "ADMIN";
  if (p.maintain) return "MAINTAIN";
  if (p.push) return "WRITE";
  if (p.triage) return "TRIAGE";
  return "READ";
}

function permissionFromGraphql(raw: string): RepoPermission {
  if (raw === "ADMIN" || raw === "MAINTAIN" || raw === "WRITE" || raw === "TRIAGE" || raw === "READ") return raw;
  return "READ";
}

function parseJsonRows(stdout: string): Record<string, unknown>[] {
  const text = stdout.trim() || "[]";
  try {
    const parsed = JSON.parse(text) as unknown;
    return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
  } catch {
    const parsed = JSON.parse(text.replace(/\]\s*\[/g, ",")) as unknown;
    return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
  }
}

const GRAPHQL = `query($after: String) {
  viewer {
    repositories(first: 100, after: $after, affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER], isArchived: false) {
      nodes { nameWithOwner description isPrivate isArchived defaultBranchRef { name } pushedAt viewerPermission }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

import { describe, expect, it } from "vitest";
import { listAccessibleRepos, parseGraphqlRepos, parseRestRepos } from "./accessible.ts";

describe("accessible repos", () => {
  it("parses REST user/repos, skips archived, and maps permission", () => {
    const rows = parseRestRepos(
      JSON.stringify([
        {
          full_name: "acme/web",
          description: "frontend",
          private: true,
          archived: false,
          default_branch: "main",
          pushed_at: "2026-11-01T00:00:00Z",
          permissions: { admin: false, maintain: false, push: true, pull: true },
        },
        { full_name: "acme/old", archived: true, permissions: { pull: true } },
      ]),
    );
    expect(rows).toEqual([
      {
        owner: "acme",
        name: "web",
        description: "frontend",
        private: true,
        defaultBranch: "main",
        pushedAt: "2026-11-01T00:00:00Z",
        permission: "WRITE",
      },
    ]);
  });

  it("parses GraphQL viewer repositories", () => {
    const page = parseGraphqlRepos(
      JSON.stringify({
        data: {
          viewer: {
            repositories: {
              nodes: [
                {
                  nameWithOwner: "globex/platform",
                  description: "core",
                  isPrivate: false,
                  isArchived: false,
                  defaultBranchRef: { name: "trunk" },
                  pushedAt: "2026-10-01T00:00:00Z",
                  viewerPermission: "ADMIN",
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      }),
    );
    expect(page.repos[0]).toMatchObject({
      owner: "globex",
      name: "platform",
      defaultBranch: "trunk",
      permission: "ADMIN",
    });
  });

  it("falls back to paginated REST when GraphQL fails", async () => {
    const exec = async (_cmd: string, args: string[]) => {
      if (args.includes("graphql")) return { code: 1, stdout: "", stderr: "no gql" };
      expect(args).toContain("--paginate");
      expect(args.join(" ")).toContain("user/repos?affiliation=owner,collaborator,organization_member");
      return {
        code: 0,
        stdout: JSON.stringify([{ full_name: "initech/handbook", private: false, archived: false }]),
        stderr: "",
      };
    };
    expect(await listAccessibleRepos(exec)).toEqual([
      {
        owner: "initech",
        name: "handbook",
        description: "",
        private: false,
        defaultBranch: "main",
        pushedAt: "",
        permission: "READ",
      },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { listAssignedIssues, listVisibleRepos } from "./assigned.ts";

describe("github assigned search", () => {
  it("maps gh search issues JSON including repository", async () => {
    const exec = async (_cmd: string, args: string[]) => {
      expect(args.join(" ")).toContain("assignee:@me");
      expect(args.join(" ")).toContain("is:issue");
      return {
        code: 0,
        stdout: JSON.stringify([
          {
            number: 12,
            title: "Mine",
            body: "b",
            url: "https://github.com/acme/web/issues/12",
            updatedAt: "2026-01-01T00:00:00Z",
            repository: { nameWithOwner: "acme/web" },
          },
        ]),
        stderr: "",
      };
    };
    const issues = await listAssignedIssues(exec);
    expect(issues[0]).toMatchObject({ owner: "acme", name: "web", number: 12 });
  });

  it("lists visible repos from paginated user/repos across orgs", async () => {
    const exec = async (_cmd: string, args: string[]) => {
      expect(args).toContain("--paginate");
      expect(args.join(" ")).toContain("user/repos?affiliation=owner,collaborator,organization_member");
      return {
        code: 0,
        stdout: JSON.stringify([{ full_name: "acme/api" }, { full_name: "other/web" }]),
        stderr: "",
      };
    };
    expect(await listVisibleRepos(exec)).toEqual([
      { owner: "acme", name: "api" },
      { owner: "other", name: "web" },
    ]);
  });
});

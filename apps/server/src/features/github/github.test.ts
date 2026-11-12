import { describe, expect, it } from "vitest";
import { createGithubClient, GH_ISSUE_CREATE_ARGS, parseCreatedIssue } from "./index.ts";
import type { ExecFn } from "../exec/index.ts";

describe("github adapter", () => {
  it("reports gh login and maps assigned issues", async () => {
    const gh = createGithubClient(statusExec);
    const status = await gh.status();
    expect(status.loggedIn).toBe(true);
    expect(status.user).toBe("dan");
    const issues = await gh.listAssignedIssues();
    expect(issues[0]?.id).toBe("github:acme/web#12");
  });

  it("creates an issue with gh args that omit --json and parses the printed URL", async () => {
    let seen: string[] = [];
    const exec: ExecFn = async (_file, args) => {
      seen = args;
      return { code: 0, stdout: "https://github.com/acme/web/issues/9\n", stderr: "" };
    };
    const created = await createGithubClient(exec).createIssue("acme", "web", "T", "B");
    expect(seen).toEqual(GH_ISSUE_CREATE_ARGS("acme", "web", "T", "B"));
    expect(seen).not.toContain("--json");
    expect(created).toEqual({ number: 9, url: "https://github.com/acme/web/issues/9" });
    expect(parseCreatedIssue("Created!\nhttps://github.com/acme/web/issues/42")).toMatchObject({ number: 42 });
  });
});

const statusExec: ExecFn = async (file, args) => {
  const joined = args.join(" ");
  if (file === "gh" && args[0] === "--version") return { code: 0, stdout: "gh 2.0", stderr: "" };
  if (joined.includes("auth status")) return { code: 0, stdout: "", stderr: "Logged in to github.com account dan" };
  if (joined.includes("search issues")) {
    return {
      code: 0,
      stdout: JSON.stringify([
        {
          number: 12,
          title: "Mine",
          body: "b",
          url: "https://github.com/acme/web/issues/12",
          updatedAt: "2026-11-12T00:00:00Z",
          repository: { nameWithOwner: "acme/web" },
        },
      ]),
      stderr: "",
    };
  }
  return { code: 1, stdout: "", stderr: `unexpected ${joined}` };
};

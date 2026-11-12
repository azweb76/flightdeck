import { describe, expect, it } from "vitest";
import { createGithubClient } from "./index.ts";
import type { ExecFn } from "../exec/index.ts";

const exec: ExecFn = async (file, args) => {
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
  if (joined.includes("issue create")) return { code: 0, stdout: JSON.stringify({ number: 9, url: "https://x/9" }), stderr: "" };
  return { code: 1, stdout: "", stderr: `unexpected ${joined}` };
};

describe("github adapter", () => {
  it("reports gh login and maps assigned issues", async () => {
    const gh = createGithubClient(exec);
    const status = await gh.status();
    expect(status.loggedIn).toBe(true);
    expect(status.user).toBe("dan");
    const issues = await gh.listAssignedIssues();
    expect(issues[0]?.id).toBe("github:acme/web#12");
  });

  it("creates an issue through gh", async () => {
    const created = await createGithubClient(exec).createIssue("acme", "web", "T", "B");
    expect(created.number).toBe(9);
  });
});

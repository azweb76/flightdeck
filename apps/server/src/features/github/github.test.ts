import { beforeEach, describe, expect, it } from "vitest";
import { resetCacheForTests } from "../cache/store.ts";
import { setSleepForTests } from "../cache/retry.ts";
import type { ExecFn } from "../exec/index.ts";
import { createGithubClient, GH_ISSUE_CREATE_ARGS, parseCreatedIssue } from "./index.ts";

describe("github adapter", () => {
  beforeEach(() => {
    resetCacheForTests();
    setSleepForTests();
  });

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

  it("caches status and assigned issues", async () => {
    let n = 0;
    const exec: ExecFn = async (file, args) => {
      n += 1;
      return statusExec(file, args);
    };
    const gh = createGithubClient(exec);
    await gh.status();
    await gh.status();
    await gh.listAssignedIssues();
    await gh.listAssignedIssues();
    expect(n).toBe(3);
  });

  it("caches user/repos", async () => {
    let n = 0;
    const exec: ExecFn = async (_file, args) => {
      if (args.includes("--paginate")) {
        n += 1;
        return { code: 0, stdout: JSON.stringify([{ full_name: "acme/web" }]), stderr: "" };
      }
      return statusExec(_file, args);
    };
    const gh = createGithubClient(exec);
    expect((await gh.listRepos())[0]?.name).toBe("web");
    await gh.listRepos();
    expect(n).toBe(1);
  });

  it("backs off on API rate limit exceeded then succeeds", async () => {
    const sleeps: number[] = [];
    setSleepForTests(async (ms) => {
      sleeps.push(ms);
    });
    let searches = 0;
    const exec: ExecFn = async (file, args) => {
      const joined = args.join(" ");
      if (joined.includes("search issues")) {
        searches += 1;
        if (searches === 1) {
          return { code: 1, stdout: "", stderr: "API rate limit exceeded" };
        }
        return { code: 0, stdout: "[]", stderr: "" };
      }
      return statusExec(file, args);
    };
    const issues = await createGithubClient(exec).listAssignedIssues();
    expect(issues).toEqual([]);
    expect(searches).toBe(2);
    expect(sleeps).toEqual([1_000]);
  });

  it("invalidates assigned issues after create", async () => {
    let searches = 0;
    const exec: ExecFn = async (file, args) => {
      if (args[0] === "issue" && args[1] === "create") {
        return { code: 0, stdout: "https://github.com/acme/web/issues/9\n", stderr: "" };
      }
      if (args.join(" ").includes("search issues")) {
        searches += 1;
        return { code: 0, stdout: "[]", stderr: "" };
      }
      return statusExec(file, args);
    };
    const gh = createGithubClient(exec);
    await gh.listAssignedIssues();
    await gh.createIssue("acme", "web", "T", "B");
    await gh.listAssignedIssues();
    expect(searches).toBe(2);
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

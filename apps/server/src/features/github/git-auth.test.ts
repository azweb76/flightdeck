import { mkdirSync, statSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { askpassPath, gitAuthEnv, gitFetchPullHead } from "./git-auth.ts";

describe("git askpass helper", () => {
  const prev = process.env.FLIGHTDECK_DATA_DIR;

  beforeEach(() => {
    process.env.FLIGHTDECK_DATA_DIR = mkdtempSync(join(tmpdir(), "fd-ask-"));
    mkdirSync(process.env.FLIGHTDECK_DATA_DIR, { recursive: true });
  });
  afterEach(() => {
    if (prev) process.env.FLIGHTDECK_DATA_DIR = prev;
    else delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("installs askpass.mjs at 0700 in the data dir", () => {
    const path = askpassPath();
    expect(path.startsWith(process.env.FLIGHTDECK_DATA_DIR ?? "")).toBe(true);
    expect(statSync(path).mode & 0o777).toBe(0o700);
  });

  it("passes the resolved env token to GIT_ASKPASS", async () => {
    const prev = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = "env-askpass-token";
    try {
      const env = await gitAuthEnv();
      expect(env.GITHUB_TOKEN).toBe("env-askpass-token");
      const r = spawnSync(process.execPath, [env.GIT_ASKPASS ?? "", "Password for github:"], {
        encoding: "utf8",
        env: { ...process.env, GITHUB_TOKEN: env.GITHUB_TOKEN },
      });
      expect(r.stdout).toBe("env-askpass-token");
      expect(r.status).toBe(0);
      const gh = spawnSync(process.execPath, [env.GIT_ASKPASS ?? "", "Password for github:"], {
        encoding: "utf8",
        env: { ...process.env, GITHUB_TOKEN: "", GH_TOKEN: "from-gh-token" },
      });
      expect(gh.stdout).toBe("from-gh-token");
    } finally {
      if (prev === undefined) delete process.env.GITHUB_TOKEN;
      else process.env.GITHUB_TOKEN = prev;
    }
  });

  it("fetches pull/<n>/head and errors if the commit is missing", async () => {
    const calls: string[][] = [];
    const exec = async (_cmd: string, args: string[]) => {
      calls.push(args);
      if (args[0] === "fetch") return { code: 0, stdout: "", stderr: "" };
      return { code: 1, stdout: "", stderr: "missing" };
    };
    await expect(gitFetchPullHead(exec, "/tmp/repo", 12, "abc")).rejects.toThrow(/PR head abc is not in the clone/);
    expect(calls[0]).toEqual(["fetch", "--no-tags", "origin", "pull/12/head"]);
    await expect(gitFetchPullHead(exec, "/tmp/repo", 12, "HEAD")).rejects.toThrow(/no head commit/);
  });
});

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ExecFn } from "../exec/index.ts";
import { fetchViewerLogin, searchOpenPrs } from "./search.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(here, "search.fixture.json"), "utf8");

function ghPage(body: string, status = 200): string {
  return `HTTP/2 ${status}\r\ncontent-type: application/json\r\n\r\n${body}`;
}

describe("searchOpenPrs against a recorded GraphQL payload", () => {
  it("substitutes viewer login and maps authored plus review-requested PRs", async () => {
    const queries: string[] = [];
    const exec: ExecFn = async (_cmd, args) => {
      const joined = args.join(" ");
      if (joined.includes("query{viewer{login}}") || joined.includes("query={viewer{login}}")) {
        return { code: 0, stdout: JSON.stringify({ data: { viewer: { login: "azweb76" } } }), stderr: "" };
      }
      const q = args[args.indexOf("-f") + 1] && args.find((a) => a.startsWith("q="))?.slice(2);
      if (q) queries.push(q);
      return { code: 0, stdout: ghPage(fixture), stderr: "" };
    };
    const login = await fetchViewerLogin(exec);
    expect(login).toBe("azweb76");
    const prs = await searchOpenPrs(exec, {
      authored: true,
      review: true,
      login,
      projectKeys: ["PROJ"],
    });
    expect(queries.every((q) => !q.includes("@me"))).toBe(true);
    expect(queries.some((q) => q.includes("author:azweb76"))).toBe(true);
    expect(queries.some((q) => q.includes("review-requested:azweb76"))).toBe(true);
    expect(queries.some((q) => q.includes("reviewed-by:azweb76"))).toBe(true);
    expect(queries.some((q) => q.includes("is:merged"))).toBe(true);
    expect(prs.map((p) => p.id).sort()).toEqual(["acme/api#88", "acme/web#431"]);
    expect(prs.find((p) => p.id === "acme/web#431")).toMatchObject({
      role: "mine",
      ci: "passing",
      review: "changes_requested",
    });
    expect(prs.find((p) => p.id === "acme/api#88")).toMatchObject({
      role: "review",
      ci: "pending",
    });
  });

  it("surfaces GraphQL errors instead of returning an empty list", async () => {
    const exec: ExecFn = async (_cmd, args) => {
      if (args.some((a) => a.includes("query{viewer{login}}"))) {
        return { code: 0, stdout: JSON.stringify({ data: { viewer: { login: "azweb76" } } }), stderr: "" };
      }
      return {
        code: 0,
        stdout: ghPage(JSON.stringify({ data: null, errors: [{ message: "API rate limit exceeded" }] })),
        stderr: "",
      };
    };
    await expect(
      searchOpenPrs(exec, { authored: true, review: false, login: "azweb76", projectKeys: [] }),
    ).rejects.toThrow(/rate limit/i);
  });
});

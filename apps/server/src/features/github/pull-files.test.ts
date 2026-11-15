import { beforeEach, describe, expect, it } from "vitest";
import { resetCacheForTests } from "../cache/store.ts";
import { clearEtags } from "./etag.ts";
import { listPullFiles } from "./pull-files.ts";

describe("listPullFiles", () => {
  beforeEach(() => {
    resetCacheForTests();
    clearEtags();
  });

  it("loads pull files through Octokit", async () => {
    const fetchFn = (async (input: string | URL | Request) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
      expect(url.pathname).toBe("/repos/acme/web/pulls/92/files");
      return new Response(
        JSON.stringify([{ filename: "src/checkout.ts", patch: "@@ -1,1 +1,2 @@\n keep\n+added\n" }]),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;
    const files = await listPullFiles("t", fetchFn, "acme", "web", 92);
    expect(files[0]?.filename).toBe("src/checkout.ts");
  });

  it("walks every page up to GitHub's file cap and etags only page 1", async () => {
    const pages: string[] = [];
    const fetchFn = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
      const page = url.searchParams.get("page") ?? "1";
      pages.push(page);
      const ifNone = new Headers(init?.headers).get("if-none-match") ?? new Headers(init?.headers).get("If-None-Match");
      if (page === "1") {
        expect(ifNone).toBeNull();
        const files = Array.from({ length: 100 }, (_, i) => ({ filename: `a/${i}.ts`, patch: "@@ -1 +1 @@\n-a\n+b\n" }));
        return new Response(JSON.stringify(files), {
          status: 200,
          headers: { "content-type": "application/json", etag: '"p1"' },
        });
      }
      expect(ifNone).toBeNull();
      return new Response(JSON.stringify([{ filename: "b.ts", patch: "@@ -1 +1 @@\n-a\n+b\n" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;
    const files = await listPullFiles("t", fetchFn, "acme", "web", 8);
    expect(pages).toEqual(["1", "2"]);
    expect(files).toHaveLength(101);
    expect(files.at(-1)?.filename).toBe("b.ts");
  });
});

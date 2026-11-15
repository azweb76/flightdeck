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
});

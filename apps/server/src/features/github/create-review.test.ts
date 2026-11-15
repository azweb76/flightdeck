import { describe, expect, it } from "vitest";
import { postPullReview } from "./create-review.ts";

describe("postPullReview", () => {
  it("posts one pulls.createReview with comments and a verdict", async () => {
    const seen: { url: string; body: unknown }[] = [];
    const fetchFn = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      seen.push({ url: url.pathname, body });
      return new Response(JSON.stringify({ id: 1 }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;

    await postPullReview("t", fetchFn, "acme", "web", 92, {
      event: "REQUEST_CHANGES",
      body: "Needs a guard.",
      commitId: "sha92",
      comments: [{ path: "src/checkout.ts", line: 24, side: "RIGHT", body: "Return early." }],
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]?.url).toBe("/repos/acme/web/pulls/92/reviews");
    expect(seen[0]?.body).toMatchObject({
      event: "REQUEST_CHANGES",
      body: "Needs a guard.",
      commit_id: "sha92",
      comments: [{ path: "src/checkout.ts", line: 24, side: "RIGHT", body: "Return early." }],
    });
  });
});

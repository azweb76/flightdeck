import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { seedDemo } from "../demo/index.ts";
import { resetPreflightStore, runChecks } from "../preflight/index.ts";
import { dropJobs, getJob } from "../run/jobs.ts";
import { patchSettings } from "../settings/index.ts";
import { chatReview, getReview, patchComment, postReview, selectReview, startReview } from "./engine.ts";
import { listReviews } from "./sync.ts";

describe("reviews engine (demo)", () => {
  beforeEach(async () => {
    process.env.FLIGHTDECK_DEMO = "1";
    const dir = mkdtempSync(join(tmpdir(), "fd-rev-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(join(dir, "app.sqlite"));
    seedDemo();
    dropJobs();
    patchSettings({ maxConcurrentAgents: 10 });
    resetPreflightStore();
    await runChecks();
  });

  afterEach(() => {
    closeDb();
    resetPreflightStore();
    delete process.env.FLIGHTDECK_DEMO;
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("seeds mixed review-requested states", async () => {
    const reviews = await listReviews();
    expect(reviews.find((r) => r.number === 90)?.status).toBe("selected");
    expect(reviews.find((r) => r.number === 91)?.status).toBe("reviewing");
    expect(reviews.find((r) => r.number === 91)?.skillPath).toBe(".cursor/skills/review/SKILL.md");
    expect(reviews.find((r) => r.number === 92)?.status).toBe("drafts");
    expect(reviews.find((r) => r.number === 93)?.status).toBe("posted");
    expect(reviews.find((r) => r.number === 94)?.selected).toBe(false);
  });

  it("reviews only after Review, then edit/discard/post one verdict", async () => {
    const selected = selectReview("github:acme/web#94");
    expect(selected.selected).toBe(true);
    const started = await startReview("github:acme/web#90");
    expect(started.status === "reviewing" || started.status === "drafts").toBe(true);
    await (getJob("github:acme/web#90") ?? Promise.resolve());
    const drafted = getReview("github:acme/web#90")!;
    expect(drafted.status).toBe("drafts");
    expect(drafted.comments.length).toBeGreaterThan(0);
    const comment = drafted.comments[0]!;
    const edited = patchComment(drafted.id, comment.id, { body: "Mention the empty list." });
    expect(edited.comments[0]?.body).toBe("Mention the empty list.");
    patchComment(drafted.id, comment.id, { state: "approved" });
    const posted = await postReview(drafted.id, "APPROVE");
    expect(posted.status).toBe("posted");
    expect(posted.postedEvent).toBe("APPROVE");
    expect(posted.comments[0]?.state).toBe("posted");
  });

  it("chats about the PR without posting", async () => {
    const next = await chatReview("github:acme/web#92", "Is the empty-list guard enough?");
    expect(next.messages.some((m) => m.role === "user")).toBe(true);
    expect(next.messages.some((m) => m.role === "assistant" && /92/.test(m.text))).toBe(true);
    expect(next.status).toBe("drafts");
  });

  it("posts one GitHub review through Octokit outside demo", async () => {
    const origDemo = process.env.FLIGHTDECK_DEMO;
    const origFetch = globalThis.fetch;
    process.env.GITHUB_TOKEN = "test-token";
    delete process.env.FLIGHTDECK_DEMO;
    const bodies: unknown[] = [];
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
      if (init?.body) bodies.push(JSON.parse(String(init.body)));
      expect(url.pathname).toBe("/repos/acme/web/pulls/92/reviews");
      return new Response(JSON.stringify({ id: 9 }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    try {
      const review = getReview("github:acme/web#92")!;
      for (const comment of review.comments) {
        patchComment(review.id, comment.id, { state: "approved" });
      }
      const posted = await postReview(review.id, "COMMENT");
      expect(posted.status).toBe("posted");
      expect(bodies).toHaveLength(1);
      expect(bodies[0]).toMatchObject({ event: "COMMENT" });
    } finally {
      globalThis.fetch = origFetch;
      process.env.FLIGHTDECK_DEMO = origDemo;
      delete process.env.GITHUB_TOKEN;
    }
  });
});

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { seedDemo } from "../demo/index.ts";
import { resetPreflightStore, runChecks } from "../preflight/index.ts";
import { setAgentDriver } from "../agent/index.ts";
import { dropJobs, getJob } from "../run/jobs.ts";
import { patchSettings } from "../settings/index.ts";
import { countActive } from "../run/store.ts";
import { countReviewing } from "./store.ts";
import { archiveReview, chatReview, getReview, patchComment, postReview, selectReview, startReview } from "./engine.ts";
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
    setAgentDriver(undefined);
  });

  it("marks a reviewing row interrupted after a restart and resumes", async () => {
    const listed = await listReviews();
    const stuck = listed.find((r) => r.number === 91)!;
    expect(stuck.interrupted).toBe(true);
    expect(countReviewing()).toBe(0);
    const resumed = await startReview(stuck.id);
    expect(resumed.status).toBe("drafts");
    expect(resumed.interrupted).toBe(false);
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
      if (url.pathname.endsWith("/files")) {
        const plus = Array.from({ length: 50 }, () => "+x").join("\n");
        return new Response(
          JSON.stringify([{ filename: "src/checkout.ts", patch: `@@ -0,0 +1,50 @@\n${plus}\n` }]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
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
      const postedBody = bodies[0] as { event: string; comments: { path: string }[]; body: string };
      expect(postedBody.event).toBe("COMMENT");
      expect(postedBody.comments.every((c) => c.path === "src/checkout.ts")).toBe(true);
      expect(postedBody.body).toContain("internal/notes.md:3");
    } finally {
      globalThis.fetch = origFetch;
      process.env.FLIGHTDECK_DEMO = origDemo;
      delete process.env.GITHUB_TOKEN;
    }
  });

  it("keeps archived when Review is still running", async () => {
    const p = startReview("github:acme/web#90");
    const archived = await archiveReview("github:acme/web#90");
    expect(archived.status).toBe("archived");
    await p;
    expect(getReview("github:acme/web#90")?.status).toBe("archived");
  });

  it("applies dollar caps and abort to PR chat without taking a slot", async () => {
    const origDemo = process.env.FLIGHTDECK_DEMO;
    delete process.env.FLIGHTDECK_DEMO;
    patchSettings({ dollarCapUsd: 0.05, dailyDollarCapUsd: 10 });
    const before = countActive();
    setAgentDriver({
      async *run(opts) {
        yield { kind: "usage", title: "usage", costUsd: 1 };
        expect(opts.abort?.aborted).toBe(true);
        yield { kind: "text", title: "text", detail: "should not land" };
      },
    });
    const next = await chatReview("github:acme/web#92", "Walk the guard");
    expect(next.status).toBe("cap_hit");
    expect(next.messages.map((m) => m.text).join("\n")).toMatch(/dollar cap/);
    expect(next.messages.some((m) => m.text === "should not land")).toBe(false);
    expect(countActive()).toBe(before);
    expect(countReviewing()).toBe(0);
    process.env.FLIGHTDECK_DEMO = origDemo;
  });
});

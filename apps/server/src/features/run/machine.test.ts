import { describe, expect, it } from "vitest";
import { canArchive, canReply, checkCaps, nextAfterReview, occupiesSlot, parseReviewVerdict, reviewLimit } from "./machine.ts";
import { demoScenarioFor, reviewFailNotes } from "./script.ts";

describe("run state machine", () => {
  it("opens a PR after a passing review and asks Dan after 3 failures", () => {
    expect(nextAfterReview(1, true)).toBe("opening_pr");
    expect(nextAfterReview(1, false)).toBe("implementing");
    expect(nextAfterReview(2, false)).toBe("implementing");
    expect(nextAfterReview(3, false)).toBe("needs_dan");
    expect(reviewLimit(3, true)).toBe(4);
    expect(reviewLimit(1, false)).toBe(3);
  });

  it("allows replies only when paused and archive when not mid-agent", () => {
    expect(canReply("asking")).toBe(true);
    expect(canReply("needs_dan")).toBe(true);
    expect(canReply("implementing")).toBe(false);
    expect(canArchive("done")).toBe(true);
    expect(canArchive("cap_hit")).toBe(true);
    expect(canArchive("queued")).toBe(true);
    expect(canArchive("archived")).toBe(false);
    expect(canArchive("implementing")).toBe(false);
    expect(canArchive("implementing", true)).toBe(true);
    expect(occupiesSlot("asking")).toBe(true);
    expect(occupiesSlot("needs_dan")).toBe(true);
    expect(occupiesSlot("watching_ci")).toBe(true);
    expect(occupiesSlot("fixing_ci")).toBe(true);
    expect(occupiesSlot("queued")).toBe(false);
  });

  it("enforces per-run and daily caps", () => {
    expect(checkCaps(9, 10, 2, 10, 50)).toBe("run");
    expect(checkCaps(1, 49, 2, 10, 50)).toBe("daily");
    expect(checkCaps(1, 10, 2, 10, 50)).toBe("ok");
  });

  it("parses reviewer verdicts", () => {
    expect(parseReviewVerdict("APPROVE — all acceptance criteria are met")).toBe(true);
    expect(parseReviewVerdict("CHANGES_NEEDED\n- missing auth")).toBe(false);
  });

  it("picks demo scenarios from issue identity", () => {
    expect(demoScenarioFor({ key: "acme/web#12", title: "Export invoices as CSV" })).toBe("success");
    expect(demoScenarioFor({ key: "acme/web#15", title: "Clarify CSV refund rows" })).toBe("ask");
    expect(demoScenarioFor({ key: "acme/web#21", title: "Add retry to webhook handler" })).toBe("fail-review");
    expect(demoScenarioFor({ key: "acme/api#8", title: "Spend-cap sensitive refactor" })).toBe("cap");
    expect(demoScenarioFor({ key: "acme/web#70", title: "CI keep failing after three auto-fixes" })).toBe("ci-ask");
    expect(demoScenarioFor({ key: "acme/web#71", title: "CI auto-fix lint on the invoices page" })).toBe("ci-fix");
  });

  it("uses fail-review notes that match the demo issue", () => {
    const r1 = reviewFailNotes({ key: "acme/web#21", title: "Add retry to webhook handler" }, 1);
    const r3 = reviewFailNotes({ key: "acme/web#21", title: "Add retry to webhook handler" }, 3);
    expect(r1).toMatch(/200 even when the downstream POST fails/);
    expect(r1).toMatch(/backoff|5xx/i);
    expect(r3).toMatch(/5xx/);
    expect(r3).not.toMatch(/returns 200/);
    expect(reviewFailNotes({ key: "acme/web#12", title: "Export invoices as CSV" })).toMatch(/auth|header/i);
    expect(reviewFailNotes({ key: "acme/web#15", title: "Clarify CSV refund rows" })).toMatch(/refund/i);
  });
});

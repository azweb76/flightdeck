import type { Change } from "@flightdeck/shared";
import { applyAgentEvent, emitChange, log, setStage } from "./emit.ts";
import { MAX_REVIEW_ROUNDS, nextAfterReview, reviewLimit } from "./machine.ts";
import { commentPrLink, openDraftPr } from "./pr.ts";
import { askEvents, capEvents, implementEvents, planEvents, reviewEvents } from "./script.ts";

function delay(): Promise<void> {
  if (process.env.FLIGHTDECK_RUN_FAST === "1") return Promise.resolve();
  return new Promise((r) => setTimeout(r, 40));
}

async function play(change: Change, events: Iterable<{ kind: string } & Record<string, unknown>>): Promise<"ask" | "cap" | "ok"> {
  for (const ev of events) {
    if (ev.kind !== "usage") await delay();
    const result = applyAgentEvent(change, ev as never);
    if (result !== "ok") return result;
  }
  return "ok";
}

export async function runDemo(change: Change, answer?: string): Promise<void> {
  if (change.scenario === "cap") {
    setStage(change, "planning", "plan", "Plan");
    await play(change, capEvents());
    if (change.status !== "cap_hit") {
      change.status = "cap_hit";
      log(change, { kind: "system", title: "cap", detail: "This change hit the per-run dollar cap." });
    }
    emitChange(change);
    return;
  }

  if (change.stage === "plan" && !change.planText) {
    setStage(change, "planning", "plan", "Plan");
    const halt = await play(change, planEvents(change.title));
    if (halt !== "ok") return;
    change.planText = change.events.find((e) => e.title === "plan")?.detail ?? "Plan ready.";
    emitChange(change);
  }

  if (change.scenario === "ask" && !answer && !change.events.some((e) => e.kind === "user")) {
    const halt = await play(change, askEvents());
    if (halt !== "ok") return;
    emitChange(change);
    return;
  }

  await implementAndReview(change, answer);
}

async function implementAndReview(change: Change, answer?: string): Promise<void> {
  let guidance = answer;
  const extra = Boolean(answer) && change.reviewRound >= MAX_REVIEW_ROUNDS;
  const limit = reviewLimit(change.reviewRound, extra);
  while (change.reviewRound < limit) {
    setStage(change, "implementing", "implement", "Implement", `Round ${change.reviewRound + 1}`);
    const usedGuidance = Boolean(guidance);
    const haltImpl = await play(change, implementEvents(change.reviewRound, guidance, { key: change.issueKey, title: change.title }));
    guidance = undefined;
    if (haltImpl !== "ok") return;

    change.reviewRound += 1;
    setStage(change, "reviewing", "review", "Review", `Round ${change.reviewRound}`);
    const pass = change.scenario !== "fail-review" || usedGuidance;
    const haltRev = await play(change, reviewEvents(change.reviewRound, pass, { key: change.issueKey, title: change.title }));
    if (haltRev !== "ok") return;

    const next = nextAfterReview(change.reviewRound, pass);
    if (next === "opening_pr") {
      await finishPr(change);
      return;
    }
    if (next === "needs_dan") {
      change.status = "needs_dan";
      change.stage = "review";
      log(change, {
        kind: "system",
        title: "needs dan",
        detail: "Review failed 3 times. I stopped so you can decide what to do next.",
      });
      emitChange(change);
      return;
    }
  }
}

async function finishPr(change: Change): Promise<void> {
  setStage(change, "opening_pr", "pr", "Draft PR");
  const pr = await openDraftPr(change);
  change.prUrl = pr.url;
  change.prNumber = pr.number;
  await commentPrLink(change, pr.url);
  log(change, { kind: "system", title: "draft pr", detail: `Opened draft PR ${pr.url}` });
  log(change, {
    kind: "system",
    title: "issue comment",
    detail: `Demo: would comment ${pr.url} on ${change.issueKey}.`,
  });
  change.status = "done";
  change.stage = "ci";
  log(change, { kind: "system", title: "ci", detail: "CI watch is a Phase 4 placeholder." });
  emitChange(change);
}

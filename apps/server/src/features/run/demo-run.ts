import { extraRoundLabel, type Change } from "@flightdeck/shared";
import { applyAgentEvent, emitChange, log, setStage } from "./emit.ts";
import { currentRunEpoch, isRunCurrent } from "./jobs.ts";
import { MAX_REVIEW_ROUNDS, nextAfterReview, reviewLimit } from "./machine.ts";
import { commentPrLink, openDraftPr } from "./pr.ts";
import { askEvents, capEvents, implementEvents, planEvents, reviewEvents } from "./script.ts";

type PlayHalt = "ask" | "cap" | "ok" | "aborted";

function delay(): Promise<void> {
  if (process.env.FLIGHTDECK_RUN_FAST === "1") return Promise.resolve();
  return new Promise((r) => setTimeout(r, 40));
}

async function play(
  change: Change,
  events: Iterable<{ kind: string } & Record<string, unknown>>,
  epoch: number,
): Promise<PlayHalt> {
  for (const ev of events) {
    if (!isRunCurrent(epoch)) return "aborted";
    if (change.status === "archived" || change.status === "queued") return "aborted";
    if (ev.kind !== "usage") await delay();
    if (!isRunCurrent(epoch)) return "aborted";
    const result = applyAgentEvent(change, ev as never);
    if (result !== "ok") return result;
  }
  return "ok";
}

export async function runDemo(change: Change, answer?: string, epoch = currentRunEpoch()): Promise<void> {
  if (!isRunCurrent(epoch)) return;
  if (change.status === "archived" || change.status === "queued") return;
  if (change.stage === "ci" && change.prNumber) {
    const { watchDemoCi } = await import("./ci.ts");
    await watchDemoCi(change, answer, epoch);
    return;
  }
  if (change.scenario === "cap") {
    setStage(change, "planning", "plan", "Plan");
    const halt = await play(change, capEvents(), epoch);
    if (halt === "aborted") return;
    if (change.status !== "cap_hit") {
      change.status = "cap_hit";
      log(change, { kind: "system", title: "cap", detail: "This change hit the per-run dollar cap." });
    }
    emitChange(change);
    return;
  }

  if (change.stage === "plan" && !change.planText) {
    setStage(change, "planning", "plan", "Plan");
    const halt = await play(change, planEvents(change.title), epoch);
    if (halt !== "ok") return;
    change.planText = change.events.find((e) => e.title === "plan")?.detail ?? "Plan ready.";
    emitChange(change);
  }

  if (change.scenario === "ask" && !answer && !change.events.some((e) => e.kind === "user")) {
    const halt = await play(change, askEvents(), epoch);
    if (halt !== "ok") return;
    emitChange(change);
    return;
  }

  await implementAndReview(change, answer, epoch);
}

async function implementAndReview(change: Change, answer?: string, epoch = currentRunEpoch()): Promise<void> {
  let guidance = answer;
  const extra = Boolean(answer) && change.reviewRound >= MAX_REVIEW_ROUNDS;
  const limit = reviewLimit(change.reviewRound, extra);
  while (change.reviewRound < limit) {
    if (!isRunCurrent(epoch)) return;
    setStage(change, "implementing", "implement", "Implement", extraRoundLabel(change.reviewRound + 1));
    const usedGuidance = Boolean(guidance);
    const haltImpl = await play(change, implementEvents(change.reviewRound, guidance, { key: change.issueKey, title: change.title }), epoch);
    guidance = undefined;
    if (haltImpl !== "ok") return;

    change.reviewRound += 1;
    setStage(change, "reviewing", "review", "Review", extraRoundLabel(change.reviewRound));
    const pass = change.scenario !== "fail-review" || usedGuidance;
    const haltRev = await play(change, reviewEvents(change.reviewRound, pass, { key: change.issueKey, title: change.title }), epoch);
    if (haltRev !== "ok") return;

    const next = nextAfterReview(change.reviewRound, pass);
    if (next === "opening_pr") {
      await finishPr(change, epoch);
      return;
    }
    if (next === "needs_dan") {
      if (!isRunCurrent(epoch)) return;
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

async function finishPr(change: Change, epoch: number): Promise<void> {
  if (!isRunCurrent(epoch)) return;
  setStage(change, "opening_pr", "pr", "Draft PR");
  const pr = await openDraftPr(change);
  if (!isRunCurrent(epoch)) return;
  change.prUrl = pr.url;
  change.prNumber = pr.number;
  await commentPrLink(change, pr.url);
  if (!isRunCurrent(epoch)) return;
  log(change, { kind: "system", title: "draft pr", detail: `Opened draft PR ${pr.url}` });
  log(change, {
    kind: "system",
    title: "issue comment",
    detail: `Demo: would comment ${pr.url} on ${change.issueKey}.`,
  });
  log(change, { kind: "system", title: "ci", detail: "Watching GitHub checks on the draft PR." });
  emitChange(change);
  const { watchDemoCi } = await import("./ci.ts");
  await watchDemoCi(change, undefined, epoch);
}

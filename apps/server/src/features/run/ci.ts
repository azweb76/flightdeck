import { MAX_CI_ROUNDS, ciRoundCaption, extraRoundLabel, type Change } from "@flightdeck/shared";
import { detectClaudeConfig, claudeSdkEnv } from "../claude/index.ts";
import { resolveGithubToken } from "../github/token.ts";
import { getSettings } from "../settings/index.ts";
import { getAgentDriver, type AgentEvent } from "../agent/index.ts";
import { applyAgentEvent, emitChange, log, setStage } from "./emit.ts";
import { ciLimit } from "./machine.ts";
import { ciFixPrompt } from "./prompts.ts";
import { currentRunEpoch, isRunCurrent } from "./jobs.ts";
import { getChange } from "./store.ts";
import { commitAll, pushBranch, runGates } from "./worktree.ts";
import { attachCiPoll, detachCiPoll, waitForChecks, type CiPollDeps } from "./ci-poll.ts";
import { waitForFixSlot } from "./ci-slot.ts";

export type { CiPollDeps };
export { abortCiWatch } from "./ci-poll.ts";

export async function watchDemoCi(change: Change, answer?: string, epoch = currentRunEpoch()): Promise<void> {
  const extra = Boolean(answer) && change.ciRound >= MAX_CI_ROUNDS;
  const limit = ciLimit(change.ciRound, extra);
  const failsBeforePass = failCount(change.scenario);
  while (change.ciRound < limit || change.ciPhase === "watching" || change.ciPhase === "fixing" || change.ciPhase === "queued") {
    if (!isRunCurrent(epoch)) return;
    if (change.ciPhase === "fixing" || change.ciPhase === "queued") {
      if (!(await waitForFixSlot(change))) return;
      await fixDemoCi(change, epoch, answer);
      if (ciHalted(change)) return;
      change.ciPhase = "";
      emitChange(change);
      answer = undefined;
      continue;
    }
    beginWatch(change);
    const passing = change.ciRound > failsBeforePass;
    log(change, {
      kind: "system",
      title: "ci",
      detail: passing ? "All checks passed." : `CI failed on attempt ${change.ciRound}.`,
    });
    if (passing) {
      change.ciPhase = "";
      change.status = "done";
      emitChange(change);
      return;
    }
    if (change.scenario === "ci-action") {
      askActionRequired(change);
      return;
    }
    if (change.ciRound >= limit) {
      askCi(change);
      return;
    }
    if (!(await waitForFixSlot(change))) return;
    await fixDemoCi(change, epoch, answer);
    if (ciHalted(change)) return;
    change.ciPhase = "";
    emitChange(change);
    answer = undefined;
  }
}

export async function watchLiveCi(change: Change, answer?: string, deps: CiPollDeps = {}): Promise<void> {
  const extra = Boolean(answer) && change.ciRound >= MAX_CI_ROUNDS;
  const limit = ciLimit(change.ciRound, extra);
  const token = await resolveGithubToken();
  if (!token?.token) {
    log(change, { kind: "system", title: "ci", detail: "No GitHub token; skipped CI watch." });
    change.status = "done";
    emitChange(change);
    return;
  }
  const [owner, name] = change.repoSlug.split("/");
  if (!owner || !name || !change.prNumber) {
    change.status = "done";
    emitChange(change);
    return;
  }
  const ac = attachCiPoll(change.id);
  try {
    while (change.ciRound < limit || change.ciPhase === "watching" || change.ciPhase === "fixing" || change.ciPhase === "queued") {
      if (ac.signal.aborted) return;
      if (change.ciPhase === "fixing" || change.ciPhase === "queued") {
        if (!(await waitForFixSlot(change))) return;
        await fixLiveCi(change, "Resuming the in-flight CI fix.", answer);
        if (ciHalted(change)) return;
        change.ciPhase = "";
        emitChange(change);
        answer = undefined;
        continue;
      }
      beginWatch(change);
      const result = await waitForChecks(token.token, owner, name, change.branch, change, ac.signal, deps);
      if (result.state === "stopped") {
        log(change, { kind: "system", title: "ci", detail: result.summary });
        const fresh = getChange(change.id);
        if (fresh?.status === "archived") return;
        change.ciPhase = "";
        change.status = "done";
        emitChange(change);
        return;
      }
      log(change, { kind: "system", title: "ci", detail: result.summary });
      if (result.state === "passing") {
        change.ciPhase = "";
        change.status = "done";
        emitChange(change);
        return;
      }
      if (result.state === "action_required") {
        askActionRequired(change);
        return;
      }
      if (change.ciRound >= limit) {
        askCi(change);
        return;
      }
      if (!(await waitForFixSlot(change))) return;
      await fixLiveCi(change, result.summary, answer);
      if (ciHalted(change)) return;
      change.ciPhase = "";
      emitChange(change);
      answer = undefined;
    }
  } finally {
    detachCiPoll(change.id);
  }
}

function beginWatch(change: Change): void {
  if (change.ciPhase === "watching") return;
  change.ciRound += 1;
  change.ciPhase = "watching";
  setStage(change, "watching_ci", "ci", "CI", ciRoundCaption(change.ciRound));
}

function failCount(scenario: string | undefined): number {
  if (scenario === "ci-ask") return MAX_CI_ROUNDS;
  if (scenario === "ci-fix" || scenario === "ci-action") return 1;
  return 0;
}

function askCi(change: Change): void {
  change.ciPhase = "";
  change.status = "needs_dan";
  change.ask = {
    prompt: "CI still fails after 3 automatic fixes. How should I proceed?",
    options: [
      { id: "retry", label: "Try one more fix" },
      { id: "leave", label: "Leave it for me" },
    ],
    reason: "ci_gave_up",
  };
  log(change, {
    kind: "ask",
    title: "Need a decision",
    detail: change.ask.prompt,
    ask: change.ask,
  });
  emitChange(change);
}

function askActionRequired(change: Change): void {
  change.ciPhase = "";
  change.status = "needs_dan";
  change.ask = {
    prompt: "A GitHub check needs your action. How should I proceed?",
    options: [
      { id: "retry", label: "Try one more fix" },
      { id: "leave", label: "Leave it for me" },
    ],
    reason: "ci_action_required",
    link: change.prUrl,
  };
  log(change, { kind: "ask", title: "Need a decision", detail: change.ask.prompt, ask: change.ask });
  emitChange(change);
}

function ciHalted(change: Change): boolean {
  return change.status === "cap_hit" || change.status === "asking" || change.status === "error" || change.status === "archived" || change.status === "done";
}

async function fixDemoCi(change: Change, epoch: number, answer?: string): Promise<void> {
  if (!isRunCurrent(epoch)) return;
  setStage(change, "fixing_ci", "ci", "CI", extraRoundLabel(change.ciRound));
  log(change, {
    kind: "text",
    title: "ci fix",
    detail: answer ? `Fixing CI using: ${answer}` : "Patching the failing check in this worktree.",
  });
  applyAgentEvent(change, { kind: "usage", title: "usage", costUsd: 0.35 });
}

async function fixLiveCi(change: Change, summary: string, answer?: string): Promise<void> {
  setStage(change, "fixing_ci", "ci", "CI", `Fixing attempt ${change.ciRound}`);
  const settings = getSettings();
  const claude = await detectClaudeConfig();
  const env = claudeSdkEnv(claude);
  const cwd = change.worktreePath;
  await collectFix(change, ciFixPrompt(change, summary, answer), cwd, settings.model, env);
  if (ciHalted(change)) return;
  const gates = await runGates(cwd);
  log(change, { kind: "system", title: "gates", detail: gates.detail });
  if (!gates.ok) return;
  await commitAll(cwd, `flightdeck: ${change.issueKey} CI fix ${change.ciRound}`);
  await pushBranch(cwd, change.branch);
}

async function collectFix(change: Change, prompt: string, cwd: string, model: string, env: NodeJS.ProcessEnv): Promise<void> {
  const ac = new AbortController();
  try {
    for await (const ev of getAgentDriver().run({ prompt, cwd, model, env, role: "implement", abort: ac.signal })) {
      const result = applyAgentEvent(change, ev as AgentEvent);
      if (result === "cap") {
        ac.abort();
        return;
      }
      if (result !== "ok") return;
    }
  } catch (err) {
    if (ac.signal.aborted) return;
    throw err;
  }
}

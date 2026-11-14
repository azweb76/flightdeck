import type { Change } from "@flightdeck/shared";
import { getAgentDriver, type AgentEvent } from "../agent/index.ts";
import { detectClaudeConfig, claudeSdkEnv } from "../claude/index.ts";
import { getSettings } from "../settings/index.ts";
import { applyAgentEvent, emitChange, log, setStage } from "./emit.ts";
import { MAX_REVIEW_ROUNDS, nextAfterReview, parseReviewVerdict } from "./machine.ts";
import { commentPrLink, openDraftPr } from "./pr.ts";
import { implementPrompt, planPrompt, reviewPrompt } from "./prompts.ts";
import { commitAll, pushBranch, runGates } from "./worktree.ts";

export async function runLive(change: Change, answer?: string): Promise<void> {
  const settings = getSettings();
  const claude = await detectClaudeConfig();
  const env = claudeSdkEnv(claude);
  const cwd = change.worktreePath;

  if (!change.planText) {
    setStage(change, "planning", "plan", "Plan");
    const plan = await collect(change, "plan", planPrompt(change), cwd, settings.model, env);
    if (stopped(change)) return;
    change.planText = plan || "Plan recorded in Flightdeck.";
    emitChange(change);
  }

  if (!answer && change.status === "asking") return;

  let guidance = answer;
  while (change.reviewRound < MAX_REVIEW_ROUNDS) {
    setStage(change, "implementing", "implement", "Implement");
    await collect(change, "implement", implementPrompt(change, guidance), cwd, settings.model, env);
    guidance = undefined;
    if (stopped(change)) return;
    const gates = await runGates(cwd);
    log(change, { kind: "system", title: "gates", detail: gates.detail });
    if (!gates.ok) {
      change.status = "needs_dan";
      log(change, { kind: "system", title: "gates failed", detail: "tests/lint/typecheck/build must pass before review." });
      emitChange(change);
      return;
    }
    await commitAll(cwd, `flightdeck: ${change.issueKey} round ${change.reviewRound + 1}`);

    change.reviewRound += 1;
    setStage(change, "reviewing", "review", "Review", `Round ${change.reviewRound}`);
    const reviewText = await collect(change, "review", reviewPrompt(change), cwd, settings.model, env);
    if (stopped(change)) return;
    const next = nextAfterReview(change.reviewRound, parseReviewVerdict(reviewText));
    if (next === "opening_pr") {
      await pushBranch(cwd, change.branch);
      setStage(change, "opening_pr", "pr", "Draft PR");
      const pr = await openDraftPr(change);
      change.prUrl = pr.url;
      change.prNumber = pr.number;
      await commentPrLink(change, pr.url);
      log(change, { kind: "system", title: "draft pr", detail: `Opened draft PR ${pr.url}` });
      log(change, { kind: "system", title: "issue comment", detail: `Commented ${pr.url} on ${change.issueKey}.` });
      change.status = "done";
      change.stage = "ci";
      log(change, { kind: "system", title: "ci", detail: "CI watch is a Phase 4 placeholder." });
      emitChange(change);
      return;
    }
    if (next === "needs_dan") {
      change.status = "needs_dan";
      log(change, { kind: "system", title: "needs dan", detail: "Review failed 3 times." });
      emitChange(change);
      return;
    }
  }
}

function stopped(change: Change): boolean {
  return change.status === "asking" || change.status === "cap_hit" || change.status === "error";
}

async function collect(
  change: Change,
  role: "plan" | "implement" | "review",
  prompt: string,
  cwd: string,
  model: string,
  env: NodeJS.ProcessEnv,
): Promise<string> {
  let text = "";
  for await (const ev of getAgentDriver().run({ prompt, cwd, model, env, role })) {
    if (ev.kind === "text" && ev.detail) text += `${ev.detail}\n`;
    const result = applyAgentEvent(change, ev as AgentEvent);
    if (result !== "ok") break;
  }
  return text;
}

import type { PrReview } from "@flightdeck/shared";
import { getAgentDriver } from "../agent/index.ts";
import { detectClaudeConfig, claudeSdkEnv } from "../claude/index.ts";
import { ensureClone } from "../clone/index.ts";
import { capMessage, evaluateSpend } from "../run/caps.ts";
import { getSettings } from "../settings/index.ts";
import { addWorktreeAtCommit, nestedWorktree } from "../run/worktree.ts";
import { parseReviewDraft } from "./parse.ts";
import { DEFAULT_REVIEW_PROMPT, detectReviewSkill } from "./skill.ts";
import { addMessage, replaceComments, saveReview } from "./store.ts";
import { emitReview, mustReview } from "./emit.ts";

export async function runLiveReview(review: PrReview): Promise<void> {
  const [owner, name] = review.repoSlug.split("/");
  const clone = await ensureClone(owner, name);
  const wt = nestedWorktree(clone.localPath, `review-${review.id}`);
  await addWorktreeAtCommit(clone.localPath, wt.path, review.headSha || "HEAD");
  review.worktreePath = wt.path;
  const skill = detectReviewSkill(wt.path);
  review.skillPath = skill?.path ?? "";
  saveReview(review);
  const settings = getSettings();
  const env = claudeSdkEnv(await detectClaudeConfig());
  const ac = new AbortController();
  let text = "";
  for await (const ev of getAgentDriver().run({
    prompt: `${skill?.text ?? DEFAULT_REVIEW_PROMPT}\n\nPR ${review.repoSlug}#${review.number}: ${review.title}\nHead: ${review.headSha}`,
    cwd: wt.path,
    model: settings.model,
    env,
    abort: ac.signal,
    role: "pr-review",
  })) {
    if (ev.costUsd) applyCost(review, ev.costUsd, ac);
    if (review.status === "cap_hit") return;
    if (ev.kind === "text" && ev.detail) text += `${ev.detail}\n`;
  }
  applyDraft(review, text);
}

export function fillDemoDraft(review: PrReview): void {
  if (review.number === 91) review.skillPath = ".cursor/skills/review/SKILL.md";
  review.costUsd += 0.4;
  applyDraft(
    review,
    `Looks solid overall on ${review.repoSlug}#${review.number}. One inline note.\n\`\`\`json\n[{"path":"src/api.ts","line":18,"body":"Guard this branch when the list is empty."}]\n\`\`\``,
  );
}

function applyDraft(review: PrReview, text: string): void {
  const parsed = parseReviewDraft(text);
  review.summary = parsed.summary;
  review.comments = replaceComments(
    review.id,
    parsed.comments.map((c) => ({ ...c, side: "RIGHT" as const, state: "draft" as const })),
  );
  review.status = "drafts";
  saveReview(review);
  addMessage(review.id, { role: "assistant", text: review.summary });
  emitReview(mustReview(review.id));
}

function applyCost(review: PrReview, add: number, ac: AbortController): void {
  const hit = evaluateSpend(review.costUsd, add);
  review.costUsd += add;
  saveReview(review);
  if (hit === "ok") return;
  ac.abort();
  review.status = "cap_hit";
  saveReview(review);
  addMessage(review.id, { role: "assistant", text: capMessage(hit) });
  emitReview(review);
}

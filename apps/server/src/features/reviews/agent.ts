import type { PrReview } from "@flightdeck/shared";
import { getAgentDriver } from "../agent/index.ts";
import { detectClaudeConfig, claudeSdkEnv } from "../claude/index.ts";
import { ensureClone } from "../clone/index.ts";
import { gitFetchPullHead } from "../github/git-auth.ts";
import { defaultExec } from "../exec/index.ts";
import { capMessage, evaluateSpend } from "../run/caps.ts";
import { getSettings } from "../settings/index.ts";
import { attachAbort } from "../run/jobs.ts";
import { addWorktreeAtCommit, nestedWorktree } from "../run/worktree.ts";
import { listPullFiles } from "../github/pull-files.ts";
import { resolveGithubToken } from "../github/token.ts";
import { parseReviewDraft } from "./parse.ts";
import { placeComments, summaryNotes } from "./diff.ts";
import { DEFAULT_REVIEW_PROMPT, detectReviewSkill } from "./skill.ts";
import { addMessage, addReviewCost, getReview, replaceComments, saveReview } from "./store.ts";
import { emitReview, mustReview } from "./emit.ts";
import { splitSlug } from "./slug.ts";

export async function runLiveReview(review: PrReview): Promise<void> {
  const [owner, name] = splitSlug(review.repoSlug);
  if (!review.headSha.trim() || review.headSha === "HEAD") {
    throw new Error("This pull request has no head commit to check out.");
  }
  const clone = await ensureClone(owner, name);
  await gitFetchPullHead(defaultExec, clone.localPath, review.number, review.headSha);
  const wt = nestedWorktree(clone.localPath, `review-${review.id}`);
  await addWorktreeAtCommit(clone.localPath, wt.path, review.headSha);
  review.worktreePath = wt.path;
  const skill = detectReviewSkill(wt.path);
  review.skillPath = skill?.path ?? "";
  saveReview(review);
  const settings = getSettings();
  const env = claudeSdkEnv(await detectClaudeConfig());
  const ac = attachAbort(review.id);
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
  await applyDraft(review, text);
}

export async function fillDemoDraft(review: PrReview): Promise<void> {
  if (review.number === 91) review.skillPath = ".cursor/skills/review/SKILL.md";
  addReviewCost(review, 0.4);
  await Promise.resolve();
  await applyDraft(
    review,
    `Looks solid overall on ${review.repoSlug}#${review.number}. One inline note.\n\`\`\`json\n[{"path":"src/api.ts","line":18,"body":"Guard this branch when the list is empty."}]\n\`\`\``,
  );
}

export async function applyDraft(review: PrReview, text: string): Promise<void> {
  const fresh = getReview(review.id);
  if (!fresh || fresh.status === "archived") return;
  const parsed = parseReviewDraft(text);
  let comments = parsed.comments.map((c) => ({
    ...c,
    side: "RIGHT" as const,
    state: "draft" as const,
    placement: "inline" as const,
  }));
  if (process.env.FLIGHTDECK_DEMO !== "1") {
    const token = await resolveGithubToken();
    if (token?.token) {
      const [owner, name] = splitSlug(review.repoSlug);
      comments = placeComments(comments, await listPullFiles(token.token, fetch, owner, name, review.number));
    }
  }
  const notes = summaryNotes(comments);
  if (getReview(review.id)?.status === "archived") return;
  review.summary = [parsed.summary, notes].filter(Boolean).join("\n\n");
  review.comments = replaceComments(review.id, comments);
  review.status = "drafts";
  saveReview(review);
  addMessage(review.id, { role: "assistant", text: review.summary });
  emitReview(mustReview(review.id));
}

export function applyCost(review: PrReview, add: number, ac: AbortController): void {
  const hit = evaluateSpend(review.costUsd, add);
  addReviewCost(review, add);
  if (hit === "ok") return;
  ac.abort();
  const live = getReview(review.id);
  const status = live?.status ?? review.status;
  addMessage(review.id, { role: "assistant", text: capMessage(hit) });
  if (status === "drafts" || status === "posted") {
    emitReview(mustReview(review.id));
    return;
  }
  review.status = "cap_hit";
  saveReview(review);
  emitReview(review);
}

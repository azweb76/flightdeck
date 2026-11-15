import type { PrReview, ReviewCommentState, ReviewVerdict } from "@flightdeck/shared";
import { getAgentDriver } from "../agent/index.ts";
import { detectClaudeConfig, claudeSdkEnv } from "../claude/index.ts";
import { demoRepoPath, repoPath } from "../clone/index.ts";
import { postPullReview } from "../github/create-review.ts";
import { listReviewRequests } from "../github/review-requests.ts";
import { resolveGithubToken } from "../github/token.ts";
import { assertPreflightGate } from "../preflight/gate.ts";
import { currentRunEpoch, getJob, isRunCurrent, setJob } from "../run/jobs.ts";
import { pumpQueue, setReviewPump } from "../run/queue.ts";
import { countActive } from "../run/store.ts";
import { getSettings } from "../settings/index.ts";
import { removeWorktree } from "../run/worktree.ts";
import { fillDemoDraft, runLiveReview } from "./agent.ts";
import { splitSlug } from "./slug.ts";
import { demoRequests } from "./demo.ts";
import { emitReview, mustReview } from "./emit.ts";
import {
  addMessage,
  findReview,
  getReview,
  listStoredReviews,
  nextQueuedReview,
  saveComment,
  saveReview,
  upsertReview,
} from "./store.ts";

setReviewPump(claimQueuedReview, kickReview);

export function listReviews(): PrReview[] {
  return mergeRequests(process.env.FLIGHTDECK_DEMO === "1" ? demoRequests() : []);
}

export async function refreshReviews(): Promise<PrReview[]> {
  if (process.env.FLIGHTDECK_DEMO === "1") return listReviews();
  const token = await resolveGithubToken();
  if (!token?.token) return listStoredReviews();
  for (const pr of await listReviewRequests(token.token, fetch)) {
    const existing = findReview(pr.repoSlug, pr.number);
    if (existing) {
      existing.title = pr.title;
      existing.url = pr.url;
      existing.author = pr.author;
      existing.headSha = pr.headSha || existing.headSha;
      saveReview(existing);
      continue;
    }
    upsertReview({
      id: pr.id,
      repoSlug: pr.repoSlug,
      number: pr.number,
      title: pr.title,
      url: pr.url,
      author: pr.author,
      headSha: pr.headSha,
      status: "requested",
      selected: false,
      summary: "",
      skillPath: "",
      worktreePath: "",
      costUsd: 0,
      demo: false,
    });
  }
  return listStoredReviews().filter((r) => r.status !== "archived");
}

export function selectReview(id: string): PrReview {
  const review = mustReview(id);
  review.selected = true;
  if (review.status === "requested") review.status = "selected";
  saveReview(review);
  return emitReview(review);
}

export async function startReview(id: string): Promise<PrReview> {
  assertPreflightGate("start");
  const review = mustReview(id);
  if (review.status === "drafts" || review.status === "posted" || review.status === "reviewing") {
    return emitReview(review);
  }
  review.selected = true;
  if (countActive() >= getSettings().maxConcurrentAgents) {
    review.status = "queued";
    saveReview(review);
    return emitReview(review);
  }
  review.status = "reviewing";
  saveReview(review);
  kickReview(id);
  if (process.env.FLIGHTDECK_DEMO === "1") await (getJob(id) ?? Promise.resolve());
  return emitReview(mustReview(id));
}

export function patchComment(
  reviewId: string,
  commentId: string,
  patch: { body?: string; state?: ReviewCommentState },
): PrReview {
  const review = mustReview(reviewId);
  if (review.status === "posted") throw new Error("This review is already posted");
  const comment = review.comments.find((c) => c.id === commentId);
  if (!comment) throw new Error("Comment not found");
  if (patch.body != null) comment.body = patch.body;
  if (patch.state) comment.state = patch.state;
  saveComment(reviewId, comment);
  return emitReview(mustReview(reviewId));
}

export async function postReview(id: string, event: ReviewVerdict): Promise<PrReview> {
  const review = mustReview(id);
  const comments = review.comments.filter((c) => c.state === "approved");
  if (process.env.FLIGHTDECK_DEMO !== "1") {
    const token = await resolveGithubToken();
    if (!token?.token) throw new Error("Set a GitHub token in Settings");
    const [owner, name] = splitSlug(review.repoSlug);
    await postPullReview(token.token, fetch, owner, name, review.number, {
      event,
      body: review.summary,
      commitId: review.headSha || undefined,
      comments: comments.map((c) => ({ path: c.path, line: c.line, side: c.side, body: c.body })),
    });
  }
  for (const comment of comments) {
    comment.state = "posted";
    saveComment(id, comment);
  }
  review.status = "posted";
  review.postedEvent = event;
  saveReview(review);
  addMessage(id, { role: "assistant", text: `Posted a ${verdictLabel(event)} review to GitHub.` });
  pumpQueue();
  return emitReview(mustReview(id));
}

export async function chatReview(id: string, text: string): Promise<PrReview> {
  const review = mustReview(id);
  addMessage(id, { role: "user", text });
  if (process.env.FLIGHTDECK_DEMO === "1") {
    addMessage(id, { role: "assistant", text: `On ${review.repoSlug}#${review.number}: ${text.slice(0, 120)}` });
    return emitReview(mustReview(id));
  }
  const settings = getSettings();
  const env = claudeSdkEnv(await detectClaudeConfig());
  let reply = "";
  for await (const ev of getAgentDriver().run({
    prompt: `PR ${review.repoSlug}#${review.number}\n${review.summary}\n\nDan: ${text}`,
    cwd: review.worktreePath || undefined,
    model: settings.model,
    env,
    role: "pr-review",
  })) {
    if (ev.kind === "text" && ev.detail) reply += ev.detail;
  }
  addMessage(id, { role: "assistant", text: reply.trim() || "I read the PR. What else should I look at?" });
  return emitReview(mustReview(id));
}

export async function archiveReview(id: string): Promise<PrReview> {
  const review = mustReview(id);
  review.status = "archived";
  saveReview(review);
  const [owner, name] = splitSlug(review.repoSlug);
  const root = process.env.FLIGHTDECK_DEMO === "1" ? demoRepoPath(owner, name) : repoPath(owner, name);
  await removeWorktree(root, review.worktreePath);
  review.worktreePath = "";
  saveReview(review);
  pumpQueue();
  return emitReview(mustReview(id));
}

export { getReview };

export function waitForReview(id: string): Promise<void> {
  return getJob(id) ?? Promise.resolve();
}

function kickReview(id: string): void {
  const epoch = currentRunEpoch();
  const prev = getJob(id) ?? Promise.resolve();
  setJob(id, prev.then(() => driveReview(id, epoch)));
}

async function driveReview(id: string, epoch: number): Promise<void> {
  if (!isRunCurrent(epoch)) return;
  const review = getReview(id);
  if (!review || review.status === "archived" || review.status === "queued") return;
  try {
    if (process.env.FLIGHTDECK_DEMO === "1") fillDemoDraft(review);
    else await runLiveReview(review);
  } catch (err) {
    const fresh = getReview(id);
    if (!fresh || fresh.status === "archived") return;
    fresh.status = "error";
    saveReview(fresh);
    addMessage(id, { role: "assistant", text: err instanceof Error ? err.message : String(err) });
    emitReview(fresh);
  } finally {
    if (isRunCurrent(epoch)) pumpQueue();
  }
}

function mergeRequests(remote: ReturnType<typeof demoRequests>): PrReview[] {
  const stored = listStoredReviews();
  if (process.env.FLIGHTDECK_DEMO === "1" && stored.length) return stored.filter((r) => r.status !== "archived");
  return remote.map((pr) => {
    const existing = findReview(pr.repoSlug, pr.number);
    return existing ?? {
      id: pr.id,
      repoSlug: pr.repoSlug,
      number: pr.number,
      title: pr.title,
      url: pr.url,
      author: pr.author,
      headSha: pr.headSha,
      status: "requested" as const,
      selected: false,
      summary: "",
      skillPath: "",
      worktreePath: "",
      costUsd: 0,
      comments: [],
      messages: [],
      updatedAt: pr.updatedAt,
      demo: true,
    };
  });
}

function claimQueuedReview(): { id: string } | undefined {
  const next = nextQueuedReview();
  if (!next) return undefined;
  next.status = "reviewing";
  saveReview(next);
  return { id: next.id };
}

function verdictLabel(event: ReviewVerdict): string {
  if (event === "APPROVE") return "approval";
  if (event === "REQUEST_CHANGES") return "changes-requested";
  return "comment";
}

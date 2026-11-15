import type { PrReview } from "@flightdeck/shared";
import { listReviewRequests, type ReviewRequest } from "../github/review-requests.ts";
import { resolveGithubToken } from "../github/token.ts";
import { presentReview } from "./emit.ts";
import { findReview, listStoredReviews, saveReview, upsertReview } from "./store.ts";
import { demoRequests } from "./demo.ts";

export async function listReviews(): Promise<PrReview[]> {
  return loadReviews(false);
}

export async function refreshReviews(): Promise<PrReview[]> {
  return loadReviews(true);
}

export function mergeRequests(remote: ReviewRequest[]): PrReview[] {
  const stored = listStoredReviews().filter((r) => r.status !== "archived");
  const byId = new Map(stored.map((r) => [r.id, r]));
  const merged: PrReview[] = stored.map((row) => overlay(row, remote.find((pr) => pr.id === row.id)));
  for (const pr of remote) {
    if (byId.has(pr.id)) continue;
    merged.push(stubFrom(pr));
  }
  return merged.map(presentReview);
}

async function loadReviews(fresh: boolean): Promise<PrReview[]> {
  if (process.env.FLIGHTDECK_DEMO === "1") return mergeRequests(demoRequests());
  const token = await resolveGithubToken();
  if (!token?.token) return listStoredReviews().filter((r) => r.status !== "archived").map(presentReview);
  try {
    persistRemote(await listReviewRequests(token.token, fetch, { fresh }));
  } catch {
    /* keep stored rows if GitHub is down */
  }
  return listStoredReviews().filter((r) => r.status !== "archived").map(presentReview);
}

function persistRemote(remote: ReviewRequest[]): void {
  for (const pr of remote) {
    const existing = findReview(pr.repoSlug, pr.number);
    if (existing) {
      existing.title = pr.title;
      existing.url = pr.url;
      existing.author = pr.author;
      if (!headFrozen(existing.status)) existing.headSha = pr.headSha || existing.headSha;
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
}

function overlay(stored: PrReview, remote?: ReviewRequest): PrReview {
  if (!remote) return stored;
  return {
    ...stored,
    title: remote.title || stored.title,
    url: remote.url || stored.url,
    author: remote.author || stored.author,
    headSha: headFrozen(stored.status) ? stored.headSha : remote.headSha || stored.headSha,
  };
}

function headFrozen(status: string): boolean {
  return status !== "requested" && status !== "selected";
}

function stubFrom(pr: ReviewRequest): PrReview {
  return {
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
    comments: [],
    messages: [],
    updatedAt: pr.updatedAt,
    demo: process.env.FLIGHTDECK_DEMO === "1",
  };
}

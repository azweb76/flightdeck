import type { BoardPr } from "@flightdeck/shared";
import { cacheGet, cacheSet } from "../cache/index.ts";
import { createGithubClient } from "../github/index.ts";
import { loadIssue } from "../issues/store.ts";
import { listBoardPrs } from "./store.ts";

export type PrDetail = {
  pr: BoardPr;
  checks: { name: string; conclusion: string; url: string }[];
  reviews: { author: string; state: string; body: string }[];
  comments: { id: string; author: string; body: string }[];
  linked: { id: string; key: string; title: string }[];
};

export async function loadPrDetail(id: string): Promise<PrDetail | undefined> {
  const pr = listBoardPrs().find((p) => p.id === id);
  if (!pr) return undefined;
  const linked = pr.linkedIssueIds
    .map((issueId) => loadIssue(issueId))
    .filter(Boolean)
    .map((i) => ({ id: i!.id, key: i!.key, title: i!.title }));
  if (process.env.FLIGHTDECK_DEMO === "1") {
    return {
      pr,
      checks: demoChecks(pr),
      reviews: pr.review === "pending" ? [] : [{ author: "reviewer", state: pr.review, body: "Looks close." }],
      comments: pr.body ? [{ id: "c1", author: "dan", body: pr.body }] : [],
      linked,
    };
  }
  return liveDetail(pr, linked);
}

async function liveDetail(
  pr: BoardPr,
  linked: PrDetail["linked"],
): Promise<PrDetail> {
  const [owner, name] = pr.repo.split("/");
  if (!owner || !name) return { pr, checks: [], reviews: [], comments: [], linked };
  const gh = createGithubClient();
  const [checksRaw, reviewsRaw, commentsRaw] = await Promise.all([
    cachedJson(gh, `repos/${owner}/${name}/commits/${encodeURIComponent(pr.headRef)}/status`),
    cachedJson(gh, `repos/${owner}/${name}/pulls/${pr.number}/reviews`),
    cachedJson(gh, `repos/${owner}/${name}/issues/${pr.number}/comments`),
  ]);
  return {
    pr,
    checks: parseChecks(checksRaw),
    reviews: parseReviews(reviewsRaw),
    comments: parseComments(commentsRaw),
    linked,
  };
}

async function cachedJson(
  gh: ReturnType<typeof createGithubClient>,
  path: string,
): Promise<string> {
  const key = `pr:http:${path}`;
  const hit = cacheGet(key);
  const res = await gh.getJson(path, hit?.etag);
  if (res.status === 304 && hit) return hit.body;
  cacheSet(key, res.body || "[]", res.etag);
  return res.body || "[]";
}

function parseChecks(raw: string): PrDetail["checks"] {
  try {
    const body = JSON.parse(raw) as { statuses?: { context?: string; state?: string; target_url?: string }[] };
    return (body.statuses ?? []).map((s) => ({
      name: s.context ?? "check",
      conclusion: s.state ?? "",
      url: s.target_url ?? "",
    }));
  } catch {
    return [];
  }
}

function parseReviews(raw: string): PrDetail["reviews"] {
  try {
    const rows = JSON.parse(raw) as { user?: { login?: string }; state?: string; body?: string }[];
    return rows.map((r) => ({ author: r.user?.login ?? "", state: r.state ?? "", body: r.body ?? "" }));
  } catch {
    return [];
  }
}

function parseComments(raw: string): PrDetail["comments"] {
  try {
    const rows = JSON.parse(raw) as { id?: number; user?: { login?: string }; body?: string }[];
    return rows.map((r) => ({ id: String(r.id ?? ""), author: r.user?.login ?? "", body: r.body ?? "" }));
  } catch {
    return [];
  }
}

function demoChecks(pr: BoardPr): PrDetail["checks"] {
  if (pr.ci === "passing") return [{ name: "ci", conclusion: "success", url: `${pr.url}/checks` }];
  if (pr.ci === "failing") return [{ name: "ci", conclusion: "failure", url: `${pr.url}/checks` }];
  return [{ name: "ci", conclusion: "pending", url: `${pr.url}/checks` }];
}
